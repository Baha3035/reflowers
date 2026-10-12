import { createServerFn, createServerOnlyFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

type Ctx = { supabase: any; userId: string };

async function loadOrder(ctx: Ctx, orderId: string) {
  const { data, error } = await ctx.supabase
    .from("orders")
    .select("id, buyer_id, seller_id, listing_id, deal_status")
    .eq("id", orderId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Сделка не найдена");
  if (data.buyer_id !== ctx.userId && data.seller_id !== ctx.userId) {
    throw new Error("Нет доступа");
  }
  return data;
}

async function logEvent(ctx: Ctx, orderId: string, event_type: string, payload: Record<string, unknown> = {}) {
  const { error } = await ctx.supabase
    .from("deal_events")
    .insert({ order_id: orderId, actor_id: ctx.userId, event_type, payload });
  if (error) throw new Error(error.message);
  // The deal_events trigger queued a notification for the other party; push it now.
  await dispatchPush();
}

const dispatchPush = createServerOnlyFn(async () => {
  const { dispatchPendingPushSafe } = await import("./push.server");
  await dispatchPendingPushSafe();
});

export const createDeal = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { listing_id: string }) => {
    if (!d?.listing_id) throw new Error("listing_id required");
    return d;
  })
  .handler(async ({ data, context }) => {
    const ctx = context as Ctx;
    const { data: listing, error: le } = await ctx.supabase
      .from("listings")
      .select("id, seller_id, price, status")
      .eq("id", data.listing_id)
      .maybeSingle();
    if (le) throw new Error(le.message);
    if (!listing) throw new Error("Объявление не найдено");
    if (listing.seller_id === ctx.userId) throw new Error("Нельзя купить своё объявление");
    if (listing.status !== "active") throw new Error("Объявление недоступно");

    // Reuse conversation
    let convId: string | null = null;
    const { data: existingConv } = await ctx.supabase
      .from("conversations")
      .select("id")
      .eq("listing_id", listing.id)
      .eq("buyer_id", ctx.userId)
      .eq("seller_id", listing.seller_id)
      .maybeSingle();
    convId = existingConv?.id ?? null;
    if (!convId) {
      const { data: newConv, error: ce } = await ctx.supabase
        .from("conversations")
        .insert({ listing_id: listing.id, buyer_id: ctx.userId, seller_id: listing.seller_id })
        .select("id")
        .single();
      if (ce) throw new Error(ce.message);
      convId = newConv.id;
    }

    // Reuse active order for this conversation, if any
    const { data: activeOrder } = await ctx.supabase
      .from("orders")
      .select("id, deal_status")
      .eq("listing_id", listing.id)
      .eq("buyer_id", ctx.userId)
      .not("deal_status", "in", "(completed,cancelled)")
      .maybeSingle();
    if (activeOrder) {
      return { order_id: activeOrder.id, conversation_id: convId };
    }

    const { data: newOrder, error: oe } = await ctx.supabase
      .from("orders")
      .insert({
        listing_id: listing.id,
        seller_id: listing.seller_id,
        buyer_id: ctx.userId,
        price: listing.price,
        conversation_id: convId,
      })
      .select("id")
      .single();
    if (oe) throw new Error(oe.message);

    await logEvent(ctx, newOrder.id, "buyer_requested", { price: listing.price });

    // Send a buyer message into the conversation so the seller sees the request
    // in their chat list (bumps last_message_at) and gets a realtime notification.
    await ctx.supabase.from("messages").insert({
      conversation_id: convId,
      sender_id: ctx.userId,
      kind: "text",
      body: "🛒 Хочу купить этот букет — открыл сделку.",
    });

    return { order_id: newOrder.id, conversation_id: convId };
  });

export const sellerRespond = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { order_id: string; accept: boolean }) => d)
  .handler(async ({ data, context }) => {
    const ctx = context as Ctx;
    const o = await loadOrder(ctx, data.order_id);
    if (o.seller_id !== ctx.userId) throw new Error("Только продавец");
    await logEvent(ctx, data.order_id, data.accept ? "seller_confirmed" : "seller_declined");
    return { ok: true };
  });

export const sellerSetTerms = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: {
    order_id: string;
    final_price: number;
    prepayment_amount: number;
    delivery_cost: number;
    payment_method: string;
    payment_details: string;
    prepayment_deadline?: string | null;
  }) => d)
  .handler(async ({ data, context }) => {
    const ctx = context as Ctx;
    const o = await loadOrder(ctx, data.order_id);
    if (o.seller_id !== ctx.userId) throw new Error("Только продавец");
    const { error } = await ctx.supabase
      .from("orders")
      .update({
        final_price: data.final_price,
        prepayment_amount: data.prepayment_amount,
        delivery_cost: data.delivery_cost,
        payment_method: data.payment_method,
        payment_details: data.payment_details,
        prepayment_deadline: data.prepayment_deadline ?? null,
      })
      .eq("id", data.order_id);
    if (error) throw new Error(error.message);
    await logEvent(ctx, data.order_id, "seller_set_terms", {
      final_price: data.final_price,
      prepayment_amount: data.prepayment_amount,
      delivery_cost: data.delivery_cost,
      payment_method: data.payment_method,
    });
    return { ok: true };
  });

