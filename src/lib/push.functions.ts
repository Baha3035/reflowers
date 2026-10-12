import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

// The server POSTs to subscription endpoints, so only accept real browser push services.
const PUSH_HOSTS = [
  /^fcm\.googleapis\.com$/,
  /(^|\.)push\.services\.mozilla\.com$/,
  /(^|\.)push\.apple\.com$/,
  /(^|\.)notify\.windows\.com$/,
];

function isPushEndpoint(endpoint: string) {
  try {
    const url = new URL(endpoint);
    return url.protocol === "https:" && PUSH_HOSTS.some((re) => re.test(url.hostname));
  } catch {
    return false;
  }
}

export const getPushConfig = createServerFn({ method: "GET" }).handler(async () => ({
  publicKey: process.env.VAPID_PUBLIC_KEY || null,
}));

type SubscriptionInput = { endpoint: string; p256dh: string; auth: string; userAgent?: string };

export const savePushSubscription = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: SubscriptionInput) => {
    if (!d || typeof d.endpoint !== "string" || !isPushEndpoint(d.endpoint)) {
      throw new Error("Unsupported push endpoint");
    }
    if (
      typeof d.p256dh !== "string" ||
      d.p256dh.length > 200 ||
      typeof d.auth !== "string" ||
      d.auth.length > 100
    ) {
      throw new Error("Invalid subscription keys");
    }
    return {
      endpoint: d.endpoint,
      p256dh: d.p256dh,
      auth: d.auth,
      userAgent: typeof d.userAgent === "string" ? d.userAgent.slice(0, 300) : null,
    };
  })
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    // Upsert by endpoint: a device moves to whoever is signed in on it now.
    const { error } = await supabaseAdmin.from("push_subscriptions").upsert(
      {
        user_id: context.userId,
        endpoint: data.endpoint,
        p256dh: data.p256dh,
        auth: data.auth,
        user_agent: data.userAgent,
      },
      { onConflict: "endpoint" },
    );
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deletePushSubscription = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { endpoint: string }) => {
    if (!d || typeof d.endpoint !== "string") throw new Error("endpoint required");
    return d;
  })
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("push_subscriptions")
      .delete()
      .eq("endpoint", data.endpoint);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// Sends whatever is queued. Called after actions that create notifications or messages.
export const flushPush = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async () => {
    const { dispatchPendingPushSafe } = await import("./push.server");
    return dispatchPendingPushSafe();
  });

export const sendTestPush = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("push_outbox").insert({
      user_id: context.userId,
      title: "ReFlowers 🌷",
      body: "Уведомления работают на этом устройстве.",
      url: "/notifications",
      tag: "test",
    });
    if (error) throw new Error(error.message);
    const { dispatchPendingPushSafe } = await import("./push.server");
    return dispatchPendingPushSafe();
  });
