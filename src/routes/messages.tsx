import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { AppLayout } from "@/components/marketplace/AppLayout";
import { supabase } from "@/integrations/supabase/client";
import { useApp } from "@/lib/store";
import { MessageCircle, User } from "lucide-react";
import { useUnreadMessages } from "@/hooks/use-unread-messages";

export const Route = createFileRoute("/messages")({
  head: () => ({ meta: [{ title: "Сообщения — ReFlowers" }] }),
  component: Messages,
});

function Messages() {
  const { user, authLoading } = useApp();
  const navigate = useNavigate();
  const unread = useUnreadMessages();

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

  const otherIds = useMemo(() => {
    if (!user || !convs.data) return [];
    return [...new Set(convs.data.map(c => (c.buyer_id === user.id ? c.seller_id : c.buyer_id)))];
  }, [convs.data, user]);

  const profiles = useQuery({
    queryKey: ["conversation-profiles", otherIds],
    enabled: otherIds.length > 0,
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("id, display_name, shop_name, seller_type, avatar_url")
        .in("id", otherIds);
      const map = new Map<string, NonNullable<typeof data>[number]>();
      (data ?? []).forEach(p => map.set(p.id, p));
      return map;
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
            {(convs.data ?? []).map(c => {
              const otherId = user?.id === c.buyer_id ? c.seller_id : c.buyer_id;
              const p = profiles.data?.get(otherId);
              const name = p
                ? (p.seller_type === "shop" ? (p.shop_name || p.display_name) : p.display_name)
                : "Собеседник";
              const count = unread.byConversation[c.id] ?? 0;
              return (
                <Link key={c.id} to="/conversation/$id" params={{ id: c.id }} className="flex items-center gap-3 rounded-2xl p-3 hover:bg-muted">
                  <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-secondary overflow-hidden">
                    {p?.avatar_url ? (
                      <img src={p.avatar_url} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <User className="h-5 w-5 text-secondary-foreground" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <div className={"truncate " + (count > 0 ? "font-semibold" : "font-medium")}>{name}</div>
                      <div className="flex shrink-0 items-center gap-2">
                        <span className="text-[11px] text-muted-foreground">
                          {new Date(c.last_message_at).toLocaleDateString()}
                        </span>
                        {count > 0 && (
                          <span className="grid h-5 min-w-5 place-items-center rounded-full bg-primary px-1.5 text-[10px] font-semibold text-primary-foreground">
                            {count > 99 ? "99+" : count}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className={"truncate text-xs " + (count > 0 ? "text-foreground/80" : "text-muted-foreground")}>
                      {count > 0 ? `${count} новых сообщений` : "Открыть диалог"}
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
