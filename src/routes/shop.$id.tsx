import { createFileRoute, notFound } from "@tanstack/react-router";
import { AppLayout } from "@/components/marketplace/AppLayout";
import { ListingCard } from "@/components/marketplace/ListingCard";
import { LISTINGS, REVIEWS, SELLERS, getSeller, formatSom } from "@/lib/mock-data";
import { BadgeCheck, Clock, Instagram, MapPin, Phone, Star } from "lucide-react";

export const Route = createFileRoute("/shop/$id")({
  loader: ({ params }) => {
    const s = getSeller(params.id);
    if (!s) throw notFound();
    return { seller: s };
  },
  head: ({ loaderData }) => ({ meta: [{ title: (loaderData?.seller.name ?? "Продавец") + " — Gül Market" }] }),
  component: Shop,
  notFoundComponent: () => <AppLayout><div className="p-8 text-center">Не найдено</div></AppLayout>,
});

function Shop() {
  const { seller } = Route.useLoaderData();
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

        <h2 className="mt-8 font-display text-xl">Отзывы</h2>
        <div className="mt-3 grid gap-3 md:grid-cols-2">
          {REVIEWS.slice(0, 6).map(r => (
            <div key={r.id} className="rounded-2xl bg-card p-4 shadow-[var(--shadow-card)]">
              <div className="flex items-center justify-between text-sm"><span className="font-medium">{r.author}</span><span className="inline-flex items-center gap-0.5 text-xs"><Star className="h-3 w-3" style={{ fill: "var(--gold)", color: "var(--gold)" }} />{r.rating}</span></div>
              <p className="mt-1.5 text-sm">{r.text}</p>
              <div className="mt-1 text-[11px] text-muted-foreground">{r.date}</div>
            </div>
          ))}
        </div>
      </div>
    </AppLayout>
  );
}

function Info({ label, value, icon }: { label: string; value: string; icon?: React.ReactNode }) {
  return <div className="rounded-2xl bg-muted p-3"><div className="text-[11px] text-muted-foreground">{label}</div><div className="mt-0.5 inline-flex items-center gap-1 font-medium">{icon}{value}</div></div>;
}