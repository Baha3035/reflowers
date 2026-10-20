// Sign-up confirmation, "already registered", wrong password, forgot/reset password — against a local
// Supabase with email confirmation ON and Mailpit (see docs/TESTING.md §3). Needs playwright installed.
import { chromium } from "playwright";
import fs from "node:fs";
const env = Object.fromEntries(fs.readFileSync("/private/tmp/rf-sb.env","utf8").split("\n").filter(l=>l.includes("=")).map(l=>{const i=l.indexOf("=");return [l.slice(0,i), l.slice(i+1).replace(/^"|"$/g,"")]}));
const BASE = "http://127.0.0.1:4173", MAIL = env.MAILPIT_URL || env.INBUCKET_URL;
const log = (...a) => console.log("[auth]", ...a);
const api = async (path, body) => { const r = await fetch(`${env.API_URL}/auth/v1/${path}`, { method: "POST", headers: { apikey: env.ANON_KEY, "Content-Type": "application/json" }, body: JSON.stringify(body) }); return r.json(); };
async function lastLink(to, subjectRe) {
  for (let i = 0; i < 30; i++) {
    const list = await (await fetch(`${MAIL}/api/v1/search?query=${encodeURIComponent("to:" + to)}`)).json();
    const m = (list.messages || []).find(x => subjectRe.test(x.Subject));
    if (m) { const full = await (await fetch(`${MAIL}/api/v1/message/${m.ID}`)).json(); const href = (full.HTML || full.Text).match(/href="([^"]+)"/)?.[1] ?? (full.Text.match(/https?:\/\/\S+/)||[])[0]; return href.replace(/&amp;/g, "&"); }
    await new Promise(r => setTimeout(r, 500));
  }
  throw new Error("no mail " + subjectRe);
}
const s = Date.now(), email = `u${s}@test.kg`, old = `old${s}`;

// 1. Reproduce the bug at API level: existing account, second sign-up with a new password
await api("signup", { email: `r${s}@test.kg`, password: "first-pass" });
const second = await api("signup", { email: `r${s}@test.kg`, password: "second-pass" });
log("API: 2nd signup returns fake user, identities:", JSON.stringify(second.identities ?? second.user?.identities), "| error:", second.error_code ?? "none");
const loginUnconfirmedRight = await api("token?grant_type=password", { email: `r${s}@test.kg`, password: "first-pass" });
const loginSecond = await api("token?grant_type=password", { email: `r${s}@test.kg`, password: "second-pass" });
log("API: unconfirmed + right password →", loginUnconfirmedRight.error_code, "| 2nd password →", loginSecond.error_code);

const exe = `${process.env.HOME}/Library/Caches/ms-playwright/chromium-1234/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing`;
const browser = await chromium.launch({ executablePath: exe, args: ["--headless=new"] });
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
const p = await ctx.newPage(); p.on("pageerror", e => log("PAGEERROR", e.message));
const text = async () => (await p.locator("main").innerText()).replace(/\s+/g, " ");

// 2. Sign up → "check your mail"
await p.goto(`${BASE}/auth`); await p.getByText("Нет аккаунта? Создать").click();
await p.getByPlaceholder("Ваше имя").fill("Тест"); await p.getByPlaceholder("Email").fill(email); await p.getByPlaceholder(/Пароль/).fill(old);
await p.getByRole("button", { name: "Создать аккаунт" }).click(); await p.waitForTimeout(1500);
log("UI signup → 'Проверьте почту':", (await text()).includes("Проверьте почту"));
await p.screenshot({ path: "shots/auth-sent.png" });
// 3. Login before confirming
await p.getByRole("button", { name: /войти/ }).click();
await p.getByPlaceholder("Email").fill(email); await p.getByPlaceholder(/Пароль/).fill(old);
await p.getByRole("button", { name: "Войти" }).click(); await p.waitForTimeout(1200);
log("UI login unconfirmed →", (await text()).includes("Почта не подтверждена"), "| resend button:", await p.getByText("Отправить письмо ещё раз").isVisible());
// 4. Confirm via email link → signed in
await p.goto(await lastLink(email, /confirm/i)); await p.waitForTimeout(2000);
log("confirm link → signed in:", await p.evaluate(() => Object.keys(localStorage).some(k => k.includes("auth-token"))), new URL(p.url()).pathname);
await p.evaluate(() => localStorage.clear());
// 5. Sign up again with same email + different password → "already registered"
await p.goto(`${BASE}/auth?signup=private`);
await p.getByPlaceholder("Email").fill(email); await p.getByPlaceholder(/Пароль/).fill("another-pass");
await p.getByRole("button", { name: "Создать аккаунт" }).click(); await p.waitForTimeout(1500);
log("UI signup existing →", (await text()).includes("уже зарегистрирован"));
await p.screenshot({ path: "shots/auth-exists.png" });
// 6. Wrong password message + forgot password
await p.getByPlaceholder("Email").fill(email); await p.getByPlaceholder(/Пароль/).fill("wrong-pass");
await p.getByRole("button", { name: "Войти" }).click(); await p.waitForTimeout(1200);
log("UI wrong password →", (await text()).includes("Неверная почта или пароль"));
await p.getByText("Забыли пароль?").click();
await p.getByPlaceholder("Email").fill(email); await p.getByRole("button", { name: "Отправить ссылку" }).click(); await p.waitForTimeout(1200);
log("UI forgot → notice:", (await text()).includes("отправили на него ссылку"));
await p.goto(await lastLink(email, /reset/i)); await p.waitForTimeout(2000);
log("reset link →", new URL(p.url()).pathname + new URL(p.url()).search, "| form:", await p.getByPlaceholder(/Новый пароль/).isVisible());
await p.screenshot({ path: "shots/auth-reset.png" });
await p.getByPlaceholder(/Новый пароль/).fill("brand-new-pass"); await p.getByRole("button", { name: "Сохранить пароль" }).click(); await p.waitForTimeout(1500);
log("after reset →", new URL(p.url()).pathname);
const ok = await api("token?grant_type=password", { email, password: "brand-new-pass" });
const bad = await api("token?grant_type=password", { email, password: old });
log("new password works:", !!ok.access_token, "| old password rejected:", bad.error_code);
await browser.close();
