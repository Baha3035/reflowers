import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { DICT, type Lang, type TKey } from "./i18n";

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
};

const AppCtx = createContext<Ctx | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [language, setLanguage] = useState<Lang>("ru");
  const [sellerMode, setSellerMode] = useState<"private" | "shop">("private");
  const [city, setCity] = useState<City>("Бишкек");

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

  const toggleFavorite = useCallback((id: string) => {
    setFavorites(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }, []);

  const t = useCallback((key: TKey) => DICT[language][key] ?? DICT.ru[key] ?? key, [language]);
  const value = useMemo(() => ({ favorites, toggleFavorite, language, setLanguage, sellerMode, setSellerMode, city, setCity, t }),
    [favorites, toggleFavorite, language, sellerMode, city, t]);

  return <AppCtx.Provider value={value}>{children}</AppCtx.Provider>;
}

export function useApp() {
  const ctx = useContext(AppCtx);
  if (!ctx) throw new Error("useApp must be inside AppProvider");
  return ctx;
}