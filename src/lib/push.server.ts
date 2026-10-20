// Sends queued notifications (rows in push_outbox) as web pushes to every device the recipient
// enabled, and as a Telegram message if they linked Telegram. Server-only: uses the service-role client.
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { sendWebPush, type VapidKeys } from "./web-push.server";
import { sendTelegramNotifications, telegramConfig } from "./telegram.server";

// Pushes older than this are dropped instead of sent (e.g. while VAPID keys were missing).
const MAX_AGE_MS = 60 * 60 * 1000;

export function getVapidKeys(): VapidKeys | null {
  const publicKey = process.env.VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  if (!publicKey || !privateKey) return null;
  return {
    publicKey,
    privateKey,
    subject: process.env.VAPID_SUBJECT || "mailto:support@reflowers.kg",
  };
}

export async function dispatchPendingPush(limit = 100): Promise<{ sent: number }> {
  const vapid = getVapidKeys();
  if (!vapid && !telegramConfig()) return { sent: 0 };

  const { data: pending, error } = await supabaseAdmin
    .from("push_outbox")
    .select("id")
    .is("sent_at", null)
    .order("created_at", { ascending: true })
    .limit(limit);
  if (error) throw error;
  if (!pending?.length) return { sent: 0 };

  // Claim the rows; a concurrent dispatcher only gets the ones still unsent.
  const { data: claimed, error: claimError } = await supabaseAdmin
    .from("push_outbox")
    .update({ sent_at: new Date().toISOString() })
    .in(
      "id",
      pending.map((r) => r.id),
    )
    .is("sent_at", null)
    .select("id, user_id, title, body, url, tag, created_at");
  if (claimError) throw claimError;

  const fresh = (claimed ?? []).filter(
    (r) => Date.now() - new Date(r.created_at).getTime() < MAX_AGE_MS,
  );
  const userIds = [...new Set(fresh.map((r) => r.user_id))];
  if (!userIds.length) return { sent: 0 };

  const telegramSent = await sendTelegramNotifications(fresh).catch((e) => {
    console.warn("[telegram] dispatch failed", e);
    return 0;
  });
  if (!vapid) return { sent: telegramSent };

  const { data: subs, error: subsError } = await supabaseAdmin
    .from("push_subscriptions")
    .select("id, user_id, endpoint, p256dh, auth")
    .in("user_id", userIds);
  if (subsError) throw subsError;

  const byUser = new Map<string, NonNullable<typeof subs>>();
  for (const s of subs ?? []) byUser.set(s.user_id, [...(byUser.get(s.user_id) ?? []), s]);

  let sent = 0;
  const gone: string[] = [];
  const delivered = new Set<string>();
  await Promise.all(
    fresh.flatMap((msg) =>
      (byUser.get(msg.user_id) ?? []).map(async (sub) => {
        try {
          const res = await sendWebPush(
            sub,
            { title: msg.title, body: msg.body, url: msg.url, tag: msg.tag },
            vapid,
            { urgency: "high" },
          );
          if (res.gone) gone.push(sub.id);
          else if (res.ok) {
            sent++;
            delivered.add(sub.id);
          } else console.warn(`[push] ${res.status} from push service`);
        } catch (e) {
          console.warn("[push] send failed", e);
        }
      }),
    ),
  );

  if (gone.length) await supabaseAdmin.from("push_subscriptions").delete().in("id", gone);
  if (delivered.size) {
    await supabaseAdmin
      .from("push_subscriptions")
      .update({ last_success_at: new Date().toISOString() })
      .in("id", [...delivered]);
  }
  return { sent: sent + telegramSent };
}

// Never let a push problem break the action that triggered it.
export async function dispatchPendingPushSafe(): Promise<{ sent: number }> {
  try {
    return await dispatchPendingPush();
  } catch (e) {
    console.warn("[push] dispatch failed", e);
    return { sent: 0 };
  }
}
