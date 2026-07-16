import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { AppLayout } from "@/components/marketplace/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useApp } from "@/lib/store";
import { useEffect, useState } from "react";
import { toast } from "sonner";

export const Route = createFileRoute("/auth")({
  head: () => ({ meta: [{ title: "Вход — ReFlowers" }, { name: "description", content: "Войдите или создайте аккаунт ReFlowers." }] }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const { user, authLoading } = useApp();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!authLoading && user) navigate({ to: "/" });
  }, [user, authLoading, navigate]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email, password,
          options: {
            emailRedirectTo: `${window.location.origin}/`,
            data: { display_name: name || email.split("@")[0] },
          },
        });
        if (error) throw error;
        toast.success("Аккаунт создан!");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast.success("С возвращением!");
      }
      navigate({ to: "/" });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      toast.error(msg.includes("Invalid login") ? "Неверная почта или пароль" : msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AppLayout hideBottomNav>
      <div className="mx-auto max-w-md px-4 pt-8 pb-16 md:pt-16">
        <div className="rounded-3xl bg-card p-6 shadow-[var(--shadow-card)] md:p-8">
          <h1 className="font-display text-2xl md:text-3xl">{mode === "signin" ? "Вход" : "Регистрация"}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {mode === "signin" ? "Войдите, чтобы продавать и покупать" : "Создайте аккаунт за 30 секунд"}
          </p>

          <form onSubmit={submit} className="mt-6 space-y-3">
            {mode === "signup" && (
              <Input value={name} onChange={e => setName(e.target.value)} placeholder="Ваше имя" autoComplete="name" />
            )}
            <Input value={email} onChange={e => setEmail(e.target.value)} type="email" required placeholder="Email" autoComplete="email" />
            <Input value={password} onChange={e => setPassword(e.target.value)} type="password" required minLength={6} placeholder="Пароль (мин. 6 символов)" autoComplete={mode === "signup" ? "new-password" : "current-password"} />

            <Button type="submit" size="lg" className="w-full rounded-full" disabled={loading}>
              {loading ? "…" : mode === "signin" ? "Войти" : "Создать аккаунт"}
            </Button>
          </form>

          <button
            onClick={() => setMode(m => m === "signin" ? "signup" : "signin")}
            className="mt-4 block w-full text-center text-sm text-muted-foreground hover:text-foreground"
          >
            {mode === "signin" ? "Нет аккаунта? Создать" : "Уже есть аккаунт? Войти"}
          </button>

          <Link to="/" className="mt-3 block text-center text-xs text-muted-foreground hover:underline">
            ← На главную
          </Link>
        </div>
      </div>
    </AppLayout>
  );
}