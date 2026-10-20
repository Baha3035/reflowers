// Seller contact channels besides the in-app chat: phone call, WhatsApp and Telegram.
// Phones are stored as +996XXXXXXXXX (the DB enforces it).

/** "0555 123 456", "555123456", "+996 555 12-34-56" → "+996555123456"; null if not a KG number. */
export function normalizeKgPhone(input: string): string | null {
  const digits = input.replace(/\D/g, "");
  if (digits.length === 12 && digits.startsWith("996")) return `+${digits}`;
  if (digits.length === 10 && digits.startsWith("0")) return `+996${digits.slice(1)}`;
  if (digits.length === 9) return `+996${digits}`;
  return null;
}

/** "+996555123456" → "+996 555 123 456" */
export function formatKgPhone(phone: string) {
  const m = /^\+996(\d{3})(\d{3})(\d{3})$/.exec(phone);
  return m ? `+996 ${m[1]} ${m[2]} ${m[3]}` : phone;
}

/** "@my_name", "t.me/my_name", "https://t.me/my_name" → "my_name"; null if invalid. */
export function normalizeTelegram(input: string): string | null {
  const name = input
    .trim()
    .replace(/^https?:\/\//, "")
    .replace(/^(t\.me|telegram\.me)\//, "")
    .replace(/^@/, "");
  return /^[A-Za-z0-9_]{5,32}$/.test(name) ? name : null;
}

export function listingContactMessage(title: string, url: string) {
  return `Здравствуйте! Пишу по объявлению на ReFlowers: «${title}» ${url}`;
}

export function whatsappLink(phone: string, text: string) {
  return `https://wa.me/${phone.replace(/\D/g, "")}?text=${encodeURIComponent(text)}`;
}

export function telegramLink(username: string) {
  return `https://t.me/${username}`;
}

export type ContactSettingsValue = {
  phone: string;
  call: boolean;
  whatsapp: boolean;
  telegram: string;
};

/** Checks the form and returns the profile columns to save, or an error message. */
export function contactSettingsToProfile(
  v: ContactSettingsValue,
):
  | {
      ok: true;
      profile: {
        phone: string | null;
        contact_call: boolean;
        contact_whatsapp: boolean;
        telegram_username: string | null;
      };
    }
  | { ok: false; error: string } {
  const phone = v.phone.trim() ? normalizeKgPhone(v.phone) : null;
  if (v.phone.trim() && !phone) return { ok: false, error: "Номер в формате +996 555 123 456" };
  if ((v.call || v.whatsapp) && !phone)
    return {
      ok: false,
      error: "Укажите номер, чтобы покупатели могли позвонить или написать в WhatsApp",
    };
  const telegram = v.telegram.trim() ? normalizeTelegram(v.telegram) : null;
  if (v.telegram.trim() && !telegram)
    return { ok: false, error: "Telegram: имя пользователя из 5–32 латинских букв, цифр или _" };
  return {
    ok: true,
    profile: {
      phone,
      contact_call: v.call,
      contact_whatsapp: v.whatsapp,
      telegram_username: telegram,
    },
  };
}
