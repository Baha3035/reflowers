import { useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { BadgeCheck, Loader2, Send } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { useApp } from "@/lib/store";
import { createTelegramLink, getTelegramConfig, telegramLogin } from "@/lib/telegram.functions";
import type { TelegramAuthData } from "@/lib/telegram.server";

function useBotUsername() {
  const getConfig = useServerFn(getTelegramConfig);
  return useQuery({
    queryKey: ["telegram-config"],
    queryFn: async () => (await getConfig()).botUsername,
    staleTime: Infinity,
  }).data;
}

declare global {
  interface Window {
    onTelegramAuth?: (user: TelegramAuthData) => void;
  }
}

/** Official Telegram Login Widget. Needs BotFather /setdomain = this site's domain. */
export function TelegramLoginButton() {
  const botUsername = useBotUsername();
  const login = useServerFn(telegramLogin);
  const ref = useRef<HTMLDivElement>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!botUsername || !ref.current) return;
    window.onTelegramAuth = async (user) => {
      setBusy(true);
      try {
        const { tokenHash } = await login({ data: user });
        const { error } = await supabase.auth.verifyOtp({
          token_hash: tokenHash,
          type: "magiclink",
        });
        if (error) throw error;
        toast.success("Вы вошли через Telegram");
        // The auth page redirects once the session appears.
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Не удалось войти через Telegram");
      } finally {
        setBusy(false);
      }
    };
    const script = document.createElement("script");
    script.src = "https://telegram.org/js/telegram-widget.js?22";
    script.async = true;
    script.dataset.telegramLogin = botUsername;
    script.dataset.size = "large";
    script.dataset.radius = "20";
    script.dataset.onauth = "onTelegramAuth(user)";
    script.dataset.requestAccess = "write"; // lets the bot send this user notifications
    script.dataset.lang = "ru";
    ref.current.replaceChildren(script);
    return () => {
      delete window.onTelegramAuth;
    };
  }, [botUsername, login]);

  if (!botUsername) return null;
  return (
    <div className="mt-5">
      <div ref={ref} className="flex min-h-10 justify-center" />
      {busy && (
        <div className="mt-2 flex items-center justify-center gap-2 text-xs text-muted-foreground">
          <Loader2 className="h-3.5 w-3.5 animate-spin" /> Входим…
        </div>
      )}
      <div className="mt-4 flex items-center gap-3 text-xs text-muted-foreground">
        <span className="h-px flex-1 bg-border" /> или по email{" "}
        <span className="h-px flex-1 bg-border" />
      </div>
    </div>
  );
}

/** /notifications card: link this account to the bot, notification switch, phone verification. */
export function TelegramConnect() {
  const { user } = useApp();
  const qc = useQueryClient();
  const botUsername = useBotUsername();
  const createLink = useServerFn(createTelegramLink);

  const me = useQuery({
    queryKey: ["my-telegram", user?.id],
    enabled: !!user && !!botUsername,
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("telegram_id, telegram_notify, phone_verified_at")
        .eq("id", user!.id)
        .maybeSingle();
      return data;
    },
    // While not linked, check every few seconds so the card updates after /start in Telegram.
    refetchInterval: (q) => (q.state.data?.telegram_id ? false : 4000),
  });
  const linked = !!me.data?.telegram_id;

  const link = useQuery({
    queryKey: ["telegram-link", user?.id],
    enabled: !!user && !!botUsername && me.isSuccess && !linked,
    queryFn: async () => (await createLink()).url,
    staleTime: 25 * 60 * 1000, // tokens live 30 min
  });

  const update = async (patch: { telegram_notify?: boolean; telegram_id?: null }) => {
    const { error } = await supabase.from("profiles").update(patch).eq("id", user!.id);
    if (error) toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["my-telegram", user?.id] });
    if (patch.telegram_id === null) qc.invalidateQueries({ queryKey: ["telegram-link", user?.id] });
  };

  if (!user || !botUsername || me.isLoading) return null;

  return (
    <div className="mt-4 flex items-start gap-3 rounded-3xl bg-card p-4 shadow-[var(--shadow-card)]">
      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-[#229ED9]/10 text-[#229ED9]">
        <Send className="h-4 w-4" />
      </span>
      <div className="min-w-0 flex-1">
        <div className="text-sm font-medium">Telegram</div>
        {!linked ? (
          <>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Сообщения и шаги сделок — в Telegram. Работает на любом телефоне, ничего не нужно
              устанавливать.
            </p>
            <div className="mt-3">
              {link.data ? (
                <a href={link.data} target="_blank" rel="noopener noreferrer">
                  <Button size="sm" className="rounded-full">
                    Подключить Telegram
                  </Button>
                </a>
              ) : (
                <Button size="sm" className="rounded-full" disabled>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                </Button>
              )}
            </div>
            <p className="mt-2 text-[11px] text-muted-foreground">
              В Telegram нажмите «Старт» — карточка обновится сама.
            </p>
          </>
        ) : (
          <>
            <label className="mt-2 flex items-center justify-between gap-2 text-sm">
              <span>Уведомления в Telegram</span>
              <Switch
                checked={!!me.data?.telegram_notify}
                onCheckedChange={(v) => update({ telegram_notify: v })}
              />
            </label>
            <p className="mt-2 text-xs text-muted-foreground">
              {me.data?.phone_verified_at ? (
                <span className="inline-flex items-center gap-1 text-primary">
                  <BadgeCheck className="h-3.5 w-3.5" /> Номер подтверждён
                </span>
              ) : (
                <>
                  Подтвердите номер — отправьте{" "}
                  <a
                    href={`https://t.me/${botUsername}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary underline"
                  >
                    боту
                  </a>{" "}
                  команду /phone. Покупатели больше доверяют подтверждённым продавцам.
                </>
              )}
            </p>
            <button
              type="button"
              onClick={() => update({ telegram_id: null })}
              className="mt-2 text-xs text-muted-foreground underline"
            >
              Отключить Telegram
            </button>
          </>
        )}
      </div>
    </div>
  );
}
