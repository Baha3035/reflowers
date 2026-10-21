// Telegram bot: login verification, account linking, verified phone and private notifications.
// Server-only (service-role client). The bot is private: it never posts to channels.
// Secrets (Lovable Cloud): TELEGRAM_BOT_TOKEN, TELEGRAM_BOT_USERNAME, TELEGRAM_WEBHOOK_SECRET.
// Optional: TELEGRAM_WEBHOOK_URL (override), PUBLIC_SITE_URL (links in messages),
// TELEGRAM_API_BASE (tests point it at a mock).
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const LINK_TOKEN_TTL_MS = 30 * 60 * 1000;
const LOGIN_MAX_AGE_S = 24 * 60 * 60;

export function telegramConfig() {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const username = process.env.TELEGRAM_BOT_USERNAME?.replace(/^@/, "");
  if (!token || !username) return null;
  return {
    token,
    username,
    webhookSecret: process.env.TELEGRAM_WEBHOOK_SECRET || null,
    apiBase: (process.env.TELEGRAM_API_BASE || "https://api.telegram.org").replace(/\/$/, ""),
    siteUrl: (process.env.PUBLIC_SITE_URL || "https://reflowers.lovable.app").replace(/\/$/, ""),
  };
}
type TgConfig = NonNullable<ReturnType<typeof telegramConfig>>;

