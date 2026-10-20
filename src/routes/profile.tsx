import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AppLayout } from "@/components/marketplace/AppLayout";
import { supabase } from "@/integrations/supabase/client";
import { useApp } from "@/lib/store";
import { LISTING_COLUMNS, mapDbListing, type DbListing } from "@/lib/db-listings";
import { contactSettingsToProfile } from "@/lib/contacts";
import { ContactSettingsForm, EMPTY_CONTACTS, loadMyContacts } from "@/components/marketplace/SellerContacts";
import { Button } from "@/components/ui/button";
import { BadgeCheck, Bell, Check, Clock, Phone, ChevronRight, Globe, Heart, HelpCircle, LogOut, MapPin, Package, Settings, ShoppingBag, Star, Store, Trash2, User as UserIcon, Wallet } from "lucide-react";
import { toast } from "sonner";
import { useState } from "react";
import { ListingCard } from "@/components/marketplace/ListingCard";
import { ReviewSection } from "@/components/marketplace/ReviewSection";

export const Route = createFileRoute("/profile")({
  head: () => ({ meta: [{ title: "Мой профиль — ReFlowers" }] }),
  component: Profile,
});

function Profile() {
  const { user, authLoading, signOut } = useApp();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [showSold, setShowSold] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) navigate({ to: "/auth", search: { redirect: "/profile" } });
  }, [user, authLoading, navigate]);

  const profile = useQuery({
    queryKey: ["my-profile", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("id, display_name, avatar_url, seller_type, shop_name, city, verified, rating, reviews_count, created_at")
        .eq("id", user!.id)
        .maybeSingle();
      return data;
    },
  });

  const myListings = useQuery({
    queryKey: ["my-listings", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("listings")
        .select(LISTING_COLUMNS)
        .eq("seller_id", user!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as DbListing[];
    },
  });

  const markSold = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("listings").update({ status: "sold" }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["my-listings", user?.id] });
      qc.invalidateQueries({ queryKey: ["db-listings"] });
    },
  });

  const removeListing = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("listings").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["my-listings", user?.id] });
      qc.invalidateQueries({ queryKey: ["db-listings"] });
    },
  });

  const extendListing = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.rpc("extend_listing", { _listing_id: id });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Объявление продлено на 24 часа");
      qc.invalidateQueries({ queryKey: ["my-listings", user?.id] });
      qc.invalidateQueries({ queryKey: ["db-listings"] });
    },
    onError: (e: Error) =>
      toast.error(e.message.includes("5 days") ? "Букету больше 5 дней — опубликуйте новое объявление" : e.message),
  });

  const [contacts, setContacts] = useState(EMPTY_CONTACTS);
  const [showContacts, setShowContacts] = useState(false);
  useEffect(() => {
    if (user) loadMyContacts(user.id).then(setContacts);
  }, [user]);
  const saveContacts = useMutation({
    mutationFn: async () => {
      const check = contactSettingsToProfile(contacts);
      if (!check.ok) throw new Error(check.error);
      const { error } = await supabase.from("profiles").update(check.profile).eq("id", user!.id);
      if (error) throw error;
    },
    onSuccess: () => toast.success("Контакты сохранены"),
    onError: (e: Error) => toast.error(e.message),
  });

  if (authLoading || !user) {
    return <AppLayout><div className="mx-auto max-w-md p-10 text-center text-sm text-muted-foreground">Загрузка…</div></AppLayout>;
  }

  const p = profile.data;
  const isShop = p?.seller_type === "shop";
  const displayName = (isShop ? p?.shop_name : p?.display_name) || user.email?.split("@")[0] || "Профиль";
  const initial = displayName.charAt(0).toUpperCase();
  const activeAll = myListings.data ?? [];
  const now = Date.now();
  const active = activeAll.filter(l => l.status === "active" && new Date(l.expires_at).getTime() > now);
  // Expired: past expires_at but not sold/hidden. Can be extended while the bouquet is under 5 days old.
  const expired = activeAll.filter(l => (l.status === "active" || l.status === "expired") && new Date(l.expires_at).getTime() <= now);
  const soldListings = activeAll.filter(l => l.status === "sold");
  const sold = soldListings.length;
  const created = p?.created_at ? new Date(p.created_at) : new Date(user.created_at);
  const monthNames = ["января","февраля","марта","апреля","мая","июня","июля","августа","сентября","октября","ноября","декабря"];
  const since = `с ${monthNames[created.getMonth()]} ${created.getFullYear()}`;

  return (
    <AppLayout>
      <div className="mx-auto max-w-3xl px-4 py-6 md:px-8">
        <div className="flex items-center gap-4">
          <div className="grid h-16 w-16 shrink-0 place-items-center rounded-2xl bg-primary font-display text-2xl font-semibold text-primary-foreground overflow-hidden">
            {p?.avatar_url ? <img src={p.avatar_url} alt="" className="h-full w-full object-cover" /> : initial}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <h1 className="truncate font-display text-2xl">{displayName}</h1>
              {p?.verified && <BadgeCheck className="h-5 w-5 text-primary" />}
              <span className="ml-1 inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[11px] text-muted-foreground">
                {isShop ? <><Store className="h-3 w-3" /> Магазин</> : <><UserIcon className="h-3 w-3" /> Частное</>}
              </span>
            </div>
            <div className="mt-0.5 flex items-center gap-2 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-0.5"><Star className="h-3 w-3" style={{ fill: "var(--gold)", color: "var(--gold)" }} />{Number(p?.rating ?? 0).toFixed(1)}</span>
              <span>· {sold} продаж</span>
              <span>· {since}</span>
            </div>
            <div className="mt-0.5 truncate text-[11px] text-muted-foreground">{user.email}</div>
          </div>
          <Link to="/sell" className="hidden rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground md:block">+ Новое</Link>
        </div>

        <div className="mt-5 grid grid-cols-3 gap-3">
          <Stat n={String(active.length)} label="Активных" />
          <Stat n={String(sold)} label="Продано" />
          <Stat n={String(p?.reviews_count ?? 0)} label="Отзывов" />
        </div>

        <h2 className="mt-8 font-display text-lg">Мои активные объявления</h2>
        {myListings.isLoading ? (
          <div className="mt-3 rounded-2xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">Загрузка…</div>
        ) : myListings.error ? (
          <div className="mt-3 rounded-2xl border border-destructive/40 bg-destructive/5 p-6 text-center text-sm text-destructive">
            Не удалось загрузить объявления: {(myListings.error as Error).message}
          </div>
        ) : active.length === 0 ? (
          <div className="mt-3 rounded-2xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
            {activeAll.length > 0
              ? <>У вас {activeAll.length} объявлений, но нет активных. <Link to="/sell" className="text-primary underline">Опубликовать новое</Link></>
              : <>У вас пока нет объявлений. <Link to="/sell" className="text-primary underline">Опубликовать</Link></>}
          </div>
        ) : (
          <div className="mt-3 grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-4">
            {active.map(l => (
              <div key={l.id} className="flex flex-col gap-2">
                <ListingCard listing={mapDbListing(l)} />
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => markSold.mutate(l.id)}
                    disabled={markSold.isPending}
                    className="flex-1 inline-flex items-center justify-center gap-1 rounded-full bg-primary px-3 py-2 text-xs font-medium text-primary-foreground disabled:opacity-50"
                  >
                    <Check className="h-3.5 w-3.5" /> Продано
                  </button>
                  <button
                    type="button"
                    onClick={() => { if (confirm("Удалить объявление?")) removeListing.mutate(l.id); }}
                    disabled={removeListing.isPending}
                    className="inline-flex items-center justify-center gap-1 rounded-full bg-muted px-3 py-2 text-xs font-medium text-destructive disabled:opacity-50"
                    aria-label="Удалить"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {expired.length > 0 && (
          <>
            <h2 className="mt-8 font-display text-lg">Истекли</h2>
            <p className="mt-1 text-xs text-muted-foreground">Покупатели их больше не видят. Букет ещё свежий? Продлите на 24 часа.</p>
            <div className="mt-3 grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-4">
              {expired.map(l => (
                <div key={l.id} className="flex flex-col gap-2">
                  <div className="opacity-60"><ListingCard listing={mapDbListing(l)} /></div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => extendListing.mutate(l.id)}
                      disabled={extendListing.isPending}
                      className="flex-1 inline-flex items-center justify-center gap-1 rounded-full bg-primary px-3 py-2 text-xs font-medium text-primary-foreground disabled:opacity-50"
                    >
                      <Clock className="h-3.5 w-3.5" /> Продлить
                    </button>
                    <button
                      type="button"
                      onClick={() => { if (confirm("Удалить объявление?")) removeListing.mutate(l.id); }}
                      disabled={removeListing.isPending}
                      className="inline-flex items-center justify-center gap-1 rounded-full bg-muted px-3 py-2 text-xs font-medium text-destructive disabled:opacity-50"
                      aria-label="Удалить"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        <ReviewSection targetUserId={user.id} />

        <h2 className="mt-8 font-display text-lg">Настройки</h2>
        <div className="mt-3 divide-y divide-border rounded-3xl bg-card shadow-[var(--shadow-card)]">
          <Row icon={ShoppingBag} label="Мои заказы" onClick={() => toast.info("История заказов скоро появится")} />
          <Row icon={Package} label={`Проданные букеты · ${sold}`} onClick={() => setShowSold(v => !v)} />
          {showSold && (
            <div className="px-4 py-3">
              {soldListings.length === 0 ? (
                <div className="text-center text-xs text-muted-foreground">Пока нет проданных букетов</div>
              ) : (
                <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
                  {soldListings.map(l => (
                    <div key={l.id} className="flex flex-col gap-2">
                      <ListingCard listing={mapDbListing(l)} />
                      <button
                        type="button"
                        onClick={() => { if (confirm("Удалить проданное объявление?")) removeListing.mutate(l.id); }}
                        disabled={removeListing.isPending}
                        className="inline-flex items-center justify-center gap-1 rounded-full bg-muted px-3 py-2 text-xs font-medium text-destructive disabled:opacity-50"
                      >
                        <Trash2 className="h-3.5 w-3.5" /> Удалить
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
          <Row icon={Phone} label="Контакты для покупателей" onClick={() => setShowContacts(v => !v)} />
          {showContacts && (
            <div className="space-y-3 px-4 py-3">
              <ContactSettingsForm value={contacts} onChange={setContacts} />
              <Button size="sm" className="rounded-full" disabled={saveContacts.isPending} onClick={() => saveContacts.mutate()}>Сохранить</Button>
            </div>
          )}
          <Row icon={Heart} label="Избранное" to="/favorites" />
          <Row icon={Wallet} label="Способы оплаты" onClick={() => toast.info("Способы оплаты скоро появятся")} />
          <Row icon={MapPin} label="Адреса доставки" onClick={() => toast.info("Адреса доставки скоро появятся")} />
          <Row icon={Globe} label="Язык · Русский" onClick={() => toast.info("Смена языка — в шапке сверху")} />
          <Row icon={Bell} label="Уведомления" to="/notifications" />
          <Row icon={HelpCircle} label="Поддержка" onClick={() => toast.info("Свяжитесь с нами: support@reflowers.kg")} />
          <Row icon={Settings} label="Настройки" onClick={() => toast.info("Настройки скоро появятся")} />
          <Row icon={LogOut} label="Выйти" destructive onClick={() => { signOut().then(() => navigate({ to: "/" })); }} />
        </div>
      </div>
    </AppLayout>
  );
}

function Stat({ n, label }: { n: string; label: string }) {
  return <div className="rounded-2xl bg-card p-4 text-center shadow-[var(--shadow-card)]"><div className="font-display text-2xl font-semibold text-primary">{n}</div><div className="mt-0.5 text-xs text-muted-foreground">{label}</div></div>;
}

function Row({ icon: Icon, label, to, destructive, onClick }: { icon: any; label: string; to?: string; destructive?: boolean; onClick?: () => void }) {
  const inner = (
    <div className="flex items-center gap-3 px-4 py-3.5">
      <Icon className={"h-4 w-4 " + (destructive ? "text-destructive" : "text-muted-foreground")} />
      <span className={"flex-1 text-sm " + (destructive ? "text-destructive" : "text-foreground")}>{label}</span>
      <ChevronRight className="h-4 w-4 text-muted-foreground" />
    </div>
  );
  if (to) return <Link to={to}>{inner}</Link>;
  if (onClick) return <button type="button" onClick={onClick} className="w-full text-left">{inner}</button>;
  return <div>{inner}</div>;
}