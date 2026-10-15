import { createFileRoute, Link, notFound, useNavigate } from "@tanstack/react-router";
import { AppLayout } from "@/components/marketplace/AppLayout";
import { ListingCard } from "@/components/marketplace/ListingCard";
import { Button } from "@/components/ui/button";
import { LISTINGS, REVIEWS, formatSom, getListing, getSeller, type Listing } from "@/lib/mock-data";
import { mapDbListing } from "@/lib/db-listings";
import { supabase } from "@/integrations/supabase/client";
import { useApp } from "@/lib/store";
import { BadgeCheck, ChevronLeft, Clock, Heart, MapPin, MessageCircle, Share2, ShieldCheck, Star } from "lucide-react";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { toast } from "sonner";
import { useQuery } from "@tanstack/react-query";
import { ReviewSection } from "@/components/marketplace/ReviewSection";
import { useServerFn } from "@tanstack/react-start";
import { createDeal } from "@/lib/deals.functions";

export const Route = createFileRoute("/listing/$id")({
  head: ({ params }) => {
    const l = getListing(params.id);
    return { meta: [
      { title: l ? `${l.title} — ReFlowers` : "Букет — ReFlowers" },
      { name: "description", content: l?.description ?? "Букет на маркетплейсе ReFlowers." },
      ...(l ? [{ property: "og:image", content: l.image }] : []),
    ] };
  },
  loader: async ({ params }): Promise<{ listing: Listing }> => {
    const local = getListing(params.id);
    if (local) return { listing: local };
    if (/^[0-9a-f]{8}-/.test(params.id)) {
      const { data } = await supabase
        .from("listings")
        .select("id, seller_id, title, description, price, original_price, category, condition, city, district, images, status, urgent, created_at")
        .eq("id", params.id)
        .maybeSingle();
      if (data) return { listing: mapDbListing(data as never) };
    }
    throw notFound();
  },
  component: ListingPage,
  notFoundComponent: NotFound,
});

function NotFound() {
  return <AppLayout><div className="mx-auto max-w-md p-8 text-center"><h1 className="font-display text-2xl">Букет не найден</h1><Link to="/catalog" className="mt-4 inline-block text-primary underline">Вернуться в каталог</Link></div></AppLayout>;
}

