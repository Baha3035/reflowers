import { Link, useNavigate } from "@tanstack/react-router";
import { Heart, MapPin, Truck, Clock, Star, BadgeCheck, Zap } from "lucide-react";
import { useApp } from "@/lib/store";
import { formatSom, type Listing, getSeller } from "@/lib/mock-data";
import { cn } from "@/lib/utils";

export function ListingCard({ listing, compact = false }: { listing: Listing; compact?: boolean }) {
  const { favorites, toggleFavorite } = useApp();
  const fav = favorites.has(listing.id);
  const seller = getSeller(listing.sellerId);
  const discount = listing.oldPrice ? Math.round((1 - listing.price / listing.oldPrice) * 100) : 0;
  const navigate = useNavigate();

  return (
    <Link to="/listing/$id" params={{ id: listing.id }} className="group block">
      <div className="relative overflow-hidden rounded-3xl bg-card shadow-[var(--shadow-card)] transition duration-300 group-hover:-translate-y-0.5 group-hover:shadow-[var(--shadow-soft)]">
        <div className={cn("relative overflow-hidden bg-muted", compact ? "aspect-square" : "aspect-[4/5]")}>
          <img src={listing.image} alt={listing.title} loading="lazy" className="h-full w-full object-cover transition duration-500 group-hover:scale-105" />
          {/* Badges */}
          <div className="absolute left-2.5 top-2.5 flex flex-col items-start gap-1.5">
            {listing.urgent && (
              <span className="rounded-full bg-destructive/95 px-2.5 py-1 text-[10px] font-semibold text-destructive-foreground shadow-sm">🔥 Срочно</span>
            )}
            {listing.badge && !listing.urgent && (
              <span className="rounded-full bg-background/95 px-2.5 py-1 text-[10px] font-semibold text-foreground shadow-sm">{listing.badge}</span>
            )}
            {discount > 0 && (
              <span className="rounded-full bg-primary px-2.5 py-1 text-[10px] font-semibold text-primary-foreground shadow-sm">-{discount}%</span>
            )}
          </div>
          <button
            onClick={(e) => { e.preventDefault(); toggleFavorite(listing.id); }}
            aria-label="В избранное"
            className="absolute right-2.5 top-2.5 grid h-9 w-9 place-items-center rounded-full bg-background/90 backdrop-blur transition hover:scale-110"
          >
            <Heart className={cn("h-4 w-4", fav ? "fill-destructive text-destructive" : "text-foreground/70")} />
          </button>
          <button
            onClick={(e) => { e.preventDefault(); navigate({ to: "/checkout", search: { id: listing.id } }); }}
            aria-label="Купить в 1 клик"
            className="absolute bottom-2.5 right-2.5 inline-flex items-center gap-1 rounded-full bg-primary px-3 py-1.5 text-[11px] font-semibold text-primary-foreground shadow-md transition hover:scale-105"
          >
            <Zap className="h-3 w-3" /> Купить
          </button>
          {listing.hoursLeft && listing.hoursLeft <= 6 && (
            <div className="absolute bottom-2.5 left-2.5 flex items-center gap-1 rounded-full bg-black/60 px-2 py-1 text-[10px] font-medium text-white backdrop-blur">
              <Clock className="h-3 w-3" /> осталось {listing.hoursLeft} ч
            </div>
          )}
        </div>
        <div className="space-y-1.5 p-3">
          <div className="flex items-baseline gap-2">
            <span className="text-base font-semibold text-foreground">{formatSom(listing.price)}</span>
            {listing.oldPrice && (
              <span className="text-xs text-muted-foreground line-through">{formatSom(listing.oldPrice)}</span>
            )}
          </div>
          <h3 className="line-clamp-2 min-h-[2.5rem] text-sm leading-snug text-foreground/90">{listing.title}</h3>
          <div className="flex items-center gap-2 pt-1 text-[11px] text-muted-foreground">
            <span className="inline-flex items-center gap-0.5"><MapPin className="h-3 w-3" />{listing.district}</span>
            {listing.delivery && (
              <span className="inline-flex items-center gap-0.5"><Truck className="h-3 w-3" />Доставка</span>
            )}
          </div>
          {seller && (
            <div className="flex items-center gap-1.5 pt-1 text-[11px] text-muted-foreground">
              <span className="truncate">{seller.type === "shop" ? "🏪" : "👤"} {seller.name}</span>
              {seller.verified && <BadgeCheck className="h-3 w-3 text-primary" />}
              <span className="ml-auto inline-flex items-center gap-0.5"><Star className="h-3 w-3 fill-gold text-gold" style={{ color: "var(--gold)" }} />{seller.rating}</span>
            </div>
          )}
        </div>
      </div>
    </Link>
  );
}