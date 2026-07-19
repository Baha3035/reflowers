import { createFileRoute, Link } from "@tanstack/react-router";
import { AppLayout, SearchBar } from "@/components/marketplace/AppLayout";
import { ListingCard } from "@/components/marketplace/ListingCard";
import { ShopCard } from "@/components/marketplace/ShopCard";
import { Button } from "@/components/ui/button";
import { DISTRICTS, LISTINGS, SELLERS, IMAGES, boostRank } from "@/lib/mock-data";
import { useDbListings } from "@/lib/db-listings";
import { useApp } from "@/lib/store";
import { ArrowRight, Leaf, Sparkles, ShoppingBag, Plus, Flame } from "lucide-react";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/")({ component: Home });

function Home() {
  const { sellerMode, setSellerMode, t } = useApp();
  const { data: dbListings = [] } = useDbListings();
  const all = [...dbListings, ...LISTINGS].sort((a, b) => boostRank(a) - boostRank(b));
  const listings = sellerMode === "private" ? all.filter(l => l.sellerType !== "shop") : all.filter(l => l.sellerType === "shop");
  const nearby = all.slice(0, 8);
  const urgent = all.filter(l => l.urgent).slice(0, 4);
  const shops = SELLERS.filter(s => s.type === "shop");

  return (
    <AppLayout>
      {/* Hero */}
      <section className="relative mx-auto max-w-7xl px-4 pt-3 md:px-8 md:pt-8">
        <div className="relative overflow-hidden rounded-2xl md:rounded-[36px]" style={{ background: "var(--gradient-hero)" }}>
          <div className="grid gap-6 p-4 md:grid-cols-2 md:items-center md:gap-8 md:p-12">
            <div>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-background/70 px-2.5 py-0.5 text-[11px] font-medium text-foreground/70 backdrop-blur md:px-3 md:py-1 md:text-xs">
                <Sparkles className="h-3 w-3 text-primary" /> {t("hero.badge")}
              </span>
              <h1 className="mt-2 font-display text-2xl leading-[1.05] text-foreground md:mt-3 md:text-5xl">
                {t("hero.title1")}<br />
                <span className="italic text-primary">{t("hero.title2")}</span>
              </h1>
              <p className="mt-2 max-w-md text-[13px] text-foreground/70 md:mt-3 md:text-base">{t("hero.desc")}</p>
              <div className="mt-3 flex flex-wrap gap-2 md:mt-5">
                <Link to="/catalog"><Button size="default" className="rounded-full md:h-11 md:px-6">{t("hero.find")} <ArrowRight className="h-4 w-4" /></Button></Link>
                <Link to="/sell"><Button size="default" variant="secondary" className="rounded-full md:h-11 md:px-6">{t("hero.sellFlowers")}</Button></Link>
              </div>
            </div>
            <div className="relative hidden md:block">
              <img src={IMAGES.heroPeonies} alt="Букет пионов" width={1600} height={1200} className="aspect-[4/3] w-full rounded-3xl object-cover shadow-[var(--shadow-soft)]" />
            </div>
          </div>
        </div>
      </section>

      {/* Search */}
      <section className="mx-auto mt-5 max-w-7xl px-4 md:px-8">
        <SearchBar />
      </section>

      {/* Quick actions — 1 tap to main flows */}
      <section className="mx-auto mt-4 max-w-7xl px-4 md:px-8">
        <div className="grid grid-cols-3 gap-2 md:gap-3">
          <Link to="/catalog" className="group flex flex-col items-center gap-1.5 rounded-2xl bg-card p-2.5 text-center shadow-[var(--shadow-card)] transition hover:-translate-y-0.5 sm:flex-row sm:gap-2 sm:text-left md:p-4">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary sm:h-10 sm:w-10 md:h-11 md:w-11"><ShoppingBag className="h-4 w-4 sm:h-5 sm:w-5" /></span>
            <div className="min-w-0"><div className="text-[13px] font-semibold leading-tight sm:text-sm md:text-base">{t("quick.buy")}</div><div className="hidden truncate text-[11px] text-muted-foreground sm:block">{t("quick.buySub")}</div></div>
          </Link>
          <Link to="/sell" className="group flex flex-col items-center gap-1.5 rounded-2xl bg-primary p-2.5 text-center text-primary-foreground shadow-[var(--shadow-soft)] transition hover:-translate-y-0.5 sm:flex-row sm:gap-2 sm:text-left md:p-4">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-primary-foreground/15 sm:h-10 sm:w-10 md:h-11 md:w-11"><Plus className="h-4 w-4 sm:h-5 sm:w-5" /></span>
            <div className="min-w-0"><div className="text-[13px] font-semibold leading-tight sm:text-sm md:text-base">{t("quick.sell")}</div><div className="hidden truncate text-[11px] opacity-80 sm:block">{t("quick.sellSub")}</div></div>
          </Link>
          <Link to="/catalog" className="group flex flex-col items-center gap-1.5 rounded-2xl bg-card p-2.5 text-center shadow-[var(--shadow-card)] transition hover:-translate-y-0.5 sm:flex-row sm:gap-2 sm:text-left md:p-4">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-destructive/10 text-destructive sm:h-10 sm:w-10 md:h-11 md:w-11"><Flame className="h-4 w-4 sm:h-5 sm:w-5" /></span>
            <div className="min-w-0"><div className="text-[13px] font-semibold leading-tight sm:text-sm md:text-base">{t("quick.urgent")}</div><div className="hidden truncate text-[11px] text-muted-foreground sm:block">{t("quick.urgentSub")}</div></div>
          </Link>
        </div>
      </section>

      {/* Seller switch */}
      <section className="mx-auto mt-4 max-w-7xl px-4 md:px-8">
        <div className="inline-flex rounded-full bg-muted p-1">
          {(["private", "shop"] as const).map(m => (
            <button key={m} onClick={() => setSellerMode(m)} className={cn(
              "rounded-full px-4 py-2 text-sm font-medium transition",
              sellerMode === m ? "bg-card text-foreground shadow-sm" : "text-muted-foreground",
            )}>
              {m === "private" ? t("seller.people") : t("seller.shops")}
            </button>
          ))}
        </div>
      </section>

      {/* Recommended */}
      <Section title={t("sec.recommended")} subtitle={sellerMode === "private" ? t("sec.recommendedSubP") : t("sec.recommendedSubS")} link="/catalog" viewAll={t("sec.viewAll")}>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-5">
          {listings.slice(0, 8).map(l => <ListingCard key={l.id} listing={l} />)}
        </div>
      </Section>

      <Section title={t("sec.nearby")} subtitle={t("sec.nearbySub")}>
        <div className="mb-3 flex gap-2 overflow-x-auto scrollbar-hide px-4 md:px-0">
          {DISTRICTS.map(d => (
            <span key={d} className="shrink-0 rounded-full border border-border bg-background px-3 py-1.5 text-xs text-foreground/70">{d}</span>
          ))}
        </div>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-5">
          {nearby.slice(0, 4).map(l => <ListingCard key={l.id} listing={l} />)}
        </div>
      </Section>

      <Section title={t("sec.urgent")} subtitle={t("sec.urgentSub")} accent>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-5">
          {urgent.map(l => <ListingCard key={l.id} listing={l} />)}
        </div>
      </Section>

      <Section title={t("sec.shops")} subtitle={t("sec.shopsSub")}>
        <div className="flex gap-3 overflow-x-auto scrollbar-hide px-4 pb-2 md:grid md:grid-cols-3 md:gap-5 md:px-0">
          {shops.map(s => <ShopCard key={s.id} shop={s} />)}
        </div>
      </Section>

      {/* Inspiration */}
      <section className="mx-auto mt-10 mb-12 max-w-7xl px-4 md:px-8">
        <div className="relative overflow-hidden rounded-[28px] bg-gradient-to-br from-[oklch(0.94_0.04_150)] via-[oklch(0.96_0.03_90)] to-[oklch(0.93_0.05_30)] p-8 md:p-14">
          <div className="relative z-10 max-w-2xl">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-background/80 px-3 py-1 text-xs font-medium text-foreground/70 backdrop-blur"><Sparkles className="h-3 w-3 text-primary" /> ReFlowers</span>
            <h2 className="mt-3 font-display text-3xl leading-[1.05] text-foreground md:text-5xl">
              Каждый день —<br/><span className="italic text-primary">повод для цветов</span>
            </h2>
            <p className="mt-3 max-w-lg text-sm text-foreground/70 md:text-base">
              Дарите букеты чаще. Радуйте близких без повода. Мы делаем цветы доступнее — от свежих поставок магазинов до букетов, которыми хочется поделиться.
            </p>
            <div className="mt-5 flex flex-wrap gap-2">
              <Link to="/catalog"><Button size="lg" className="rounded-full">Смотреть букеты <ArrowRight className="h-4 w-4" /></Button></Link>
            </div>
          </div>
          <div className="pointer-events-none absolute -right-10 -bottom-10 text-[10rem] leading-none opacity-25 md:text-[18rem]">💐</div>
        </div>
      </section>
    </AppLayout>
  );
}

function Section({ title, subtitle, children, link, accent, viewAll }: { title: string; subtitle?: string; children: React.ReactNode; link?: string; accent?: boolean; viewAll?: string }) {
  return (
    <section className={cn("mx-auto mt-8 max-w-7xl md:px-8", accent && "")}>
      <div className="mb-3 flex items-end justify-between gap-4 px-4 md:px-0">
        <div>
          <h2 className="font-display text-xl text-foreground md:text-2xl">{title}</h2>
          {subtitle && <p className="mt-0.5 text-xs text-muted-foreground md:text-sm">{subtitle}</p>}
        </div>
        {link && <Link to={link} className="shrink-0 text-xs font-medium text-primary hover:underline md:text-sm">{viewAll ?? "→"}</Link>}
      </div>
      <div className="px-4 md:px-0">{children}</div>
    </section>
  );
}
