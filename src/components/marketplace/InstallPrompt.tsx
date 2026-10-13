import { useEffect, useState } from "react";
import { Share, X } from "lucide-react";
import { useApp } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { isIos, isStandalone } from "@/lib/pwa";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

const DISMISS_KEY = "rf-install-dismissed-at";
const DISMISS_DAYS = 14;
const SHOW_AFTER_MS = 15_000;

function recentlyDismissed() {
  try {
    const at = Number(localStorage.getItem(DISMISS_KEY) || 0);
    return Date.now() - at < DISMISS_DAYS * 86_400_000;
  } catch {
    return false;
  }
}

// beforeinstallprompt fires once per page load, but every route mounts its own AppLayout
// (and so its own InstallPrompt). Keep the event and the load time at module level so the
// banner survives client-side navigation.
let savedPrompt: BeforeInstallPromptEvent | null = null;
const loadedAt = Date.now();
if (typeof window !== "undefined") {
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    savedPrompt = e as BeforeInstallPromptEvent;
    window.dispatchEvent(new Event("rf-installable"));
  });
}

// "Add to home screen" banner: Chrome/Android uses the native prompt, iOS Safari gets
// instructions (it has no install API). Hidden once installed or for 14 days after "Not now".
export function InstallPrompt({ aboveBottomNav = true }: { aboveBottomNav?: boolean }) {
  const { t } = useApp();
  const [mode, setMode] = useState<"native" | "ios" | null>(null);

  useEffect(() => {
    if (isStandalone() || recentlyDismissed()) return;
    const show = () => setMode(savedPrompt ? "native" : isIos() ? "ios" : null);
    const timer = window.setTimeout(show, Math.max(0, loadedAt + SHOW_AFTER_MS - Date.now()));
    const onInstallable = () => {
      if (Date.now() - loadedAt >= SHOW_AFTER_MS) show();
    };
    window.addEventListener("rf-installable", onInstallable);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("rf-installable", onInstallable);
    };
  }, []);

  const dismiss = () => {
    try {
      localStorage.setItem(DISMISS_KEY, String(Date.now()));
    } catch {
      /* storage unavailable */
    }
    setMode(null);
  };

  const install = async () => {
    if (!savedPrompt) return;
    await savedPrompt.prompt();
    await savedPrompt.userChoice.catch(() => null);
    savedPrompt = null;
    setMode(null);
  };

  if (!mode) return null;

  return (
    <div
      className={
        "fixed inset-x-3 z-50 mx-auto max-w-md rounded-3xl border border-border bg-card p-4 shadow-lg md:bottom-6 " +
        (aboveBottomNav ? "bottom-24" : "bottom-4")
      }
      role="dialog"
      aria-label={t("pwa.installTitle")}
    >
      <div className="flex items-start gap-3">
        <img src="/icons/icon-192.png" alt="" className="h-11 w-11 shrink-0 rounded-2xl" />
        <div className="min-w-0 flex-1">
          <div className="font-display text-base font-semibold">{t("pwa.installTitle")}</div>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {mode === "ios" ? (
              <>
                <Share className="mr-1 inline h-3.5 w-3.5 align-text-bottom" />
                {t("pwa.installIos")}
              </>
            ) : (
              t("pwa.installDesc")
            )}
          </p>
        </div>
        <button
          onClick={dismiss}
          aria-label={t("pwa.later")}
          className="text-muted-foreground hover:text-foreground"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
      {mode === "native" && (
        <div className="mt-3 flex justify-end gap-2">
          <Button variant="ghost" size="sm" className="rounded-full" onClick={dismiss}>
            {t("pwa.later")}
          </Button>
          <Button size="sm" className="rounded-full" onClick={install}>
            {t("pwa.install")}
          </Button>
        </div>
      )}
    </div>
  );
}