function ListingPage() {
  const { listing } = Route.useLoaderData() as { listing: Listing };
  const { t } = useApp();
  const isSellerUuid = /^[0-9a-f]{8}-[0-9a-f]{4}/.test(listing.sellerId);
  const dbSeller = useQuery({
    queryKey: ["listing-seller", listing.sellerId],
    enabled: isSellerUuid,
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("id, display_name, shop_name, seller_type, avatar_url, verified, rating, reviews_count")
        .eq("id", listing.sellerId)
        .maybeSingle();
      return data;
    },
  });
  const seller = getSeller(listing.sellerId) ?? (dbSeller.data ? {
    id: dbSeller.data.id,
    type: (dbSeller.data.seller_type === "shop" ? "shop" : "private") as "shop" | "private",
    name: (dbSeller.data.seller_type === "shop" ? dbSeller.data.shop_name : dbSeller.data.display_name) || "Продавец",
    rating: Number(dbSeller.data.rating ?? 0),
    sales: 0,
    responseTime: "≈30 мин",
    memberSince: "новый",
    verified: !!dbSeller.data.verified,
    reviewsCount: dbSeller.data.reviews_count ?? 0,
  } : {
    id: listing.sellerId,
    type: "private" as const,
    name: "Продавец",
    rating: 5,
    sales: 0,
    responseTime: "≈30 мин",
    memberSince: "новый",
    verified: false,
    reviewsCount: 0,
  });
  const { favorites, toggleFavorite } = useApp();
  const { user } = useApp();
  const navigate = useNavigate();
  const fav = favorites.has(listing.id);
  const gallery = listing.gallery ?? [listing.image];
  const [idx, setIdx] = useState(0);
  const similar = LISTINGS.filter(l => l.id !== listing.id && l.flowerType === listing.flowerType).slice(0, 4);
  const [sending, setSending] = useState(false);
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}/.test(listing.id);
  const createDealFn = useServerFn(createDeal);
  const [buying, setBuying] = useState(false);
  const notActive = listing.status && listing.status !== "active";

  async function wantToBuy() {
    if (!user) { navigate({ to: "/auth" }); return; }
    if (!isUuid) { toast.info("Это демо-объявление"); return; }
    if (user.id === listing.sellerId) { toast.info("Это ваше объявление"); return; }
    if (notActive) { toast.info(listing.status === "sold" ? t("listing.sold") : t("listing.reserved")); return; }
    setBuying(true);
    try {
      const res = await createDealFn({ data: { listing_id: listing.id } });
      toast.success("Заявка отправлена продавцу");
      navigate({ to: "/conversation/$id", params: { id: res.conversation_id! } });
    } catch (e) {
      toast.error("Не удалось создать сделку: " + (e as Error).message);
    } finally {
      setBuying(false);
    }
  }

  async function startChat() {
    if (!user) { navigate({ to: "/auth" }); return; }
    if (!isUuid) { toast.info("Это демо-объявление"); return; }
    if (user.id === listing.sellerId) { toast.info("Это ваше объявление"); return; }
    if (notActive) { toast.info(listing.status === "sold" ? t("listing.sold") : t("listing.reserved")); return; }
    setSending(true);
    try {
      const { data: existing } = await supabase
        .from("conversations")
        .select("id")
        .eq("listing_id", listing.id)
        .eq("buyer_id", user.id)
        .eq("seller_id", listing.sellerId)
        .maybeSingle();
      let convId = existing?.id;
      if (!convId) {
        const { data: created, error } = await supabase
          .from("conversations")
          .insert({ listing_id: listing.id, buyer_id: user.id, seller_id: listing.sellerId })
          .select("id")
          .single();
        if (error) throw error;
        convId = created.id;
      }
      if (convId) navigate({ to: "/conversation/$id", params: { id: convId } });
    } catch (e) {
      toast.error("Не удалось открыть чат: " + (e as Error).message);
    } finally {
      setSending(false);
    }
  }
  const discount = listing.oldPrice ? Math.round((1 - listing.price / listing.oldPrice) * 100) : 0;

  return (
    <AppLayout>
      <div className="mx-auto max-w-5xl px-4 pb-32 md:px-8 md:pb-16">
        <div className="flex items-center justify-between py-3">
          <Link to="/catalog" className="inline-flex items-center gap-1 rounded-full bg-muted px-3 py-2 text-sm"><ChevronLeft className="h-4 w-4" /> Каталог</Link>
          <div className="flex gap-2">
            <button onClick={() => toggleFavorite(listing.id)} className="grid h-10 w-10 place-items-center rounded-full bg-muted"><Heart className={cn("h-4 w-4", fav && "fill-destructive text-destructive")} /></button>
            <button className="grid h-10 w-10 place-items-center rounded-full bg-muted"><Share2 className="h-4 w-4" /></button>
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <div>
            <div className="overflow-hidden rounded-3xl bg-muted">
              <img src={gallery[idx]} alt={listing.title} className="aspect-square w-full object-cover" />
            </div>
            {gallery.length > 1 && (
              <div className="mt-2 flex gap-2">
                {gallery.map((g: string, i: number) => (
                  <button key={i} onClick={() => setIdx(i)} className={cn("aspect-square w-20 overflow-hidden rounded-2xl", idx === i && "ring-2 ring-primary")}>
                    <img src={g} alt="" className="h-full w-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          <div>
            <div className="flex flex-wrap gap-1.5">
              {listing.urgent && <span className="rounded-full bg-destructive/15 px-2.5 py-1 text-[11px] font-medium text-destructive">🔥 Срочная продажа</span>}
              {listing.badge && <span className="rounded-full bg-secondary px-2.5 py-1 text-[11px] font-medium text-secondary-foreground">{listing.badge}</span>}
              <span className="rounded-full bg-accent px-2.5 py-1 text-[11px] font-medium text-accent-foreground">✓ Фото сделано сегодня</span>
            </div>
            <h1 className="mt-3 font-display text-2xl leading-tight md:text-3xl">{listing.title}</h1>
            <div className="mt-2 flex items-baseline gap-3">
              <span className="font-display text-3xl font-semibold text-primary">{formatSom(listing.price)}</span>
              {listing.oldPrice && <><span className="text-base text-muted-foreground line-through">{formatSom(listing.oldPrice)}</span><span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">-{discount}%</span></>}
            </div>
            {listing.oldPrice && <div className="mt-1 text-xs text-muted-foreground">Около {formatSom(listing.oldPrice)} в магазине</div>}

            <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
              <Info label="Свежесть" value={listing.freshness} />
              <Info label="Состояние" value="Как новый" />
              <Info label="Тип" value={listing.flowerType} />
              <Info label="Цвет" value={listing.color} />
              <Info label="Размер" value={listing.size} />
              {listing.count && <Info label="Количество" value={`${listing.count} шт.`} />}
              <Info label="Район" value={listing.district} icon={<MapPin className="h-3.5 w-3.5" />} />
              <Info label="Встреча" value="Согласуется в чате" />
            </div>

            {listing.hoursLeft && (
              <div className="mt-3 flex items-center gap-2 rounded-2xl bg-destructive/8 p-3 text-sm text-destructive">
                <Clock className="h-4 w-4" /> Объявление исчезнет через {listing.hoursLeft} ч
              </div>
            )}

            {listing.reason && (
              <div className="mt-3 rounded-2xl bg-muted p-3 text-sm">
                <span className="text-muted-foreground">Причина продажи: </span><b>{listing.reason}</b>
              </div>
            )}

            {listing.description && (
              <div className="mt-4">
                <h3 className="mb-1 text-sm font-semibold">{t("listing.description")}</h3>
                <p className="text-sm text-foreground/80 leading-relaxed">{listing.description}</p>
              </div>
            )}

            {/* Seller */}
            <Link to="/shop/$id" params={{ id: seller.id }} className="mt-5 flex items-center gap-3 rounded-3xl bg-card p-3 shadow-[var(--shadow-card)]">
              <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-secondary font-display text-lg font-semibold text-secondary-foreground">{seller.name.charAt(0)}</div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1">
                  <span className="font-medium">{seller.name}</span>
                  {seller.verified && <BadgeCheck className="h-4 w-4 text-primary" />}
                </div>
                <div className="mt-0.5 flex items-center gap-2 text-xs text-muted-foreground">
                  <span className="inline-flex items-center gap-0.5"><Star className="h-3 w-3" style={{ fill: "var(--gold)", color: "var(--gold)" }} />{seller.rating}</span>
                  <span>· {seller.sales} продаж</span>
                  <span>· отвечает {seller.responseTime}</span>
                </div>
              </div>
              <span className="text-xs text-muted-foreground">Открыть →</span>
            </Link>

            {/* Trust */}
            <div className="mt-3 flex flex-wrap gap-1.5 text-[11px]">
              <TrustBadge icon={<ShieldCheck className="h-3 w-3" />} label="Номер подтверждён" />
              <TrustBadge label="Быстро отвечает" />
              <TrustBadge label="Безопасная сделка" />
            </div>

            {notActive ? (
              <div className="mt-5 rounded-2xl border border-destructive/30 bg-destructive/5 p-4 text-center text-sm font-medium text-destructive">
                {listing.status === "sold" ? t("listing.sold") : t("listing.reserved")}
              </div>
            ) : (
              <>
                {/* Desktop actions */}
                <div className="mt-5 hidden gap-2 md:flex">
                  <Button size="lg" onClick={wantToBuy} disabled={buying} className="flex-1 w-full rounded-full">{buying ? "…" : t("listing.wantToBuy")}</Button>
                  <Button size="lg" variant="secondary" onClick={startChat} disabled={sending} className="flex-1 w-full rounded-full"><MessageCircle className="h-4 w-4" /> {sending ? "…" : t("listing.message")}</Button>
                </div>
                <div className="mt-2 hidden text-[11px] text-muted-foreground md:block">
                  {t("listing.paymentNotice")}
                </div>
              </>
            )}
          </div>
        </div>

        {/* Reviews */}
        {isSellerUuid ? (
          <ReviewSection targetUserId={listing.sellerId} />
        ) : (
          <section className="mt-10">
            <h2 className="font-display text-xl">{t("listing.reviews")}</h2>
            <div className="mt-3 grid gap-3 md:grid-cols-2">
              {REVIEWS.slice(0, 4).map(r => (
                <div key={r.id} className="rounded-2xl bg-card p-4 shadow-[var(--shadow-card)]">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium">{r.author}</span>
                    <span className="inline-flex items-center gap-0.5 text-xs"><Star className="h-3 w-3" style={{ fill: "var(--gold)", color: "var(--gold)" }} />{r.rating}</span>
                  </div>
                  <p className="mt-1.5 text-sm text-foreground/80">{r.text}</p>
                  <div className="mt-1 text-[11px] text-muted-foreground">{r.date}</div>
                </div>
              ))}
            </div>
          </section>
        )}

        <section className="mt-10">
          <h2 className="font-display text-xl">{t("listing.similar")}</h2>
          <div className="mt-3 grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-5">
            {similar.map(l => <ListingCard key={l.id} listing={l} />)}
          </div>
        </section>
      </div>

      {/* Sticky mobile action bar */}
      {!notActive && (
        <div className="fixed bottom-[72px] left-0 right-0 z-30 border-t border-border/60 bg-background/95 backdrop-blur-md md:hidden">
          <div className="mx-auto flex max-w-md gap-2 p-3">
            <Button variant="secondary" onClick={startChat} disabled={sending} className="flex-1 w-full rounded-full"><MessageCircle className="h-4 w-4" /> {sending ? "…" : t("listing.message")}</Button>
            <Button onClick={wantToBuy} disabled={buying} className="flex-[1.4] w-full rounded-full">{buying ? "…" : `${t("listing.wantToBuy")} · ${formatSom(listing.price)}`}</Button>
          </div>
        </div>
      )}
    </AppLayout>
  );
}

function Info({ label, value, icon }: { label: string; value: string; icon?: React.ReactNode }) {
  return (
    <div className="rounded-2xl bg-muted p-3">
      <div className="text-[11px] text-muted-foreground">{label}</div>
      <div className="mt-0.5 inline-flex items-center gap-1 font-medium text-foreground">{icon}{value}</div>
    </div>
  );
}
function TrustBadge({ label, icon }: { label: string; icon?: React.ReactNode }) {
  return <span className="inline-flex items-center gap-1 rounded-full bg-accent px-2.5 py-1 text-accent-foreground">{icon}{label}</span>;
}