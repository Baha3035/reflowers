import redRoses from "@/assets/bouquet-red-roses.jpg";
import whiteRoses from "@/assets/bouquet-white-roses.jpg";
import pinkPeonies from "@/assets/bouquet-pink-peonies.jpg";
import mixed from "@/assets/bouquet-mixed.jpg";
import tulips from "@/assets/bouquet-tulips.jpg";
import box from "@/assets/bouquet-box.jpg";
import white51 from "@/assets/bouquet-51-white.jpg";
import spray from "@/assets/bouquet-spray.jpg";
import hydrangea from "@/assets/bouquet-hydrangea.jpg";
import heroPeonies from "@/assets/hero-peonies.jpg";

export const IMAGES = {
  redRoses, whiteRoses, pinkPeonies, mixed, tulips, box, white51, spray, hydrangea, heroPeonies,
};

export const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type SellerType = "private" | "shop";

export interface SellerSummary {
  id: string;
  type: SellerType;
  name: string;
  verified: boolean;
  /** Phone confirmed by sharing the Telegram contact with the bot. */
  phoneVerified: boolean;
  rating: number;
  reviewsCount: number;
  createdAt?: string | null;
}

export interface Listing {
  id: string;
  title: string;
  price: number;
  oldPrice?: number;
  image: string;
  gallery: string[];
  district: string;
  category: string;
  sellerType: SellerType;
  sellerId: string;
  seller?: SellerSummary;
  description?: string;
  urgent?: boolean;
  badge?: string;
  boostTopUntil?: string | null;
  boostHighlightUntil?: string | null;
  boostBumpUntil?: string | null;
  status: "active" | "reserved" | "sold" | "hidden" | "expired";
  createdAt: string;
  expiresAt: string;
  /** Whole hours until the listing disappears; 0 once expired. */
  hoursLeft: number;
}

// Sort priority for boosted listings: top > urgent > highlight > bump > none.
// Lower number = higher in the feed.
export function boostRank(l: Listing): number {
  const now = Date.now();
  const active = (v?: string | null) => !!v && new Date(v).getTime() > now;
  if (active(l.boostTopUntil)) return 1;
  if (l.urgent) return 2;
  if (active(l.boostHighlightUntil)) return 3;
  if (active(l.boostBumpUntil)) return 4;
  return 5;
}

export const DISTRICTS = [
  "Асанбай", "Джал", "Восток-5", "Центр", "12 микрорайон",
  "Южные микрорайоны", "Аламедин-1", "Тунгуч",
];

export function formatSom(n: number) {
  return `${n.toLocaleString("ru-RU")} сом`;
}

export function isExpired(l: Pick<Listing, "expiresAt">) {
  return new Date(l.expiresAt).getTime() <= Date.now();
}

/** "15 мин назад", "3 ч назад", "2 дн. назад". Relative, so server and browser time zones agree. */
export function postedAgo(iso: string) {
  const minutes = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 60_000));
  if (minutes < 60) return `${Math.max(1, minutes)} мин назад`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} ч назад`;
  return `${Math.floor(hours / 24)} дн. назад`;
}
