import { useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { useApp } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Loader2, MoreHorizontal, X } from "lucide-react";
import { toast } from "sonner";
import {
  sellerRespond,
  sellerSetTerms,
  buyerSentPrepayment,
  sellerConfirmPrepayment,
  sellerBouquetStatus,
  buyerReceived,
  buyerSentFull,
  sellerConfirmFull,
  cancelDeal,
  reportProblem,
} from "@/lib/deals.functions";

type DealStatus =
  | "awaiting_confirmation"
  | "awaiting_payment"
  | "in_progress"
  | "awaiting_completion"
  | "completed"
  | "cancelled"
  | "disputed";

type Order = {
  id: string;
  buyer_id: string;
  seller_id: string;
  listing_id: string;
  deal_status: DealStatus;
  price: number;
  final_price: number | null;
  prepayment_amount: number | null;
  delivery_cost: number | null;
  payment_method: string | null;
  payment_details: string | null;
  prepayment_deadline: string | null;
  cancel_reason: string | null;
  dispute_reason: string | null;
};

type Event = {
  id: string;
  event_type: string;
  actor_id: string;
  payload: Record<string, unknown> | null;
  created_at: string;
};

const STATUS_LABEL: Record<DealStatus, string> = {
  awaiting_confirmation: "Запрос",
  awaiting_payment: "Оплата",
  in_progress: "Готовим",
  awaiting_completion: "Доставка",
  completed: "Готово",
  cancelled: "Отменено",
  disputed: "Спор",
};

const STATUS_COLOR: Record<DealStatus, string> = {
  awaiting_confirmation: "bg-amber-100 text-amber-900",
  awaiting_payment: "bg-blue-100 text-blue-900",
  in_progress: "bg-violet-100 text-violet-900",
  awaiting_completion: "bg-teal-100 text-teal-900",
  completed: "bg-emerald-100 text-emerald-900",
  cancelled: "bg-neutral-200 text-neutral-700",
  disputed: "bg-red-100 text-red-900",
};

const EVENT_LABEL: Record<string, string> = {
  buyer_requested: "Покупатель отправил запрос",
  seller_confirmed: "Продавец подтвердил заказ",
  seller_declined: "Продавец отклонил заказ",
  seller_set_terms: "Продавец указал условия сделки",
  buyer_sent_prepayment: "Покупатель отметил предоплату как отправленную",
  seller_confirmed_prepayment: "Продавец подтвердил получение предоплаты",
  seller_rejected_prepayment: "Продавец: предоплата не поступила",
  bouquet_ready_pickup: "Букет готов к самовывозу",
  bouquet_shipped: "Букет передан в доставку",
  buyer_received: "Покупатель подтвердил получение букета",
  buyer_sent_full: "Покупатель отметил полную оплату как отправленную",
  seller_confirmed_full: "Продавец подтвердил получение полной суммы",
  cancelled: "Сделка отменена",
  problem_reported: "Отправлена жалоба",
};

function fmtSom(n: number | null | undefined) {
  if (n == null) return "—";
  return `${n.toLocaleString("ru-RU")} сом`;
}

