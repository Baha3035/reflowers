import { createFileRoute, Link } from "@tanstack/react-router";
import { AppLayout, SearchBar } from "@/components/marketplace/AppLayout";
import { ListingCard } from "@/components/marketplace/ListingCard";
import { ShopCard } from "@/components/marketplace/ShopCard";
import { Button } from "@/components/ui/button";
import { CATEGORIES, DISTRICTS, LISTINGS, SELLERS, IMAGES } from "@/lib/mock-data";
import { useApp } from "@/lib/store";
import { ArrowRight, Leaf, Sparkles, ShoppingBag, Plus, Flame } from "lucide-react";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/")({ component: Home });

function Home() {
  const { sellerMode, setSellerMode, t } = useApp();
  const listings = LISTINGS.filter(l => l.sellerType === sellerMode);
  const nearby = LISTINGS.slice(0, 8);
  const urgent = LISTINGS.filter(l => l.urgent).slice(0, 4);
  const shops = SELLERS.filter(s => s.type === "shop");

  return (
    <AppLayout>
      {/* Hero */}
      <section className="relative mx-auto max-w-7xl px-4 pt-4 md:px-8 md:pt-8">
        <div className="relative overflow-hidden rounded-[28px] md:rounded-[36px]" style={{ background: "var(--gradient-hero)" }}>
          <div className="grid gap-6 p-6 md:grid-cols-2 md:items-center md:gap-8 md:p-12">
            <div>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-background/70 px-3 py-1 text-xs font-medium text-foreground/70 backdrop-blur">
                <Sparkles className="h-3 w-3 text-primary" /> {t("hero.badge")}
              </span>
              <h1 className="mt-3 font-display text-3xl leading-[1.05] text-foreground md:text-5xl">
                {t("hero.title1")}<br />
                <span className="italic text-primary">{t("hero.title2")}</span>
              </h1>
              <p className="mt-3 max-w-md text-sm text-foreground/70 md:text-base">{t("hero.desc")}</p>
              <div className="mt-5 flex flex-wrap gap-2">
                <Link to="/catalog"><Button size="lg" className="rounded-full">{t("hero.find")} <ArrowRight className="h-4 w-4" /></Button></Link>
                <Link to="/sell"><Button size="lg" variant="secondary" className="rounded-full">{t("hero.sellFlowers")}</Button></Link>
              </div>
              <div className="mt-5 flex items-center gap-4 text-xs text-muted-foreground">
                <div><b className="text-foreground">1200+</b> {t("hero.stat1")}</div>
                <div><b className="text-foreground">5</b> {t("hero.stat2")}</div>
              </div>
            </div>
            <div className="relative">
              <img src={IMAGES.heroPeonies} alt="Букет пионов" width={1600} height={1200} className="aspect-[4/3] w-full rounded-3xl object-cover shadow-[var(--shadow-soft)]" />
              <div className="absolute -bottom-3 -left-3 rounded-2xl bg-card px-3 py-2 text-xs shadow-[var(--shadow-soft)] md:-bottom-4 md:-left-4">
                <div className="text-[10px] text-muted-foreground">Сегодня в 11:00</div>
                <div className="font-medium">Пионы · 1 800 сом</div>
              </div>
              <div className="absolute -top-3 -right-3 rounded-2xl bg-card px-3 py-2 text-xs shadow-[var(--shadow-soft)] md:-top-4 md:-right-4">
                <div className="flex items-center gap-1 text-[10px] text-muted-foreground">✓ Проверенный продавец</div>
                <div className="font-medium text-primary">−55% от магазина</div>
              </div>
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
          <Link to="/catalog" className="group flex items-center gap-2 rounded-2xl bg-card p-3 shadow-[var(--shadow-card)] transition hover:-translate-y-0.5 md:p-4">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary md:h-11 md:w-11"><ShoppingBag className="h-5 w-5" /></span>
            <div className="min-w-0"><div className="text-sm font-semibold leading-tight md:text-base">{t("quick.buy")}</div><div className="truncate text-[11px] text-muted-foreground">{t("quick.buySub")}</div></div>
          </Link>
          <Link to="/sell" className="group flex items-center gap-2 rounded-2xl bg-primary p-3 text-primary-foreground shadow-[var(--shadow-soft)] transition hover:-translate-y-0.5 md:p-4">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary-foreground/15 md:h-11 md:w-11"><Plus className="h-5 w-5" /></span>
            <div className="min-w-0"><div className="text-sm font-semibold leading-tight md:text-base">{t("quick.sell")}</div><div className="truncate text-[11px] opacity-80">{t("quick.sellSub")}</div></div>
          </Link>
          <Link to="/catalog" className="group flex items-center gap-2 rounded-2xl bg-card p-3 shadow-[var(--shadow-card)] transition hover:-translate-y-0.5 md:p-4">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-destructive/10 text-destructive md:h-11 md:w-11"><Flame className="h-5 w-5" /></span>
            <div className="min-w-0"><div className="text-sm font-semibold leading-tight md:text-base">{t("quick.urgent")}</div><div className="truncate text-[11px] text-muted-foreground">{t("quick.urgentSub")}</div></div>
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

      {/* Categories */}
      <section className="mx-auto mt-5 max-w-7xl md:px-8">
        <div className="flex gap-2 overflow-x-auto scrollbar-hide px-4 pb-2 md:px-0">
          {CATEGORIES.map(c => (
            <Link key={c.id} to="/catalog" className="flex shrink-0 items-center gap-2 rounded-full bg-card px-4 py-2.5 text-sm shadow-[var(--shadow-card)] transition hover:-translate-y-0.5">
              <span className="text-base">{c.icon}</span>
              <span className="whitespace-nowrap font-medium text-foreground/80">{c.label}</span>
            </Link>
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
