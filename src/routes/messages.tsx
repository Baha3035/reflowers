import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { AppLayout } from "@/components/marketplace/AppLayout";
import { supabase } from "@/integrations/supabase/client";
import { useApp } from "@/lib/store";
import { MessageCircle } from "lucide-react";

export const Route = createFileRoute("/messages")({
  head: () => ({ meta: [{ title: "Сообщения — ReFlowers" }] }),
  component: Messages,
});

function Messages() {
  const { user, authLoading } = useApp();
  const navigate = useNavigate();

  useEffect(() => {
    if (!authLoading && !user) navigate({ to: "/auth" });
  }, [user, authLoading, navigate]);

  const convs = useQuery({
    queryKey: ["conversations", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase
        .from("conversations")
        .select("id, listing_id, buyer_id, seller_id, last_message_at, created_at")
        .order("last_message_at", { ascending: false });
      return data ?? [];
    },
  });

  return (
    <AppLayout>
      <div className="mx-auto max-w-3xl px-4 py-6 md:px-8">
        <h1 className="font-display text-2xl">Сообщения</h1>
        <p className="mt-1 text-sm text-muted-foreground">Здесь появятся ваши диалоги с покупателями и продавцами.</p>

        {convs.isLoading ? (
          <div className="mt-10 text-center text-sm text-muted-foreground">Загрузка…</div>
        ) : (convs.data ?? []).length === 0 ? (
          <div className="mt-8 rounded-3xl border border-dashed border-border bg-card/60 p-10 text-center">
            <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-primary/10 text-primary">
              <MessageCircle className="h-6 w-6" />
            </div>
            <h2 className="mt-4 font-display text-lg">Пока нет сообщений</h2>
            <p className="mt-1 text-sm text-muted-foreground">Откройте объявление и напишите продавцу — диалог появится тут.</p>
            <Link to="/catalog" className="mt-5 inline-block rounded-full bg-primary px-5 py-2 text-sm font-medium text-primary-foreground">Смотреть каталог</Link>
          </div>
        ) : (
          <div className="mt-4 rounded-3xl bg-card p-2 shadow-[var(--shadow-card)]">
            {(convs.data ?? []).map(c => (
              <Link key={c.id} to="/conversation/$id" params={{ id: c.id }} className="flex items-center gap-3 rounded-2xl p-3 hover:bg-muted">
                <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-secondary font-display font-semibold text-secondary-foreground">
                  {c.listing_id.slice(0, 1).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium">Диалог по объявлению</div>
                  <div className="truncate text-xs text-muted-foreground">
                    {new Date(c.last_message_at).toLocaleString()}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
}