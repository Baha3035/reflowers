import { createFileRoute, Link, notFound, useNavigate } from "@tanstack/react-router";
import { AppLayout } from "@/components/marketplace/AppLayout";
import { ListingCard } from "@/components/marketplace/ListingCard";
import { Button } from "@/components/ui/button";
import { UUID_RE, formatSom, postedAgo } from "@/lib/marketplace";
import { LISTING_COLUMNS, mapDbListing, fetchSellers, useDbListings, type DbListing } from "@/lib/db-listings";
import { supabase } from "@/integrations/supabase/client";
import { useApp } from "@/lib/store";
import { BadgeCheck, ChevronLeft, Clock, Heart, MapPin, MessageCircle, Share2, Star } from "lucide-react";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { toast } from "sonner";
import { ReviewSection } from "@/components/marketplace/ReviewSection";
import { SellerContactButtons } from "@/components/marketplace/SellerContacts";
import { useServerFn } from "@tanstack/react-start";
import { createDeal } from "@/lib/deals.functions";

const MONTHS = ["января", "февраля", "марта", "апреля", "мая", "июня", "июля", "августа", "сентября", "октября", "ноября", "декабря"];

export const Route = createFileRoute("/listing/$id")({
  loader: async ({ params }) => {
    if (!UUID_RE.test(params.id)) throw notFound();
    const { data } = await supabase.from("listings").select(LISTING_COLUMNS).eq("id", params.id).maybeSingle();
    if (!data) throw notFound();
    const row = data as DbListing;
    const sellers = await fetchSellers([row.seller_id]);
    return { listing: mapDbListing(row, sellers.get(row.seller_id)) };
  },
  // Rendered on the server, so Telegram/WhatsApp link previews show this bouquet.
  head: ({ loaderData }) => {
    const l = loaderData?.listing;
    if (!l) return { meta: [{ title: "Букет — ReFlowers" }] };
    const title = `${l.title} — ${formatSom(l.price)}`;
    const description = [l.district, l.description].filter(Boolean).join(" · ") || "Букет на ReFlowers, Бишкек";
    return {
      meta: [
        { title: `${title} | ReFlowers` },
        { name: "description", content: description },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
        { property: "og:image", content: l.image },
        { property: "og:type", content: "product" },
        { name: "twitter:title", content: title },
        { name: "twitter:description", content: description },
        { name: "twitter:image", content: l.image },
      ],
    };
  },
  component: ListingPage,
  notFoundComponent: NotFound,
});

function NotFound() {
  return (
    <AppLayout>
      <div className="mx-auto max-w-md p-8 text-center">
        <h1 className="font-display text-2xl">Букет не найден</h1>
        <p className="mt-2 text-sm text-muted-foreground">Возможно, его уже продали или объявление истекло.</p>
        <Link to="/catalog" className="mt-4 inline-block text-primary underline">Смотреть другие букеты</Link>
      </div>
    </AppLayout>
  );
}

