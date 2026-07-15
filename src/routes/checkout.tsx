import { createFileRoute, Link } from "@tanstack/react-router";
import { z } from "zod";
import { AppLayout } from "@/components/marketplace/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { LISTINGS, formatSom, getListing } from "@/lib/mock-data";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { Check, MapPin } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/checkout")({
  validateSearch: (s) => z.object({ id: z.string().optional() }).parse(s),
  head: () => ({ meta: [{ title: "Оформление заказа — Gül Market" }] }),
  component: Checkout,
});

const DELIVERY = [
  { id: "pickup", label: "Самовывоз", price: 0, time: "по договорённости" },
  { id: "standard", label: "Стандартная доставка", price: 250, time: "2–3 часа" },
  { id: "fast", label: "Быстрая доставка", price: 400, time: "1–1.5 часа" },
  { id: "hour", label: "Доставка за час", price: 550, time: "до 60 мин" },
];
const PAY = ["Наличными", "Банковской картой", "MBank", "Optima", "Элсом"];

function Checkout() {
  const { id } = Route.useSearch();
  const listing = getListing(id ?? "") ?? LISTINGS[0];
  const [delivery, setDelivery] = useState("fast");
  const [pay, setPay] = useState("MBank");
  const [anon, setAnon] = useState(false);
  const [gift, setGift] = useState("");
  const d = DELIVERY.find(x => x.id === delivery)!;
  const total = listing.price + d.price;

  return (
    <AppLayout>
      <div className="mx-auto grid max-w-5xl gap-6 px-4 py-6 pb-32 md:grid-cols-[1fr_360px] md:px-8">
        <div className="space-y-4">
          <h1 className="font-display text-2xl">Оформление заказа</h1>

          <Section title="Букет">
            <div className="flex gap-3">
              <img src={listing.image} alt="" className="h-20 w-20 rounded-xl object-cover" />
              <div>
                <div className="font-medium">{listing.title}</div>
                <div className="mt-0.5 text-sm text-primary font-semibold">{formatSom(listing.price)}</div>
                <div className="mt-1 inline-flex items-center gap-0.5 text-xs text-muted-foreground"><MapPin className="h-3 w-3" />{listing.district}</div>
              </div>
            </div>
          </Section>

          <Section title="Способ доставки">
            <div className="grid gap-2">
              {DELIVERY.map(o => (
                <button key={o.id} onClick={() => setDelivery(o.id)} className={cn("flex items-center gap-3 rounded-2xl border p-3 text-left transition", delivery === o.id ? "border-primary bg-primary/5" : "border-border bg-background")}>
                  <span className={cn("grid h-5 w-5 place-items-center rounded-full border", delivery === o.id ? "border-primary bg-primary text-primary-foreground" : "border-border")}>{delivery === o.id && <Check className="h-3 w-3" />}</span>
                  <div className="flex-1"><div className="text-sm font-medium">{o.label}</div><div className="text-[11px] text-muted-foreground">{o.time}</div></div>
                  <div className="text-sm font-semibold">{o.price === 0 ? "Бесплатно" : formatSom(o.price)}</div>
                </button>
              ))}
            </div>
            <div className="mt-3 grid h-32 place-items-center rounded-2xl bg-secondary text-sm text-secondary-foreground">🗺️ Карта Бишкека — превью</div>
          </Section>

          <Section title="Данные получателя">
            <div className="grid gap-3 md:grid-cols-2">
              <Input placeholder="Адрес доставки" defaultValue="ул. Байтик Баатыра 45, кв. 12" />
              <Input placeholder="Имя получателя" defaultValue="Айгерим" />
              <Input placeholder="Телефон" defaultValue="+996 555 12 34 56" />
              <Input placeholder="Желаемое время" defaultValue="Сегодня, 18:00" />
            </div>
            <label className="mt-3 flex items-center gap-2 text-sm"><input type="checkbox" checked={anon} onChange={e => setAnon(e.target.checked)} className="accent-primary" /> Не показывать имя отправителя</label>
            <Textarea value={gift} onChange={e => setGift(e.target.value)} rows={2} placeholder="Открытка к букету (необязательно)" className="mt-3" />
          </Section>

          <Section title="Способ оплаты">
            <div className="flex flex-wrap gap-2">
              {PAY.map(p => (
                <button key={p} onClick={() => setPay(p)} className={cn("rounded-full border px-4 py-2 text-sm font-medium transition", pay === p ? "border-primary bg-primary text-primary-foreground" : "border-border bg-background")}>{p}</button>
              ))}
            </div>
          </Section>
        </div>

        <aside className="md:sticky md:top-24 md:self-start">
          <div className="rounded-3xl bg-card p-5 shadow-[var(--shadow-card)]">
            <h3 className="font-display text-lg">Итог</h3>
            <div className="mt-3 space-y-1.5 text-sm">
              <Row label="Букет" v={formatSom(listing.price)} />
              <Row label={"Доставка · " + d.label} v={d.price === 0 ? "Бесплатно" : formatSom(d.price)} />
            </div>
            <div className="mt-3 flex items-baseline justify-between border-t border-border pt-3">
              <span className="text-sm">К оплате</span>
              <span className="font-display text-2xl font-semibold text-primary">{formatSom(total)}</span>
            </div>
            <Button size="lg" className="mt-4 w-full rounded-full" onClick={() => toast.success("Заказ оформлен! Продавец скоро свяжется с вами.")}>
              Оформить заказ
            </Button>
            <Link to="/catalog" className="mt-2 block text-center text-xs text-muted-foreground hover:underline">← Продолжить покупки</Link>
          </div>
        </aside>
      </div>
    </AppLayout>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return <section className="rounded-3xl bg-card p-5 shadow-[var(--shadow-card)]"><h2 className="mb-3 font-display text-lg">{title}</h2>{children}</section>;
}
function Row({ label, v }: { label: string; v: string }) {
  return <div className="flex justify-between text-muted-foreground"><span>{label}</span><span className="text-foreground">{v}</span></div>;
}