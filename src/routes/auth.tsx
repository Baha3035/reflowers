import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import type { AuthError } from "@supabase/supabase-js";
import { AppLayout } from "@/components/marketplace/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useApp } from "@/lib/store";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { TelegramLoginButton } from "@/components/marketplace/Telegram";

// Only same-site paths, so ?redirect= can't send people to another website.
function safeRedirect(v: unknown) {
  return typeof v === "string" && v.startsWith("/") && !v.startsWith("//") ? v : undefined;
}

export const Route = createFileRoute("/auth")({
  validateSearch: (
    s: Record<string, unknown>,
  ): { redirect?: string; signup?: "private" | "shop"; reset?: boolean } => ({
    redirect: safeRedirect(s.redirect),
    signup: s.signup === "shop" || s.signup === "private" ? s.signup : undefined,
    reset: s.reset === true || s.reset === "1" || s.reset === 1 ? true : undefined,
  }),
  head: () => ({ meta: [{ title: "Вход — ReFlowers" }, { name: "description", content: "Войдите или создайте аккаунт ReFlowers." }] }),
  component: AuthPage,
});

// signin / signup: the forms. sent: confirmation email sent after sign-up.
// forgot: ask for a reset link. reset: set a new password (after the reset link signed the user in).
type Mode = "signin" | "signup" | "sent" | "forgot" | "reset";

/** Russian text for the Supabase auth errors people actually hit. */
function authErrorText(err: unknown) {
  const e = err as Partial<AuthError> & { message?: string };
  switch (e.code) {
    case "invalid_credentials":
      return "Неверная почта или пароль";
    case "email_not_confirmed":
      return "Почта не подтверждена — откройте письмо от ReFlowers и нажмите ссылку";
    case "over_email_send_rate_limit":
    case "over_request_rate_limit":
      return "Слишком много попыток. Подождите немного и попробуйте снова";
    case "weak_password":
      return "Пароль слишком простой — минимум 6 символов";
    case "same_password":
      return "Новый пароль совпадает со старым";
    case "user_already_exists":
    case "email_exists":
      return "Этот email уже зарегистрирован. Войдите или восстановите пароль";
    default:
      return e.message || String(err);
  }
}

