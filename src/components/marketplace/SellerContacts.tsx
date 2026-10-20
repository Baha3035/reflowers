import { useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { MessageCircle, Phone, Send } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { useApp } from "@/lib/store";
import {
  formatKgPhone,
  listingContactMessage,
  telegramLink,
  whatsappLink,
  type ContactSettingsValue,
} from "@/lib/contacts";

export const EMPTY_CONTACTS: ContactSettingsValue = {
  phone: "",
  call: false,
  whatsapp: false,
  telegram: "",
};

/** Loads the signed-in user's contact settings into the form shape. */
export async function loadMyContacts(userId: string): Promise<ContactSettingsValue> {
  const { data } = await supabase
    .from("profiles")
    .select("phone, contact_call, contact_whatsapp, telegram_username")
    .eq("id", userId)
    .maybeSingle();
  if (!data) return EMPTY_CONTACTS;
  return {
    phone: data.phone ? formatKgPhone(data.phone) : "",
    call: data.contact_call,
    whatsapp: data.contact_whatsapp,
    telegram: data.telegram_username ?? "",
  };
}

/** Seller side: which channels buyers may use besides the chat. */
export function ContactSettingsForm({
  value,
  onChange,
}: {
  value: ContactSettingsValue;
  onChange: (v: ContactSettingsValue) => void;
}) {
  const set = (patch: Partial<ContactSettingsValue>) => onChange({ ...value, ...patch });
  return (
    <div className="space-y-2.5">
      <div className="rounded-2xl bg-muted px-3 py-2.5 text-xs text-muted-foreground">
        <MessageCircle className="mr-1 inline h-3.5 w-3.5" />
        Чат ReFlowers включён всегда. Номер видят только вошедшие покупатели.
      </div>
      <Input
        value={value.phone}
        onChange={(e) => set({ phone: e.target.value })}
        type="tel"
        inputMode="tel"
        autoComplete="tel"
        placeholder="+996 555 123 456"
      />
      <Toggle
        label="Можно позвонить"
        icon={<Phone className="h-4 w-4" />}
        checked={value.call}
        onChange={(call) => set({ call })}
      />
      <Toggle
        label="Можно написать в WhatsApp"
        icon={<MessageCircle className="h-4 w-4" />}
        checked={value.whatsapp}
        onChange={(whatsapp) => set({ whatsapp })}
      />
      <div className="flex items-center gap-2">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-muted text-foreground/70">
          <Send className="h-4 w-4" />
        </span>
        <Input
          value={value.telegram}
          onChange={(e) => set({ telegram: e.target.value })}
          autoCapitalize="none"
          autoCorrect="off"
          placeholder="Telegram: @username (необязательно)"
        />
      </div>
    </div>
  );
}

function Toggle({
  label,
  icon,
  checked,
  onChange,
}: {
  label: string;
  icon: React.ReactNode;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex cursor-pointer items-center gap-2 rounded-2xl border border-border bg-background p-2">
      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-muted text-foreground/70">
        {icon}
      </span>
      <span className="flex-1 text-sm">{label}</span>
      <Switch checked={checked} onCheckedChange={onChange} />
    </label>
  );
}

/** Buyer side: call / WhatsApp / Telegram buttons for the channels the seller turned on. */
export function SellerContactButtons({ listingId, title }: { listingId: string; title: string }) {
  const { user } = useApp();
  const navigate = useNavigate();
  const contacts = useQuery({
    queryKey: ["listing-contacts", listingId, user?.id ?? null],
    queryFn: async () => {
      const { data } = await supabase.rpc("get_listing_contacts", { _listing_id: listingId });
      return data?.[0] ?? null;
    },
  });
  const c = contacts.data;
  if (!c || !(c.call || c.whatsapp || c.telegram)) return null;

  const url = typeof window !== "undefined" ? window.location.href : "";
  const text = listingContactMessage(title, url);
  const requireLogin = () => {
    toast.info("Войдите, чтобы увидеть контакты продавца");
    navigate({ to: "/auth", search: { redirect: `/listing/${listingId}` } });
  };

  const openTelegram = async () => {
    if (!c.telegram_username) return requireLogin();
    try {
      await navigator.clipboard.writeText(text);
      toast.success("Текст сообщения скопирован — вставьте его в чат");
    } catch {
      /* clipboard blocked: open the chat anyway */
    }
    window.open(telegramLink(c.telegram_username), "_blank", "noopener");
  };

  const btn =
    "inline-flex flex-1 items-center justify-center gap-1.5 rounded-full border border-border bg-background px-3 py-2 text-sm font-medium transition hover:border-primary";

  return (
    <div className="mt-3 flex flex-wrap gap-2">
      {c.call &&
        (c.phone ? (
          <a href={`tel:${c.phone}`} className={btn}>
            <Phone className="h-4 w-4" /> Позвонить
          </a>
        ) : (
          <button type="button" onClick={requireLogin} className={btn}>
            <Phone className="h-4 w-4" /> Позвонить
          </button>
        ))}
      {c.whatsapp &&
        (c.phone ? (
          <a
            href={whatsappLink(c.phone, text)}
            target="_blank"
            rel="noopener noreferrer"
            className={btn}
          >
            <MessageCircle className="h-4 w-4" /> WhatsApp
          </a>
        ) : (
          <button type="button" onClick={requireLogin} className={btn}>
            <MessageCircle className="h-4 w-4" /> WhatsApp
          </button>
        ))}
      {c.telegram && (
        <button type="button" onClick={openTelegram} className={btn}>
          <Send className="h-4 w-4" /> Telegram
        </button>
      )}
    </div>
  );
}
