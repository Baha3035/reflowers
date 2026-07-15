import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

type Ctx = {
  favorites: Set<string>;
  toggleFavorite: (id: string) => void;
  language: "ru" | "ky" | "en";
  setLanguage: (l: "ru" | "ky" | "en") => void;
  sellerMode: "private" | "shop";
  setSellerMode: (m: "private" | "shop") => void;
};

const AppCtx = createContext<Ctx | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [language, setLanguage] = useState<"ru" | "ky" | "en">("ru");
  const [sellerMode, setSellerMode] = useState<"private" | "shop">("private");

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

  const toggleFavorite = useCallback((id: string) => {
    setFavorites(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }, []);

  const value = useMemo(() => ({ favorites, toggleFavorite, language, setLanguage, sellerMode, setSellerMode }), [favorites, toggleFavorite, language, sellerMode]);

  return <AppCtx.Provider value={value}>{children}</AppCtx.Provider>;
}

export function useApp() {
  const ctx = useContext(AppCtx);
  if (!ctx) throw new Error("useApp must be inside AppProvider");
  return ctx;
}