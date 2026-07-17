import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { z } from "zod";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useApp } from "@/lib/store";
import { useQueryClient } from "@tanstack/react-query";
import { AppLayout } from "@/components/marketplace/AppLayout";
import { Button } from "@/components/ui/button";
import { ShieldCheck, TrendingUp, Palette, Crown, Flame } from "lucide-react";

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

  const ids = kinds.split(",").filter(Boolean).filter(id => id in BOOSTS);
  const items = ids.map(id => ({ id, ...BOOSTS[id] }));
  const total = items.reduce((s, b) => s + b.price, 0);

  const pay = async () => {
    if (!user) { toast.info("Войдите"); return; }
    setPaying(true);
    try {
      const now = Date.now();
      const rows = items.map(b => ({
        listing_id: listing,
        user_id: user.id,
        kind: b.kind,
        price: b.price,
        expires_at: new Date(now + b.hours * 3600_000).toISOString(),
      }));
      const { error: be } = await supabase.from("listing_boosts").insert(rows);
      if (be) throw be;

      // Apply boost flags on listing
      const patch: Record<string, string | boolean> = {};
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
      toast.success("Продвижение оплачено и активировано!");
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

          <div className="mt-2 flex items-start gap-1.5 rounded-2xl bg-secondary/60 p-2.5 text-[11px] text-muted-foreground">
            <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
            <span>ReFlowers берёт оплату только за продвижение объявлений. С самой продажи букета мы не удерживаем комиссию.</span>
          </div>

          <Button size="lg" className="mt-3 w-full rounded-full" onClick={pay} disabled={paying || items.length === 0 || total === 0}>
            {paying ? "…" : `Оплатить ${total} сом`}
          </Button>
          <Link to="/catalog" className="mt-2 block text-center text-xs text-muted-foreground hover:underline">
            Пропустить — опубликовать без продвижения
          </Link>
        </div>
      </div>
    </AppLayout>
  );
}