function ListingPage() {
  const { listing } = Route.useLoaderData();
  const { t, favorites, toggleFavorite, user } = useApp();
  const seller = listing.seller;
  const navigate = useNavigate();
  const fav = favorites.has(listing.id);
  const gallery = listing.gallery;
  const [idx, setIdx] = useState(0);
  const { data: feed = [] } = useDbListings();
  const similar = feed.filter((l) => l.id !== listing.id).slice(0, 4);
  const [sending, setSending] = useState(false);
  const createDealFn = useServerFn(createDeal);
  const [buying, setBuying] = useState(false);
  const expired = listing.status === "active" && listing.hoursLeft === 0;
  const notActive = listing.status !== "active" || expired;
  const inactiveLabel = expired
    ? "Объявление истекло"
    : listing.status === "sold"
      ? t("listing.sold")
      : t("listing.reserved");
  const loginFirst = () => navigate({ to: "/auth", search: { redirect: `/listing/${listing.id}` } });

  async function share() {
    const url = window.location.href;
    const text = `${listing.title} — ${formatSom(listing.price)}`;
    try {
      if (navigator.share) {
        await navigator.share({ title: text, text, url });
        return;
      }
      await navigator.clipboard.writeText(url);
      toast.success("Ссылка скопирована");
    } catch {
      /* user closed the share sheet */
    }
  }

  async function wantToBuy() {
    if (!user) return loginFirst();
    if (user.id === listing.sellerId) { toast.info("Это ваше объявление"); return; }
    if (notActive) { toast.info(inactiveLabel); return; }
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
    if (!user) return loginFirst();
    if (user.id === listing.sellerId) { toast.info("Это ваше объявление"); return; }
    if (notActive) { toast.info(inactiveLabel); return; }
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
  const memberSince = seller?.createdAt ? new Date(seller.createdAt) : null;

  return (
    <AppLayout>
      <div className="mx-auto max-w-5xl px-4 pb-32 md:px-8 md:pb-16">
        <div className="flex items-center justify-between py-3">
          <Link to="/catalog" className="inline-flex items-center gap-1 rounded-full bg-muted px-3 py-2 text-sm"><ChevronLeft className="h-4 w-4" /> Каталог</Link>
          <div className="flex gap-2">
            <button onClick={() => toggleFavorite(listing.id)} aria-label="В избранное" className="grid h-10 w-10 place-items-center rounded-full bg-muted"><Heart className={cn("h-4 w-4", fav && "fill-destructive text-destructive")} /></button>
            <button onClick={share} aria-label="Поделиться" className="grid h-10 w-10 place-items-center rounded-full bg-muted"><Share2 className="h-4 w-4" /></button>
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
            {listing.urgent && (
              <div className="flex flex-wrap gap-1.5">
                <span className="rounded-full bg-destructive/15 px-2.5 py-1 text-[11px] font-medium text-destructive">🔥 Срочная продажа</span>
              </div>
            )}
            <h1 className="mt-3 font-display text-2xl leading-tight md:text-3xl">{listing.title}</h1>
            <div className="mt-2 flex items-baseline gap-3">
              <span className="font-display text-3xl font-semibold text-primary">{formatSom(listing.price)}</span>
              {listing.oldPrice && <><span className="text-base text-muted-foreground line-through">{formatSom(listing.oldPrice)}</span><span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">-{discount}%</span></>}
            </div>
            {listing.oldPrice && <div className="mt-1 text-xs text-muted-foreground">Около {formatSom(listing.oldPrice)} в магазине</div>}

            <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
              <Info label="Опубликовано" value={postedAgo(listing.createdAt)} />
              <Info label="Район" value={listing.district} icon={<MapPin className="h-3.5 w-3.5" />} />
              <Info label="Встреча" value="Согласуется в чате" />
            </div>

            {!notActive && listing.hoursLeft > 0 && (
              <div className="mt-3 flex items-center gap-2 rounded-2xl bg-destructive/8 p-3 text-sm text-destructive">
                <Clock className="h-4 w-4" /> Объявление исчезнет через {listing.hoursLeft} ч
              </div>
            )}

            {listing.description && (
              <div className="mt-4">
                <h3 className="mb-1 text-sm font-semibold">{t("listing.description")}</h3>
                <p className="text-sm text-foreground/80 leading-relaxed">{listing.description}</p>
              </div>
            )}

            {/* Seller */}
            <Link to="/shop/$id" params={{ id: listing.sellerId }} className="mt-5 flex items-center gap-3 rounded-3xl bg-card p-3 shadow-[var(--shadow-card)]">
              <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-secondary font-display text-lg font-semibold text-secondary-foreground">{(seller?.name ?? "П").charAt(0)}</div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1">
                  <span className="font-medium">{seller?.name ?? "Продавец"}</span>
                  {seller?.verified && <BadgeCheck className="h-4 w-4 text-primary" />}
                </div>
                <div className="mt-0.5 flex items-center gap-2 text-xs text-muted-foreground">
                  {seller && seller.reviewsCount > 0 ? (
                    <span className="inline-flex items-center gap-0.5"><Star className="h-3 w-3" style={{ fill: "var(--gold)", color: "var(--gold)" }} />{seller.rating.toFixed(1)} · {seller.reviewsCount} отзывов</span>
                  ) : (
                    <span>Пока без отзывов</span>
                  )}
                  {memberSince && <span>· на ReFlowers с {MONTHS[memberSince.getMonth()]} {memberSince.getFullYear()}</span>}
                </div>
              </div>
              <span className="text-xs text-muted-foreground">Открыть →</span>
            </Link>

            {notActive ? (
              <div className="mt-5 rounded-2xl border border-destructive/30 bg-destructive/5 p-4 text-center text-sm font-medium text-destructive">
                {inactiveLabel}
              </div>
            ) : (
              <>
                {/* Desktop actions */}
                <div className="mt-5 hidden gap-2 md:flex">
                  <Button size="lg" onClick={wantToBuy} disabled={buying} className="flex-1 w-full rounded-full">{buying ? "…" : t("listing.wantToBuy")}</Button>
                  <Button size="lg" variant="secondary" onClick={startChat} disabled={sending} className="flex-1 w-full rounded-full"><MessageCircle className="h-4 w-4" /> {sending ? "…" : t("listing.message")}</Button>
                </div>
                <SellerContactButtons listingId={listing.id} title={listing.title} />
                <div className="mt-2 text-[11px] text-muted-foreground">
                  {t("listing.paymentNotice")}
                </div>
              </>
            )}
          </div>
        </div>

        <ReviewSection targetUserId={listing.sellerId} />

        {similar.length > 0 && (
          <section className="mt-10">
            <h2 className="font-display text-xl">Ещё букеты</h2>
            <div className="mt-3 grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-5">
              {similar.map(l => <ListingCard key={l.id} listing={l} />)}
            </div>
          </section>
        )}
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
