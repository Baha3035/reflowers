import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";

import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";
import { AppProvider } from "../lib/store";
import { Toaster } from "@/components/ui/sonner";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}

const RECOVERY_FLAG = "reflowers-client-recovery-v1";

function getErrorText(error: unknown) {
  if (error instanceof Error) return `${error.name} ${error.message} ${error.stack ?? ""}`;
  return String(error ?? "");
}

function isChunkLoadError(error: unknown) {
  const text = getErrorText(error).toLowerCase();
  return [
    "chunkloaderror",
    "loading chunk",
    "failed to fetch dynamically imported module",
    "error loading dynamically imported module",
    "importing a module script failed",
    "module script",
  ].some(pattern => text.includes(pattern));
}

async function clearRuntimeCache(clearLocalData = false) {
  if (typeof window === "undefined") return;

  try {
    if ("caches" in window) {
      const keys = await window.caches.keys();
      await Promise.all(keys.map(key => window.caches.delete(key)));
    }
  } catch {}

  if (clearLocalData) {
    try { window.localStorage.clear(); } catch {}
  } else {
    try {
      window.localStorage.removeItem("gm_favs");
      window.localStorage.removeItem("gm_lang");
      window.localStorage.removeItem("gm_city");
    } catch {}
  }
}

function reloadFresh() {
  if (typeof window === "undefined") return;
  const url = new URL(window.location.href);
  url.searchParams.set("refresh", String(Date.now()));
  window.location.replace(url.toString());
}

function ClientErrorRecovery() {
  useEffect(() => {
    const recover = (error: unknown) => {
      if (!isChunkLoadError(error)) return;
      try {
        if (window.sessionStorage.getItem(RECOVERY_FLAG)) return;
        window.sessionStorage.setItem(RECOVERY_FLAG, "chunk");
      } catch {}
      void clearRuntimeCache(false).finally(reloadFresh);
    };

    const onError = (event: ErrorEvent) => recover(event.error ?? event.message);
    const onRejection = (event: PromiseRejectionEvent) => recover(event.reason);

    window.addEventListener("error", onError);
    window.addEventListener("unhandledrejection", onRejection);
    return () => {
      window.removeEventListener("error", onError);
      window.removeEventListener("unhandledrejection", onRejection);
    };
  }, []);

  return null;
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });

    if (typeof window === "undefined" || !isChunkLoadError(error)) return;
    try {
      if (window.sessionStorage.getItem(RECOVERY_FLAG)) return;
      window.sessionStorage.setItem(RECOVERY_FLAG, "boundary");
    } catch {}
    void clearRuntimeCache(false).finally(reloadFresh);
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          Страница не загрузилась
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Обновите приложение. Если ошибка повторяется, сбросьте локальный кэш этой страницы.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              void clearRuntimeCache(false).finally(() => {
                router.invalidate();
                reset();
                reloadFresh();
              });
            }}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Обновить
          </button>
          <button
            onClick={() => {
              void clearRuntimeCache(true).finally(reloadFresh);
            }}
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            Сбросить кэш
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            На главную
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "ReFlowers — маркетплейс цветов в Бишкеке" },
      { name: "description", content: "Покупайте букеты дешевле, продавайте ненужные цветы или заказывайте новые у проверенных магазинов Бишкека." },
      { name: "author", content: "ReFlowers" },
      { property: "og:title", content: "ReFlowers — маркетплейс цветов в Бишкеке" },
      { property: "og:description", content: "Покупайте букеты дешевле, продавайте ненужные цветы или заказывайте новые у проверенных магазинов Бишкека." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:site", content: "@Lovable" },
      { name: "twitter:title", content: "ReFlowers — маркетплейс цветов в Бишкеке" },
      { name: "twitter:description", content: "Покупайте букеты дешевле, продавайте ненужные цветы или заказывайте новые у проверенных магазинов Бишкека." },
      { property: "og:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/cfe6ab14-254f-49e4-889f-6827bd0aacae/id-preview-cac22ce8--4ab0411c-3807-447f-aa66-99750f9fb580.lovable.app-1784184614515.png" },
      { name: "twitter:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/cfe6ab14-254f-49e4-889f-6827bd0aacae/id-preview-cac22ce8--4ab0411c-3807-447f-aa66-99750f9fb580.lovable.app-1784184614515.png" },
    ],
    links: [
      {
        rel: "stylesheet",
        href: appCss,
      },
      { rel: "icon", href: "/favicon.ico", type: "image/x-icon" },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();

  return (
    <QueryClientProvider client={queryClient}>
      <AppProvider>
        <ClientErrorRecovery />
        <Outlet />
        <Toaster position="top-center" />
      </AppProvider>
    </QueryClientProvider>
  );
}
