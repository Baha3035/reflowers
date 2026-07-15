import { createFileRoute } from "@tanstack/react-router";
import { AppLayout } from "@/components/marketplace/AppLayout";
import { ListingCard } from "@/components/marketplace/ListingCard";
import { Button } from "@/components/ui/button";
import { LISTINGS, formatSom } from "@/lib/mock-data";
import { BadgeCheck, Package, Plus, TrendingUp } from "lucide-react";

export const Route = createFileRoute("/shop-dashboard")({
  head: () => ({ meta: [{ title: "Панель магазина — ReFlowers" }] }),
  component: ShopDashboard,
});

function ShopDashboard() {
  const shopListings = LISTINGS.filter(l => l.sellerType === "shop").slice(0, 6);
  return (
    <AppLayout>
      <div className="mx-auto max-w-6xl px-4 py-6 md:px-8">
        <div className="flex flex-wrap items-center gap-3">
          <div className="grid h-14 w-14 place-items-center rounded-2xl bg-primary font-display text-xl font-semibold text-primary-foreground">B</div>
          <div>
            <div className="flex items-center gap-1"><h1 className="font-display text-2xl">Bloom Bishkek</h1><BadgeCheck className="h-5 w-5 text-primary" /></div>
            <div className="text-xs text-muted-foreground">Панель магазина · тариф Premium</div>
          </div>
          <div className="ml-auto flex gap-2">
            <Button variant="secondary" className="rounded-full">Скидки на старое</Button>
            <Button className="rounded-full"><Plus className="h-4 w-4" /> Товар</Button>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-5">
          <Stat label="Заказов сегодня" value="18" trend="+12%" />
          <Stat label="Выручка за неделю" value={formatSom(84200)} trend="+8%" />
          <Stat label="Средний чек" value={formatSom(3400)} />
          <Stat label="Конверсия" value="6.4%" trend="+0.7%" />
          <Stat label="Рейтинг" value="4.9 ★" />
        </div>

        <div className="mt-8 grid gap-6 md:grid-cols-3">
          <div className="md:col-span-2">
            <h2 className="mb-3 font-display text-xl">Ваш каталог</h2>
            <div className="grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-4">
              {shopListings.map(l => <ListingCard key={l.id} listing={l} />)}
            </div>
          </div>
          <div>
            <h2 className="mb-3 font-display text-xl">Заказы</h2>
            <div className="space-y-2">
              {[
                { name: "Айгерим · 51 роза Premium", price: 7500, status: "В доставке" },
                { name: "Данияр · Композиция Etoile", price: 3800, status: "Готов" },
                { name: "Асель · Букет пионов Grand", price: 5200, status: "Собирается" },
                { name: "Бек · 25 роз", price: 3200, status: "Новый" },
              ].map((o, i) => (
                <div key={i} className="flex items-center gap-2 rounded-2xl bg-card p-3 shadow-[var(--shadow-card)]">
                  <Package className="h-4 w-4 text-primary" />
                  <div className="min-w-0 flex-1"><div className="truncate text-sm font-medium">{o.name}</div><div className="text-xs text-muted-foreground">{o.status}</div></div>
                  <div className="text-sm font-semibold">{formatSom(o.price)}</div>
                </div>
              ))}
            </div>

            <h3 className="mt-6 mb-2 font-display text-lg">Популярный букет</h3>
            <div className="rounded-3xl bg-secondary p-4">
              <div className="text-sm font-medium text-secondary-foreground">51 роза Premium</div>
              <div className="mt-1 flex items-center gap-1 text-xs text-secondary-foreground/80"><TrendingUp className="h-3 w-3" /> 128 продаж за месяц</div>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}

function Stat({ label, value, trend }: { label: string; value: string; trend?: string }) {
  return (
    <div className="rounded-2xl bg-card p-4 shadow-[var(--shadow-card)]">
      <div className="text-[11px] text-muted-foreground">{label}</div>
      <div className="mt-1 font-display text-xl font-semibold">{value}</div>
      {trend && <div className="mt-0.5 text-[11px] text-primary">{trend}</div>}
    </div>
  );
}