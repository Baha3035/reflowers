import { createFileRoute } from "@tanstack/react-router";
import { AppLayout, SearchBar } from "@/components/marketplace/AppLayout";
import { ListingCard } from "@/components/marketplace/ListingCard";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { LISTINGS, DISTRICTS } from "@/lib/mock-data";
import { useApp } from "@/lib/store";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { LayoutGrid, List, MapPin } from "lucide-react";

export const Route = createFileRoute("/catalog")({
  head: () => ({ meta: [{ title: "Каталог букетов — Gül Market" }, { name: "description", content: "Все букеты и композиции Бишкека в одном каталоге." }] }),
  component: Catalog,
});

const SORTS = ["Рекомендуемые", "Сначала новые", "Сначала дешевле", "Сначала дороже", "Ближе ко мне", "Самые популярные"];
const PRICES = ["До 1000", "1000–3000", "3000–10000", "10000–20000", "От 20000"];
const FLOWERS = ["Розы", "Пионы", "Тюльпаны", "Хризантемы", "Гортензии", "Лилии", "Ромашки", "Смешанные"];
const COLORS = ["Красные", "Белые", "Розовые", "Жёлтые", "Фиолетовые", "Разноцветные"];
const OCCASIONS = ["Свидание", "День рождения", "Извинение", "Свадьба", "Для мамы", "Для коллеги", "Без повода"];
const DELIVERY = ["Самовывоз", "Доставка продавцом", "Курьерская доставка", "За час"];

function Catalog() {
  const { sellerMode, setSellerMode } = useApp();
  const [view, setView] = useState<"grid" | "list">("grid");
  const [sort, setSort] = useState(SORTS[0]);
  const listings = LISTINGS.filter(l => l.sellerType === sellerMode);

  return (
    <AppLayout>
      <div className="mx-auto max-w-7xl px-4 py-4 md:px-8 md:py-6">
        <div className="mb-4"><SearchBar /></div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex rounded-full bg-muted p-1">
            {(["private", "shop"] as const).map(m => (
              <button key={m} onClick={() => setSellerMode(m)} className={cn("rounded-full px-3.5 py-1.5 text-xs font-medium transition md:text-sm", sellerMode === m ? "bg-card text-foreground shadow-sm" : "text-muted-foreground")}>
                {m === "private" ? "Частные" : "Магазины"}
              </button>
            ))}
          </div>

          <select value={sort} onChange={e => setSort(e.target.value)} className="rounded-full bg-muted px-3 py-1.5 text-xs font-medium md:text-sm">
            {SORTS.map(s => <option key={s}>{s}</option>)}
          </select>

          <Sheet>
            <SheetTrigger asChild>
              <Button size="sm" variant="secondary" className="rounded-full">Фильтры</Button>
            </SheetTrigger>
            <SheetContent side="bottom" className="max-h-[85vh] overflow-y-auto rounded-t-3xl">
              <SheetHeader><SheetTitle>Фильтры</SheetTitle></SheetHeader>
              <FilterGroup title="Цена" opts={PRICES.map(p => p + " сом")} />
              <FilterGroup title="Свежесть" opts={["Получены сегодня", "1 день", "2 дня", "Новые от магазина"]} />
              <FilterGroup title="Тип цветов" opts={FLOWERS} />
              <FilterGroup title="Цвет" opts={COLORS} />
              <FilterGroup title="Повод" opts={OCCASIONS} />
              <FilterGroup title="Доставка" opts={DELIVERY} />
              <FilterGroup title="Район" opts={DISTRICTS} />
              <div className="sticky bottom-0 mt-4 flex gap-2 bg-background/95 py-3 backdrop-blur">
                <Button variant="outline" className="flex-1 rounded-full">Сбросить</Button>
                <Button className="flex-1 rounded-full">Показать</Button>
              </div>
            </SheetContent>
          </Sheet>

          <Button size="sm" variant="ghost" className="rounded-full text-xs"><MapPin className="h-3.5 w-3.5" /> На карте</Button>

          <div className="ml-auto flex items-center gap-2">
            <span className="text-xs text-muted-foreground">{listings.length} объявлений</span>
            <div className="inline-flex rounded-full bg-muted p-1">
              <button onClick={() => setView("grid")} className={cn("grid h-7 w-7 place-items-center rounded-full", view === "grid" && "bg-card shadow-sm")}><LayoutGrid className="h-3.5 w-3.5" /></button>
              <button onClick={() => setView("list")} className={cn("grid h-7 w-7 place-items-center rounded-full", view === "list" && "bg-card shadow-sm")}><List className="h-3.5 w-3.5" /></button>
            </div>
          </div>
        </div>

        <div className={cn("mt-5", view === "grid" ? "grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-5" : "flex flex-col gap-3")}>
          {listings.map(l => <ListingCard key={l.id} listing={l} compact={view === "list"} />)}
        </div>
      </div>
    </AppLayout>
  );
}

function FilterGroup({ title, opts }: { title: string; opts: string[] }) {
  return (
    <div className="border-b border-border/60 py-4">
      <h4 className="mb-2 text-sm font-semibold">{title}</h4>
      <div className="flex flex-wrap gap-1.5">
        {opts.map(o => (
          <button key={o} className="rounded-full border border-border bg-background px-3 py-1.5 text-xs text-foreground/80 transition hover:border-primary hover:bg-secondary hover:text-secondary-foreground">{o}</button>
        ))}
      </div>
    </div>
  );
}