import { createFileRoute } from "@tanstack/react-router";

// Telegram Bot API webhook. Telegram sends the secret we registered in a header; anything else is
// rejected. Always answer 200 to real updates, or Telegram retries the same update for hours.
export const Route = createFileRoute("/api/telegram/webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const { telegramConfig, handleTelegramUpdate } = await import("@/lib/telegram.server");
        const cfg = telegramConfig();
        if (
          !cfg?.webhookSecret ||
          request.headers.get("x-telegram-bot-api-secret-token") !== cfg.webhookSecret
        ) {
          return new Response("forbidden", { status: 403 });
        }
        try {
          await handleTelegramUpdate(cfg, await request.json());
        } catch (e) {
          console.error("[telegram] update failed", e);
        }
        return new Response("ok");
      },
    },
  },
});
