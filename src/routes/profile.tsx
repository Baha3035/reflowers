import { createFileRoute, Link } from "@tanstack/react-router";
import { AppLayout } from "@/components/marketplace/AppLayout";
import { LISTINGS } from "@/lib/mock-data";
import { BadgeCheck, Bell, ChevronRight, Globe, Heart, HelpCircle, LogOut, MapPin, Package, Settings, ShoppingBag, Star, Wallet } from "lucide-react";
import { ListingCard } from "@/components/marketplace/ListingCard";

export const Route = createFileRoute("/profile")({
  head: () => ({ meta: [{ title: "Мой профиль — ReFlowers" }] }),
  component: Profile,
});

function Profile() {
  const active = LISTINGS.slice(0, 2);
  return (
    <AppLayout>
      <div className="mx-auto max-w-3xl px-4 py-6 md:px-8">
        <div className="flex items-center gap-4">
          <div className="grid h-16 w-16 shrink-0 place-items-center rounded-2xl bg-primary font-display text-2xl font-semibold text-primary-foreground">А</div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1"><h1 className="font-display text-2xl">Алина</h1><BadgeCheck className="h-5 w-5 text-primary" /></div>
            <div className="mt-0.5 flex items-center gap-2 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-0.5"><Star className="h-3 w-3" style={{ fill: "var(--gold)", color: "var(--gold)" }} />4.9</span>
              <span>· 12 продаж</span>
              <span>· с марта 2024</span>
            </div>
          </div>
          <Link to="/sell" className="hidden rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground md:block">+ Новое</Link>
        </div>

        <div className="mt-5 grid grid-cols-3 gap-3">
          <Stat n="3" label="Активных" />
          <Stat n="12" label="Продано" />
          <Stat n="8" label="Избранных" />
        </div>

        <h2 className="mt-8 font-display text-lg">Мои активные объявления</h2>
        <div className="mt-3 grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-4">
          {active.map(l => <ListingCard key={l.id} listing={l} />)}
        </div>

        <div className="mt-6 flex flex-wrap gap-2">
          {["Продлить объявление", "Снизить цену", "Отметить как продано"].map(x => (
            <button key={x} className="rounded-full border border-border bg-background px-4 py-2 text-xs font-medium hover:bg-muted">{x}</button>
          ))}
        </div>

        <h2 className="mt-8 font-display text-lg">Настройки</h2>
        <div className="mt-3 divide-y divide-border rounded-3xl bg-card shadow-[var(--shadow-card)]">
          <Row icon={ShoppingBag} label="Мои заказы" />
          <Row icon={Package} label="Проданные букеты" />
          <Row icon={Heart} label="Избранное" to="/favorites" />
          <Row icon={Wallet} label="Способы оплаты" />
          <Row icon={MapPin} label="Адреса доставки" />
          <Row icon={Globe} label="Язык · Русский" />
          <Row icon={Bell} label="Уведомления" to="/notifications" />
          <Row icon={HelpCircle} label="Поддержка" />
          <Row icon={Settings} label="Настройки" />
          <Row icon={LogOut} label="Выйти" destructive />
        </div>
      </div>
    </AppLayout>
  );
}

function Stat({ n, label }: { n: string; label: string }) {
  return <div className="rounded-2xl bg-card p-4 text-center shadow-[var(--shadow-card)]"><div className="font-display text-2xl font-semibold text-primary">{n}</div><div className="mt-0.5 text-xs text-muted-foreground">{label}</div></div>;
}

function Row({ icon: Icon, label, to, destructive }: { icon: any; label: string; to?: string; destructive?: boolean }) {
  const inner = (
    <div className="flex items-center gap-3 px-4 py-3.5">
      <Icon className={"h-4 w-4 " + (destructive ? "text-destructive" : "text-muted-foreground")} />
      <span className={"flex-1 text-sm " + (destructive ? "text-destructive" : "text-foreground")}>{label}</span>
      <ChevronRight className="h-4 w-4 text-muted-foreground" />
    </div>
  );
  return to ? <Link to={to}>{inner}</Link> : <div>{inner}</div>;
}