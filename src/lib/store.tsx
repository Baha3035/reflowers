import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { DICT, type Lang, type TKey } from "./i18n";
import { supabase } from "@/integrations/supabase/client";
import type { Session, User } from "@supabase/supabase-js";

export const CITIES = ["Бишкек", "Ош", "Каракол", "Токмок", "Джалал-Абад"] as const;
export type City = typeof CITIES[number];

type Ctx = {
  favorites: Set<string>;
  toggleFavorite: (id: string) => void;
  language: Lang;
  setLanguage: (l: Lang) => void;
  sellerMode: "private" | "shop";
  setSellerMode: (m: "private" | "shop") => void;
  city: City;
  setCity: (c: City) => void;
  t: (key: TKey) => string;
  user: User | null;
  session: Session | null;
  authLoading: boolean;
  signOut: () => Promise<void>;
};

const AppCtx = createContext<Ctx | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [language, setLanguage] = useState<Lang>("ru");
  const [sellerMode, setSellerMode] = useState<"private" | "shop">("private");
  const [city, setCity] = useState<City>("Бишкек");
  const [session, setSession] = useState<Session | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  // hydrate from localStorage after mount
  useEffect(() => {
    try {
      const raw = localStorage.getItem("gm_favs");
      if (raw) setFavorites(new Set(JSON.parse(raw)));
    } catch {}
  }, []);
  useEffect(() => {
    try { localStorage.setItem("gm_favs", JSON.stringify([...favorites])); } catch {}
  }, [favorites]);
  useEffect(() => {
    try {
      const l = localStorage.getItem("gm_lang") as Lang | null;
      if (l === "ru" || l === "ky" || l === "en") setLanguage(l);
      const c = localStorage.getItem("gm_city") as City | null;
      if (c && (CITIES as readonly string[]).includes(c)) setCity(c as City);
    } catch {}
  }, []);
  useEffect(() => { try { localStorage.setItem("gm_lang", language); } catch {} }, [language]);
  useEffect(() => { try { localStorage.setItem("gm_city", city); } catch {} }, [city]);

  // Auth session bootstrap + listener
  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
      setSession(s);
      setAuthLoading(false);
    });
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setAuthLoading(false);
    });
    return () => { sub.subscription.unsubscribe(); };
  }, []);

  const toggleFavorite = useCallback((id: string) => {
    setFavorites(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }, []);

  const signOut = useCallback(async () => { await supabase.auth.signOut(); }, []);

  const t = useCallback((key: TKey) => DICT[language][key] ?? DICT.ru[key] ?? key, [language]);
  const value = useMemo(() => ({
    favorites, toggleFavorite, language, setLanguage, sellerMode, setSellerMode, city, setCity, t,
    user: session?.user ?? null, session, authLoading, signOut,
  }), [favorites, toggleFavorite, language, sellerMode, city, t, session, authLoading, signOut]);

  return <AppCtx.Provider value={value}>{children}</AppCtx.Provider>;
}

export function useApp() {
  const ctx = useContext(AppCtx);
  if (!ctx) throw new Error("useApp must be inside AppProvider");
  return ctx;
}