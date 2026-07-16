import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

async function assertAdmin(context: { supabase: any; userId: string }) {
  const { data } = await context.supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", context.userId)
    .eq("role", "admin")
    .maybeSingle();
  if (!data) throw new Response("Forbidden", { status: 403 });
}

export const getUserEmails = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const emails: Record<string, string> = {};
    let page = 1;
    // paginate through users (up to ~2000)
    for (let i = 0; i < 20; i++) {
      const { data, error } = await supabaseAdmin.auth.admin.listUsers({ page, perPage: 100 });
      if (error) break;
      for (const u of data.users) if (u.email) emails[u.id] = u.email;
      if (data.users.length < 100) break;
      page++;
    }
    return emails;
  });

export type UserStats = {
  listings_total: number;
  listings_active: number;
  listings_sold: number;
  sales_count: number;
  sales_revenue: number;
  purchases_count: number;
  purchases_spent: number;
};

export const getUserStats = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<Record<string, UserStats>> => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const stats: Record<string, UserStats> = {};
    const bump = (id: string): UserStats => {
      if (!stats[id]) stats[id] = { listings_total: 0, listings_active: 0, listings_sold: 0, sales_count: 0, sales_revenue: 0, purchases_count: 0, purchases_spent: 0 };
      return stats[id];
    };

    const { data: listings } = await supabaseAdmin.from("listings").select("seller_id, status");
    for (const l of listings ?? []) {
      const s = bump(l.seller_id);
      s.listings_total++;
      if (l.status === "active") s.listings_active++;
      if (l.status === "sold") s.listings_sold++;
    }

    const { data: orders } = await supabaseAdmin.from("orders").select("buyer_id, seller_id, price, status");
    for (const o of orders ?? []) {
      if (o.status === "cancelled") continue;
      const seller = bump(o.seller_id);
      seller.sales_count++;
      seller.sales_revenue += o.price ?? 0;
      const buyer = bump(o.buyer_id);
      buyer.purchases_count++;
      buyer.purchases_spent += o.price ?? 0;
    }

    return stats;
  });

export const deleteUserAsAdmin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { userId: string }) => input)
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    if (data.userId === context.userId) throw new Response("Cannot delete yourself", { status: 400 });
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.auth.admin.deleteUser(data.userId);
    if (error) throw new Response(error.message, { status: 500 });
    return { ok: true };
  });