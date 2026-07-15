import { Link } from "@tanstack/react-router";
import { Bell, Home, Grid3x3, Plus, MessageCircle, User, MapPin, ChevronDown, Search } from "lucide-react";
import { useApp } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

export function AppLayout({ children, hideBottomNav = false }: { children: ReactNode; hideBottomNav?: boolean }) {
  return (
    <div className="min-h-screen bg-background pb-24 md:pb-0">
      <TopHeader />
      <main>{children}</main>
      {!hideBottomNav && <BottomNav />}
    </div>
  );
}

export function TopHeader() {
  const { language, setLanguage } = useApp();
  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/85 backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-3 md:px-8">
        <Link to="/" className="flex items-center gap-2">
          <div className="grid h-9 w-9 shrink-0 place-items-center rounded-2xl bg-primary text-primary-foreground shadow-sm">
            <span className="font-display text-lg font-semibold lowercase">re</span>
          </div>
          <span className="font-display text-xl font-semibold tracking-tight text-foreground">Re<span className="text-primary">Flowers</span></span>
        </Link>

        <button className="ml-2 hidden items-center gap-1 rounded-full bg-muted px-3 py-1.5 text-sm text-foreground/80 transition hover:bg-muted/70 sm:flex">
          <MapPin className="h-4 w-4 text-primary" /> Бишкек <ChevronDown className="h-3.5 w-3.5 opacity-60" />
        </button>

        {/* Desktop nav */}
        <nav className="ml-6 hidden items-center gap-1 md:flex">
          {[
            { to: "/", label: "Главная" },
            { to: "/catalog", label: "Каталог" },
            { to: "/messages", label: "Сообщения" },
            { to: "/favorites", label: "Избранное" },
            { to: "/shop-dashboard", label: "Для магазинов" },
          ].map(l => (
            <Link key={l.to} to={l.to} className="rounded-full px-3 py-1.5 text-sm text-foreground/70 transition hover:bg-muted hover:text-foreground" activeProps={{ className: "bg-muted text-foreground font-medium" }} activeOptions={{ exact: l.to === "/" }}>
              {l.label}
            </Link>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-1.5">
          <select value={language} onChange={e => setLanguage(e.target.value as "ru" | "ky" | "en")} className="rounded-full bg-muted px-3 py-1.5 text-xs font-medium text-foreground/80">
            <option value="ru">RU</option>
            <option value="ky">KG</option>
            <option value="en">EN</option>
          </select>
          <Link to="/notifications" className="grid h-9 w-9 place-items-center rounded-full bg-muted transition hover:bg-muted/70" aria-label="Уведомления">
            <Bell className="h-4 w-4" />
          </Link>
          <Link to="/profile" className="grid h-9 w-9 place-items-center rounded-full bg-primary text-primary-foreground transition hover:opacity-90" aria-label="Профиль">
            <User className="h-4 w-4" />
          </Link>
          <Link to="/sell" className="ml-1 hidden md:block">
            <Button size="sm" className="rounded-full">
              <Plus className="h-4 w-4" /> Продать
            </Button>
          </Link>
        </div>
      </div>
    </header>
  );
}

export function BottomNav() {
  const items = [
    { to: "/", label: "Главная", icon: Home, exact: true },
    { to: "/catalog", label: "Каталог", icon: Grid3x3 },
    { to: "/sell", label: "Продать", icon: Plus, primary: true },
    { to: "/messages", label: "Сообщения", icon: MessageCircle },
    { to: "/profile", label: "Профиль", icon: User },
  ];
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-border/60 bg-background/95 pb-safe backdrop-blur-md md:hidden">
      <div className="mx-auto grid max-w-md grid-cols-5 items-end px-2 pt-1.5 pb-2">
        {items.map(item => (
          <Link
            key={item.to}
            to={item.to}
            activeOptions={{ exact: item.exact }}
            className={cn(
              "flex flex-col items-center gap-0.5 rounded-2xl px-1 py-1.5 text-[10px] font-medium text-muted-foreground transition",
            )}
            activeProps={{ className: "text-primary" }}
          >
            {item.primary ? (
              <span className="mb-0.5 grid h-11 w-11 -translate-y-3 place-items-center rounded-2xl bg-primary text-primary-foreground shadow-[0_6px_18px_-6px_var(--primary)]">
                <item.icon className="h-5 w-5" />
              </span>
            ) : (
              <item.icon className="h-5 w-5" />
            )}
            <span className={cn(item.primary && "-mt-2")}>{item.label}</span>
          </Link>
        ))}
      </div>
    </nav>
  );
}

export function SearchBar({ onFilter }: { onFilter?: () => void }) {
  return (
    <div className="flex items-center gap-2">
      <div className="flex flex-1 items-center gap-2 rounded-2xl bg-card px-4 py-3 shadow-[var(--shadow-card)]">
        <Search className="h-4 w-4 text-muted-foreground" />
        <input placeholder="Розы, пионы, букеты до 2000 сом..." className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground" />
      </div>
      <button onClick={onFilter} className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-primary text-primary-foreground shadow-[var(--shadow-soft)]">
        <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M3 6h18M6 12h12M10 18h4" /></svg>
      </button>
    </div>
  );
}