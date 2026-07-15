import { createFileRoute, Link } from "@tanstack/react-router";
import { AppLayout } from "@/components/marketplace/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { DISTRICTS } from "@/lib/mock-data";
import { Camera, Check, ChevronLeft, Sparkles } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export const Route = createFileRoute("/sell")({
  head: () => ({ meta: [{ title: "Продать букет — Gül Market" }, { name: "description", content: "Опубликуйте объявление о продаже букета за 2 минуты." }] }),
  component: Sell,
});

const STEPS = ["Фото", "Букет", "Цена", "Доставка", "Готово"];

function Sell() {
  const [step, setStep] = useState(0);
  const [photos, setPhotos] = useState<string[]>([]);
  const [price, setPrice] = useState("1900");
  const [priceMode, setPriceMode] = useState("Рыночная цена");

  const analyzed = photos.length > 0;

  return (
    <AppLayout>
      <div className="mx-auto max-w-2xl px-4 pb-32 pt-4 md:px-8">
        <div className="mb-4 flex items-center gap-2">
          <Link to="/" className="grid h-10 w-10 place-items-center rounded-full bg-muted"><ChevronLeft className="h-4 w-4" /></Link>
          <h1 className="font-display text-2xl">Продать букет</h1>
        </div>

        {/* Stepper */}
        <div className="mb-6 flex items-center gap-1">
          {STEPS.map((s, i) => (
            <div key={s} className="flex flex-1 items-center gap-1">
              <div className={cn("grid h-8 w-8 place-items-center rounded-full text-xs font-medium", i <= step ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground")}>
                {i < step ? <Check className="h-4 w-4" /> : i + 1}
              </div>
              {i < STEPS.length - 1 && <div className={cn("h-0.5 flex-1 rounded-full", i < step ? "bg-primary" : "bg-muted")} />}
            </div>
          ))}
        </div>

        <div className="rounded-3xl bg-card p-5 shadow-[var(--shadow-card)] md:p-6">
          {step === 0 && (
            <div>
              <h2 className="font-display text-xl">Добавьте свежие фотографии букета</h2>
              <p className="mt-1 text-sm text-muted-foreground">Лучше всего фотографировать букет при дневном свете. До 6 фото.</p>
              <div className="mt-4 grid grid-cols-3 gap-2">
                {Array.from({ length: 6 }).map((_, i) => {
                  const has = photos[i];
                  return (
                    <button key={i} onClick={() => setPhotos(p => [...p, `demo-${p.length}`])} className={cn("aspect-square rounded-2xl border-2 border-dashed transition", has ? "border-transparent bg-secondary" : "border-border bg-muted hover:border-primary")}>
                      {has ? <div className="grid h-full w-full place-items-center text-2xl">🌸</div> : <Camera className="mx-auto h-5 w-5 text-muted-foreground" />}
                    </button>
                  );
                })}
              </div>

              {analyzed && (
                <div className="mt-5 rounded-2xl border border-primary/30 bg-primary/5 p-4">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-primary"><Sparkles className="h-3.5 w-3.5" /> Умная оценка</div>
                  <ul className="mt-2 space-y-1 text-sm text-foreground/80">
                    <li>• Похоже, это букет из 25 красных роз.</li>
                    <li>• Примерная стоимость нового букета: 3 500–4 500 сом.</li>
                    <li>• Рекомендуемая цена для быстрой продажи: 1 800–2 300 сом.</li>
                  </ul>
                </div>
              )}
            </div>
          )}

          {step === 1 && (
            <div className="space-y-3">
              <h2 className="font-display text-xl">Расскажите о букете</h2>
              <Field label="Название объявления"><Input placeholder="Букет из 25 красных роз" /></Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Тип цветов"><Input placeholder="Розы" /></Field>
                <Field label="Цвет"><Input placeholder="Красный" /></Field>
                <Field label="Размер"><Input placeholder="Средний" /></Field>
                <Field label="Количество"><Input placeholder="25" /></Field>
              </div>
              <Field label="Когда получен"><Input placeholder="Сегодня в 10:00" /></Field>
              <Field label="Состояние">
                <div className="flex gap-2">{["Как новый", "Свежий", "1–2 дня"].map(o => <Chip key={o}>{o}</Chip>)}</div>
              </Field>
              <Field label="Описание"><Textarea rows={3} placeholder="Свежий букет, стоит в воде..." /></Field>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <h2 className="font-display text-xl">Установите цену</h2>
              <div className="rounded-2xl bg-secondary p-4 text-sm">
                <div className="text-xs text-secondary-foreground/70">💡 Похожие букеты продаются за</div>
                <div className="mt-0.5 font-display text-2xl font-semibold text-secondary-foreground">1 800 – 2 300 сом</div>
              </div>
              <Field label="Ваша цена (сом)"><Input value={price} onChange={e => setPrice(e.target.value)} type="number" /></Field>
              <Field label="Примерная стоимость в магазине (сом)"><Input placeholder="3500" type="number" /></Field>
              <div className="grid grid-cols-3 gap-2">
                {["Продать быстро", "Рыночная цена", "Своя цена"].map(m => (
                  <button key={m} onClick={() => setPriceMode(m)} className={cn("rounded-2xl border p-3 text-xs font-medium transition", priceMode === m ? "border-primary bg-primary/5 text-primary" : "border-border bg-background")}>{m}</button>
                ))}
              </div>
              <Field label="Возможен ли торг">
                <div className="flex gap-2">{["Да", "Нет"].map(o => <Chip key={o}>{o}</Chip>)}</div>
              </Field>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4">
              <h2 className="font-display text-xl">Локация и доставка</h2>
              <Field label="Район">
                <div className="flex flex-wrap gap-1.5">{DISTRICTS.map(d => <Chip key={d}>{d}</Chip>)}</div>
              </Field>
              <Field label="Точный адрес (скрыт до покупки)"><Input placeholder="ул. Токтогула 145, кв. 12" /></Field>
              <Field label="Варианты доставки">
                <div className="space-y-2">
                  {["Самовывоз — бесплатно", "Доставка продавцом — 250 сом", "Курьерская доставка — 400 сом", "Доставка за час — 550 сом"].map(o => (
                    <label key={o} className="flex cursor-pointer items-center gap-3 rounded-2xl border border-border bg-background p-3 text-sm">
                      <input type="checkbox" defaultChecked className="accent-primary" />
                      <span>{o}</span>
                    </label>
                  ))}
                </div>
              </Field>
            </div>
          )}

          {step === 4 && (
            <div>
              <h2 className="font-display text-xl">Готово к публикации</h2>
              <div className="mt-4 flex gap-3 rounded-2xl bg-muted p-3">
                <div className="grid h-20 w-20 shrink-0 place-items-center rounded-xl bg-secondary text-3xl">🌹</div>
                <div className="min-w-0 flex-1">
                  <div className="font-medium">Букет из 25 красных роз</div>
                  <div className="mt-0.5 text-sm text-primary font-semibold">{price} сом</div>
                  <div className="mt-1 text-xs text-muted-foreground">Центр · Самовывоз, доставка</div>
                </div>
              </div>
              <div className="mt-4 rounded-2xl bg-accent p-3 text-xs text-accent-foreground">
                Объявление будет активно 24 часа. Вы сможете продлить его, подтвердив свежесть букета.
              </div>
              <label className="mt-4 flex items-start gap-2 text-xs text-foreground/70">
                <input type="checkbox" defaultChecked className="mt-0.5 accent-primary" />
                Я подтверждаю, что фотографии свежие и букет соответствует описанию.
              </label>
            </div>
          )}
        </div>
      </div>

      {/* Sticky action bar */}
      <div className="fixed bottom-[72px] left-0 right-0 z-30 border-t border-border/60 bg-background/95 backdrop-blur md:bottom-0">
        <div className="mx-auto flex max-w-2xl gap-2 p-3">
          {step > 0 && <Button variant="secondary" className="rounded-full" onClick={() => setStep(step - 1)}>Назад</Button>}
          <Button className="flex-1 rounded-full" onClick={() => {
            if (step === STEPS.length - 1) { toast.success("Объявление опубликовано! Активно 24 часа."); }
            else setStep(step + 1);
          }}>
            {step === STEPS.length - 1 ? "Опубликовать" : "Далее"}
          </Button>
        </div>
      </div>
    </AppLayout>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div><label className="mb-1.5 block text-xs font-medium text-muted-foreground">{label}</label>{children}</div>;
}
function Chip({ children }: { children: React.ReactNode }) {
  const [on, setOn] = useState(false);
  return <button onClick={() => setOn(!on)} className={cn("rounded-full border px-3 py-1.5 text-xs font-medium transition", on ? "border-primary bg-primary text-primary-foreground" : "border-border bg-background text-foreground/80")}>{children}</button>;
}