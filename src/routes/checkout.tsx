import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { z } from "zod";
import { AppLayout } from "@/components/marketplace/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { LISTINGS, formatSom, getListing } from "@/lib/mock-data";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { Check, MapPin, Zap, ChevronDown, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/checkout")({
  validateSearch: (s) => z.object({ id: z.string().optional() }).parse(s),
  head: () => ({ meta: [{ title: "Оформление заказа — ReFlowers" }] }),
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
  const [showDetails, setShowDetails] = useState(false);
  const navigate = useNavigate();
  const d = DELIVERY.find(x => x.id === delivery)!;
  const commission = Math.round(listing.price * 0.07);
  const sellerGets = listing.price - commission;
  const total = listing.price + d.price;

  const submit = () => {
    toast.success("Заказ оформлен! Продавец скоро свяжется с вами.");
    setTimeout(() => navigate({ to: "/profile" }), 700);
  };

  return (
    <AppLayout>
      <div className="mx-auto grid max-w-5xl gap-6 px-4 py-6 pb-32 md:grid-cols-[1fr_360px] md:px-8">
        <div className="space-y-4">
          <h1 className="font-display text-2xl">Оформление заказа</h1>

          {/* Express 1-tap */}
          <section className="rounded-3xl border border-primary/30 bg-primary/5 p-5">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-primary"><Zap className="h-3.5 w-3.5" /> Заказ в 1 клик</div>
            <div className="mt-3 flex gap-3">
              <img src={listing.image} alt="" className="h-16 w-16 shrink-0 rounded-xl object-cover" />
              <div className="min-w-0 flex-1 text-sm">
                <div className="truncate font-medium">{listing.title}</div>
                <div className="mt-0.5 text-xs text-muted-foreground">Айгерим · +996 555 12 34 56</div>
                <div className="text-xs text-muted-foreground">ул. Байтик Баатыра 45, кв. 12</div>
                <div className="mt-1 text-xs"><span className="text-muted-foreground">Доставка:</span> <b>Быстрая · 1–1.5 ч</b> · <span className="text-muted-foreground">Оплата:</span> <b>MBank</b></div>
              </div>
            </div>
            <div className="mt-3 flex items-baseline justify-between">
              <span className="text-xs text-muted-foreground">К оплате</span>
              <span className="font-display text-2xl font-semibold text-primary">{formatSom(total)}</span>
            </div>
            <div className="mt-2 flex items-start gap-1.5 rounded-2xl bg-background/70 p-2.5 text-[11px] text-muted-foreground">
              <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
              <span>Оплата защищена. Деньги придут продавцу <b className="text-foreground">после получения букета</b>. Если что-то не так — вернём.</span>
            </div>
            <Button size="lg" className="mt-3 w-full rounded-full" onClick={submit}>
              <Zap className="h-4 w-4" /> Заказать сейчас
            </Button>
            <button onClick={() => setShowDetails(s => !s)} className="mx-auto mt-2 flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
              {showDetails ? "Скрыть" : "Изменить"} детали <ChevronDown className={cn("h-3 w-3 transition", showDetails && "rotate-180")} />
            </button>
          </section>

          {showDetails && (<>

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
          </>)}
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
            <div className="mt-3 rounded-2xl bg-secondary/60 p-3 text-[11px] leading-relaxed text-muted-foreground">
              <div className="mb-1.5 flex items-center gap-1 text-[11px] font-semibold text-foreground"><ShieldCheck className="h-3 w-3 text-primary" /> Безопасная сделка</div>
              <div className="flex justify-between"><span>Комиссия платформы (7%)</span><span>{formatSom(commission)}</span></div>
              <div className="flex justify-between"><span>Продавец получит</span><span className="text-foreground">{formatSom(sellerGets)}</span></div>
              <div className="mt-1.5">Деньги придут продавцу после подтверждения получения букета.</div>
            </div>
            <Button size="lg" className="mt-4 w-full rounded-full" onClick={submit}>
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