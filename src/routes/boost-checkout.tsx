import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { z } from "zod";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useApp } from "@/lib/store";
import { useQueryClient } from "@tanstack/react-query";
import { AppLayout } from "@/components/marketplace/AppLayout";
import { Button } from "@/components/ui/button";
import { ShieldCheck, TrendingUp, Palette, Crown, Flame, Loader2, Copy, Check } from "lucide-react";

type BoostKind = "bump" | "highlight" | "top" | "urgent";

const BOOSTS: Record<string, { kind: BoostKind; label: string; price: number; hours: number; icon: React.ComponentType<{ className?: string }>; desc: string }> = {
  up:     { kind: "bump",      label: "Поднять объявление",         price: 50,  hours: 24, icon: TrendingUp, desc: "+3× просмотров" },
  color:  { kind: "highlight", label: "Выделить цветом",            price: 80,  hours: 48, icon: Palette,    desc: "Заметнее в ленте" },
  top:    { kind: "top",       label: "В топ на сутки",             price: 150, hours: 24, icon: Crown,      desc: "Первые позиции" },
  urgent: { kind: "urgent",    label: "«Успейте купить сегодня»",   price: 100, hours: 24, icon: Flame,      desc: "Отдельный раздел" },
};

export const Route = createFileRoute("/boost-checkout")({
  validateSearch: (s) => z.object({ listing: z.string(), kinds: z.string() }).parse(s),
  head: () => ({ meta: [{ title: "Оплата продвижения — ReFlowers" }] }),
  component: BoostCheckout,
});

