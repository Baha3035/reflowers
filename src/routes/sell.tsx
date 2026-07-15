import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { AppLayout } from "@/components/marketplace/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { DISTRICTS } from "@/lib/mock-data";
import { Camera, ChevronLeft, Sparkles, ChevronDown, TrendingUp, Palette, Crown, Flame } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export const Route = createFileRoute("/sell")({
  head: () => ({ meta: [{ title: "Продать букет — ReFlowers" }, { name: "description", content: "Опубликуйте объявление о продаже букета за 30 секунд." }] }),
  component: Sell,
});

function Sell() {
  const navigate = useNavigate();
  const [photos, setPhotos] = useState<string[]>([]);
  const [price, setPrice] = useState("1900");
  const [district, setDistrict] = useState("Центр");
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [boosts, setBoosts] = useState<Record<string, boolean>>({});
  const analyzed = photos.length > 0;

  const BOOSTS = [
    { id: "up", label: "Поднять объявление", price: 50, icon: TrendingUp, desc: "+3× просмотров" },
    { id: "color", label: "Выделить цветом", price: 80, icon: Palette, desc: "Заметнее в ленте" },
    { id: "top", label: "В топ на сутки", price: 150, icon: Crown, desc: "Первые позиции" },
    { id: "urgent", label: "«Успейте купить сегодня»", price: 100, icon: Flame, desc: "Отдельный раздел" },
  ];
  const boostTotal = BOOSTS.filter(b => boosts[b.id]).reduce((s, b) => s + b.price, 0);
  const numPrice = Number(price) || 0;
  const commission = Math.round(numPrice * 0.07);
  const sellerGets = Math.max(0, numPrice - commission);

  const publish = () => {
    toast.success(boostTotal > 0
      ? `Опубликовано с продвижением (+${boostTotal} сом). Активно 24 часа.`
      : "Объявление опубликовано! Активно 24 часа.");
    setTimeout(() => navigate({ to: "/profile" }), 600);
  };

  return (
    <AppLayout>
      <div className="mx-auto max-w-2xl px-4 pb-32 pt-4 md:px-8">
        <div className="mb-4 flex items-center gap-2">
          <Link to="/" className="grid h-10 w-10 place-items-center rounded-full bg-muted"><ChevronLeft className="h-4 w-4" /></Link>
          <div>
            <h1 className="font-display text-2xl">Продать букет</h1>
            <p className="text-xs text-muted-foreground">Один экран — 30 секунд. AI подставит остальное.</p>
          </div>
        </div>

        <div className="space-y-4 rounded-3xl bg-card p-5 shadow-[var(--shadow-card)] md:p-6">
          {/* Photos */}
          <div>
            <div className="mb-2 flex items-center justify-between">
              <span className="text-sm font-semibold">1. Добавьте фото</span>
              <span className="text-[11px] text-muted-foreground">до 6 фото</span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {Array.from({ length: 6 }).map((_, i) => {
                const has = photos[i];
                return (
                  <button key={i} onClick={() => setPhotos(p => p.length > i ? p : [...p, `demo-${p.length}`])} className={cn("aspect-square rounded-2xl border-2 border-dashed transition", has ? "border-transparent bg-secondary" : "border-border bg-muted hover:border-primary")}>
                    {has ? <div className="grid h-full w-full place-items-center text-2xl">🌸</div> : <Camera className="mx-auto h-5 w-5 text-muted-foreground" />}
                  </button>
                );
              })}
            </div>

            {analyzed && (
              <div className="mt-3 rounded-2xl border border-primary/30 bg-primary/5 p-3">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-primary"><Sparkles className="h-3.5 w-3.5" /> Умная оценка · заполнено автоматически</div>
                <ul className="mt-1.5 space-y-0.5 text-[13px] text-foreground/80">
                  <li>• Букет из 25 красных роз, размер средний</li>
                  <li>• Свежесть: получен сегодня · как новый</li>
                  <li>• Рекомендуемая цена: <b>1 800–2 300 сом</b></li>
                </ul>
              </div>
            )}
          </div>

          {/* Price */}
          <div>
            <div className="mb-2 text-sm font-semibold">2. Ваша цена</div>
            <div className="flex items-center gap-2">
              <Input value={price} onChange={e => setPrice(e.target.value)} type="number" className="text-lg font-semibold" />
              <span className="text-sm text-muted-foreground">сом</span>
            </div>
          </div>

          {/* District */}
          <div>
            <div className="mb-2 text-sm font-semibold">3. Район</div>
            <div className="flex flex-wrap gap-1.5">
              {DISTRICTS.map(d => (
                <button key={d} onClick={() => setDistrict(d)} className={cn("rounded-full border px-3 py-1.5 text-xs font-medium transition", district === d ? "border-primary bg-primary text-primary-foreground" : "border-border bg-background text-foreground/80")}>{d}</button>
              ))}
            </div>
          </div>

          {/* Advanced (optional) */}
          <button onClick={() => setShowAdvanced(s => !s)} className="flex w-full items-center justify-between rounded-2xl bg-muted px-3 py-2.5 text-xs font-medium text-foreground/70">
            Название и описание — необязательно
            <ChevronDown className={cn("h-4 w-4 transition", showAdvanced && "rotate-180")} />
          </button>
          {showAdvanced && (
            <div className="space-y-3">
              <Input placeholder="Название (иначе AI придумает)" />
              <Input placeholder="Описание (необязательно)" />
            </div>
          )}

          <div>
            <div className="mb-2 flex items-center justify-between">
              <span className="text-sm font-semibold">Продвижение <span className="text-[11px] font-normal text-muted-foreground">· необязательно</span></span>
              {boostTotal > 0 && <span className="text-xs font-semibold text-primary">+{boostTotal} сом</span>}
            </div>
            <div className="grid gap-2">
              {BOOSTS.map(b => {
                const on = !!boosts[b.id];
                const Icon = b.icon;
                return (
                  <button key={b.id} onClick={() => setBoosts(s => ({ ...s, [b.id]: !s[b.id] }))} className={cn("flex items-center gap-3 rounded-2xl border p-2.5 text-left transition", on ? "border-primary bg-primary/5" : "border-border bg-background")}>
                    <span className={cn("grid h-9 w-9 place-items-center rounded-xl", on ? "bg-primary text-primary-foreground" : "bg-muted text-foreground/70")}><Icon className="h-4 w-4" /></span>
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-medium">{b.label}</div>
                      <div className="text-[11px] text-muted-foreground">{b.desc}</div>
                    </div>
                    <div className="text-sm font-semibold">{b.price} сом</div>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-background p-3 text-[12px]">
            <div className="mb-1 text-xs font-semibold text-foreground">Сколько вы получите</div>
            <div className="flex justify-between text-muted-foreground"><span>Цена букета</span><span className="text-foreground">{numPrice} сом</span></div>
            <div className="flex justify-between text-muted-foreground"><span>Комиссия платформы (7%)</span><span>−{commission} сом</span></div>
            {boostTotal > 0 && <div className="flex justify-between text-muted-foreground"><span>Продвижение</span><span>−{boostTotal} сом</span></div>}
            <div className="mt-1.5 flex justify-between border-t border-border pt-1.5 font-semibold text-foreground"><span>На карту после продажи</span><span className="text-primary">{Math.max(0, sellerGets - boostTotal)} сом</span></div>
            <div className="mt-1 text-[11px] text-muted-foreground">Деньги придут после подтверждения получения букета покупателем.</div>
          </div>

          <div className="rounded-2xl bg-accent p-2.5 text-[11px] text-accent-foreground">
            Объявление активно 24 часа. Место встречи вы согласуете с покупателем в чате.
          </div>
        </div>
      </div>

      {/* Sticky publish bar */}
      <div className="fixed bottom-[72px] left-0 right-0 z-30 border-t border-border/60 bg-background/95 backdrop-blur md:bottom-0">
        <div className="mx-auto flex max-w-2xl items-center gap-3 p-3">
          <div className="min-w-0 flex-1">
            <div className="text-[11px] text-muted-foreground">Публикация · {district}</div>
            <div className="font-display text-lg font-semibold text-primary">{price} сом</div>
          </div>
          <Button size="lg" className="rounded-full px-6" onClick={publish} disabled={!analyzed}>Опубликовать</Button>
        </div>
      </div>
    </AppLayout>
  );
}