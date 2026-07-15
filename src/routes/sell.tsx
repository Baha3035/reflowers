import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { AppLayout } from "@/components/marketplace/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { DISTRICTS } from "@/lib/mock-data";
import { Camera, ChevronLeft, Sparkles, ChevronDown } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export const Route = createFileRoute("/sell")({
  head: () => ({ meta: [{ title: "Продать букет — Gül Market" }, { name: "description", content: "Опубликуйте объявление о продаже букета за 30 секунд." }] }),
  component: Sell,
});

function Sell() {
  const navigate = useNavigate();
  const [photos, setPhotos] = useState<string[]>([]);
  const [price, setPrice] = useState("1900");
  const [district, setDistrict] = useState("Центр");
  const [showAdvanced, setShowAdvanced] = useState(false);
  const analyzed = photos.length > 0;

  const publish = () => {
    toast.success("Объявление опубликовано! Активно 24 часа.");
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
            Название, описание, доставка — необязательно
            <ChevronDown className={cn("h-4 w-4 transition", showAdvanced && "rotate-180")} />
          </button>
          {showAdvanced && (
            <div className="space-y-3">
              <Input placeholder="Название (иначе AI придумает)" />
              <Input placeholder="Описание (необязательно)" />
              <div className="space-y-2">
                {["Самовывоз — бесплатно", "Курьерская доставка — 400 сом", "Доставка за час — 550 сом"].map(o => (
                  <label key={o} className="flex cursor-pointer items-center gap-3 rounded-2xl border border-border bg-background p-2.5 text-sm">
                    <input type="checkbox" defaultChecked className="accent-primary" /><span>{o}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          <div className="rounded-2xl bg-accent p-2.5 text-[11px] text-accent-foreground">
            Объявление активно 24 часа. По умолчанию: самовывоз + курьер, торг возможен, номер скрыт.
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