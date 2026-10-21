import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { TelegramAuthData } from "./telegram.server";

/** Bot username for the login widget and links; null while the Telegram secrets aren't set. */
export const getTelegramConfig = createServerFn({ method: "GET" }).handler(async () => {
  const { telegramConfig } = await import("./telegram.server");
  return { botUsername: telegramConfig()?.username ?? null };
});

/** "Log in with Telegram": verifies the widget signature and returns a one-time sign-in token. */
export const telegramLogin = createServerFn({ method: "POST" })
  .inputValidator((d: TelegramAuthData) => {
    if (
      !d ||
      typeof d.hash !== "string" ||
      !Number.isFinite(Number(d.id)) ||
      !Number.isFinite(Number(d.auth_date))
    ) {
      throw new Error("invalid Telegram data");
    }
    const str = (v: unknown) => (typeof v === "string" ? v.slice(0, 256) : undefined);
    return {
      id: Number(d.id),
      first_name: str(d.first_name),
      last_name: str(d.last_name),
      username: str(d.username),
      photo_url: str(d.photo_url),
      auth_date: Number(d.auth_date),
      hash: d.hash.slice(0, 128),
    } satisfies TelegramAuthData;
  })
  .handler(async ({ data }) => {
    const { telegramConfig, verifyTelegramLogin, telegramSignIn } =
      await import("./telegram.server");
    const cfg = telegramConfig();
    if (!cfg) throw new Error("Вход через Telegram ещё не настроен");
    // Undefined fields were not sent by Telegram and must not enter the signed string.
    const signed = Object.fromEntries(
      Object.entries(data).filter(([, v]) => v !== undefined),
    ) as TelegramAuthData;
    if (!(await verifyTelegramLogin(cfg, signed)))
      throw new Error("Не удалось проверить вход через Telegram");
    return telegramSignIn(signed);
  });

/** Link the signed-in account to Telegram: returns t.me/<bot>?start=<one-time token>. */
export const createTelegramLink = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { telegramConfig, createLinkToken, ensureWebhook } = await import("./telegram.server");
    const cfg = telegramConfig();
    if (!cfg) throw new Error("Telegram ещё не настроен");
    await ensureWebhook(cfg).catch((e) => console.warn("[telegram] webhook", e));
    const token = await createLinkToken(context.userId);
    return { url: `https://t.me/${cfg.username}?start=${token}` };
  });
