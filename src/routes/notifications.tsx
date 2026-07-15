import { createFileRoute } from "@tanstack/react-router";
import { AppLayout } from "@/components/marketplace/AppLayout";
import { Bell, Heart, MessageCircle, Package, ShoppingBag, TrendingDown, Truck } from "lucide-react";

export const Route = createFileRoute("/notifications")({
  head: () => ({ meta: [{ title: "Уведомления — ReFlowers" }] }),
  component: Notifications,
});

const ITEMS = [
  { icon: Heart, text: "Ваш букет добавили в избранное", time: "5 мин", accent: "text-destructive" },
  { icon: MessageCircle, text: "Айдана написала вам сообщение", time: "12 мин", accent: "text-primary" },
  { icon: TrendingDown, text: "Цена на сохранённый букет снизилась на 500 сом", time: "1 ч", accent: "text-primary" },
  { icon: Bell, text: "Ваше объявление завершится через 2 часа", time: "2 ч", accent: "text-foreground" },
  { icon: ShoppingBag, text: "Bloom Bishkek подтвердил ваш заказ", time: "3 ч", accent: "text-foreground" },
  { icon: Truck, text: "Курьер забрал ваши цветы", time: "вчера", accent: "text-foreground" },
  { icon: Package, text: "Букет доставлен получателю 🎉", time: "вчера", accent: "text-foreground" },
];

function Notifications() {
  return (
    <AppLayout>
      <div className="mx-auto max-w-2xl px-4 py-6 md:px-8">
        <h1 className="font-display text-2xl">Уведомления</h1>
        <div className="mt-4 divide-y divide-border rounded-3xl bg-card shadow-[var(--shadow-card)]">
          {ITEMS.map((n, i) => (
            <div key={i} className="flex items-start gap-3 p-4">
              <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-muted"><n.icon className={"h-4 w-4 " + n.accent} /></div>
              <div className="flex-1 text-sm">{n.text}</div>
              <div className="text-[11px] text-muted-foreground">{n.time}</div>
            </div>
          ))}
        </div>
      </div>
    </AppLayout>
  );
}