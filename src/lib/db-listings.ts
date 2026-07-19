import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import type { Listing } from "./mock-data";
import { IMAGES } from "./mock-data";

type DbListing = {
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
  boost_top_until?: string | null;
  boost_highlight_until?: string | null;
  boost_bump_until?: string | null;
};

const FALLBACK_IMG = IMAGES.mixed;

export function mapDbListing(l: DbListing): Listing {
  const primary = l.images?.[0] || FALLBACK_IMG;
  return {
    id: l.id,
    title: l.title,
    price: l.price,
    oldPrice: l.original_price ?? undefined,
    image: primary,
    gallery: l.images?.length ? l.images : [primary],
    district: l.district || "Центр",
    freshness: l.condition === "fresh" ? "Получен сегодня" : l.condition === "day_old" ? "1 день" : "Новый",
    sellerType: "private",
    sellerId: l.seller_id,
    delivery: false,
    badge: l.urgent ? "Срочная продажа" : l.condition === "fresh" ? "Сегодня" : undefined,
    flowerType: l.category,
    color: "—",
    size: "Средний",
    description: l.description ?? undefined,
    urgent: l.urgent,
    boostTopUntil: l.boost_top_until ?? null,
    boostHighlightUntil: l.boost_highlight_until ?? null,
    boostBumpUntil: l.boost_bump_until ?? null,
    status: l.status,
  };
}

export function useDbListings() {
  return useQuery({
    queryKey: ["db-listings"],
    queryFn: async (): Promise<Listing[]> => {
      const { data, error } = await supabase
        .from("listings")
        .select("id, seller_id, title, description, price, original_price, category, condition, city, district, images, status, urgent, created_at, boost_top_until, boost_highlight_until, boost_bump_until")
        .eq("status", "active")
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) return [];
      return (data as DbListing[]).map(mapDbListing);
    },
    staleTime: 30_000,
  });
}