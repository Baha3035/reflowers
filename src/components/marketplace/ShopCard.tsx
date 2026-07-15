import { Link } from "@tanstack/react-router";
import { Star, BadgeCheck, Clock } from "lucide-react";
import type { Seller } from "@/lib/mock-data";
import { formatSom } from "@/lib/mock-data";

export function ShopCard({ shop }: { shop: Seller }) {
  return (
    <Link to="/shop/$id" params={{ id: shop.id }} className="block">
      <div className="flex min-w-[240px] gap-3 rounded-3xl bg-card p-3 shadow-[var(--shadow-card)] transition hover:-translate-y-0.5 hover:shadow-[var(--shadow-soft)]">
        <div className="grid h-16 w-16 shrink-0 place-items-center rounded-2xl bg-secondary font-display text-2xl font-semibold text-secondary-foreground">
          {shop.name.charAt(0)}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1">
            <h4 className="truncate font-medium text-foreground">{shop.name}</h4>
            {shop.verified && <BadgeCheck className="h-4 w-4 text-primary" />}
          </div>
          <div className="mt-0.5 flex items-center gap-2 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-0.5"><Star className="h-3 w-3" style={{ color: "var(--gold)", fill: "var(--gold)" }} />{shop.rating}</span>
            <span>· {shop.reviewsCount} отзывов</span>
          </div>
          <div className="mt-1.5 flex items-center gap-2 text-[11px] text-muted-foreground">
            <span className="inline-flex items-center gap-0.5"><Clock className="h-3 w-3" />{shop.deliveryTime}</span>
            <span>· от {formatSom(shop.minOrder ?? 0)}</span>
          </div>
        </div>
      </div>
    </Link>
  );
}