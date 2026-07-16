import { useEffect, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useApp } from "@/lib/store";
import { toast } from "sonner";

export type UnreadInfo = {
  total: number;
  byConversation: Record<string, number>;
};

/**
 * Global unread-messages tracker.
 * - Queries all unread messages for the current user.
 * - Subscribes to realtime inserts and shows a toast + browser notification
 *   whenever a message arrives for the user (unless they're viewing that convo).
 */
export function useUnreadMessages(): UnreadInfo {
  const { user } = useApp();
  const qc = useQueryClient();
  const permAsked = useRef(false);

  const q = useQuery({
    queryKey: ["unread-messages", user?.id],
    enabled: !!user,
    queryFn: async (): Promise<UnreadInfo> => {
      const { data, error } = await supabase
        .from("messages")
        .select("conversation_id, sender_id, read_at")
        .is("read_at", null)
        .neq("sender_id", user!.id);
      if (error) throw error;
      const byConversation: Record<string, number> = {};
      (data ?? []).forEach(m => {
        byConversation[m.conversation_id] = (byConversation[m.conversation_id] ?? 0) + 1;
      });
      const total = Object.values(byConversation).reduce((a, b) => a + b, 0);
      return { total, byConversation };
    },
    staleTime: 15_000,
  });

  // Ask for browser notification permission once, after user has signed in.
  useEffect(() => {
    if (!user || permAsked.current) return;
    permAsked.current = true;
    if (typeof window === "undefined" || !("Notification" in window)) return;
    if (Notification.permission === "default") {
      try { Notification.requestPermission().catch(() => {}); } catch {}
    }
  }, [user]);

  // Global realtime subscription for new messages addressed to this user.
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel(`user-messages:${user.id}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages" },
        (payload) => {
          const m = payload.new as { conversation_id: string; sender_id: string; body: string };
          if (!m || m.sender_id === user.id) return;

          // Refresh unread + conversation list
          qc.invalidateQueries({ queryKey: ["unread-messages", user.id] });
          qc.invalidateQueries({ queryKey: ["conversations", user.id] });
          qc.invalidateQueries({ queryKey: ["messages", m.conversation_id] });

          // Skip notification if user is already reading this conversation
          const path = typeof window !== "undefined" ? window.location.pathname : "";
          const isViewing = path === `/conversation/${m.conversation_id}`;
          if (isViewing) return;

          const preview = (m.body ?? "").slice(0, 120);
          toast.message("Новое сообщение", {
            description: preview,
            action: {
              label: "Открыть",
              onClick: () => { window.location.href = `/conversation/${m.conversation_id}`; },
            },
          });

          if (typeof window !== "undefined" && "Notification" in window && Notification.permission === "granted" && document.visibilityState !== "visible") {
            try {
              const n = new Notification("ReFlowers — новое сообщение", { body: preview, icon: "/favicon.ico", tag: m.conversation_id });
              n.onclick = () => { window.focus(); window.location.href = `/conversation/${m.conversation_id}`; };
            } catch {}
          }
        },
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user, qc]);

  return q.data ?? { total: 0, byConversation: {} };
}