function AuthPage() {
  const navigate = useNavigate();
  const { redirect, signup, reset } = Route.useSearch();
  const { user, authLoading } = useApp();
  const [mode, setMode] = useState<Mode>(reset ? "reset" : signup ? "signup" : "signin");
  const [sellerType, setSellerType] = useState<"private" | "shop">(signup ?? "private");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [shopName, setShopName] = useState("");
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState<{ kind: "info" | "error"; text: string } | null>(null);
  const [canResend, setCanResend] = useState(false);

  useEffect(() => {
    // A signed-in user setting a new password stays here; everyone else goes on.
    if (!authLoading && user && mode !== "reset") navigate({ href: redirect ?? "/" });
  }, [user, authLoading, navigate, redirect, mode]);

  const go = (m: Mode) => {
    setMode(m);
    setNotice(null);
    setCanResend(false);
  };

  const resendConfirmation = async () => {
    setLoading(true);
    try {
      const { error } = await supabase.auth.resend({
        type: "signup",
        email,
        options: { emailRedirectTo: `${window.location.origin}${redirect ?? "/"}` },
      });
      if (error) throw error;
      toast.success("Письмо отправлено ещё раз");
    } catch (err) {
      toast.error(authErrorText(err));
    } finally {
      setLoading(false);
    }
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setNotice(null);
    setCanResend(false);
    try {
      if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}${redirect ?? "/"}`,
            data: {
              display_name: name || (sellerType === "shop" ? shopName : email.split("@")[0]),
              seller_type: sellerType,
              shop_name: sellerType === "shop" ? shopName : null,
            },
          },
        });
        if (error) throw error;
        if (data.session) {
          toast.success("Аккаунт создан!");
          navigate({ href: redirect ?? "/" });
        } else if (data.user && data.user.identities?.length === 0) {
          // With email confirmation on, Supabase answers an existing email with a fake success and
          // keeps the old password. Say so instead of "account created".
          setMode("signin");
          setPassword("");
          setNotice({ kind: "error", text: "Этот email уже зарегистрирован. Войдите или восстановите пароль." });
        } else {
          setMode("sent");
        }
      } else if (mode === "signin") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast.success("С возвращением!");
        navigate({ href: redirect ?? "/" });
      } else if (mode === "forgot") {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/auth?reset=1`,
        });
        if (error) throw error;
        setNotice({
          kind: "info",
          text: `Если аккаунт ${email} существует, мы отправили на него ссылку для смены пароля.`,
        });
      } else if (mode === "reset") {
        const { error } = await supabase.auth.updateUser({ password });
        if (error) throw error;
        toast.success("Пароль изменён");
        navigate({ href: redirect ?? "/" });
      }
    } catch (err) {
      setNotice({ kind: "error", text: authErrorText(err) });
      setCanResend((err as Partial<AuthError>).code === "email_not_confirmed");
    } finally {
      setLoading(false);
    }
  };

  const title = { signin: "Вход", signup: "Регистрация", sent: "Проверьте почту", forgot: "Восстановление пароля", reset: "Новый пароль" }[mode];
  const subtitle = {
    signin: "Войдите, чтобы продавать и покупать",
    signup: "Создайте аккаунт за 30 секунд",
    sent: "",
    forgot: "Пришлём ссылку для смены пароля",
    reset: "Придумайте новый пароль",
  }[mode];

  return (
    <AppLayout hideBottomNav>
      <div className="mx-auto max-w-md px-4 pt-8 pb-16 md:pt-16">
        <div className="rounded-3xl bg-card p-6 shadow-[var(--shadow-card)] md:p-8">
          <h1 className="font-display text-2xl md:text-3xl">{title}</h1>
          {subtitle && <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>}

          {mode === "sent" ? (
            <div className="mt-5 space-y-3 text-sm">
              <p>
                Мы отправили письмо на <b>{email}</b>. Откройте его и нажмите ссылку, чтобы подтвердить почту — после
                этого вы сразу войдёте.
              </p>
              <p className="text-xs text-muted-foreground">Письма нет? Проверьте «Спам» или отправьте ещё раз.</p>
              <Button variant="secondary" className="w-full rounded-full" disabled={loading} onClick={resendConfirmation}>
                Отправить ещё раз
              </Button>
              <Button className="w-full rounded-full" onClick={() => go("signin")}>
                Я подтвердил(а) — войти
              </Button>
            </div>
          ) : mode === "reset" && !authLoading && !user ? (
            <div className="mt-5 space-y-3 text-sm">
              <p>Ссылка устарела или уже использована. Запросите новую.</p>
              <Button className="w-full rounded-full" onClick={() => go("forgot")}>
                Получить новую ссылку
              </Button>
            </div>
          ) : (
            <>
              {(mode === "signin" || mode === "signup") && <TelegramLoginButton />}

              {mode === "signup" && (
                <div className="mt-5 grid grid-cols-2 gap-2">
                  {([
                    { id: "private", title: "Частное лицо", desc: "Продать свой букет" },
                    { id: "shop", title: "Магазин", desc: "Флористический бизнес" },
                  ] as const).map(o => (
                    <button
                      key={o.id}
                      type="button"
                      onClick={() => setSellerType(o.id)}
                      className={
                        "rounded-2xl border p-3 text-left transition " +
                        (sellerType === o.id ? "border-primary bg-primary/5" : "border-border bg-background hover:border-primary/50")
                      }
                    >
                      <div className="text-sm font-semibold">{o.title}</div>
                      <div className="mt-0.5 text-[11px] text-muted-foreground">{o.desc}</div>
                    </button>
                  ))}
                </div>
              )}

              <form onSubmit={submit} className="mt-6 space-y-3">
                {mode === "signup" && sellerType === "shop" && (
                  <Input value={shopName} onChange={e => setShopName(e.target.value)} required placeholder="Название магазина" />
                )}
                {mode === "signup" && (
                  <Input value={name} onChange={e => setName(e.target.value)} placeholder="Ваше имя" autoComplete="name" />
                )}
                {mode !== "reset" && (
                  <Input value={email} onChange={e => setEmail(e.target.value)} type="email" required placeholder="Email" autoComplete="email" />
                )}
                {mode !== "forgot" && (
                  <Input
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    type="password"
                    required
                    minLength={6}
                    placeholder={mode === "reset" ? "Новый пароль (мин. 6 символов)" : "Пароль (мин. 6 символов)"}
                    autoComplete={mode === "signin" ? "current-password" : "new-password"}
                  />
                )}

                {notice && (
                  <div
                    className={
                      "rounded-2xl p-3 text-sm " +
                      (notice.kind === "error" ? "bg-destructive/10 text-destructive" : "bg-primary/10 text-foreground")
                    }
                  >
                    {notice.text}
                    {canResend && (
                      <button type="button" onClick={resendConfirmation} disabled={loading} className="mt-1 block font-medium underline">
                        Отправить письмо ещё раз
                      </button>
                    )}
                  </div>
                )}

                <Button type="submit" size="lg" className="w-full rounded-full" disabled={loading}>
                  {loading
                    ? "…"
                    : { signin: "Войти", signup: "Создать аккаунт", forgot: "Отправить ссылку", reset: "Сохранить пароль" }[mode]}
                </Button>
              </form>

              {mode === "signin" && (
                <button onClick={() => go("forgot")} className="mt-3 block w-full text-center text-sm text-primary hover:underline">
                  Забыли пароль?
                </button>
              )}
              {mode !== "reset" && (
                <button
                  onClick={() => go(mode === "signin" ? "signup" : "signin")}
                  className="mt-4 block w-full text-center text-sm text-muted-foreground hover:text-foreground"
                >
                  {mode === "signin" ? "Нет аккаунта? Создать" : "Уже есть аккаунт? Войти"}
                </button>
              )}
            </>
          )}

          <Link to="/" className="mt-3 block text-center text-xs text-muted-foreground hover:underline">
            ← На главную
          </Link>
        </div>
      </div>
    </AppLayout>
  );
}
