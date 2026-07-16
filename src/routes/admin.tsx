import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { AppLayout } from "@/components/marketplace/AppLayout";
import { supabase } from "@/integrations/supabase/client";
import { useApp } from "@/lib/store";
import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import { ShieldCheck, Users, Package, ShoppingBag, Store, User as UserIcon } from "lucide-react";

export const Route = createFileRoute("/admin")({
  head: () => ({ meta: [{ title: "Админ — ReFlowers" }, { name: "description", content: "Панель управления участниками ReFlowers." }] }),
  component: AdminPage,
});

function useIsAdmin() {
  const { user } = useApp();
  return useQuery({
    queryKey: ["is-admin", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user!.id)
        .eq("role", "admin")
        .maybeSingle();
      if (error) return false;
      return !!data;
    },
  });
}

function AdminPage() {
  const { user, authLoading } = useApp();
  const navigate = useNavigate();
  const { data: isAdmin, isLoading: adminLoading } = useIsAdmin();

  useEffect(() => {
    if (!authLoading && !user) navigate({ to: "/auth" });
  }, [user, authLoading, navigate]);

  const profiles = useQuery({
    queryKey: ["admin-profiles"],
    enabled: !!isAdmin,
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("id, display_name, seller_type, shop_name, city, verified, rating, reviews_count, created_at")
        .order("created_at", { ascending: false })
        .limit(200);
      return data ?? [];
    },
  });

  const listings = useQuery({
    queryKey: ["admin-listings"],
    enabled: !!isAdmin,
    queryFn: async () => {
      const { data } = await supabase
        .from("listings")
        .select("id, title, price, status, seller_id, created_at")
        .order("created_at", { ascending: false })
        .limit(100);
      return data ?? [];
    },
  });

  const orders = useQuery({
    queryKey: ["admin-orders"],
    enabled: !!isAdmin,
    queryFn: async () => {
      const { data } = await supabase
        .from("orders")
        .select("id, price, commission, status, buyer_id, seller_id, created_at")
        .order("created_at", { ascending: false })
        .limit(100);
      return data ?? [];
    },
  });

  if (authLoading || adminLoading) {
    return <AppLayout><div className="mx-auto max-w-md p-10 text-center text-sm text-muted-foreground">Загрузка…</div></AppLayout>;
  }

  if (!isAdmin) {
    return (
      <AppLayout>
        <div className="mx-auto max-w-md px-4 py-16 text-center">
          <ShieldCheck className="mx-auto h-10 w-10 text-primary" />
          <h1 className="mt-3 font-display text-2xl">Доступ только для админов</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Ваш аккаунт: <b>{user?.email}</b>. Попросите администратора добавить вам роль <code>admin</code>.
          </p>
          <Link to="/" className="mt-6 inline-block text-primary underline">На главную</Link>
        </div>
      </AppLayout>
    );
  }

  const totalUsers = profiles.data?.length ?? 0;
  const totalShops = profiles.data?.filter(p => p.seller_type === "shop").length ?? 0;
  const totalListings = listings.data?.length ?? 0;
  const totalCommission = (orders.data ?? []).reduce((s, o) => s + (o.commission ?? 0), 0);

  return (
    <AppLayout>
      <div className="mx-auto max-w-6xl px-4 py-6 md:px-8">
        <div className="mb-6 flex items-center gap-2">
          <ShieldCheck className="h-5 w-5 text-primary" />
          <h1 className="font-display text-2xl md:text-3xl">Панель управления</h1>
        </div>

        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <Stat icon={<Users className="h-4 w-4" />} label="Участников" value={totalUsers} />
          <Stat icon={<Store className="h-4 w-4" />} label="Магазинов" value={totalShops} />
          <Stat icon={<Package className="h-4 w-4" />} label="Объявлений" value={totalListings} />
          <Stat icon={<ShoppingBag className="h-4 w-4" />} label="Комиссия, сом" value={totalCommission} />
        </div>

        <section className="mt-8">
          <h2 className="font-display text-lg mb-3">Участники</h2>
          <div className="overflow-hidden rounded-2xl bg-card shadow-[var(--shadow-card)]">
            <table className="w-full text-sm">
              <thead className="bg-muted text-xs text-muted-foreground">
                <tr>
                  <th className="p-3 text-left">Имя</th>
                  <th className="p-3 text-left">Тип</th>
                  <th className="p-3 text-left">Город</th>
                  <th className="p-3 text-left">Рейтинг</th>
                  <th className="p-3 text-left">Дата</th>
                </tr>
              </thead>
              <tbody>
                {(profiles.data ?? []).map(p => (
                  <tr key={p.id} className="border-t border-border/60">
                    <td className="p-3">
                      <div className="flex items-center gap-2">
                        {p.seller_type === "shop" ? <Store className="h-3.5 w-3.5 text-primary" /> : <UserIcon className="h-3.5 w-3.5 text-muted-foreground" />}
                        {p.seller_type === "shop" ? (p.shop_name || p.display_name) : p.display_name}
                      </div>
                    </td>
                    <td className="p-3 text-xs">{p.seller_type === "shop" ? "Магазин" : "Частное"}</td>
                    <td className="p-3 text-xs">{p.city}</td>
                    <td className="p-3 text-xs">{p.rating} ({p.reviews_count})</td>
                    <td className="p-3 text-xs text-muted-foreground">{new Date(p.created_at).toLocaleDateString()}</td>
                  </tr>
                ))}
                {(!profiles.data || profiles.data.length === 0) && (
                  <tr><td className="p-6 text-center text-muted-foreground text-xs" colSpan={5}>Пока нет участников</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        <section className="mt-8">
          <h2 className="font-display text-lg mb-3">Заказы</h2>
          <div className="overflow-hidden rounded-2xl bg-card shadow-[var(--shadow-card)]">
            <table className="w-full text-sm">
              <thead className="bg-muted text-xs text-muted-foreground">
                <tr>
                  <th className="p-3 text-left">Сумма</th>
                  <th className="p-3 text-left">Комиссия</th>
                  <th className="p-3 text-left">Статус</th>
                  <th className="p-3 text-left">Дата</th>
                </tr>
              </thead>
              <tbody>
                {(orders.data ?? []).map(o => (
                  <tr key={o.id} className="border-t border-border/60">
                    <td className="p-3 font-medium">{o.price} сом</td>
                    <td className="p-3 text-primary">{o.commission} сом</td>
                    <td className="p-3 text-xs">{o.status}</td>
                    <td className="p-3 text-xs text-muted-foreground">{new Date(o.created_at).toLocaleString()}</td>
                  </tr>
                ))}
                {(!orders.data || orders.data.length === 0) && (
                  <tr><td className="p-6 text-center text-muted-foreground text-xs" colSpan={4}>Заказов пока нет</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </AppLayout>
  );
}

function Stat({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) {
  return (
    <div className="rounded-2xl bg-card p-4 shadow-[var(--shadow-card)]">
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">{icon}{label}</div>
      <div className="mt-1 font-display text-2xl font-semibold">{value.toLocaleString()}</div>
    </div>
  );
}