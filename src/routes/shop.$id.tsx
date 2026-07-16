import { createFileRoute, notFound } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { AppLayout } from "@/components/marketplace/AppLayout";
import { ListingCard } from "@/components/marketplace/ListingCard";
import { LISTINGS, getSeller, formatSom } from "@/lib/mock-data";
import { mapDbListing } from "@/lib/db-listings";
import { supabase } from "@/integrations/supabase/client";
import { ReviewSection } from "@/components/marketplace/ReviewSection";
import { BadgeCheck, Clock, Instagram, MapPin, Phone, Star, Store, User as UserIcon } from "lucide-react";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}/;

export const Route = createFileRoute("/shop/$id")({
  loader: async ({ params }) => {
    if (UUID_RE.test(params.id)) {
      const { data } = await supabase
        .from("profiles")
        .select("id, display_name, shop_name, seller_type, avatar_url, city, verified, rating, reviews_count, bio, created_at")
        .eq("id", params.id)
        .maybeSingle();
      if (data) return { kind: "db" as const, profile: data };
    }
    const s = getSeller(params.id);
    if (!s) throw notFound();
    return { kind: "mock" as const, seller: s };
  },
  head: ({ loaderData }) => {
    const name = loaderData?.kind === "db"
      ? (loaderData.profile.seller_type === "shop" ? loaderData.profile.shop_name : loaderData.profile.display_name)
      : loaderData?.seller?.name;
    return { meta: [{ title: (name ?? "Продавец") + " — ReFlowers" }] };
  },
  component: Shop,
  notFoundComponent: () => <AppLayout><div className="p-8 text-center">Не найдено</div></AppLayout>,
});

function Shop() {
  const data = Route.useLoaderData();
  if (data.kind === "db") return <DbShop profile={data.profile} />;
  return <MockShop seller={data.seller} />;
}

type DbProfile = {
  id: string;
  display_name: string | null;
  shop_name: string | null;
  seller_type: string | null;
  avatar_url: string | null;
  city: string | null;
  verified: boolean | null;
  rating: number | null;
  reviews_count: number | null;
  bio: string | null;
  created_at: string;
};

