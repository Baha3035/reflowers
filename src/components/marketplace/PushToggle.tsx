import { useCallback, useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { BellRing, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { getPushConfig, sendTestPush } from "@/lib/push.functions";
import { disablePush, enablePush, getPushStatus, type PushStatus } from "@/lib/push-client";

const HINT: Partial<Record<PushStatus, string>> = {
  unsupported: "Этот браузер не поддерживает push-уведомления.",
  preview: "Push-уведомления работают на опубликованном сайте.",
  "ios-install":
    "На iPhone уведомления работают, если добавить ReFlowers на экран «Домой»: «Поделиться» → «На экран „Домой“».",
  "not-configured": "Push-уведомления скоро появятся.",
  denied: "Уведомления заблокированы в настройках браузера для этого сайта.",
  off: "Узнавайте о новых сообщениях и шагах сделки сразу, даже когда сайт закрыт.",
  on: "Включены на этом устройстве.",
};

export function PushToggle() {
  const getConfig = useServerFn(getPushConfig);
  const runTest = useServerFn(sendTestPush);
  const [publicKey, setPublicKey] = useState<string | null>(null);
  const [status, setStatus] = useState<PushStatus | null>(null);
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async (key: string | null) => {
    setStatus(await getPushStatus(key).catch(() => "unsupported" as const));
  }, []);

  useEffect(() => {
    getConfig()
      .then((c) => {
        setPublicKey(c.publicKey);
        return refresh(c.publicKey);
      })
      .catch(() => refresh(null));
  }, [getConfig, refresh]);

  const run = async (fn: () => Promise<unknown>) => {
    setBusy(true);
    try {
      await fn();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Не получилось");
    } finally {
      setBusy(false);
      await refresh(publicKey);
    }
  };

  if (!status) return null;

  return (
    <div className="mt-4 flex items-start gap-3 rounded-3xl bg-card p-4 shadow-[var(--shadow-card)]">
      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
        <BellRing className="h-4 w-4" />
      </span>
      <div className="min-w-0 flex-1">
        <div className="text-sm font-medium">Push-уведомления</div>
        <p className="mt-0.5 text-xs text-muted-foreground">{HINT[status]}</p>
        {(status === "off" || status === "on") && (
          <div className="mt-3 flex flex-wrap gap-2">
            {status === "off" ? (
              <Button
                size="sm"
                className="rounded-full"
                disabled={busy}
                onClick={() =>
                  run(async () => {
                    if (!publicKey) return;
                    const ok = await enablePush(publicKey);
                    if (ok) toast.success("Уведомления включены");
                  })
                }
              >
                {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Включить"}
              </Button>
            ) : (
              <>
                <Button
                  size="sm"
                  variant="outline"
                  className="rounded-full"
                  disabled={busy}
                  onClick={() =>
                    run(async () => {
                      const res = await runTest();
                      if (!res.sent)
                        toast.info("Не удалось доставить — попробуйте выключить и включить снова");
                    })
                  }
                >
                  Проверить
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="rounded-full"
                  disabled={busy}
                  onClick={() => run(disablePush)}
                >
                  Выключить
                </Button>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
