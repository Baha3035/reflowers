import { useMemo, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { useApp } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { AlertTriangle, ChevronDown, ChevronUp, Loader2, ShieldAlert, X } from "lucide-react";
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
  awaiting_confirmation: "Ожидает подтверждения",
  awaiting_payment: "Ожидает оплаты",
  in_progress: "Заказ выполняется",
  awaiting_completion: "Ожидает завершения",
  completed: "Завершена",
  cancelled: "Отменена",
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

  // Realtime: refresh when this order's events change
  useMemo(() => {
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

  return (
    <div className="mb-3 rounded-2xl bg-card p-3 shadow-[var(--shadow-card)]">
      <div className="flex items-center justify-between gap-2">
        <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ${STATUS_COLOR[s]}`}>
          Сделка · {STATUS_LABEL[s]}
        </span>
        {canAct && (
          <div className="flex gap-1">
            <button onClick={() => setShowProblem(true)} className="rounded-full bg-muted px-2 py-1 text-[11px] hover:bg-destructive/10 hover:text-destructive inline-flex items-center gap-1">
              <ShieldAlert className="h-3 w-3" /> Есть проблема
            </button>
            <button onClick={() => setShowCancel(true)} className="rounded-full bg-muted px-2 py-1 text-[11px] hover:bg-muted/80">
              Отменить
            </button>
          </div>
        )}
      </div>

      {s === "cancelled" && order.cancel_reason && (
        <div className="mt-2 text-xs text-muted-foreground">Причина отмены: {order.cancel_reason}</div>
      )}
      {s === "disputed" && order.dispute_reason && (
        <div className="mt-2 text-xs text-red-700">Спор: {order.dispute_reason}</div>
      )}

      {/* Buyer-side warning for new/unverified sellers */}
      {isBuyer && canAct && isNewSeller && (
        <div className="mt-2 flex gap-2 rounded-xl border border-amber-300 bg-amber-50 p-2 text-[12px] text-amber-900">
          <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
          <div>
            Продавец пока не проверен и провёл мало сделок. Не отправляйте полную сумму заранее — договоритесь о частичной предоплате или встрече.
          </div>
        </div>
      )}

      {/* Terms block */}
      {(order.final_price != null || order.payment_details) && (
        <div className="mt-2 rounded-xl bg-muted p-2 text-[12px]">
          <div className="grid grid-cols-2 gap-1">
            <div>Итоговая цена: <b>{fmtSom(order.final_price ?? order.price)}</b></div>
            <div>Предоплата: <b>{fmtSom(order.prepayment_amount)}</b></div>
            <div>Доставка: <b>{fmtSom(order.delivery_cost)}</b></div>
            <div>Способ: <b>{order.payment_method || "—"}</b></div>
          </div>
          {order.payment_details && s !== "cancelled" && (
            <>
              <div className="mt-2 rounded-lg border border-amber-300 bg-amber-50 p-2 text-[11px] text-amber-900">
                ReFlowers не принимает и не хранит деньги. Оплата напрямую продавцу. Перед переводом проверьте рейтинг, отзывы и статус верификации.
              </div>
              <div className="mt-1 whitespace-pre-wrap break-words">
                <span className="text-muted-foreground">Реквизиты: </span>
                <b>{order.payment_details}</b>
              </div>
            </>
          )}
          {order.prepayment_deadline && (
            <div className="mt-1 text-muted-foreground">Внести до: {new Date(order.prepayment_deadline).toLocaleString()}</div>
          )}
        </div>
      )}

      {/* Action buttons per status/role */}
      <div className="mt-2 flex flex-wrap gap-1.5">
        {s === "awaiting_confirmation" && isSeller && (
          <>
            <Button size="sm" onClick={() => setShowTerms(true)}>Подтвердить и указать условия</Button>
            <Button size="sm" variant="outline" onClick={() => wrap("decline", () => respondFn({ data: { order_id: order.id, accept: false } }))}>
              Отклонить
            </Button>
          </>
        )}
        {s === "awaiting_confirmation" && isBuyer && (
          <span className="text-[12px] text-muted-foreground">Ждём подтверждения продавца…</span>
        )}

        {s === "awaiting_payment" && isBuyer && (
          <Button size="sm" onClick={() => setShowPay(true)}>Я отправил предоплату</Button>
        )}
        {s === "awaiting_payment" && isSeller && (
          <>
            <Button size="sm" onClick={() => wrap("confirmPre", () => confirmPayFn({ data: { order_id: order.id, ok: true } }))}>
              Предоплата получена
            </Button>
            <Button size="sm" variant="outline" onClick={() => wrap("rejectPre", () => confirmPayFn({ data: { order_id: order.id, ok: false } }))}>
              Оплата не поступила
            </Button>
          </>
        )}

        {s === "in_progress" && isSeller && (
          <>
            <Button size="sm" onClick={() => wrap("pickup", () => bouquetFn({ data: { order_id: order.id, mode: "pickup" } }))}>
              Букет готов к самовывозу
            </Button>
            <Button size="sm" variant="outline" onClick={() => wrap("ship", () => bouquetFn({ data: { order_id: order.id, mode: "shipped" } }))}>
              Букет передан в доставку
            </Button>
          </>
        )}
        {s === "in_progress" && isBuyer && (
          <span className="text-[12px] text-muted-foreground">Продавец готовит букет.</span>
        )}

        {s === "awaiting_completion" && isBuyer && (
          <>
            <Button size="sm" onClick={() => wrap("received", () => receivedFn({ data: { order_id: order.id } }))}>
              Букет получен
            </Button>
            {order.final_price != null && order.prepayment_amount != null &&
              order.final_price + (order.delivery_cost ?? 0) - order.prepayment_amount > 0 && (
              <Button size="sm" variant="outline" onClick={() => wrap("sentFull", () => sentFullFn({ data: { order_id: order.id } }))}>
                Полная сумма отправлена
              </Button>
            )}
          </>
        )}
        {s === "awaiting_completion" && isSeller && (
          <Button size="sm" onClick={() => wrap("confirmFull", () => confirmFullFn({ data: { order_id: order.id } }))}>
            Полная сумма получена
          </Button>
        )}

        {s === "completed" && (
          <span className="text-[12px] text-emerald-700">Сделка завершена. Оставьте отзыв ниже 👇</span>
        )}
      </div>

      {/* History */}
      <button
        onClick={() => setExpandedHistory(v => !v)}
        className="mt-2 inline-flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground"
      >
        История сделки {expandedHistory ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
      </button>
      {expandedHistory && (
        <ul className="mt-1 space-y-0.5 border-l border-border pl-3 text-[11px] text-muted-foreground">
          {(events.data ?? []).map(e => (
            <li key={e.id}>
              <span className="text-foreground/80">{EVENT_LABEL[e.event_type] ?? e.event_type}</span>
              {" · "}
              {new Date(e.created_at).toLocaleString([], { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}
            </li>
          ))}
          {(events.data ?? []).length === 0 && <li>Пока пусто</li>}
        </ul>
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

  return (
    <ModalShell title="Условия сделки" onClose={onClose}>
      <div className="rounded-xl border border-amber-300 bg-amber-50 p-2 text-[12px] text-amber-900">
        ReFlowers не принимает и не хранит деньги. Реквизиты видит только покупатель.
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
        <Field label="Итоговая цена (сом)"><input type="number" value={finalPrice} onChange={e => setFinalPrice(e.target.value)} className="input" /></Field>
        <Field label="Предоплата (сом)"><input type="number" value={prepay} onChange={e => setPrepay(e.target.value)} className="input" /></Field>
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
}: { orderId: string; suggested: number; busy: boolean; onClose: () => void; onSubmit: (v: { amount: number; receipt_url?: string | null }) => Promise<void> }) {
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
      <Field label="Чек (необязательно)">
        <input ref={fileRef} type="file" accept="image/*" hidden onChange={e => { const f = e.target.files?.[0]; if (f) upload(f); }} />
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => fileRef.current?.click()} disabled={uploading}>
            {uploading ? <Loader2 className="h-3 w-3 animate-spin" /> : "Прикрепить"}
          </Button>
          {receipt && <a href={receipt} target="_blank" rel="noreferrer" className="text-[12px] text-primary underline">Просмотр</a>}
        </div>
      </Field>
      <div className="mt-3 flex justify-end gap-2">
        <Button variant="outline" size="sm" onClick={onClose}>Отмена</Button>
        <Button size="sm" disabled={busy || !Number(amount)} onClick={() => onSubmit({ amount: Number(amount), receipt_url: receipt })}>
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