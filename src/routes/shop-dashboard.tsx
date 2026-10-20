import { createFileRoute, Link } from "@tanstack/react-router";
import { AppLayout } from "@/components/marketplace/AppLayout";
import { Button } from "@/components/ui/button";
import { useApp } from "@/lib/store";
import { BadgeCheck, Clock, Percent, Store } from "lucide-react";

// "Для магазинов": what flower shops get and how to join. A real shop dashboard
// (orders, analytics) is on the roadmap — see docs/ROADMAP.md.
export const Route = createFileRoute("/shop-dashboard")({
  head: () => ({ meta: [{ title: "Для цветочных магазинов — ReFlowers" }] }),
  component: ForShops,
});

const POINTS = [
  {
    icon: Percent,
    title: "Продавайте остатки",
    text: "Букеты, которые не ушли сегодня, — со скидкой, пока они свежие.",
  },
  {
    icon: Clock,
    title: "Публикация за минуту",
    text: "Фото, цена, район — умная оценка подскажет название и цену.",
  },
  {
    icon: BadgeCheck,
    title: "Значок «Проверенный магазин»",
    text: "Подтвердим магазин после регистрации — покупатели доверяют больше.",
  },
];

function ForShops() {
  const { user } = useApp();
  return (
    <AppLayout>
      <div className="mx-auto max-w-3xl px-4 py-8 md:px-8">
        <div className="rounded-3xl p-6 md:p-10" style={{ background: "var(--gradient-hero)" }}>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-background/70 px-3 py-1 text-xs font-medium text-foreground/70">
            <Store className="h-3.5 w-3.5 text-primary" /> Для цветочных магазинов
          </span>
          <h1 className="mt-3 font-display text-3xl leading-tight md:text-4xl">
            Ещё один канал продаж — без комиссии
          </h1>
          <p className="mt-2 max-w-xl text-sm text-foreground/70 md:text-base">
            Покупатели в Бишкеке ищут букеты на ReFlowers каждый день. Покупатель платит вам
            напрямую, ReFlowers деньги не держит.
          </p>
          <div className="mt-5 flex flex-wrap gap-2">
            {user ? (
              <Link to="/sell">
                <Button className="rounded-full">Добавить букет</Button>
              </Link>
            ) : (
              <Link to="/auth" search={{ redirect: "/sell", signup: "shop" }}>
                <Button className="rounded-full">Зарегистрировать магазин</Button>
              </Link>
            )}
            <Link to="/catalog">
              <Button variant="secondary" className="rounded-full">
                Смотреть каталог
              </Button>
            </Link>
          </div>
        </div>

        <div className="mt-6 grid gap-3 md:grid-cols-3">
          {POINTS.map((p) => (
            <div key={p.title} className="rounded-3xl bg-card p-5 shadow-[var(--shadow-card)]">
              <p.icon className="h-5 w-5 text-primary" />
              <div className="mt-2 font-medium">{p.title}</div>
              <p className="mt-1 text-sm text-muted-foreground">{p.text}</p>
            </div>
          ))}
        </div>
      </div>
    </AppLayout>
  );
}
