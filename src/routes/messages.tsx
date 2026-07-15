import { createFileRoute } from "@tanstack/react-router";
import { AppLayout } from "@/components/marketplace/AppLayout";
import { CONVERSATIONS, getListing, getSeller, formatSom } from "@/lib/mock-data";
import { BadgeCheck, MapPin, Send, MoreHorizontal, DollarSign, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/messages")({
  head: () => ({ meta: [{ title: "Сообщения — ReFlowers" }] }),
  component: Messages,
});

const QUICK = ["Букет ещё доступен?", "Можно оформить доставку?", "Сможете немного снизить цену?", "Когда можно забрать?", "Цветы точно свежие?"];

function Messages() {
  const [active, setActive] = useState(CONVERSATIONS[0].id);
  const conv = CONVERSATIONS.find(c => c.id === active)!;
  const seller = getSeller(conv.sellerId)!;
  const listing = getListing(conv.listingId)!;

  const [msgs, setMsgs] = useState([
    { me: false, text: "Здравствуйте! Букет ещё доступен?" },
    { me: true, text: "Да, ещё доступен. Могу привезти вечером." },
    { me: false, text: "Отлично! А сможете снизить до 3000?" },
    { me: true, text: "Могу до 3200, цветы очень свежие 🌹" },
  ]);
  const [text, setText] = useState("");

  return (
    <AppLayout>
      <div className="mx-auto grid max-w-6xl gap-4 px-4 py-4 md:grid-cols-[320px_1fr] md:px-8">
        {/* Conv list */}
        <div className="rounded-3xl bg-card p-2 shadow-[var(--shadow-card)]">
          <h2 className="px-3 py-2 font-display text-lg">Сообщения</h2>
          <div className="space-y-1">
            {CONVERSATIONS.map(c => {
              const s = getSeller(c.sellerId)!;
              const l = getListing(c.listingId)!;
              return (
                <button key={c.id} onClick={() => setActive(c.id)} className={cn("flex w-full items-center gap-3 rounded-2xl p-2.5 text-left transition", active === c.id ? "bg-secondary" : "hover:bg-muted")}>
                  <img src={l.image} alt="" className="h-12 w-12 shrink-0 rounded-xl object-cover" />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1"><span className="truncate text-sm font-medium">{s.name}</span>{s.verified && <BadgeCheck className="h-3.5 w-3.5 text-primary" />}</div>
                    <div className="truncate text-xs text-muted-foreground">{c.lastMessage}</div>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <span className="text-[10px] text-muted-foreground">{c.time}</span>
                    {c.unread > 0 && <span className="grid h-4 min-w-4 place-items-center rounded-full bg-primary px-1 text-[10px] font-semibold text-primary-foreground">{c.unread}</span>}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Chat */}
        <div className="flex min-h-[70vh] flex-col rounded-3xl bg-card shadow-[var(--shadow-card)]">
          <div className="flex items-center gap-3 border-b border-border/60 p-3">
            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-secondary font-display font-semibold text-secondary-foreground">{seller.name.charAt(0)}</div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1"><span className="font-medium">{seller.name}</span>{seller.verified && <BadgeCheck className="h-4 w-4 text-primary" />}</div>
              <div className="text-xs text-muted-foreground">отвечает {seller.responseTime}</div>
            </div>
            <button className="grid h-9 w-9 place-items-center rounded-full bg-muted"><MoreHorizontal className="h-4 w-4" /></button>
          </div>

          {/* Listing preview */}
          <div className="flex items-center gap-3 border-b border-border/60 p-3">
            <img src={listing.image} alt="" className="h-14 w-14 rounded-xl object-cover" />
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-medium">{listing.title}</div>
              <div className="text-xs text-primary font-semibold">{formatSom(listing.price)}</div>
              <div className="mt-0.5 inline-flex items-center gap-0.5 text-[11px] text-muted-foreground"><MapPin className="h-3 w-3" />{listing.district}</div>
            </div>
          </div>

          <div className="flex-1 space-y-2 overflow-y-auto p-4">
            {msgs.map((m, i) => (
              <div key={i} className={cn("flex", m.me && "justify-end")}>
                <div className={cn("max-w-[75%] rounded-2xl px-3 py-2 text-sm", m.me ? "bg-primary text-primary-foreground" : "bg-muted")}>{m.text}</div>
              </div>
            ))}
          </div>

          <div className="border-t border-border/60 p-3">
            <div className="mb-2 flex gap-1.5 overflow-x-auto scrollbar-hide">
              {QUICK.map(q => <button key={q} onClick={() => setMsgs(m => [...m, { me: true, text: q }])} className="shrink-0 rounded-full bg-secondary px-3 py-1.5 text-xs text-secondary-foreground hover:bg-secondary/80">{q}</button>)}
            </div>
            <div className="flex gap-2">
              <Button variant="ghost" size="sm" className="rounded-full"><DollarSign className="h-4 w-4" /> Предложить цену</Button>
              <Button variant="ghost" size="sm" className="rounded-full"><MapPin className="h-4 w-4" /> Локация</Button>
              <Button variant="ghost" size="sm" className="rounded-full text-destructive"><AlertCircle className="h-4 w-4" /> Жалоба</Button>
            </div>
            <div className="mt-2 flex items-center gap-2 rounded-2xl bg-muted p-2 pl-4">
              <input value={text} onChange={e => setText(e.target.value)} placeholder="Сообщение..." className="w-full bg-transparent text-sm outline-none" onKeyDown={e => { if (e.key === "Enter" && text) { setMsgs(m => [...m, { me: true, text }]); setText(""); } }} />
              <button onClick={() => { if (text) { setMsgs(m => [...m, { me: true, text }]); setText(""); } }} className="grid h-9 w-9 place-items-center rounded-full bg-primary text-primary-foreground"><Send className="h-4 w-4" /></button>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}