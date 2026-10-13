import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import type { Listing, SellerSummary } from "./marketplace";
import { IMAGES, UUID_RE } from "./marketplace";

export const LISTING_COLUMNS =
  "id, seller_id, title, description, price, original_price, category, condition, city, district, images, status, urgent, created_at, expires_at, boost_top_until, boost_highlight_until, boost_bump_until";

export type DbListing = {
  id: string;
  seller_id: string;
  title: string;
  description: string | null;
  price: number;
  original_price: number | null;
  category: string;
  condition: "new" | "fresh" | "day_old";
  city: string;
  district: string | null;
  images: string[];
  status: "active" | "sold" | "hidden" | "expired";
  urgent: boolean;
  created_at: string;
  expires_at: string;
  boost_top_until?: string | null;
  boost_highlight_until?: string | null;
  boost_bump_until?: string | null;
};

export type DbPublicProfile = {
  id: string | null;
  display_name: string | null;
  shop_name: string | null;
  seller_type: "private" | "shop" | null;
  verified: boolean | null;
  rating: number | null;
  reviews_count: number | null;
  created_at: string | null;
};

const FALLBACK_IMG = IMAGES.mixed;

export function mapSeller(p: DbPublicProfile): SellerSummary {
  const type = p.seller_type === "shop" ? "shop" : "private";
  return {
    id: p.id ?? "",
    type,
    name: (type === "shop" ? p.shop_name : p.display_name) || "Продавец",
    verified: !!p.verified,
    rating: Number(p.rating ?? 0),
    reviewsCount: p.reviews_count ?? 0,
    createdAt: p.created_at,
  };
}

export function mapDbListing(l: DbListing, seller?: SellerSummary): Listing {
  const primary = l.images?.[0] || FALLBACK_IMG;
  const msLeft = new Date(l.expires_at).getTime() - Date.now();
  return {
    id: l.id,
    title: l.title,
    price: l.price,
    oldPrice: l.original_price ?? undefined,
    image: primary,
    gallery: l.images?.length ? l.images : [primary],
    district: l.district || "Бишкек",
    category: l.category,
    sellerType: seller?.type ?? "private",
    sellerId: l.seller_id,
    seller,
    description: l.description ?? undefined,
    urgent: l.urgent,
    badge: l.urgent ? "Срочная продажа" : undefined,
    boostTopUntil: l.boost_top_until ?? null,
    boostHighlightUntil: l.boost_highlight_until ?? null,
    boostBumpUntil: l.boost_bump_until ?? null,
    status: l.status,
    createdAt: l.created_at,
    expiresAt: l.expires_at,
    hoursLeft: Math.max(0, Math.ceil(msLeft / 3_600_000)),
  };
}

/** Public seller info for a set of user ids, keyed by id. */
export async function fetchSellers(ids: string[]): Promise<Map<string, SellerSummary>> {
  const unique = [...new Set(ids)];
  if (!unique.length) return new Map();
  const { data } = await supabase
    .from("public_profiles")
    .select("id, display_name, shop_name, seller_type, verified, rating, reviews_count, created_at")
    .in("id", unique);
  return new Map((data ?? []).map((p) => [p.id ?? "", mapSeller(p as DbPublicProfile)]));
}

/** Maps listing rows and attaches their sellers (one extra query for the whole batch). */
export async function withSellers(rows: DbListing[]): Promise<Listing[]> {
  const sellers = await fetchSellers(rows.map((r) => r.seller_id));
  return rows.map((r) => mapDbListing(r, sellers.get(r.seller_id)));
}

/** Active, unexpired listings for the feed. RLS hides expired ones; the filter keeps the query explicit. */
export function useDbListings() {
  return useQuery({
    queryKey: ["db-listings"],
    queryFn: async (): Promise<Listing[]> => {
      const { data, error } = await supabase
        .from("listings")
        .select(LISTING_COLUMNS)
        .eq("status", "active")
        .gt("expires_at", new Date().toISOString())
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) return [];
      return withSellers(data as DbListing[]);
    },
    staleTime: 30_000,
  });
}

/** Listings by id, e.g. the favourites page. Expired or sold ones simply don't come back. */
export function useListingsByIds(allIds: string[]) {
  // Favourites saved before launch may hold old demo ids; only UUIDs exist in the database.
  const ids = allIds.filter((id) => UUID_RE.test(id));
  return useQuery({
    queryKey: ["listings-by-ids", [...ids].sort()],
    enabled: ids.length > 0,
    queryFn: async (): Promise<Listing[]> => {
      const { data, error } = await supabase
        .from("listings")
        .select(LISTING_COLUMNS)
        .in("id", ids)
        .eq("status", "active")
        .gt("expires_at", new Date().toISOString());
      if (error) return [];
      return withSellers(data as DbListing[]);
    },
  });
}
