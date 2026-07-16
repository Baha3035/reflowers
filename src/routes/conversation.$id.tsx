import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { AppLayout } from "@/components/marketplace/AppLayout";
import { supabase } from "@/integrations/supabase/client";
import { useApp } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Send, User } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/conversation/$id")({
  head: () => ({ meta: [{ title: "Диалог — ReFlowers" }] }),
  component: ConversationPage,
});

function ConversationPage() {
  const { id } = Route.useParams();
  const { user, authLoading } = useApp();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    if (!authLoading && !user) navigate({ to: "/auth" });
  }, [user, authLoading, navigate]);

  const conv = useQuery({
    queryKey: ["conversation", id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("conversations")
        .select("id, listing_id, buyer_id, seller_id")
        .eq("id", id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const listing = useQuery({
    queryKey: ["conversation-listing", conv.data?.listing_id],
    enabled: !!conv.data?.listing_id,
    queryFn: async () => {
      const { data } = await supabase
        .from("listings")
        .select("id, title, price, images")
        .eq("id", conv.data!.listing_id)
        .maybeSingle();
      return data;
    },
  });

  const otherId = conv.data ? (conv.data.buyer_id === user?.id ? conv.data.seller_id : conv.data.buyer_id) : null;
  const other = useQuery({
    queryKey: ["conversation-other", otherId],
    enabled: !!otherId,
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("id, display_name, shop_name, seller_type, avatar_url")
        .eq("id", otherId!)
        .maybeSingle();
      return data;
    },
  });

  const messages = useQuery({
    queryKey: ["messages", id],
    enabled: !!user && !!conv.data,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("messages")
        .select("id, sender_id, body, kind, created_at")
        .eq("conversation_id", id)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });

  // Mark incoming messages as read whenever the conversation view loads or
  // new messages arrive.
  useEffect(() => {
    if (!user || !messages.data) return;
    const hasUnread = messages.data.some(m => m.sender_id !== user.id);
    if (!hasUnread) return;
    (async () => {
      const { error } = await supabase
        .from("messages")
        .update({ read_at: new Date().toISOString() })
        .eq("conversation_id", id)
        .neq("sender_id", user.id)
        .is("read_at", null);
      if (!error) {
        qc.invalidateQueries({ queryKey: ["unread-messages", user.id] });
      }
    })();
  }, [id, user, messages.data, qc]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.data]);

  useEffect(() => {
    if (!user || !conv.data) return;
    const channel = supabase
      .channel(`messages:${id}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages", filter: `conversation_id=eq.${id}` },
        () => qc.invalidateQueries({ queryKey: ["messages", id] }),
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [id, user, conv.data, qc]);

  async function send(e?: React.FormEvent) {
    e?.preventDefault();
    const body = text.trim();
    if (!body || !user) return;
    setSending(true);
    try {
      const { error } = await supabase
        .from("messages")
        .insert({ conversation_id: id, sender_id: user.id, body });
      if (error) throw error;
      setText("");
      qc.invalidateQueries({ queryKey: ["messages", id] });
      qc.invalidateQueries({ queryKey: ["conversations", user.id] });
      inputRef.current?.focus();
    } catch (err) {
      toast.error("Не удалось отправить: " + (err instanceof Error ? err.message : String(err)));
    } finally {
      setSending(false);
    }
  }

  if (authLoading || conv.isLoading) {
    return <AppLayout><div className="p-10 text-center text-sm text-muted-foreground">Загрузка…</div></AppLayout>;
  }
  if (!conv.data) {
    return (
      <AppLayout>
        <div className="mx-auto max-w-md px-4 py-16 text-center">
          <h1 className="font-display text-xl">Диалог не найден</h1>
          <Link to="/messages" className="mt-4 inline-block text-primary underline">К списку сообщений</Link>
        </div>
      </AppLayout>
    );
  }

  const otherName = other.data
    ? (other.data.seller_type === "shop" ? (other.data.shop_name || other.data.display_name) : other.data.display_name)
    : "Собеседник";

  return (
    <AppLayout hideBottomNav>
      <div className="mx-auto flex h-[calc(100dvh-64px)] max-w-3xl flex-col px-2 md:px-6">
        {/* User header */}
        <div className="mt-3 flex items-center gap-3 rounded-2xl bg-card p-3 shadow-[var(--shadow-card)]">
          <div className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-secondary overflow-hidden">
            {other.data?.avatar_url ? (
              <img src={other.data.avatar_url} alt="" className="h-full w-full object-cover" />
            ) : (
              <User className="h-6 w-6 text-secondary-foreground" />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <div className="truncate font-medium">{otherName}</div>
            {listing.data && (
              <Link to="/listing/$id" params={{ id: listing.data.id }} className="block truncate text-xs text-muted-foreground hover:text-primary">
                {listing.data.title}
              </Link>
            )}
          </div>
        </div>

        {/* Messages */}
        <div className="mt-3 flex-1 overflow-y-auto rounded-2xl bg-muted/30 p-3">
          {messages.isLoading ? (
            <div className="text-center text-sm text-muted-foreground">Загрузка сообщений…</div>
          ) : (messages.data ?? []).length === 0 ? (
            <div className="mx-auto mt-10 max-w-sm text-center text-sm text-muted-foreground">
              Напишите первое сообщение — {otherName} получит его сразу.
            </div>
          ) : (
            <div className="space-y-2">
              {(messages.data ?? []).map(m => {
                const mine = m.sender_id === user?.id;
                return (
                  <div key={m.id} className={"flex " + (mine ? "justify-end" : "justify-start")}>
                    <div className={"max-w-[80%] rounded-2xl px-3.5 py-2 text-sm " + (mine ? "bg-primary text-primary-foreground rounded-br-sm" : "bg-card rounded-bl-sm shadow-sm")}>
                      <div className="whitespace-pre-wrap break-words">{m.body}</div>
                      <div className={"mt-0.5 text-[10px] " + (mine ? "text-primary-foreground/70" : "text-muted-foreground")}>
                        {new Date(m.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </div>
                    </div>
                  </div>
                );
              })}
              <div ref={bottomRef} />
            </div>
          )}
        </div>

        {/* Composer */}
        {(() => {
          const quickReplies = [
            "Здравствуйте! Ещё актуально?",
            "Какая цена?",
            "Можно посмотреть сегодня?",
            "Где забрать?",
            "Торг уместен?",
            "Есть ещё фото?",
          ];
          return (
            <div className="mt-2 flex gap-1.5 overflow-x-auto pb-1">
              {quickReplies.map(q => (
                <button
                  key={q}
                  type="button"
                  onClick={() => { setText(q); inputRef.current?.focus(); }}
                  className="shrink-0 rounded-full bg-muted px-3 py-1.5 text-xs text-foreground/80 transition hover:bg-primary/10 hover:text-primary"
                >
                  {q}
                </button>
              ))}
            </div>
          );
        })()}
        <form onSubmit={send} className="mt-2 mb-3 flex items-end gap-2 rounded-2xl bg-card p-2 shadow-[var(--shadow-card)]">
          <textarea
            ref={inputRef}
            value={text}
            onChange={e => setText(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
            placeholder="Напишите сообщение…"
            rows={1}
            maxLength={2000}
            className="max-h-40 flex-1 resize-none bg-transparent px-2 py-2 text-sm outline-none placeholder:text-muted-foreground"
          />
          <Button type="submit" size="icon" className="rounded-full" disabled={sending || !text.trim()}>
            <Send className="h-4 w-4" />
          </Button>
        </form>
      </div>
    </AppLayout>
  );
}