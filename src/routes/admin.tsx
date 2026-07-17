import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { AppLayout } from "@/components/marketplace/AppLayout";
import { supabase } from "@/integrations/supabase/client";
import { useApp } from "@/lib/store";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { deleteUserAsAdmin, getUserEmails, getUserStats } from "@/lib/admin.functions";
import { adminCancelDeal } from "@/lib/deals.functions";
import { useEffect } from "react";
import { ShieldCheck, Users, Package, ShoppingBag, Store, Trash2, User as UserIcon } from "lucide-react";
import { toast } from "sonner";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

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

  const fetchEmails = useServerFn(getUserEmails);
  const emails = useQuery({
    queryKey: ["admin-emails"],
    enabled: !!isAdmin,
    queryFn: () => fetchEmails(),
  });

  const fetchStats = useServerFn(getUserStats);
  const stats = useQuery({
    queryKey: ["admin-user-stats"],
    enabled: !!isAdmin,
    queryFn: () => fetchStats(),
  });

  const qc = useQueryClient();
  const deleteUser = useServerFn(deleteUserAsAdmin);
  const deleteMutation = useMutation({
    mutationFn: (userId: string) => deleteUser({ data: { userId } }),
    onSuccess: () => {
      toast.success("Пользователь удалён");
      qc.invalidateQueries({ queryKey: ["admin-profiles"] });
      qc.invalidateQueries({ queryKey: ["admin-emails"] });
      qc.invalidateQueries({ queryKey: ["admin-user-stats"] });
      qc.invalidateQueries({ queryKey: ["admin-listings"] });
      qc.invalidateQueries({ queryKey: ["admin-orders"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Не удалось удалить"),
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
        .select("id, price, final_price, commission, status, deal_status, buyer_id, seller_id, listing_id, conversation_id, created_at")
        .order("created_at", { ascending: false })
        .limit(100);
      return data ?? [];
    },
  });

  const cancelDealFn = useServerFn(adminCancelDeal);
  const cancelDealMutation = useMutation({
    mutationFn: (v: { order_id: string; reason: string }) => cancelDealFn({ data: v }),
    onSuccess: () => {
      toast.success("Сделка отменена");
      qc.invalidateQueries({ queryKey: ["admin-orders"] });
      qc.invalidateQueries({ queryKey: ["admin-user-stats"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Не удалось отменить"),
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
  const completedDeals = (orders.data ?? []).filter(o => (o as { deal_status?: string }).deal_status === "completed").length;
  const activeDeals = (orders.data ?? []).filter(o => {
    const st = (o as { deal_status?: string }).deal_status;
    return st && st !== "completed" && st !== "cancelled";
  }).length;

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
          <Stat icon={<ShoppingBag className="h-4 w-4" />} label="Сделок активн./завершён." value={`${activeDeals} / ${completedDeals}`} />
        </div>

        <section className="mt-8">
          <h2 className="font-display text-lg mb-3">Участники</h2>
          <div className="overflow-hidden rounded-2xl bg-card shadow-[var(--shadow-card)]">
            <table className="w-full text-sm">
              <thead className="bg-muted text-xs text-muted-foreground">
                <tr>
                  <th className="p-3 text-left">Имя</th>
                  <th className="p-3 text-left">Email</th>
                  <th className="p-3 text-left">Тип</th>
                  <th className="p-3 text-left">Город</th>
                  <th className="p-3 text-left">Объявл.</th>
                  <th className="p-3 text-left">Продажи</th>
                  <th className="p-3 text-left">Покупки</th>
                  <th className="p-3 text-left">Рейтинг</th>
                  <th className="p-3 text-left">Дата</th>
                  <th className="p-3 text-right">Действия</th>
                </tr>
              </thead>
              <tbody>
                {(profiles.data ?? []).map(p => {
                  const s = stats.data?.[p.id];
                  return (
                  <tr key={p.id} className="border-t border-border/60">
                    <td className="p-3">
                      <div className="flex items-center gap-2">
                        {p.seller_type === "shop" ? <Store className="h-3.5 w-3.5 text-primary" /> : <UserIcon className="h-3.5 w-3.5 text-muted-foreground" />}
                        {p.seller_type === "shop" ? (p.shop_name || p.display_name) : p.display_name}
                      </div>
                    </td>
                    <td className="p-3 text-xs text-muted-foreground">{emails.data?.[p.id] ?? "—"}</td>
                    <td className="p-3 text-xs">{p.seller_type === "shop" ? "Магазин" : "Частное"}</td>
                    <td className="p-3 text-xs">{p.city}</td>
                    <td className="p-3 text-xs">
                      <span className="font-medium">{s?.listings_total ?? 0}</span>
                      <span className="ml-1 text-muted-foreground">({s?.listings_active ?? 0}/{s?.listings_sold ?? 0})</span>
                    </td>
                    <td className="p-3 text-xs">
                      {s?.sales_count ?? 0} <span className="text-primary">· {(s?.sales_revenue ?? 0).toLocaleString()} с</span>
                    </td>
                    <td className="p-3 text-xs">
                      {s?.purchases_count ?? 0} <span className="text-muted-foreground">· {(s?.purchases_spent ?? 0).toLocaleString()} с</span>
                    </td>
                    <td className="p-3 text-xs">{p.rating} ({p.reviews_count})</td>
                    <td className="p-3 text-xs text-muted-foreground">{new Date(p.created_at).toLocaleDateString()}</td>
                    <td className="p-3 text-right">
                      {p.id !== user?.id && (
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <button
                              className="inline-flex h-8 w-8 items-center justify-center rounded-full text-destructive hover:bg-destructive/10"
                              aria-label="Удалить"
                              disabled={deleteMutation.isPending}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Удалить пользователя?</AlertDialogTitle>
                              <AlertDialogDescription>
                                {emails.data?.[p.id] ?? p.display_name}. Будут удалены объявления, сообщения, заказы и отзывы. Действие необратимо.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Отмена</AlertDialogCancel>
                              <AlertDialogAction onClick={() => deleteMutation.mutate(p.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                                Удалить
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      )}
                    </td>
                  </tr>
                  );
                })}
                {(!profiles.data || profiles.data.length === 0) && (
                  <tr><td className="p-6 text-center text-muted-foreground text-xs" colSpan={10}>Пока нет участников</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        <section className="mt-8">
          <h2 className="font-display text-lg mb-3">Сделки</h2>
          <div className="overflow-hidden rounded-2xl bg-card shadow-[var(--shadow-card)]">
            <table className="w-full text-sm">
              <thead className="bg-muted text-xs text-muted-foreground">
                <tr>
                  <th className="p-3 text-left">Сумма</th>
                  <th className="p-3 text-left">Статус сделки</th>
                  <th className="p-3 text-left">Дата</th>
                  <th className="p-3 text-right">Действия</th>
                </tr>
              </thead>
              <tbody>
                {(orders.data ?? []).map(o => {
                  const oo = o as { id: string; price: number; final_price?: number | null; deal_status?: string; conversation_id?: string | null; created_at: string };
                  const canCancel = oo.deal_status && oo.deal_status !== "completed" && oo.deal_status !== "cancelled";
                  return (
                    <tr key={oo.id} className="border-t border-border/60">
                      <td className="p-3 font-medium">{oo.final_price ?? oo.price} сом</td>
                      <td className="p-3 text-xs">{oo.deal_status ?? "—"}</td>
                      <td className="p-3 text-xs text-muted-foreground">{new Date(oo.created_at).toLocaleString()}</td>
                      <td className="p-3 text-right">
                        <div className="inline-flex gap-2">
                          {oo.conversation_id && (
                            <Link to="/conversation/$id" params={{ id: oo.conversation_id }} className="text-xs text-primary underline">
                              Открыть
                            </Link>
                          )}
                          {canCancel && (
                            <button
                              onClick={() => {
                                const r = prompt("Причина отмены сделки?", "Отменено администратором");
                                if (r === null) return;
                                cancelDealMutation.mutate({ order_id: oo.id, reason: r || "Отменено администратором" });
                              }}
                              disabled={cancelDealMutation.isPending}
                              className="text-xs text-destructive underline"
                            >
                              Отменить
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {(!orders.data || orders.data.length === 0) && (
                  <tr><td className="p-6 text-center text-muted-foreground text-xs" colSpan={4}>Сделок пока нет</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </AppLayout>
  );
}

function Stat({ icon, label, value }: { icon: React.ReactNode; label: string; value: number | string }) {
  return (
    <div className="rounded-2xl bg-card p-4 shadow-[var(--shadow-card)]">
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">{icon}{label}</div>
      <div className="mt-1 font-display text-2xl font-semibold">{typeof value === "number" ? value.toLocaleString() : value}</div>
    </div>
  );
}