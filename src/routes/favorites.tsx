import { createFileRoute, Link } from "@tanstack/react-router";
import { AppLayout } from "@/components/marketplace/AppLayout";
import { ListingCard } from "@/components/marketplace/ListingCard";
import { useDbListings, useListingsByIds } from "@/lib/db-listings";
import { useApp } from "@/lib/store";
import { Heart } from "lucide-react";

export const Route = createFileRoute("/favorites")({
  head: () => ({ meta: [{ title: "Избранное — ReFlowers" }] }),
  component: Favorites,
});

function Favorites() {
  const { favorites, t } = useApp();
  // Favourites are kept on this device (localStorage). Sold or expired bouquets drop out.
  const { data: saved = [] } = useListingsByIds([...favorites]);
  const { data: feed = [] } = useDbListings();
  const similar = feed.filter(l => !favorites.has(l.id)).slice(0, 4);

  return (
    <AppLayout>
      <div className="mx-auto max-w-7xl px-4 py-6 md:px-8">
        <h1 className="font-display text-2xl md:text-3xl">{t("fav.title")}</h1>

        {saved.length === 0 ? (
          <div className="mt-8 rounded-3xl bg-card p-10 text-center shadow-[var(--shadow-card)]">
            <Heart className="mx-auto h-10 w-10 text-primary/60" />
            <h2 className="mt-3 font-display text-xl">{t("fav.empty")}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{t("fav.emptyDesc")}</p>
            <Link to="/catalog" className="mt-4 inline-block rounded-full bg-primary px-5 py-2 text-sm font-medium text-primary-foreground">{t("fav.toCatalog")}</Link>
          </div>
        ) : (
          <>
            <div className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-5">
              {saved.map(l => <ListingCard key={l.id} listing={l} />)}
            </div>
          </>
        )}

        {similar.length > 0 && (
          <>
            <h2 className="mt-10 font-display text-xl">{t("fav.similar")}</h2>
            <div className="mt-3 grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-5">
              {similar.map(l => <ListingCard key={l.id} listing={l} />)}
            </div>
          </>
        )}
      </div>
    </AppLayout>
  );
}