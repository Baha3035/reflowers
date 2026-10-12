import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { AppLayout } from "@/components/marketplace/AppLayout";
import { supabase } from "@/integrations/supabase/client";
import { useApp } from "@/lib/store";
import { Bell } from "lucide-react";
import { PushToggle } from "@/components/marketplace/PushToggle";

export const Route = createFileRoute("/notifications")({
  head: () => ({ meta: [{ title: "Уведомления — ReFlowers" }] }),
  component: Notifications,
});

type Notif = {
  id: string;
  type: string;
  title: string;
  body: string | null;
  order_id: string | null;
  listing_id: string | null;
  conversation_id: string | null;
  read_at: string | null;
  created_at: string;
};

function timeAgo(iso: string) {
  const d = (Date.now() - new Date(iso).getTime()) / 1000;
  if (d < 60) return "только что";
  if (d < 3600) return `${Math.floor(d / 60)} мин`;
  if (d < 86400) return `${Math.floor(d / 3600)} ч`;
  return `${Math.floor(d / 86400)} дн`;
}

function Notifications() {
  const { user, authLoading } = useApp();
  const navigate = useNavigate();
  const qc = useQueryClient();

  useEffect(() => { if (!authLoading && !user) navigate({ to: "/auth", search: { redirect: "/notifications" } }); }, [user, authLoading, navigate]);

  const notifs = useQuery({
    queryKey: ["notifications", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await (supabase as never as { from: (t: string) => { select: (c: string) => { order: (col: string, opts: { ascending: boolean }) => { limit: (n: number) => Promise<{ data: Notif[] | null; error: unknown }> } } } })
        .from("notifications")
        .select("id, type, title, body, order_id, listing_id, conversation_id, read_at, created_at")
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return (data ?? []) as Notif[];
    },
  });

  // Realtime
  useEffect(() => {
    if (!user) return;
    const ch = supabase
      .channel(`notifs:${user.id}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${user.id}` },
        () => qc.invalidateQueries({ queryKey: ["notifications", user.id] }))
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [user, qc]);

  // Mark all as read on view
  useEffect(() => {
    if (!user || !notifs.data) return;
    const unread = notifs.data.filter(n => !n.read_at).map(n => n.id);
    if (unread.length === 0) return;
    (async () => {
      await (supabase as never as { from: (t: string) => { update: (v: { read_at: string }) => { in: (col: string, arr: string[]) => Promise<unknown> } } })
        .from("notifications")
        .update({ read_at: new Date().toISOString() })
        .in("id", unread);
    })();
  }, [user, notifs.data]);

  return (
    <AppLayout>
      <div className="mx-auto max-w-2xl px-4 py-6 md:px-8">
        <h1 className="font-display text-2xl">Уведомления</h1>
        <PushToggle />
        {notifs.isLoading ? (
          <div className="mt-6 text-center text-sm text-muted-foreground">Загрузка…</div>
        ) : (notifs.data ?? []).length === 0 ? (
          <div className="mt-6 rounded-3xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
            <Bell className="mx-auto mb-2 h-6 w-6 opacity-60" />
            Пока нет уведомлений
          </div>
        ) : (
          <div className="mt-4 divide-y divide-border rounded-3xl bg-card shadow-[var(--shadow-card)]">
            {(notifs.data ?? []).map(n => {
              const inner = (
                <div className={"flex items-start gap-3 p-4 " + (!n.read_at ? "bg-primary/5" : "")}>
                  <div className="mt-1 h-2 w-2 shrink-0 rounded-full" style={{ background: !n.read_at ? "hsl(var(--primary))" : "transparent" }} />
                  <div className="flex-1">
                    <div className="text-sm font-medium">{n.title}</div>
                    {n.body && <div className="mt-0.5 text-xs text-muted-foreground">{n.body}</div>}
                  </div>
                  <div className="text-[11px] text-muted-foreground">{timeAgo(n.created_at)}</div>
                </div>
              );
              if (n.conversation_id) {
                return <Link key={n.id} to="/conversation/$id" params={{ id: n.conversation_id }}>{inner}</Link>;
              }
              return <div key={n.id}>{inner}</div>;
            })}
          </div>
        )}
      </div>
    </AppLayout>
  );
}