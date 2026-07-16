import { Link, useRouter, useRouterState } from "@tanstack/react-router";
import { Bell, Home, Grid3x3, Plus, MessageCircle, User, MapPin, ChevronDown, Search, ArrowLeft, LogIn, ShieldCheck } from "lucide-react";
import { useApp, CITIES, type City } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { ReactNode } from "react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useUnreadMessages } from "@/hooks/use-unread-messages";

export function AppLayout({ children, hideBottomNav = false }: { children: ReactNode; hideBottomNav?: boolean }) {
  // Global unread tracker + realtime notifications (no-op when signed out).
  useUnreadMessages();
  return (
    <div className="min-h-screen bg-background pb-24 md:pb-0">
      <TopHeader />
      <main>{children}</main>
      {!hideBottomNav && <BottomNav />}
    </div>
  );
}

export function TopHeader() {
  const { language, setLanguage, city, setCity, t, user } = useApp();
  const router = useRouter();
  const pathname = useRouterState({ select: s => s.location.pathname });
  const showBack = pathname !== "/";
  const unread = useUnreadMessages();
  const { data: isAdmin } = useQuery({
    queryKey: ["is-admin", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user!.id)
        .eq("role", "admin")
        .maybeSingle();
      return !!data;
    },
  });
  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/85 backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-3 md:px-8">
        {showBack && (
          <button
            onClick={() => { try { router.history.back(); } catch { router.navigate({ to: "/" }); } }}
            aria-label={t("back")}
            className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-muted transition hover:bg-muted/70"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
        )}
        <Link to="/" className="flex items-center gap-2">
          <div className="grid h-9 w-9 shrink-0 place-items-center rounded-2xl bg-primary text-primary-foreground shadow-sm">
            <span className="font-display text-lg font-semibold lowercase">re</span>
          </div>
          <span className="hidden font-display text-xl font-semibold tracking-tight text-foreground sm:inline">Re<span className="text-primary">Flowers</span></span>
        </Link>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="ml-1 hidden items-center gap-1 rounded-full bg-muted px-3 py-1.5 text-sm text-foreground/80 transition hover:bg-muted/70 sm:flex">
              <MapPin className="h-4 w-4 text-primary" /> {city} <ChevronDown className="h-3.5 w-3.5 opacity-60" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="min-w-40">
            {CITIES.map(c => (
              <DropdownMenuItem key={c} onClick={() => setCity(c as City)} className={cn(city === c && "font-semibold text-primary")}>{c}</DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Desktop nav */}
        <nav className="ml-6 hidden items-center gap-1 md:flex">
          {[
            { to: "/", label: t("nav.home") },
            { to: "/catalog", label: t("nav.catalog") },
            { to: "/messages", label: t("nav.messages"), badge: unread.total },
            { to: "/favorites", label: t("nav.favorites") },
            { to: "/shop-dashboard", label: t("nav.shops") },
          ].map(l => (
            <Link key={l.to} to={l.to} className="relative rounded-full px-3 py-1.5 text-sm text-foreground/70 transition hover:bg-muted hover:text-foreground" activeProps={{ className: "bg-muted text-foreground font-medium" }} activeOptions={{ exact: l.to === "/" }}>
              {l.label}
              {"badge" in l && (l.badge ?? 0) > 0 && (
                <span className="ml-1 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-semibold text-primary-foreground">{l.badge! > 99 ? "99+" : l.badge}</span>
              )}
            </Link>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-1.5">
          {/* Mobile city button */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center gap-1 rounded-full bg-muted px-2.5 py-1.5 text-xs font-medium text-foreground/80 sm:hidden">
                <MapPin className="h-3.5 w-3.5 text-primary" /> {city}
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="min-w-40">
              {CITIES.map(c => (
                <DropdownMenuItem key={c} onClick={() => setCity(c as City)} className={cn(city === c && "font-semibold text-primary")}>{c}</DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
          <select value={language} onChange={e => setLanguage(e.target.value as "ru" | "ky" | "en")} className="rounded-full bg-muted px-3 py-1.5 text-xs font-medium text-foreground/80">
            <option value="ru">RU</option>
            <option value="ky">KG</option>
            <option value="en">EN</option>
          </select>
          <Link to="/notifications" className="relative hidden h-9 w-9 place-items-center rounded-full bg-muted transition hover:bg-muted/70 sm:grid" aria-label="Notifications">
            <Bell className="h-4 w-4" />
            {unread.total > 0 && (
              <span className="absolute -right-0.5 -top-0.5 grid h-4 min-w-4 place-items-center rounded-full bg-primary px-1 text-[10px] font-semibold text-primary-foreground">{unread.total > 99 ? "99+" : unread.total}</span>
            )}
          </Link>
          {isAdmin && (
            <Link
              to="/admin"
              className="hidden h-9 items-center gap-1 rounded-full bg-primary/10 px-3 text-xs font-medium text-primary transition hover:bg-primary/20 sm:inline-flex"
              aria-label="Admin panel"
            >
              <ShieldCheck className="h-3.5 w-3.5" /> Админ
            </Link>
          )}
          {user ? (
            <Link
              to="/profile"
              className="grid h-9 w-9 place-items-center rounded-full bg-primary text-primary-foreground transition hover:opacity-90"
              aria-label={t("nav.profile")}
            >
              <User className="h-4 w-4" />
            </Link>
          ) : (
            <Link to="/auth" className="inline-flex h-9 items-center gap-1 rounded-full bg-primary px-3 text-xs font-medium text-primary-foreground transition hover:opacity-90">
              <LogIn className="h-3.5 w-3.5" /> Войти
            </Link>
          )}
          <Link to="/sell" className="ml-1 hidden md:block">
            <Button size="sm" className="rounded-full">
              <Plus className="h-4 w-4" /> {t("header.sell")}
            </Button>
          </Link>
        </div>
      </div>
    </header>
  );
}

export function BottomNav() {
  const { t } = useApp();
  const unread = useUnreadMessages();
  const items = [
    { to: "/", label: t("nav.home"), icon: Home, exact: true },
    { to: "/catalog", label: t("nav.catalog"), icon: Grid3x3 },
    { to: "/sell", label: t("nav.sell"), icon: Plus, primary: true },
    { to: "/messages", label: t("nav.messages"), icon: MessageCircle, badge: unread.total },
    { to: "/profile", label: t("nav.profile"), icon: User },
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
              <span className="relative">
                <item.icon className="h-5 w-5" />
                {"badge" in item && (item.badge ?? 0) > 0 && (
                  <span className="absolute -right-2 -top-1 grid h-4 min-w-4 place-items-center rounded-full bg-primary px-1 text-[10px] font-semibold text-primary-foreground">{item.badge! > 9 ? "9+" : item.badge}</span>
                )}
              </span>
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