function DbShop({ profile }: { profile: DbProfile }) {
  const isShop = profile.seller_type === "shop";
  const name = (isShop ? profile.shop_name : profile.display_name) || "Продавец";
  const dbListings = useQuery({
    queryKey: ["shop-listings", profile.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("listings")
        .select("id, seller_id, title, description, price, original_price, category, condition, city, district, images, status, urgent, created_at")
        .eq("seller_id", profile.id)
        .eq("status", "active")
        .order("created_at", { ascending: false });
      return (data ?? []).map(l => mapDbListing(l as never));
    },
  });
  const created = profile.created_at ? new Date(profile.created_at) : new Date();
  const monthNames = ["янв","фев","мар","апр","мая","июн","июл","авг","сен","окт","ноя","дек"];
  return (
    <AppLayout>
      <div className="mx-auto max-w-4xl px-4 py-6 md:px-8">
        <div className="rounded-3xl bg-card p-5 shadow-[var(--shadow-card)] md:p-6">
          <div className="flex items-start gap-4">
            <div className="grid h-16 w-16 shrink-0 place-items-center overflow-hidden rounded-2xl bg-primary font-display text-2xl font-semibold text-primary-foreground md:h-20 md:w-20">
              {profile.avatar_url ? <img src={profile.avatar_url} alt="" className="h-full w-full object-cover" /> : name.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-1.5">
                <h1 className="truncate font-display text-xl md:text-2xl">{name}</h1>
                {profile.verified && <BadgeCheck className="h-5 w-5 text-primary" />}
                <span className="inline-flex items-center gap-1 rounded-full bg-secondary px-2 py-0.5 text-[11px] font-medium text-secondary-foreground">
                  {isShop ? <><Store className="h-3 w-3" /> Магазин</> : <><UserIcon className="h-3 w-3" /> Частный продавец</>}
                </span>
              </div>
              <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                <span className="inline-flex items-center gap-0.5"><Star className="h-3 w-3" style={{ fill: "var(--gold)", color: "var(--gold)" }} />{Number(profile.rating ?? 0).toFixed(1)}</span>
                <span>· {profile.reviews_count ?? 0} отзывов</span>
                <span>· с {monthNames[created.getMonth()]} {created.getFullYear()}</span>
                {profile.city && <span>· {profile.city}</span>}
              </div>
              {profile.bio && <p className="mt-2 text-sm text-foreground/80">{profile.bio}</p>}
            </div>
          </div>
        </div>

        <h2 className="mt-8 font-display text-xl">Активные объявления</h2>
        {dbListings.isLoading ? (
          <div className="mt-3 rounded-2xl bg-muted p-6 text-center text-sm text-muted-foreground">Загрузка…</div>
        ) : (
          <div className="mt-3 grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-4">
            {(dbListings.data ?? []).map(l => <ListingCard key={l.id} listing={l} />)}
            {(dbListings.data ?? []).length === 0 && <div className="col-span-full rounded-2xl bg-muted p-6 text-center text-sm text-muted-foreground">Пока нет активных объявлений</div>}
          </div>
        )}

        <ReviewSection targetUserId={profile.id} />
      </div>
    </AppLayout>
  );
}

function MockShop({ seller }: { seller: NonNullable<ReturnType<typeof getSeller>> }) {
  const isShop = seller.type === "shop";
  const listings = LISTINGS.filter(l => l.sellerId === seller.id);

  return (
    <AppLayout>
      <div className="mx-auto max-w-4xl px-4 py-6 md:px-8">
        <div className="rounded-3xl bg-card p-5 shadow-[var(--shadow-card)] md:p-6">
          <div className="flex items-start gap-4">
            <div className="grid h-16 w-16 shrink-0 place-items-center rounded-2xl bg-primary font-display text-2xl font-semibold text-primary-foreground md:h-20 md:w-20">
              {seller.name.charAt(0)}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-1.5">
                <h1 className="font-display text-xl md:text-2xl">{seller.name}</h1>
                {seller.verified && <BadgeCheck className="h-5 w-5 text-primary" />}
                {isShop && <span className="rounded-full bg-secondary px-2 py-0.5 text-[11px] font-medium text-secondary-foreground">Магазин</span>}
              </div>
              <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                <span className="inline-flex items-center gap-0.5"><Star className="h-3 w-3" style={{ fill: "var(--gold)", color: "var(--gold)" }} />{seller.rating}</span>
                <span>· {seller.reviewsCount} отзывов</span>
                <span>· {isShop ? `${seller.sales} заказов` : `${seller.sales} продаж`}</span>
                <span>· отвечает {seller.responseTime}</span>
              </div>
              {seller.about && <p className="mt-2 text-sm text-foreground/80">{seller.about}</p>}
            </div>
          </div>

          {isShop && (
            <div className="mt-4 grid grid-cols-2 gap-2 text-sm md:grid-cols-4">
              <Info icon={<Clock className="h-3.5 w-3.5" />} label="Часы" value={seller.workingHours ?? ""} />
              <Info icon={<Clock className="h-3.5 w-3.5" />} label="Доставка" value={seller.deliveryTime ?? ""} />
              <Info icon={<MapPin className="h-3.5 w-3.5" />} label="Адрес" value={seller.address ?? ""} />
              <Info label="Мин. заказ" value={formatSom(seller.minOrder ?? 0)} />
            </div>
          )}

          <div className="mt-4 flex flex-wrap gap-2">
            <a className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"><Phone className="h-4 w-4" /> WhatsApp</a>
            {seller.instagram && <a className="inline-flex items-center gap-2 rounded-full border border-border bg-background px-4 py-2 text-sm"><Instagram className="h-4 w-4" /> {seller.instagram}</a>}
          </div>
        </div>

        <h2 className="mt-8 font-display text-xl">Активные объявления</h2>
        <div className="mt-3 grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-4">
          {listings.map(l => <ListingCard key={l.id} listing={l} />)}
          {listings.length === 0 && <div className="col-span-full rounded-2xl bg-muted p-6 text-center text-sm text-muted-foreground">Пока нет активных объявлений</div>}
        </div>
      </div>
    </AppLayout>
  );
}

function Info({ label, value, icon }: { label: string; value: string; icon?: React.ReactNode }) {
  return <div className="rounded-2xl bg-muted p-3"><div className="text-[11px] text-muted-foreground">{label}</div><div className="mt-0.5 inline-flex items-center gap-1 font-medium">{icon}{value}</div></div>;
}