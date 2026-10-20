import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { useApp } from "@/lib/store";
import { useQueryClient } from "@tanstack/react-query";
import { AppLayout } from "@/components/marketplace/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { DISTRICTS } from "@/lib/marketplace";
import { shrinkImage } from "@/lib/image";
import { contactSettingsToProfile } from "@/lib/contacts";
import { ContactSettingsForm, EMPTY_CONTACTS, loadMyContacts } from "@/components/marketplace/SellerContacts";
import { Camera, ChevronLeft, Sparkles, ChevronDown, TrendingUp, Palette, Crown, Flame, X, Loader2, AlertTriangle } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";
import { analyzeBouquet, type BouquetAnalysis } from "@/lib/analyze-bouquet.functions";

export const Route = createFileRoute("/sell")({
  head: () => ({ meta: [{ title: "Продать букет — ReFlowers" }, { name: "description", content: "Опубликуйте объявление о продаже букета за 30 секунд." }] }),
  component: Sell,
});

function Sell() {
  const navigate = useNavigate();
  const { user } = useApp();
  const qc = useQueryClient();
  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [photos, setPhotos] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);
  // No default price: if the AI estimate fails, the seller must type one rather than publish at a made-up 1900.
  const [price, setPrice] = useState("");
  const [district, setDistrict] = useState("Центр");
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [boosts, setBoosts] = useState<Record<string, boolean>>({});
  const analyzed = photos.length > 0;
  const [ai, setAi] = useState<BouquetAnalysis | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiFailed, setAiFailed] = useState(false);
  const [contacts, setContacts] = useState(EMPTY_CONTACTS);
  const [contactsLoaded, setContactsLoaded] = useState(false);
  const runAnalyze = useServerFn(analyzeBouquet);
  const [priceTouched, setPriceTouched] = useState(false);
  const [titleTouched, setTitleTouched] = useState(false);
  const [descTouched, setDescTouched] = useState(false);

  useEffect(() => {
    if (!user || contactsLoaded) return;
    loadMyContacts(user.id).then(c => { setContacts(c); setContactsLoaded(true); });
  }, [user, contactsLoaded]);

  // Analyze whenever photos change
  useEffect(() => {
    if (photos.length === 0) { setAi(null); setAiFailed(false); return; }
    let cancelled = false;
    setAiLoading(true);
    setAiFailed(false);
    runAnalyze({ data: { images: photos } })
      .then(res => {
        if (cancelled) return;
        setAi(res);
        if (res.isBouquet && !res.priceMax) setAiFailed(true);
        if (res.isBouquet) {
          if (!titleTouched && res.title) setTitle(res.title);
          if (!descTouched && res.description) setDesc(res.description);
          if (!priceTouched && res.priceMin && res.priceMax) {
            setPrice(String(Math.round((res.priceMin + res.priceMax) / 2)));
          }
        }
      })
      .catch(() => { if (!cancelled) setAiFailed(true); })
      .finally(() => { if (!cancelled) setAiLoading(false); });
    return () => { cancelled = true; };
  }, [photos, runAnalyze, titleTouched, descTouched, priceTouched]);

  const onPickPhotos = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    if (!user) {
      toast.info("Войдите, чтобы загрузить фото");
      navigate({ to: "/auth", search: { redirect: "/sell" } });
      return;
    }
    const remaining = 6 - photos.length;
    const chosen = Array.from(files).slice(0, remaining);
    setUploading(true);
    try {
      const uploaded: string[] = [];
      for (const original of chosen) {
        if (!original.type.startsWith("image/")) continue;
        const file = await shrinkImage(original);
        if (file.size > 10 * 1024 * 1024) { toast.error(`${original.name}: больше 10 МБ`); continue; }
        const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
        const path = `${user.id}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
        const { error: upErr } = await supabase.storage.from("listing-photos").upload(path, file, {
          contentType: file.type, upsert: false,
        });
        if (upErr) { toast.error(upErr.message); continue; }
        const { data: signed } = await supabase.storage.from("listing-photos").createSignedUrl(path, 60 * 60 * 24 * 365 * 10);
        if (signed?.signedUrl) uploaded.push(signed.signedUrl);
      }
      if (uploaded.length) setPhotos(p => [...p, ...uploaded]);
    } finally {
      setUploading(false);
      if (fileInput.current) fileInput.current.value = "";
    }
  };

  const removePhoto = (i: number) => setPhotos(p => p.filter((_, idx) => idx !== i));

  const BOOSTS = [
    { id: "up", label: "Поднять объявление", price: 50, icon: TrendingUp, desc: "+3× просмотров" },
    { id: "color", label: "Выделить цветом", price: 80, icon: Palette, desc: "Заметнее в ленте" },
    { id: "top", label: "В топ на сутки", price: 150, icon: Crown, desc: "Первые позиции" },
    { id: "urgent", label: "«Успейте купить сегодня»", price: 100, icon: Flame, desc: "Отдельный раздел" },
  ];
  const boostTotal = BOOSTS.filter(b => boosts[b.id]).reduce((s, b) => s + b.price, 0);
  const numPrice = Number(price) || 0;
  const contactCheck = contactSettingsToProfile(contacts);

  const publish = async () => {
    if (!user) {
      toast.info("Войдите, чтобы опубликовать");
      navigate({ to: "/auth", search: { redirect: "/sell" } });
      return;
    }
    if (numPrice <= 0) { toast.error("Укажите цену"); return; }
    if (!contactCheck.ok) { toast.error(contactCheck.error); return; }
    setSubmitting(true);
    try {
      const { error: profileError } = await supabase.from("profiles").update(contactCheck.profile).eq("id", user.id);
      if (profileError) throw profileError;
      const { data: inserted, error } = await supabase.from("listings").insert({
        seller_id: user.id,
        title: title || "Свежий букет",
        description: desc || null,
        price: numPrice,
        category: "Смешанные",
        condition: "fresh",
        city: "Бишкек",
        district,
        images: photos,
        urgent: false,
        status: "active",
      }).select("id").single();
      if (error) throw error;
      await qc.invalidateQueries({ queryKey: ["db-listings"] });
      const selectedIds = BOOSTS.filter(b => boosts[b.id]).map(b => b.id).join(",");
      if (selectedIds && inserted?.id) {
        toast.success("Объявление опубликовано. Оплатите продвижение.");
        navigate({ to: "/boost-checkout", search: { listing: inserted.id, kinds: selectedIds } });
      } else {
        toast.success("Объявление опубликовано!");
        setTimeout(() => navigate({ to: "/catalog" }), 500);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Не удалось опубликовать");
    } finally {
      setSubmitting(false);
    }
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
                const url = photos[i];
                if (url) {
                  return (
                    <div key={i} className="relative aspect-square overflow-hidden rounded-2xl bg-secondary">
                      <img src={url} alt="" className="h-full w-full object-cover" />
                      <button type="button" onClick={() => removePhoto(i)} className="absolute right-1 top-1 grid h-6 w-6 place-items-center rounded-full bg-background/90 text-foreground shadow">
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  );
                }
                const isNext = i === photos.length;
                return (
                  <button
                    key={i}
                    type="button"
                    disabled={!isNext || uploading}
                    onClick={() => fileInput.current?.click()}
                    className={cn(
                      "grid aspect-square place-items-center rounded-2xl border-2 border-dashed transition",
                      isNext ? "border-border bg-muted hover:border-primary" : "border-border/40 bg-muted/50",
                    )}
                  >
                    {isNext && uploading
                      ? <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                      : <Camera className="h-5 w-5 text-muted-foreground" />}
                  </button>
                );
              })}
            </div>
            <input
              ref={fileInput}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={e => onPickPhotos(e.target.files)}
            />

            {analyzed && (
              aiLoading ? (
                <div className="mt-3 flex items-center gap-2 rounded-2xl border border-primary/30 bg-primary/5 p-3 text-xs text-primary">
                  <Loader2 className="h-4 w-4 animate-spin" /> Умная оценка анализирует фото…
                </div>
              ) : aiFailed ? (
                <div className="mt-3 rounded-2xl border border-border bg-muted p-3 text-[13px] text-foreground/80">
                  Умная оценка сейчас недоступна — укажите цену и название сами.
                </div>
              ) : ai && !ai.isBouquet ? (
                <div className="mt-3 rounded-2xl border border-destructive/30 bg-destructive/5 p-3">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-destructive"><AlertTriangle className="h-3.5 w-3.5" /> Похоже, это не букет цветов</div>
                  <p className="mt-1 text-[13px] text-foreground/80">{ai.reason || "Загрузите фото букета, чтобы получить оценку и опубликовать объявление."}</p>
                </div>
              ) : ai ? (
                <div className="mt-3 rounded-2xl border border-primary/30 bg-primary/5 p-3">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-primary"><Sparkles className="h-3.5 w-3.5" /> Умная оценка</div>
                  <ul className="mt-1.5 space-y-0.5 text-[13px] text-foreground/80">
                    {ai.title && <li>• {ai.title}</li>}
                    {ai.description && <li>• {ai.description}</li>}
                    {ai.priceMin > 0 && ai.priceMax > 0 && (
                      <li>• Рекомендуемая цена: <b>{ai.priceMin.toLocaleString("ru-RU")}–{ai.priceMax.toLocaleString("ru-RU")} сом</b></li>
                    )}
                  </ul>
                </div>
              ) : null
            )}
          </div>

          {/* Price */}
          <div>
            <div className="mb-2 text-sm font-semibold">2. Ваша цена</div>
            <div className="flex items-center gap-2">
              <Input value={price} onChange={e => { setPrice(e.target.value); setPriceTouched(true); }} type="number" inputMode="numeric" min={1} placeholder="Например, 1500" className="text-lg font-semibold" />
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

          {/* Contacts */}
          <div>
            <div className="mb-2 text-sm font-semibold">4. Как с вами связаться</div>
            <ContactSettingsForm value={contacts} onChange={setContacts} />
          </div>

          {/* Advanced (optional) */}
          <button onClick={() => setShowAdvanced(s => !s)} className="flex w-full items-center justify-between rounded-2xl bg-muted px-3 py-2.5 text-xs font-medium text-foreground/70">
            Название и описание — необязательно
            <ChevronDown className={cn("h-4 w-4 transition", showAdvanced && "rotate-180")} />
          </button>
          {showAdvanced && (
            <div className="space-y-3">
              <Input value={title} onChange={e => { setTitle(e.target.value); setTitleTouched(true); }} placeholder="Название (иначе AI придумает)" />
              <Input value={desc} onChange={e => { setDesc(e.target.value); setDescTouched(true); }} placeholder="Описание (необязательно)" />
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
            {boostTotal > 0 && <div className="flex justify-between text-muted-foreground"><span>Продвижение</span><span>+{boostTotal} сом (оплачивается отдельно)</span></div>}
            <div className="mt-1.5 flex justify-between border-t border-border pt-1.5 font-semibold text-foreground"><span>На карту после продажи</span><span className="text-primary">{numPrice} сом</span></div>
            <div className="mt-1 text-[11px] text-muted-foreground">Без комиссии. Деньги — напрямую от покупателя после получения букета.</div>
          </div>

          <div className="rounded-2xl bg-accent p-2.5 text-[11px] text-accent-foreground">
            Объявление активно 24 часа — продлить можно в профиле, пока букет свежий. Место встречи согласуете с покупателем.
          </div>
        </div>
      </div>

      {/* Sticky publish bar */}
      <div className="fixed bottom-[72px] left-0 right-0 z-30 border-t border-border/60 bg-background/95 backdrop-blur md:bottom-0">
        <div className="mx-auto flex max-w-2xl items-center gap-3 p-3">
          <div className="min-w-0 flex-1">
            <div className="text-[11px] text-muted-foreground">Публикация · {district}</div>
            <div className="font-display text-lg font-semibold text-primary">{numPrice > 0 ? `${numPrice} сом` : "Цена не указана"}</div>
          </div>
          <Button size="lg" className="rounded-full px-6" onClick={publish} disabled={!analyzed || submitting || aiLoading || numPrice <= 0 || (ai ? !ai.isBouquet : false)}>
            {submitting ? "…" : "Опубликовать"}
          </Button>
        </div>
      </div>
    </AppLayout>
  );
}