export function DealCard({ conversationId }: { conversationId: string }) {
  const { user } = useApp();
  const qc = useQueryClient();
  const [expandedHistory, setExpandedHistory] = useState(false);
  const [showTerms, setShowTerms] = useState(false);
  const [showPay, setShowPay] = useState(false);
  const [showCancel, setShowCancel] = useState(false);
  const [showProblem, setShowProblem] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);

  const orderQ = useQuery({
    queryKey: ["conv-order", conversationId],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase
        .from("orders")
        .select("id, buyer_id, seller_id, listing_id, deal_status, price, final_price, prepayment_amount, delivery_cost, payment_method, payment_details, prepayment_deadline, cancel_reason, dispute_reason")
        .eq("conversation_id", conversationId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      return (data as Order | null) ?? null;
    },
  });

  const order = orderQ.data;

  const events = useQuery({
    queryKey: ["deal-events", order?.id],
    enabled: !!order?.id,
    queryFn: async () => {
      const { data } = await supabase
        .from("deal_events")
        .select("id, event_type, actor_id, payload, created_at")
        .eq("order_id", order!.id)
        .order("created_at", { ascending: true });
      return (data ?? []) as Event[];
    },
  });

  // Seller reputation for warning
  const sellerRep = useQuery({
    queryKey: ["seller-rep", order?.seller_id],
    enabled: !!order?.seller_id,
    queryFn: async () => {
      const [{ data: prof }, { count }] = await Promise.all([
        supabase.from("profiles").select("verified, reviews_count, rating").eq("id", order!.seller_id).maybeSingle(),
        supabase.from("orders").select("id", { count: "exact", head: true }).eq("seller_id", order!.seller_id).eq("deal_status", "completed"),
      ]);
      return { verified: !!prof?.verified, reviewsCount: prof?.reviews_count ?? 0, rating: prof?.rating ?? 0, completed: count ?? 0 };
    },
  });

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["conv-order", conversationId] });
    qc.invalidateQueries({ queryKey: ["deal-events", order?.id] });
    qc.invalidateQueries({ queryKey: ["seller-rep", order?.seller_id] });
  };

  // Realtime: refresh when this order's events/status change
  useEffect(() => {
    if (!order?.id) return;
    const ch = supabase
      .channel(`deal:${order.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "deal_events", filter: `order_id=eq.${order.id}` }, refresh)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "orders", filter: `id=eq.${order.id}` }, refresh)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [order?.id]);

  const wrap = async (label: string, fn: () => Promise<unknown>) => {
    setBusy(label);
    try { await fn(); refresh(); }
    catch (e) { toast.error(e instanceof Error ? e.message : String(e)); }
    finally { setBusy(null); }
  };

  const respondFn = useServerFn(sellerRespond);
  const cancelFn = useServerFn(cancelDeal);
  const reportFn = useServerFn(reportProblem);
  const setTermsFn = useServerFn(sellerSetTerms);
  const buyerPayFn = useServerFn(buyerSentPrepayment);
  const confirmPayFn = useServerFn(sellerConfirmPrepayment);
  const bouquetFn = useServerFn(sellerBouquetStatus);
  const receivedFn = useServerFn(buyerReceived);
  const sentFullFn = useServerFn(buyerSentFull);
  const confirmFullFn = useServerFn(sellerConfirmFull);

  if (orderQ.isLoading) {
    return <div className="rounded-2xl bg-card p-3 text-xs text-muted-foreground shadow-[var(--shadow-card)]">Загрузка сделки…</div>;
  }
  if (!order) return null;

  const isBuyer = user?.id === order.buyer_id;
  const isSeller = user?.id === order.seller_id;
  const s = order.deal_status;
  const canAct = s !== "completed" && s !== "cancelled";
  const isNewSeller = sellerRep.data && !sellerRep.data.verified && sellerRep.data.completed < 3;

  const hasTerms = order.final_price != null || order.payment_details;
  const remainder = (order.final_price ?? 0) + (order.delivery_cost ?? 0) - (order.prepayment_amount ?? 0);

  // Latest prepayment receipt (from buyer_sent_prepayment event)
  const latestReceipt = (() => {
    const list = events.data ?? [];
    for (let i = list.length - 1; i >= 0; i--) {
      const e = list[i];
      if (e.event_type === "buyer_sent_prepayment") {
        const url = (e.payload as { receipt_url?: string } | null)?.receipt_url;
        const amount = (e.payload as { amount?: number } | null)?.amount;
        if (url) return { url, amount };
      }
    }
    return null;
  })();

  // Combined action: confirm prepayment + mark bouquet shipped in one click
  const confirmAndShip = async () => {
    await confirmPayFn({ data: { order_id: order.id, ok: true } });
    await bouquetFn({ data: { order_id: order.id, mode: "shipped" } });
  };

  // Primary action (single button per role/status)
  let primary: { label: string; onClick: () => void; loading?: string } | null = null;
  let hint: string | null = null;
  if (s === "awaiting_confirmation" && isSeller) primary = { label: "Принять", onClick: () => setShowTerms(true) };
  else if (s === "awaiting_confirmation" && isBuyer) hint = "Ждём продавца";
  else if (s === "awaiting_payment" && isBuyer) primary = { label: "Я оплатил", onClick: () => setShowPay(true) };
  else if (s === "awaiting_payment" && isSeller) primary = { label: "Получил оплату — отправил букет", onClick: () => wrap("confirmShip", confirmAndShip), loading: "confirmShip" };
  else if (s === "in_progress" && isSeller) primary = { label: "Отправил букет", onClick: () => wrap("pickup", () => bouquetFn({ data: { order_id: order.id, mode: "shipped" } })), loading: "pickup" };
  else if (s === "in_progress" && isBuyer) hint = "Букет готовится";
  else if (s === "awaiting_completion" && isBuyer)
    primary = remainder > 0
      ? { label: `Отправил остаток ${fmtSom(remainder)}`, onClick: () => wrap("sentFull", () => sentFullFn({ data: { order_id: order.id } })), loading: "sentFull" }
      : { label: "Получил букет", onClick: () => wrap("received", () => receivedFn({ data: { order_id: order.id } })), loading: "received" };
  else if (s === "awaiting_completion" && isSeller) primary = { label: "Оплата получена", onClick: () => wrap("confirmFull", () => confirmFullFn({ data: { order_id: order.id } })), loading: "confirmFull" };

  return (
    <div className="mb-2 rounded-xl border border-border bg-card px-3 py-2 text-sm">
      <div className="flex items-center gap-2">
        <span className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium ${STATUS_COLOR[s]}`}>
          {STATUS_LABEL[s]}
        </span>
        {hasTerms && (
          <span className="truncate text-xs text-muted-foreground">
            {fmtSom(order.final_price ?? order.price)}
            {order.prepayment_amount ? ` · пред. ${fmtSom(order.prepayment_amount)}` : ""}
          </span>
        )}
        <div className="ml-auto flex items-center gap-1">
          {primary && (
            <Button size="sm" className="h-7 rounded-full px-3 text-xs" disabled={!!busy} onClick={primary.onClick}>
              {busy === primary.loading ? <Loader2 className="h-3 w-3 animate-spin" /> : primary.label}
            </Button>
          )}
          {canAct && (
            <div className="relative">
              <button
                type="button"
                onClick={() => setExpandedHistory(v => !v)}
                className="grid h-7 w-7 place-items-center rounded-full text-muted-foreground hover:bg-muted"
                aria-label="Ещё"
              >
                <MoreHorizontal className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>
      </div>

      {hint && <div className="mt-1 text-xs text-muted-foreground">{hint}</div>}

      {s === "awaiting_payment" && order.payment_details && isBuyer && (
        <div className="mt-1.5 rounded-lg bg-muted px-2 py-1.5 text-xs">
          <span className="text-muted-foreground">Реквизиты: </span>
          <span className="font-medium break-all">{order.payment_details}</span>
        </div>
      )}

      {s === "awaiting_payment" && isSeller && latestReceipt && (
        <div className="mt-1.5 flex items-center gap-2 rounded-lg bg-muted px-2 py-1.5 text-xs">
          <a href={latestReceipt.url} target="_blank" rel="noreferrer" className="shrink-0">
            <img src={latestReceipt.url} alt="Чек" className="h-12 w-12 rounded object-cover" />
          </a>
          <div className="min-w-0">
            <div className="text-muted-foreground">Чек от покупателя{latestReceipt.amount ? ` · ${fmtSom(latestReceipt.amount)}` : ""}</div>
            <a href={latestReceipt.url} target="_blank" rel="noreferrer" className="text-primary underline">Открыть чек</a>
          </div>
        </div>
      )}

      {s === "completed" && (
        <div className="mt-1 text-xs text-emerald-700">Сделка завершена — оставьте отзыв ниже</div>
      )}
      {s === "cancelled" && order.cancel_reason && (
        <div className="mt-1 text-xs text-muted-foreground">Отменено: {order.cancel_reason}</div>
      )}

      {expandedHistory && (
        <div className="mt-2 border-t border-border pt-2">
          {isBuyer && canAct && isNewSeller && (
            <div className="mb-2 rounded-lg bg-amber-50 px-2 py-1.5 text-[11px] text-amber-900">
              Продавец пока не проверен. Не отправляйте всю сумму заранее.
            </div>
          )}
          {hasTerms && (
            <div className="mb-2 grid grid-cols-2 gap-x-2 gap-y-0.5 text-[11px] text-muted-foreground">
              <div>Цена: <b className="text-foreground">{fmtSom(order.final_price ?? order.price)}</b></div>
              <div>Предоплата: <b className="text-foreground">{fmtSom(order.prepayment_amount)}</b></div>
              <div>Доставка: <b className="text-foreground">{fmtSom(order.delivery_cost)}</b></div>
              <div>Способ: <b className="text-foreground">{order.payment_method || "—"}</b></div>
            </div>
          )}
          <ul className="space-y-0.5 text-[11px] text-muted-foreground">
            {(events.data ?? []).map(e => (
              <li key={e.id}>
                {EVENT_LABEL[e.event_type] ?? e.event_type}
                {" · "}
                {new Date(e.created_at).toLocaleString([], { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}
              </li>
            ))}
          </ul>
          {canAct && (
            <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[11px]">
              {s === "awaiting_confirmation" && isSeller && (
                <button onClick={() => wrap("decline", () => respondFn({ data: { order_id: order.id, accept: false } }))} className="text-muted-foreground underline underline-offset-2">Отклонить</button>
              )}
              {s === "awaiting_payment" && isSeller && (
                <button onClick={() => wrap("rejectPre", () => confirmPayFn({ data: { order_id: order.id, ok: false } }))} className="text-muted-foreground underline underline-offset-2">Оплата не пришла</button>
              )}
              <button onClick={() => setShowProblem(true)} className="text-destructive underline underline-offset-2">Проблема</button>
              <button onClick={() => setShowCancel(true)} className="text-muted-foreground underline underline-offset-2">Отменить</button>
            </div>
          )}
        </div>
      )}

      {/* Modals */}
      {showTerms && (
        <TermsModal
          initial={order}
          busy={busy === "terms"}
          onClose={() => setShowTerms(false)}
          onSubmit={async (v) => {
            await wrap("terms", async () => {
              await respondFn({ data: { order_id: order.id, accept: true } }).catch(() => {});
              await setTermsFn({ data: { order_id: order.id, ...v } });
              setShowTerms(false);
            });
          }}
        />
      )}
      {showPay && (
        <PrepaymentModal
          orderId={order.id}
          suggested={order.prepayment_amount ?? order.final_price ?? order.price}
          busy={busy === "pay"}
          onClose={() => setShowPay(false)}
          onSubmit={async (v) => {
            await wrap("pay", async () => {
              await buyerPayFn({ data: { order_id: order.id, amount: v.amount, receipt_url: v.receipt_url } });
              setShowPay(false);
            });
          }}
        />
      )}
      {showCancel && (
        <ReasonModal
          title="Отменить сделку"
          placeholder="Причина отмены"
          busy={busy === "cancel"}
          onClose={() => setShowCancel(false)}
          onSubmit={async (reason) => {
            await wrap("cancel", async () => {
              await cancelFn({ data: { order_id: order.id, reason } });
              setShowCancel(false);
            });
          }}
        />
      )}
      {showProblem && (
        <ProblemModal
          busy={busy === "problem"}
          onClose={() => setShowProblem(false)}
          onSubmit={async (reason, details) => {
            await wrap("problem", async () => {
              await reportFn({ data: { order_id: order.id, reason, details } });
              setShowProblem(false);
            });
          }}
        />
      )}
    </div>
  );
}

function ModalShell({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4" onClick={onClose}>
      <div className="w-full max-w-md rounded-2xl bg-background p-4 shadow-xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <div className="font-semibold">{title}</div>
          <button onClick={onClose} className="rounded-full p-1 hover:bg-muted"><X className="h-4 w-4" /></button>
        </div>
        <div className="mt-3">{children}</div>
      </div>
    </div>
  );
}

function TermsModal({
  initial, busy, onClose, onSubmit,
}: { initial: Order; busy: boolean; onClose: () => void; onSubmit: (v: {
  final_price: number; prepayment_amount: number; delivery_cost: number;
  payment_method: string; payment_details: string; prepayment_deadline?: string | null;
}) => Promise<void> }) {
  const [finalPrice, setFinalPrice] = useState(String(initial.final_price ?? initial.price ?? 0));
  const [prepay, setPrepay] = useState(String(initial.prepayment_amount ?? 0));
  const [delivery, setDelivery] = useState(String(initial.delivery_cost ?? 0));
  const [method, setMethod] = useState(initial.payment_method ?? "MBank");
  const [details, setDetails] = useState(initial.payment_details ?? "");
  const [deadline, setDeadline] = useState("");

  const applyPct = (pct: number) => {
    const base = Number(finalPrice) || 0;
    setPrepay(String(Math.round((base * pct) / 100)));
  };

  return (
    <ModalShell title="Условия сделки" onClose={onClose}>
      <div className="rounded-xl border border-amber-300 bg-amber-50 p-2 text-[12px] text-amber-900">
        ReFlowers не принимает и не хранит деньги. Реквизиты видит только покупатель.
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
        <Field label="Итоговая цена (сом)"><input type="number" value={finalPrice} onChange={e => setFinalPrice(e.target.value)} className="input" /></Field>
        <Field label="Предоплата (сом)">
          <input type="number" value={prepay} onChange={e => setPrepay(e.target.value)} className="input" />
          <div className="mt-1 flex flex-wrap gap-1">
            {[0, 15, 20, 50, 100].map(pct => (
              <button
                key={pct}
                type="button"
                onClick={() => applyPct(pct)}
                className="rounded-full border border-border bg-background px-2 py-0.5 text-[11px] text-foreground/70 hover:border-primary hover:text-primary"
              >
                {pct}%
              </button>
            ))}
          </div>
        </Field>
        <Field label="Доставка (сом)"><input type="number" value={delivery} onChange={e => setDelivery(e.target.value)} className="input" /></Field>
        <Field label="Способ оплаты"><input value={method} onChange={e => setMethod(e.target.value)} className="input" placeholder="MBank / O!Деньги / наличные" /></Field>
      </div>
      <Field label="Реквизиты (телефон или счёт)">
        <textarea value={details} onChange={e => setDetails(e.target.value)} className="input min-h-[70px]" placeholder="+996 XXX XXX XXX · MBank" />
      </Field>
      <Field label="Срок предоплаты">
        <input type="datetime-local" value={deadline} onChange={e => setDeadline(e.target.value)} className="input" />
      </Field>
      <div className="mt-3 flex justify-end gap-2">
        <Button variant="outline" size="sm" onClick={onClose}>Отмена</Button>
        <Button size="sm" disabled={busy || !details.trim()} onClick={() => onSubmit({
          final_price: Number(finalPrice) || 0,
          prepayment_amount: Number(prepay) || 0,
          delivery_cost: Number(delivery) || 0,
          payment_method: method.trim(),
          payment_details: details.trim(),
          prepayment_deadline: deadline ? new Date(deadline).toISOString() : null,
        })}>
          {busy ? <Loader2 className="h-3 w-3 animate-spin" /> : "Отправить условия"}
        </Button>
      </div>
    </ModalShell>
  );
}

function PrepaymentModal({
  orderId, suggested, busy, onClose, onSubmit,
}: { orderId: string; suggested: number; busy: boolean; onClose: () => void; onSubmit: (v: { amount: number; receipt_url: string }) => Promise<void> }) {
  const { user } = useApp();
  const [amount, setAmount] = useState(String(suggested || 0));
  const [uploading, setUploading] = useState(false);
  const [receipt, setReceipt] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);

  async function upload(f: File) {
    if (!user) return;
    if (f.size > 10 * 1024 * 1024) { toast.error("Больше 10 МБ"); return; }
    setUploading(true);
    try {
      const ext = f.name.split(".").pop()?.toLowerCase() || "jpg";
      const path = `${orderId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
      const { error } = await supabase.storage.from("deal-receipts").upload(path, f, { contentType: f.type, upsert: false });
      if (error) throw error;
      const { data } = await supabase.storage.from("deal-receipts").createSignedUrl(path, 60 * 60 * 24 * 365);
      setReceipt(data?.signedUrl ?? null);
    } catch (e) {
      toast.error("Не удалось загрузить чек: " + (e as Error).message);
    } finally { setUploading(false); }
  }

  return (
    <ModalShell title="Отправка предоплаты" onClose={onClose}>
      <div className="rounded-xl border border-amber-300 bg-amber-50 p-2 text-[12px] text-amber-900">
        ReFlowers не проверяет банковский перевод. Кнопка лишь фиксирует ваше действие. Оплата напрямую продавцу.
      </div>
      <Field label="Сумма (сом)">
        <input type="number" value={amount} onChange={e => setAmount(e.target.value)} className="input" />
      </Field>
      <Field label="Чек об оплате (обязательно)">
        <input ref={fileRef} type="file" accept="image/*" hidden onChange={e => { const f = e.target.files?.[0]; if (f) upload(f); }} />
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => fileRef.current?.click()} disabled={uploading}>
            {uploading ? <Loader2 className="h-3 w-3 animate-spin" /> : receipt ? "Заменить чек" : "Прикрепить чек"}
          </Button>
          {receipt && <a href={receipt} target="_blank" rel="noreferrer" className="text-[12px] text-primary underline">Просмотр</a>}
        </div>
        {!receipt && <div className="mt-1 text-[11px] text-muted-foreground">Без чека кнопка «Отправить» будет недоступна.</div>}
      </Field>
      <div className="mt-3 flex justify-end gap-2">
        <Button variant="outline" size="sm" onClick={onClose}>Отмена</Button>
        <Button size="sm" disabled={busy || !Number(amount) || !receipt} onClick={() => receipt && onSubmit({ amount: Number(amount), receipt_url: receipt })}>
          {busy ? <Loader2 className="h-3 w-3 animate-spin" /> : "Я отправил"}
        </Button>
      </div>
    </ModalShell>
  );
}

function ReasonModal({ title, placeholder, busy, onClose, onSubmit }: { title: string; placeholder: string; busy: boolean; onClose: () => void; onSubmit: (r: string) => Promise<void> }) {
  const [r, setR] = useState("");
  return (
    <ModalShell title={title} onClose={onClose}>
      <textarea value={r} onChange={e => setR(e.target.value)} className="input min-h-[90px]" placeholder={placeholder} maxLength={300} />
      <div className="mt-3 flex justify-end gap-2">
        <Button variant="outline" size="sm" onClick={onClose}>Закрыть</Button>
        <Button size="sm" disabled={busy || !r.trim()} onClick={() => onSubmit(r.trim())}>
          {busy ? <Loader2 className="h-3 w-3 animate-spin" /> : "Подтвердить"}
        </Button>
      </div>
    </ModalShell>
  );
}

function ProblemModal({ busy, onClose, onSubmit }: { busy: boolean; onClose: () => void; onSubmit: (reason: string, details?: string) => Promise<void> }) {
  const reasons = [
    "букет не соответствует фотографии",
    "заказ не доставлен",
    "продавец или покупатель не отвечает",
    "оплата не поступила",
    "сумма изменилась",
    "другая проблема",
  ];
  const [r, setR] = useState(reasons[0]);
  const [d, setD] = useState("");
  return (
    <ModalShell title="Есть проблема" onClose={onClose}>
      <div className="space-y-1 text-sm">
        {reasons.map(x => (
          <label key={x} className="flex items-center gap-2 cursor-pointer">
            <input type="radio" name="reason" checked={r === x} onChange={() => setR(x)} />
            <span>{x}</span>
          </label>
        ))}
      </div>
      <textarea value={d} onChange={e => setD(e.target.value)} className="input mt-3 min-h-[70px]" placeholder="Подробности (необязательно)" maxLength={500} />
      <div className="mt-3 flex justify-end gap-2">
        <Button variant="outline" size="sm" onClick={onClose}>Отмена</Button>
        <Button size="sm" disabled={busy} onClick={() => onSubmit(r, d.trim() || undefined)}>
          {busy ? <Loader2 className="h-3 w-3 animate-spin" /> : "Отправить"}
        </Button>
      </div>
    </ModalShell>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="mt-2 block text-[12px]">
      <div className="mb-1 text-muted-foreground">{label}</div>
      {children}
    </label>
  );
}