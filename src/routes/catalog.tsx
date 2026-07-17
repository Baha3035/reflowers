import { createFileRoute } from "@tanstack/react-router";
import { AppLayout, SearchBar } from "@/components/marketplace/AppLayout";
import { ListingCard } from "@/components/marketplace/ListingCard";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { LISTINGS, DISTRICTS, boostRank } from "@/lib/mock-data";
import { useDbListings } from "@/lib/db-listings";
import { useApp } from "@/lib/store";
import { cn } from "@/lib/utils";
import { useMemo, useState } from "react";
import { LayoutGrid, List, MapPin } from "lucide-react";
import type { TKey } from "@/lib/i18n";

export const Route = createFileRoute("/catalog")({
  head: () => ({ meta: [{ title: "Каталог букетов — ReFlowers" }, { name: "description", content: "Все букеты и композиции Бишкека в одном каталоге." }] }),
  component: Catalog,
});

const SORTS: { id: string; key: TKey }[] = [
  { id: "recommended", key: "sort.recommended" },
  { id: "new", key: "sort.new" },
  { id: "cheap", key: "sort.cheap" },
  { id: "expensive", key: "sort.expensive" },
  { id: "near", key: "sort.near" },
  { id: "popular", key: "sort.popular" },
];
const PRICES = ["До 1000", "1000–3000", "3000–10000", "10000–20000", "От 20000"];
const FLOWERS = ["Розы", "Пионы", "Тюльпаны", "Хризантемы", "Гортензии", "Лилии", "Ромашки", "Смешанные"];
const COLORS = ["Красные", "Белые", "Розовые", "Жёлтые", "Фиолетовые", "Разноцветные"];
const OCCASIONS = ["Свидание", "День рождения", "Извинение", "Свадьба", "Для мамы", "Для коллеги", "Без повода"];

function Catalog() {
  const { sellerMode, setSellerMode, t, city } = useApp();
  const { data: dbListings = [] } = useDbListings();
  const [view, setView] = useState<"grid" | "list">("grid");
  const [sortId, setSortId] = useState(SORTS[0].id);

  // Rough "distance" map — for demo we just prefer some districts for Бишкек
  const listings = useMemo(() => {
    const all = [...dbListings, ...LISTINGS];
    const base = sellerMode === "shop" ? all.filter(l => l.sellerType === "shop") : all.filter(l => l.sellerType !== "shop");
    const arr = [...base];
    switch (sortId) {
      case "cheap": arr.sort((a, b) => a.price - b.price); break;
      case "expensive": arr.sort((a, b) => b.price - a.price); break;
      case "new": arr.sort((a, b) => (b.hoursLeft ?? 24) - (a.hoursLeft ?? 24)); break;
      case "popular": arr.sort((a, b) => (b.oldPrice ?? 0) - (a.oldPrice ?? 0)); break;
      case "near": {
        const nearOrder = ["Центр", "Джал", "Асанбай", "Восток-5", "12 микрорайон", "Тунгуч", "Южные микрорайоны", "Аламедин-1"];
        arr.sort((a, b) => nearOrder.indexOf(a.district) - nearOrder.indexOf(b.district));
        break;
      }
      case "recommended":
      default:
        arr.sort((a, b) => boostRank(a) - boostRank(b) || (b.oldPrice ?? 0) - (a.oldPrice ?? 0));
    }
    return arr;
  }, [sellerMode, sortId, city, dbListings]);

  return (
    <AppLayout>
      <div className="mx-auto max-w-7xl px-4 py-4 md:px-8 md:py-6">
        <div className="mb-4"><SearchBar /></div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex rounded-full bg-muted p-1">
            {(["private", "shop"] as const).map(m => (
              <button key={m} onClick={() => setSellerMode(m)} className={cn("rounded-full px-3.5 py-1.5 text-xs font-medium transition md:text-sm", sellerMode === m ? "bg-card text-foreground shadow-sm" : "text-muted-foreground")}>
                {m === "private" ? t("catalog.private") : t("catalog.shops")}
              </button>
            ))}
          </div>

          <select value={sortId} onChange={e => setSortId(e.target.value)} className="rounded-full bg-muted px-3 py-1.5 text-xs font-medium md:text-sm">
            {SORTS.map(s => <option key={s.id} value={s.id}>{t(s.key)}</option>)}
          </select>

          <Sheet>
            <SheetTrigger asChild>
              <Button size="sm" variant="secondary" className="rounded-full">{t("catalog.filters")}</Button>
            </SheetTrigger>
            <SheetContent side="bottom" className="max-h-[85vh] overflow-y-auto rounded-t-3xl">
              <SheetHeader><SheetTitle>{t("catalog.filters")}</SheetTitle></SheetHeader>
              <FilterGroup title="Цена" opts={PRICES.map(p => p + " сом")} />
              <FilterGroup title="Свежесть" opts={["Получены сегодня", "1 день", "2 дня", "Новые от магазина"]} />
              <FilterGroup title="Тип цветов" opts={FLOWERS} />
              <FilterGroup title="Цвет" opts={COLORS} />
              <FilterGroup title="Повод" opts={OCCASIONS} />
              <FilterGroup title="Район" opts={DISTRICTS} />
              <div className="sticky bottom-0 mt-4 flex gap-2 bg-background/95 py-3 backdrop-blur">
                <Button variant="outline" className="flex-1 rounded-full">Сбросить</Button>
                <Button className="flex-1 rounded-full">Показать</Button>
              </div>
            </SheetContent>
          </Sheet>

          <Button size="sm" variant="ghost" className="rounded-full text-xs"><MapPin className="h-3.5 w-3.5" /> {t("catalog.onMap")}</Button>

          <div className="ml-auto flex items-center gap-2">
            <span className="text-xs text-muted-foreground">{listings.length} {t("catalog.count")}</span>
            <div className="inline-flex rounded-full bg-muted p-1">
              <button onClick={() => setView("grid")} className={cn("grid h-7 w-7 place-items-center rounded-full", view === "grid" && "bg-card shadow-sm")}><LayoutGrid className="h-3.5 w-3.5" /></button>
              <button onClick={() => setView("list")} className={cn("grid h-7 w-7 place-items-center rounded-full", view === "list" && "bg-card shadow-sm")}><List className="h-3.5 w-3.5" /></button>
            </div>
          </div>
        </div>

        <div className={cn("mt-5", view === "grid" ? "grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-5" : "flex flex-col gap-2 md:gap-2.5")}>
          {listings.map(l => <ListingCard key={l.id} listing={l} horizontal={view === "list"} />)}
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