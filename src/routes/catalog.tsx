import { createFileRoute } from "@tanstack/react-router";
import { AppLayout, SearchBar } from "@/components/marketplace/AppLayout";
import { ListingCard } from "@/components/marketplace/ListingCard";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { DISTRICTS, boostRank, type Listing } from "@/lib/marketplace";
import { useDbListings } from "@/lib/db-listings";
import { useApp } from "@/lib/store";
import { cn } from "@/lib/utils";
import { useMemo, useState } from "react";
import { LayoutGrid, List } from "lucide-react";
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
];
const PRICES: { label: string; min: number; max: number }[] = [
  { label: "До 1000 сом", min: 0, max: 1000 },
  { label: "1000–3000 сом", min: 1000, max: 3000 },
  { label: "3000–10000 сом", min: 3000, max: 10000 },
  { label: "10000–20000 сом", min: 10000, max: 20000 },
  { label: "От 20000 сом", min: 20000, max: Infinity },
];

// Flower type / colour filters come back once listings store those attributes (see docs/ROADMAP.md).
type Filters = {
  priceIdx: number | null;
  districts: string[];
};
const EMPTY_FILTERS: Filters = { priceIdx: null, districts: [] };

function toggle<T>(arr: T[], v: T): T[] {
  return arr.includes(v) ? arr.filter(x => x !== v) : [...arr, v];
}

function Catalog() {
  const { sellerMode, setSellerMode, t, city, searchQuery } = useApp();
  const { data: dbListings = [], isLoading } = useDbListings();
  const [view, setView] = useState<"grid" | "list">("grid");
  const [sortId, setSortId] = useState(SORTS[0].id);
  const [draft, setDraft] = useState<Filters>(EMPTY_FILTERS);
  const [applied, setApplied] = useState<Filters>(EMPTY_FILTERS);
  const [sheetOpen, setSheetOpen] = useState(false);

  const q = searchQuery.trim().toLowerCase();

  // Rough "distance" map — for demo we just prefer some districts for Бишкек
  const listings = useMemo(() => {
    const all = dbListings;
    const base = sellerMode === "shop" ? all.filter(l => l.sellerType === "shop") : all.filter(l => l.sellerType !== "shop");
    const matchesQ = (l: Listing) => !q
      || l.title.toLowerCase().includes(q)
      || l.category.toLowerCase().includes(q)
      || l.district.toLowerCase().includes(q)
      || (l.description?.toLowerCase().includes(q) ?? false);
    const matchesFilters = (l: Listing) => {
      if (applied.priceIdx != null) {
        const p = PRICES[applied.priceIdx];
        if (l.price < p.min || l.price >= p.max) return false;
      }
      if (applied.districts.length && !applied.districts.includes(l.district)) return false;
      return true;
    };
    const arr = base.filter(l => matchesQ(l) && matchesFilters(l));
    switch (sortId) {
      case "cheap": arr.sort((a, b) => a.price - b.price); break;
      case "expensive": arr.sort((a, b) => b.price - a.price); break;
      case "new": arr.sort((a, b) => b.createdAt.localeCompare(a.createdAt)); break;
      case "recommended":
      default:
        arr.sort((a, b) => boostRank(a) - boostRank(b) || b.createdAt.localeCompare(a.createdAt));
    }
    return arr;
  }, [sellerMode, sortId, city, dbListings, q, applied]);

  const openFilters = () => { setDraft(applied); setSheetOpen(true); };
  const resetFilters = () => setDraft(EMPTY_FILTERS);
  const applyFilters = () => { setApplied(draft); setSheetOpen(false); };

  return (
    <AppLayout>
      <div className="mx-auto max-w-7xl px-4 py-4 md:px-8 md:py-6">
        <div className="mb-4"><SearchBar onFilter={openFilters} /></div>

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

          <Sheet open={sheetOpen} onOpenChange={o => { if (o) openFilters(); else setSheetOpen(false); }}>
            <SheetTrigger asChild>
              <Button size="sm" variant="secondary" className="rounded-full">{t("catalog.filters")}</Button>
            </SheetTrigger>
            <SheetContent side="bottom" className="max-h-[85vh] overflow-y-auto rounded-t-3xl">
              <SheetHeader><SheetTitle>{t("catalog.filters")}</SheetTitle></SheetHeader>
              <FilterGroup
                title={t("filter.price")}
                opts={PRICES.map(p => p.label)}
                selected={draft.priceIdx != null ? [PRICES[draft.priceIdx].label] : []}
                onToggle={(label) => setDraft(d => {
                  const i = PRICES.findIndex(p => p.label === label);
                  return { ...d, priceIdx: d.priceIdx === i ? null : i };
                })}
              />
              <FilterGroup
                title={t("filter.district")}
                opts={DISTRICTS}
                selected={draft.districts}
                onToggle={(v) => setDraft(d => ({ ...d, districts: toggle(d.districts, v) }))}
              />
              <div className="sticky bottom-0 mt-4 flex gap-2 bg-background/95 py-3 backdrop-blur">
                <Button variant="outline" onClick={resetFilters} className="flex-1 rounded-full">{t("catalog.reset")}</Button>
                <Button onClick={applyFilters} className="flex-1 rounded-full">{t("catalog.show")}</Button>
              </div>
            </SheetContent>
          </Sheet>

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
        {!isLoading && listings.length === 0 && (
          <div className="mt-6 rounded-3xl bg-card p-8 text-center text-sm text-muted-foreground shadow-[var(--shadow-card)]">
            {dbListings.length === 0 ? "Сейчас букетов нет — объявления живут 24 часа. Загляните позже или продайте свой." : "Ничего не нашлось. Попробуйте изменить фильтры."}
          </div>
        )}
      </div>
    </AppLayout>
  );
}

function FilterGroup({ title, opts, selected, onToggle }: { title: string; opts: string[]; selected: string[]; onToggle: (v: string) => void }) {
  return (
    <div className="border-b border-border/60 py-4">
      <h4 className="mb-2 text-sm font-semibold">{title}</h4>
      <div className="flex flex-wrap gap-1.5">
        {opts.map(o => (
          <button
            key={o}
            type="button"
            onClick={() => onToggle(o)}
            className={cn(
              "rounded-full border px-3 py-1.5 text-xs transition",
              selected.includes(o)
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-background text-foreground/80 hover:border-primary hover:bg-secondary hover:text-secondary-foreground"
            )}
          >
            {o}
          </button>
        ))}
      </div>
    </div>
  );
}