export async function tgCall<T = unknown>(
  cfg: TgConfig,
  method: string,
  payload: Record<string, unknown>,
) {
  const res = await fetch(`${cfg.apiBase}/bot${cfg.token}/${method}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload),
  });
  const body = (await res.json().catch(() => ({}))) as {
    ok?: boolean;
    result?: T;
    description?: string;
  };
  if (!body.ok) throw new Error(`Telegram ${method}: ${body.description ?? res.status}`);
  return body.result as T;
}

const escapeHtml = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/** Inline "open" button; Telegram rejects http/localhost URLs, so only https links get a button. */
function openButton(cfg: TgConfig, path: string, text = "Открыть") {
  const url = `${cfg.siteUrl}${path.startsWith("/") ? path : `/${path}`}`;
  return url.startsWith("https://") ? { inline_keyboard: [[{ text, url }]] } : undefined;
}

// ---------- Login widget ----------

export type TelegramAuthData = {
  id: number;
  first_name?: string;
  last_name?: string;
  username?: string;
  photo_url?: string;
  auth_date: number;
  hash: string;
};

const hex = (buf: ArrayBuffer) =>
  [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");

/** Checks the Login Widget signature: HMAC-SHA256(data_check_string, SHA256(bot_token)). */
export async function verifyTelegramLogin(cfg: TgConfig, data: TelegramAuthData): Promise<boolean> {
  if (!data?.hash || !data.id || !data.auth_date) return false;
  if (Date.now() / 1000 - Number(data.auth_date) > LOGIN_MAX_AGE_S) return false;
  const checkString = Object.keys(data)
    .filter(
      (k) =>
        k !== "hash" &&
        data[k as keyof TelegramAuthData] !== undefined &&
        data[k as keyof TelegramAuthData] !== null,
    )
    .sort()
    .map((k) => `${k}=${data[k as keyof TelegramAuthData]}`)
    .join("\n");
  const enc = new TextEncoder();
  const secret = await crypto.subtle.digest("SHA-256", enc.encode(cfg.token));
  const key = await crypto.subtle.importKey(
    "raw",
    secret,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = hex(await crypto.subtle.sign("HMAC", key, enc.encode(checkString)));
  if (sig.length !== data.hash.length) return false;
  let diff = 0;
  for (let i = 0; i < sig.length; i++) diff |= sig.charCodeAt(i) ^ data.hash.charCodeAt(i);
  return diff === 0;
}

/** Finds or creates the account for a Telegram user and returns a one-time sign-in token hash. */
export async function telegramSignIn(data: TelegramAuthData): Promise<{ tokenHash: string }> {
  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("id")
    .eq("telegram_id", data.id)
    .maybeSingle();

  let email: string;
  if (profile) {
    const { data: u, error } = await supabaseAdmin.auth.admin.getUserById(profile.id);
    if (error || !u.user?.email) throw new Error("Аккаунт не найден");
    email = u.user.email;
  } else {
    // Telegram-only accounts get a placeholder address that never receives mail.
    email = `tg${data.id}@telegram.reflowers.invalid`;
    const name =
      [data.first_name, data.last_name].filter(Boolean).join(" ") ||
      data.username ||
      "Пользователь";
    const { error } = await supabaseAdmin.auth.admin.createUser({
      email,
      email_confirm: true,
      user_metadata: {
        display_name: name,
        avatar_url: data.photo_url ?? null,
        telegram_username: data.username ?? null,
      },
    });
    if (error && !/already/i.test(error.message)) throw new Error(error.message);
  }

  const { data: link, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
    type: "magiclink",
    email,
  });
  if (linkError || !link.properties?.hashed_token)
    throw new Error(linkError?.message ?? "Не удалось войти");
  if (!profile && link.user) {
    await supabaseAdmin
      .from("profiles")
      .update({ telegram_id: data.id, telegram_notify: true })
      .eq("id", link.user.id);
  }
  return { tokenHash: link.properties.hashed_token };
}

// ---------- Linking an existing account (t.me/<bot>?start=<token>) ----------

export async function createLinkToken(userId: string): Promise<string> {
  const bytes = crypto.getRandomValues(new Uint8Array(18));
  const token = btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
  const { error } = await supabaseAdmin
    .from("telegram_link_tokens")
    .insert({ token, user_id: userId });
  if (error) throw new Error(error.message);
  return token;
}

/**
 * Points the bot's webhook at the production site (PUBLIC_SITE_URL, or TELEGRAM_WEBHOOK_URL) once per
 * worker. Always the public URL, never the request's origin, so a click in the Lovable preview can't
 * redirect the bot. setWebhook is idempotent and also picks up a changed TELEGRAM_WEBHOOK_SECRET.
 */
let webhookSetFor: string | null = null;
export async function ensureWebhook(cfg: TgConfig) {
  if (!cfg.webhookSecret) return;
  const url = process.env.TELEGRAM_WEBHOOK_URL || `${cfg.siteUrl}/api/telegram/webhook`;
  if (webhookSetFor === url) return;
  if (!url.startsWith("https://") && !process.env.TELEGRAM_WEBHOOK_URL) return;
  await tgCall(cfg, "setWebhook", {
    url,
    secret_token: cfg.webhookSecret,
    allowed_updates: ["message"],
  });
  webhookSetFor = url;
}

// ---------- Webhook updates ----------

type TgMessage = {
  chat: { id: number; type: string };
  from?: { id: number; first_name?: string; username?: string };
  text?: string;
  contact?: { phone_number: string; user_id?: number };
};

const CONTACT_KEYBOARD = {
  keyboard: [[{ text: "📱 Подтвердить номер", request_contact: true }]],
  resize_keyboard: true,
  one_time_keyboard: true,
};

async function reply(
  cfg: TgConfig,
  chatId: number,
  text: string,
  extra: Record<string, unknown> = {},
) {
  await tgCall(cfg, "sendMessage", { chat_id: chatId, text, parse_mode: "HTML", ...extra });
}

/** Telegram phone ("996555123456" / "+996…") → "+996555123456", or null for non-KG numbers. */
function kgPhone(raw: string) {
  const digits = raw.replace(/\D/g, "");
  return digits.length === 12 && digits.startsWith("996") ? `+${digits}` : null;
}

export async function handleTelegramUpdate(cfg: TgConfig, update: { message?: TgMessage }) {
  const msg = update.message;
  if (!msg?.from || msg.chat.type !== "private") return;
  const tgId = msg.from.id;
  const chatId = msg.chat.id;
  const text = msg.text?.trim() ?? "";

  if (msg.contact) {
    if (msg.contact.user_id !== tgId) {
      await reply(cfg, chatId, "Отправьте, пожалуйста, <b>свой</b> номер кнопкой ниже.", {
        reply_markup: CONTACT_KEYBOARD,
      });
      return;
    }
    const phone = kgPhone(msg.contact.phone_number);
    if (!phone) {
      await reply(cfg, chatId, "Пока подтверждаем только номера Кыргызстана (+996).", {
        reply_markup: { remove_keyboard: true },
      });
      return;
    }
    const { data: updated } = await supabaseAdmin
      .from("profiles")
      .update({ phone, phone_verified_at: new Date().toISOString() })
      .eq("telegram_id", tgId)
      .select("id");
    await reply(
      cfg,
      chatId,
      updated?.length
        ? "✅ Номер подтверждён. Покупатели увидят отметку «Номер подтверждён»."
        : "Сначала подключите Telegram на сайте: «Уведомления» → «Подключить Telegram».",
      { reply_markup: { remove_keyboard: true } },
    );
    return;
  }

  const [command, arg] = text.split(/\s+/, 2);
  if (command === "/start" && arg) {
    const { data: row } = await supabaseAdmin
      .from("telegram_link_tokens")
      .select("token, user_id, created_at, used_at")
      .eq("token", arg)
      .maybeSingle();
    if (
      !row ||
      row.used_at ||
      Date.now() - new Date(row.created_at).getTime() > LINK_TOKEN_TTL_MS
    ) {
      await reply(
        cfg,
        chatId,
        "Ссылка устарела. Откройте «Уведомления» на сайте и нажмите «Подключить Telegram» ещё раз.",
      );
      return;
    }
    const { data: other } = await supabaseAdmin
      .from("profiles")
      .select("id")
      .eq("telegram_id", tgId)
      .neq("id", row.user_id)
      .maybeSingle();
    if (other) {
      await reply(
        cfg,
        chatId,
        "Этот Telegram уже привязан к другому аккаунту ReFlowers. Отключите его там («Уведомления» → «Отключить») и попробуйте снова.",
      );
      return;
    }
    await supabaseAdmin
      .from("profiles")
      .update({ telegram_id: tgId, telegram_notify: true })
      .eq("id", row.user_id);
    await supabaseAdmin
      .from("telegram_link_tokens")
      .update({ used_at: new Date().toISOString() })
      .eq("token", arg);
    await reply(
      cfg,
      chatId,
      "✅ Telegram подключён. Сюда будут приходить новые сообщения и шаги сделок.\n\nПодтвердите номер — покупатели больше доверяют продавцам с отметкой «Номер подтверждён».",
      { reply_markup: CONTACT_KEYBOARD },
    );
    return;
  }

  if (command === "/stop") {
    await supabaseAdmin.from("profiles").update({ telegram_notify: false }).eq("telegram_id", tgId);
    await reply(cfg, chatId, "Уведомления выключены. Включить снова — /notify");
    return;
  }
  if (command === "/notify") {
    await supabaseAdmin.from("profiles").update({ telegram_notify: true }).eq("telegram_id", tgId);
    await reply(cfg, chatId, "Уведомления включены.");
    return;
  }
  if (command === "/phone") {
    await reply(cfg, chatId, "Нажмите кнопку ниже, чтобы подтвердить номер.", {
      reply_markup: CONTACT_KEYBOARD,
    });
    return;
  }

  const { data: linked } = await supabaseAdmin
    .from("profiles")
    .select("id")
    .eq("telegram_id", tgId)
    .maybeSingle();
  await reply(
    cfg,
    chatId,
    linked
      ? "Вы подключены к ReFlowers. Команды: /phone — подтвердить номер, /stop — выключить уведомления."
      : "Это бот ReFlowers — маркетплейса букетов в Бишкеке. Войдите на сайте через Telegram или подключите уведомления в разделе «Уведомления».",
    { reply_markup: openButton(cfg, linked ? "/notifications" : "/auth", "Открыть ReFlowers") },
  );
}

// ---------- Notifications ----------

export type OutboxMessage = { user_id: string; title: string; body: string | null; url: string };

/** Sends queued notifications to users who linked Telegram and kept notifications on. */
export async function sendTelegramNotifications(messages: OutboxMessage[]): Promise<number> {
  const cfg = telegramConfig();
  if (!cfg || !messages.length) return 0;
  const userIds = [...new Set(messages.map((m) => m.user_id))];
  const { data: profiles } = await supabaseAdmin
    .from("profiles")
    .select("id, telegram_id, telegram_notify")
    .in("id", userIds)
    .not("telegram_id", "is", null);
  const chatByUser = new Map(
    (profiles ?? [])
      .filter((p) => p.telegram_notify && p.telegram_id)
      .map((p) => [p.id, p.telegram_id as number]),
  );
  let sent = 0;
  await Promise.all(
    messages.map(async (m) => {
      const chatId = chatByUser.get(m.user_id);
      if (!chatId) return;
      const text = `<b>${escapeHtml(m.title)}</b>${m.body ? `\n${escapeHtml(m.body)}` : ""}`;
      try {
        await tgCall(cfg, "sendMessage", {
          chat_id: chatId,
          text,
          parse_mode: "HTML",
          reply_markup: openButton(cfg, m.url),
        });
        sent++;
      } catch (e) {
        // 403: the user blocked the bot. Stop trying until they link again.
        if (String(e).includes("blocked") || String(e).includes("403")) {
          await supabaseAdmin
            .from("profiles")
            .update({ telegram_notify: false })
            .eq("telegram_id", chatId);
        }
        console.warn("[telegram] send failed", e);
      }
    }),
  );
  return sent;
}
