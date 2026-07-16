import { useEffect, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useApp } from "@/lib/store";
import { toast } from "sonner";
import { useRouterState } from "@tanstack/react-router";

export type UnreadRow = { id: string; conversation_id: string; sender_id: string };

export function useUnreadMessages() {
  const { user } = useApp();
  const qc = useQueryClient();
  const pathname = useRouterState({ select: s => s.location.pathname });

  const query = useQuery({
    queryKey: ["unread-messages", user?.id],
    enabled: !!user,
    queryFn: async (): Promise<UnreadRow[]> => {
      const { data, error } = await supabase
        .from("messages")
        .select("id, conversation_id, sender_id")
        .is("read_at", null)
        .neq("sender_id", user!.id);
      if (error) throw error;
      return data ?? [];
    },
  });

  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel(`unread-messages:${user.id}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages" },
        (payload) => {
          const row = payload.new as { sender_id: string; conversation_id: string; body: string };
          if (row.sender_id === user.id) return;
          qc.invalidateQueries({ queryKey: ["unread-messages", user.id] });
          qc.invalidateQueries({ queryKey: ["conversations", user.id] });
          const openConv = pathname.startsWith("/conversation/") ? pathname.split("/")[2] : null;
          if (openConv !== row.conversation_id) {
            toast("Новое сообщение", {
              description: row.body?.slice(0, 80) ?? "",
              action: { label: "Открыть", onClick: () => { window.location.href = `/conversation/${row.conversation_id}`; } },
            });
          }
        },
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user, qc, pathname]);

  const total = query.data?.length ?? 0;
  const byConversation = useMemo(() => {
    const map = new Map<string, number>();
    (query.data ?? []).forEach(r => map.set(r.conversation_id, (map.get(r.conversation_id) ?? 0) + 1));
    return map;
  }, [query.data]);

  return { total, byConversation, refetch: query.refetch };
}