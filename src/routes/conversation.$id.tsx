import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { AppLayout } from "@/components/marketplace/AppLayout";
import { supabase } from "@/integrations/supabase/client";
import { useApp } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Send, User, ImagePlus, Loader2, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";
import { analyzeBouquet } from "@/lib/analyze-bouquet.functions";
import { flushPush } from "@/lib/push.functions";
import { DealCard } from "@/components/marketplace/DealCard";
import { SafeImagePreview } from "@/components/marketplace/SafeAttachment";

export const Route = createFileRoute("/conversation/$id")({
  head: () => ({ meta: [{ title: "Диалог — ReFlowers" }] }),
  component: ConversationPage,
});

function ConversationPage() {
  const { id } = Route.useParams();
  const { user, authLoading, t } = useApp();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLTextAreaElement | null>(null);
  const photoInputRef = useRef<HTMLInputElement | null>(null);
  const runAnalyze = useServerFn(analyzeBouquet);
  const [photoError, setPhotoError] = useState<string | null>(null);

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
        .select("id, sender_id, body, kind, meta, created_at")
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
      flushPush().catch(() => {});
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

  async function sendPhoto(file: File) {
    if (!user) return;
    if (!file.type.startsWith("image/")) { toast.error("Нужен файл-изображение"); return; }
    if (file.size > 10 * 1024 * 1024) { toast.error("Больше 10 МБ"); return; }
    setUploadingPhoto(true);
    setPhotoError(null);
    try {
      const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
      const path = `${user.id}/${id}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
      const { error: upErr } = await supabase.storage.from("chat-photos").upload(path, file, {
        contentType: file.type, upsert: false,
      });
      if (upErr) throw upErr;
      const { data: signed } = await supabase.storage.from("chat-photos").createSignedUrl(path, 60 * 60 * 24 * 365);
      if (!signed?.signedUrl) throw new Error("Не удалось получить ссылку");

      // Smart check: only allow bouquet/flower photos in chat.
      try {
        const check = await runAnalyze({ data: { images: [signed.signedUrl] } });
        if (!check.isBouquet) {
          await supabase.storage.from("chat-photos").remove([path]);
          const msg = check.reason || "Похоже, на фото не букет. Отправляйте только фото цветов.";
          setPhotoError(msg);
          toast.error(msg);
          return;
        }
      } catch {
        // If AI check fails, allow the photo to go through (do not block on infra errors).
      }

      const { error } = await supabase
        .from("messages")
        .insert({
          conversation_id: id,
          sender_id: user.id,
          body: null,
          kind: "image" as never,
          meta: { url: signed.signedUrl, path } as never,
        });
      if (error) throw error;
      flushPush().catch(() => {});
      qc.invalidateQueries({ queryKey: ["messages", id] });
      qc.invalidateQueries({ queryKey: ["conversations", user.id] });
    } catch (err) {
      toast.error("Не удалось отправить фото: " + (err instanceof Error ? err.message : String(err)));
    } finally {
      setUploadingPhoto(false);
      if (photoInputRef.current) photoInputRef.current.value = "";
    }
  }

  if (authLoading || conv.isLoading) {
    return <AppLayout><div className="p-10 text-center text-sm text-muted-foreground">{t("conv.loading")}</div></AppLayout>;
  }
  if (!conv.data) {
    return (
      <AppLayout>
        <div className="mx-auto max-w-md px-4 py-16 text-center">
          <h1 className="font-display text-xl">{t("conv.notFound")}</h1>
          <Link to="/messages" className="mt-4 inline-block text-primary underline">{t("conv.toList")}</Link>
        </div>
      </AppLayout>
    );
  }

  const otherName = other.data
    ? (other.data.seller_type === "shop" ? (other.data.shop_name || other.data.display_name) : other.data.display_name)
    : "Собеседник";

  return (
    <AppLayout hideBottomNav>
      <div className="mx-auto flex h-[calc(100dvh-58px)] w-full max-w-3xl min-w-0 flex-col overflow-hidden px-2 md:h-[calc(100dvh-64px)] md:px-6">
        {/* User header */}
        <div className="mt-3 flex min-w-0 items-center gap-3 rounded-2xl bg-card p-3 shadow-[var(--shadow-card)]">
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
        <div className="mt-3 min-h-0 flex-1 overflow-y-auto rounded-2xl bg-muted/30 p-3">
          <DealCard conversationId={id} />
          {messages.isLoading ? (
            <div className="text-center text-sm text-muted-foreground">{t("conv.loadingMsg")}</div>
          ) : (messages.data ?? []).length === 0 ? (
            <div className="mx-auto mt-10 max-w-sm text-center text-sm text-muted-foreground">
              {t("conv.empty").replace("{name}", otherName ?? "")}
            </div>
          ) : (
            <div className="space-y-2">
              {(messages.data ?? []).map(m => {
                const mine = m.sender_id === user?.id;
                const isImage = m.kind === "image";
                const imgUrl = isImage ? (m.meta as { url?: string } | null)?.url : undefined;
                return (
                  <div key={m.id} className={"flex " + (mine ? "justify-end" : "justify-start")}>
                    <div className={"max-w-[80%] min-w-0 rounded-2xl text-sm " + (isImage ? "overflow-hidden p-1 " : "px-3.5 py-2 ") + (mine ? "bg-primary text-primary-foreground rounded-br-sm" : "bg-card rounded-bl-sm shadow-sm")}>
                      {isImage && imgUrl ? (
                        <SafeImagePreview url={imgUrl} alt="Фото" imageClassName="max-h-72 w-full rounded-xl object-cover" />
                      ) : (
                        <div className="whitespace-pre-wrap break-words">{m.body}</div>
                      )}
                      <div className={"mt-0.5 px-1 text-[10px] " + (mine ? "text-primary-foreground/70" : "text-muted-foreground")}>
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
            t("conv.q1"), t("conv.q2"), t("conv.q3"), t("conv.q4"), t("conv.q5"), t("conv.q6"),
          ];
          return (
            <div className="mt-2 flex flex-wrap gap-1.5 pb-1">
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
        {photoError && (
          <div className="mt-2 flex items-start gap-1.5 rounded-2xl border border-destructive/40 bg-destructive/5 p-2 text-[12px] text-destructive">
            <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            <span className="min-w-0 flex-1">{photoError}</span>
            <button type="button" onClick={() => setPhotoError(null)} className="text-[11px] underline">Скрыть</button>
          </div>
        )}
        <form onSubmit={send} className="mt-2 mb-2 flex w-full min-w-0 shrink-0 items-end gap-1.5 rounded-2xl bg-card p-2 shadow-[var(--shadow-card)]">
          <input
            ref={photoInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={e => { const f = e.target.files?.[0]; if (f) sendPhoto(f); }}
          />
          <Button
            type="button"
            size="icon"
            variant="ghost"
            className="shrink-0 rounded-full"
            onClick={() => photoInputRef.current?.click()}
            disabled={uploadingPhoto}
            aria-label={t("conv.attach")}
          >
            {uploadingPhoto ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImagePlus className="h-4 w-4" />}
          </Button>
          <textarea
            ref={inputRef}
            value={text}
            onChange={e => setText(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
            placeholder={t("conv.placeholder")}
            rows={1}
            maxLength={2000}
            className="max-h-40 w-full min-w-0 flex-1 resize-none bg-transparent px-2 py-2 text-sm outline-none placeholder:text-muted-foreground"
          />
          <Button type="submit" size="icon" className="shrink-0 rounded-full" disabled={sending || !text.trim()}>
            <Send className="h-4 w-4" />
          </Button>
        </form>
      </div>
    </AppLayout>
  );
}