export const buyerSentPrepayment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { order_id: string; amount: number; receipt_url: string }) => {
    if (!d?.receipt_url || !/^https?:\/\//.test(d.receipt_url)) {
      throw new Error("Прикрепите чек об оплате");
    }
    return d;
  })
  .handler(async ({ data, context }) => {
    const ctx = context as Ctx;
    const o = await loadOrder(ctx, data.order_id);
    if (o.buyer_id !== ctx.userId) throw new Error("Только покупатель");
    await logEvent(ctx, data.order_id, "buyer_sent_prepayment", {
      amount: data.amount,
      receipt_url: data.receipt_url,
    });
    return { ok: true };
  });

export const sellerConfirmPrepayment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { order_id: string; ok: boolean }) => d)
  .handler(async ({ data, context }) => {
    const ctx = context as Ctx;
    const o = await loadOrder(ctx, data.order_id);
    if (o.seller_id !== ctx.userId) throw new Error("Только продавец");
    await logEvent(ctx, data.order_id, data.ok ? "seller_confirmed_prepayment" : "seller_rejected_prepayment");
    return { ok: true };
  });

export const sellerBouquetStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { order_id: string; mode: "pickup" | "shipped" }) => d)
  .handler(async ({ data, context }) => {
    const ctx = context as Ctx;
    const o = await loadOrder(ctx, data.order_id);
    if (o.seller_id !== ctx.userId) throw new Error("Только продавец");
    await logEvent(
      ctx,
      data.order_id,
      data.mode === "pickup" ? "bouquet_ready_pickup" : "bouquet_shipped",
    );
    return { ok: true };
  });

export const buyerReceived = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { order_id: string }) => d)
  .handler(async ({ data, context }) => {
    const ctx = context as Ctx;
    const o = await loadOrder(ctx, data.order_id);
    if (o.buyer_id !== ctx.userId) throw new Error("Только покупатель");
    await logEvent(ctx, data.order_id, "buyer_received");
    return { ok: true };
  });

export const buyerSentFull = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { order_id: string }) => d)
  .handler(async ({ data, context }) => {
    const ctx = context as Ctx;
    const o = await loadOrder(ctx, data.order_id);
    if (o.buyer_id !== ctx.userId) throw new Error("Только покупатель");
    await logEvent(ctx, data.order_id, "buyer_sent_full");
    return { ok: true };
  });

export const sellerConfirmFull = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { order_id: string }) => d)
  .handler(async ({ data, context }) => {
    const ctx = context as Ctx;
    const o = await loadOrder(ctx, data.order_id);
    if (o.seller_id !== ctx.userId) throw new Error("Только продавец");
    await logEvent(ctx, data.order_id, "seller_confirmed_full");
    return { ok: true };
  });

export const cancelDeal = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { order_id: string; reason: string }) => d)
  .handler(async ({ data, context }) => {
    const ctx = context as Ctx;
    await loadOrder(ctx, data.order_id);
    await logEvent(ctx, data.order_id, "cancelled", { reason: data.reason });
    return { ok: true };
  });

export const reportProblem = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { order_id: string; reason: string; details?: string }) => d)
  .handler(async ({ data, context }) => {
    const ctx = context as Ctx;
    const o = await loadOrder(ctx, data.order_id);
    await logEvent(ctx, data.order_id, "problem_reported", { reason: data.reason, details: data.details ?? null });
    const targetUser = o.buyer_id === ctx.userId ? o.seller_id : o.buyer_id;
    await ctx.supabase.from("reports").insert({
      reporter_id: ctx.userId,
      target_user_id: targetUser,
      listing_id: o.listing_id,
      reason: data.reason,
      details: data.details ?? null,
    });
    return { ok: true };
  });

export const adminCancelDeal = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { order_id: string; reason: string }) => d)
  .handler(async ({ data, context }) => {
    const ctx = context as Ctx;
    // Verify admin using the caller's RLS-scoped client
    const { data: role } = await ctx.supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", ctx.userId)
      .eq("role", "admin")
      .maybeSingle();
    if (!role) throw new Error("Только администратор");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.rpc("admin_cancel_deal", {
      _order_id: data.order_id,
      _reason: data.reason,
      _actor: ctx.userId,
    });
    if (error) throw new Error(error.message);
    await dispatchPush();
    return { ok: true };
  });