function BoostCheckout() {
  const { listing, kinds } = Route.useSearch();
  const { user } = useApp();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [paying, setPaying] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [receipt, setReceipt] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const fileRef = useRef<HTMLInputElement | null>(null);

  const ids: string[] = kinds.split(",").filter(Boolean).filter((id: string) => id in BOOSTS);
  const items = ids.map((id: string) => ({ id, ...BOOSTS[id] }));
  const total = items.reduce((s: number, b: { price: number }) => s + b.price, 0);

  const PLATFORM_PHONE = "+996 700 123 456";
  const PLATFORM_BANK = "MBank / O!Деньги · ReFlowers";

  const copyPhone = async () => {
    try {
      await navigator.clipboard.writeText(PLATFORM_PHONE);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch { /* noop */ }
  };

  async function uploadReceipt(f: File) {
    if (!user) { toast.info("Войдите"); return; }
    if (!f.type.startsWith("image/")) { toast.error("Нужно изображение чека"); return; }
    if (f.size > 10 * 1024 * 1024) { toast.error("Больше 10 МБ"); return; }
    setUploading(true);
    try {
      const ext = f.name.split(".").pop()?.toLowerCase() || "jpg";
      const path = `${user.id}/boost/${listing}-${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from("chat-photos").upload(path, f, { contentType: f.type, upsert: false });
      if (error) throw error;
      const { data } = await supabase.storage.from("chat-photos").createSignedUrl(path, 60 * 60 * 24 * 365);
      setReceipt(data?.signedUrl ?? null);
      toast.success("Чек прикреплён");
    } catch (e) {
      toast.error("Не удалось загрузить чек: " + (e instanceof Error ? e.message : String(e)));
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  const pay = async () => {
    if (!user) { toast.info("Войдите"); return; }
    if (!receipt) { toast.error("Прикрепите чек об оплате"); return; }
    setPaying(true);
    try {
      const now = Date.now();
      const rows = items.map(b => ({
        listing_id: listing,
        user_id: user.id,
        kind: b.kind,
        price: b.price,
        expires_at: new Date(now + b.hours * 3600_000).toISOString(),
        receipt_url: receipt,
      }));
      const { error: be } = await supabase.from("listing_boosts").insert(rows);
      if (be) throw be;

      // Apply boost flags on listing
      const patch: {
        boost_bump_until?: string;
        boost_highlight_until?: string;
        boost_top_until?: string;
        urgent?: boolean;
      } = {};
      for (const b of items) {
        const exp = new Date(now + b.hours * 3600_000).toISOString();
        if (b.kind === "bump") patch.boost_bump_until = exp;
        if (b.kind === "highlight") patch.boost_highlight_until = exp;
        if (b.kind === "top") patch.boost_top_until = exp;
        if (b.kind === "urgent") patch.urgent = true;
      }
      if (Object.keys(patch).length) {
        await supabase.from("listings").update(patch).eq("id", listing);
      }
      await qc.invalidateQueries({ queryKey: ["db-listings"] });
      toast.success("Чек получен — продвижение активировано!");
      setTimeout(() => navigate({ to: "/catalog" }), 500);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Не удалось оплатить");
    } finally {
      setPaying(false);
    }
  };

  return (
    <AppLayout>
      <div className="mx-auto max-w-xl px-4 py-6 md:px-8">
        <h1 className="font-display text-2xl md:text-3xl">Оплата продвижения</h1>
        <p className="mt-1 text-sm text-muted-foreground">Услуги активируются сразу после оплаты.</p>

        <div className="mt-5 space-y-2 rounded-3xl bg-card p-4 shadow-[var(--shadow-card)]">
          {items.map(b => {
            const Icon = b.icon;
            return (
              <div key={b.id} className="flex items-center gap-3 rounded-2xl border border-border p-2.5">
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary"><Icon className="h-4 w-4" /></span>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium">{b.label}</div>
                  <div className="text-[11px] text-muted-foreground">{b.desc} · {b.hours} ч</div>
                </div>
                <div className="text-sm font-semibold">{b.price} сом</div>
              </div>
            );
          })}
          {items.length === 0 && (
            <div className="text-sm text-muted-foreground">Не выбрано ни одной услуги.</div>
          )}

          <div className="mt-2 flex items-baseline justify-between border-t border-border pt-3">
            <span className="text-sm">К оплате</span>
            <span className="font-display text-2xl font-semibold text-primary">{total} сом</span>
          </div>

          {items.length > 0 && (
            <div className="mt-3 rounded-2xl border border-border bg-secondary/40 p-3">
              <div className="text-xs font-medium text-foreground/80">Реквизиты для оплаты</div>
              <div className="mt-2 space-y-1.5 text-sm">
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <div className="text-[11px] text-muted-foreground">Телефон / номер счёта</div>
                    <div className="truncate font-medium">{PLATFORM_PHONE}</div>
                  </div>
                  <button
                    type="button"
                    onClick={copyPhone}
                    className="grid h-8 w-8 shrink-0 place-items-center rounded-full border border-border bg-background text-muted-foreground hover:text-primary"
                    aria-label="Скопировать"
                  >
                    {copied ? <Check className="h-3.5 w-3.5 text-primary" /> : <Copy className="h-3.5 w-3.5" />}
                  </button>
                </div>
                <div>
                  <div className="text-[11px] text-muted-foreground">Способ</div>
                  <div className="font-medium">{PLATFORM_BANK}</div>
                </div>
                <div>
                  <div className="text-[11px] text-muted-foreground">Комментарий к переводу</div>
                  <div className="font-medium">Продвижение · {listing.slice(0, 8)}</div>
                </div>
              </div>
            </div>
          )}

          {items.length > 0 && (
            <div className="mt-3 rounded-2xl border border-border p-3">
              <div className="text-xs font-medium text-foreground/80">Чек об оплате (обязательно)</div>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                hidden
                onChange={e => { const f = e.target.files?.[0]; if (f) uploadReceipt(f); }}
              />
              <div className="mt-2 flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => fileRef.current?.click()}
                  disabled={uploading}
                >
                  {uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : receipt ? "Заменить чек" : "Прикрепить чек"}
                </Button>
                {receipt && (
                  <a href={receipt} target="_blank" rel="noreferrer" className="text-xs text-primary underline">
                    Просмотреть
                  </a>
                )}
              </div>
              {receipt ? (
                <a href={receipt} target="_blank" rel="noreferrer" className="mt-2 block">
                  <img src={receipt} alt="Чек" className="max-h-40 rounded-xl border border-border object-cover" />
                </a>
              ) : (
                <div className="mt-1.5 text-[11px] text-muted-foreground">
                  Переведите сумму на указанные реквизиты и приложите скриншот/фото чека. Продвижение активируется после получения чека.
                </div>
              )}
            </div>
          )}

          <div className="mt-2 flex items-start gap-1.5 rounded-2xl bg-secondary/60 p-2.5 text-[11px] text-muted-foreground">
            <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
            <span>ReFlowers берёт оплату только за продвижение объявлений. С самой продажи букета мы не удерживаем комиссию.</span>
          </div>

          <Button size="lg" className="mt-3 w-full rounded-full" onClick={pay} disabled={paying || items.length === 0 || total === 0 || !receipt || uploading}>
            {paying ? <Loader2 className="h-4 w-4 animate-spin" /> : receipt ? `Активировать за ${total} сом` : "Прикрепите чек"}
          </Button>
          <Link to="/catalog" className="mt-2 block text-center text-xs text-muted-foreground hover:underline">
            Пропустить — опубликовать без продвижения
          </Link>
        </div>
      </div>
    </AppLayout>
  );
}