import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Star, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useApp } from "@/lib/store";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

type ReviewRow = {
  id: string;
  reviewer_id: string;
  target_user_id: string;
  listing_id: string | null;
  rating: number;
  comment: string | null;
  created_at: string;
};

type ReviewerProfile = { id: string; display_name: string | null; shop_name: string | null; seller_type: string | null; avatar_url: string | null };

function displayName(p: ReviewerProfile | undefined) {
  if (!p) return "Пользователь";
  return (p.seller_type === "shop" ? (p.shop_name || p.display_name) : p.display_name) || "Пользователь";
}

export function ReviewSection({ targetUserId }: { targetUserId: string }) {
  const { user } = useApp();
  const qc = useQueryClient();
  const meId = user?.id;

  const reviews = useQuery({
    queryKey: ["reviews", targetUserId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("reviews")
        .select("id, reviewer_id, target_user_id, listing_id, rating, comment, created_at")
        .eq("target_user_id", targetUserId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as ReviewRow[];
    },
  });

  const reviewerIds = useMemo(() => [...new Set((reviews.data ?? []).map(r => r.reviewer_id))], [reviews.data]);
  const reviewers = useQuery({
    queryKey: ["review-authors", reviewerIds],
    enabled: reviewerIds.length > 0,
    queryFn: async () => {
      const { data } = await supabase
        .from("public_profiles")
        .select("id, display_name, shop_name, seller_type, avatar_url")
        .in("id", reviewerIds);
      const map = new Map<string, ReviewerProfile>();
      (data ?? []).forEach(p => map.set(p.id ?? "", p as ReviewerProfile));
      return map;
    },
  });

  // Eligibility: sold listings where I and target were on opposite sides of a conversation, minus already-reviewed.
  const eligible = useQuery({
    queryKey: ["review-eligible", meId, targetUserId],
    enabled: !!meId && meId !== targetUserId,
    queryFn: async () => {
      const { data: convs } = await supabase
        .from("conversations")
        .select("id, listing_id, buyer_id, seller_id")
        .or(`and(buyer_id.eq.${meId},seller_id.eq.${targetUserId}),and(seller_id.eq.${meId},buyer_id.eq.${targetUserId})`);
      const ids = [...new Set((convs ?? []).map(c => c.listing_id))];
      if (ids.length === 0) return [] as { id: string; title: string }[];
      const { data: sold } = await supabase
        .from("listings")
        .select("id, title, status")
        .in("id", ids)
        .eq("status", "sold");
      const { data: mine } = await supabase
        .from("reviews")
        .select("listing_id")
        .eq("reviewer_id", meId!)
        .eq("target_user_id", targetUserId);
      const done = new Set((mine ?? []).map(r => r.listing_id));
      return (sold ?? []).filter(l => !done.has(l.id)).map(l => ({ id: l.id, title: l.title }));
    },
  });

  const list = reviews.data ?? [];
  const avg = list.length ? (list.reduce((s, r) => s + r.rating, 0) / list.length) : 0;
  const canReview = !!meId && meId !== targetUserId && (eligible.data ?? []).length > 0;

  return (
    <section className="mt-8">
      <div className="flex items-baseline justify-between">
        <h2 className="font-display text-xl">Отзывы</h2>
        {list.length > 0 && (
          <span className="inline-flex items-center gap-1 text-sm text-muted-foreground">
            <Star className="h-3.5 w-3.5" style={{ fill: "var(--gold)", color: "var(--gold)" }} />
            <b className="text-foreground">{avg.toFixed(1)}</b> · {list.length}
          </span>
        )}
      </div>

      {canReview && (
        <div className="mt-3">
          <ReviewForm
            targetUserId={targetUserId}
            eligibleListings={eligible.data ?? []}
            onSubmitted={() => {
              qc.invalidateQueries({ queryKey: ["reviews", targetUserId] });
              qc.invalidateQueries({ queryKey: ["review-eligible", meId, targetUserId] });
              qc.invalidateQueries({ queryKey: ["my-profile"] });
            }}
          />
        </div>
      )}

      {reviews.isLoading ? (
        <div className="mt-4 text-center text-sm text-muted-foreground">Загрузка…</div>
      ) : list.length === 0 ? (
        <div className="mt-3 rounded-2xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
          Пока нет отзывов. Отзыв можно оставить после сделки.
        </div>
      ) : (
        <div className="mt-3 grid gap-3 md:grid-cols-2">
          {list.map(r => {
            const p = reviewers.data?.get(r.reviewer_id);
            return (
              <div key={r.id} className="rounded-2xl bg-card p-4 shadow-[var(--shadow-card)]">
                <div className="flex items-center justify-between text-sm">
                  <span className="inline-flex items-center gap-2">
                    <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-secondary text-xs font-semibold text-secondary-foreground overflow-hidden">
                      {p?.avatar_url ? <img src={p.avatar_url} alt="" className="h-full w-full object-cover" /> : displayName(p).charAt(0).toUpperCase()}
                    </span>
                    <span className="font-medium">{displayName(p)}</span>
                  </span>
                  <span className="inline-flex items-center gap-0.5 text-xs">
                    <Star className="h-3 w-3" style={{ fill: "var(--gold)", color: "var(--gold)" }} />{r.rating}
                  </span>
                </div>
                {r.comment && <p className="mt-1.5 text-sm text-foreground/80 whitespace-pre-wrap">{r.comment}</p>}
                <div className="mt-1 text-[11px] text-muted-foreground">{new Date(r.created_at).toLocaleDateString()}</div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}

function ReviewForm({
  targetUserId,
  eligibleListings,
  onSubmitted,
}: {
  targetUserId: string;
  eligibleListings: { id: string; title: string }[];
  onSubmitted: () => void;
}) {
  const { user } = useApp();
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [listingId, setListingId] = useState<string>(eligibleListings[0]?.id ?? "");
  const [submitting, setSubmitting] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !listingId) return;
    setSubmitting(true);
    try {
      const { error } = await supabase.from("reviews").insert({
        reviewer_id: user.id,
        target_user_id: targetUserId,
        listing_id: listingId,
        rating,
        comment: comment.trim() || null,
      } as never);
      if (error) throw error;
      toast.success("Спасибо за отзыв!");
      setComment("");
      setRating(5);
      onSubmitted();
    } catch (err) {
      toast.error("Не удалось отправить отзыв: " + (err instanceof Error ? err.message : String(err)));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={submit} className="rounded-2xl border border-primary/30 bg-primary/5 p-4">
      <div className="text-sm font-semibold">Оставить отзыв</div>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <span className="text-xs text-muted-foreground">Оценка:</span>
        {[1,2,3,4,5].map(n => (
          <button key={n} type="button" onClick={() => setRating(n)} className="p-0.5" aria-label={`${n} звёзд`}>
            <Star className="h-6 w-6" style={{ fill: n <= rating ? "var(--gold)" : "transparent", color: "var(--gold)" }} />
          </button>
        ))}
      </div>
      {eligibleListings.length > 1 && (
        <select
          value={listingId}
          onChange={e => setListingId(e.target.value)}
          className="mt-2 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm"
        >
          {eligibleListings.map(l => (
            <option key={l.id} value={l.id}>По сделке: {l.title}</option>
          ))}
        </select>
      )}
      <textarea
        value={comment}
        onChange={e => setComment(e.target.value)}
        placeholder="Расскажите, как прошла сделка (необязательно)"
        maxLength={500}
        rows={3}
        className="mt-2 w-full resize-none rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
      />
      <div className="mt-2 flex justify-end">
        <Button type="submit" size="sm" disabled={submitting || !listingId}>
          {submitting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Отправить"}
        </Button>
      </div>
    </form>
  );
}