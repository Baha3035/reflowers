// Telegram flows against a local build + mock Bot API (telegram-mock.mjs on :4599). See docs/TESTING.md §3.
import { chromium } from "playwright";
import crypto from "node:crypto";
import fs from "node:fs";
const env = Object.fromEntries(fs.readFileSync("/private/tmp/rf-sb.env","utf8").split("\n").filter(l=>l.includes("=")).map(l=>{const i=l.indexOf("=");return [l.slice(0,i), l.slice(i+1).replace(/^"|"$/g,"")]}));
const BASE = "http://127.0.0.1:4173", TOKEN = "123456:TEST-TOKEN", SECRET = "s3cret-test";
const log = (...a) => console.log("[tg]", ...a);
const rest = async (path, init={}, key=env.SERVICE_ROLE_KEY, auth=key) => { const r = await fetch(`${env.API_URL}/rest/v1/${path}`, { ...init, headers: { apikey: key, Authorization: `Bearer ${auth}`, "Content-Type":"application/json", Prefer: "return=representation", ...(init.headers||{}) } }); return r.json().catch(()=>null); };
const calls = async () => (await fetch("http://127.0.0.1:4599/calls")).json();
const hook = (update, secret = SECRET) => fetch(`${BASE}/api/telegram/webhook`, { method: "POST", headers: { "content-type": "application/json", "x-telegram-bot-api-secret-token": secret }, body: JSON.stringify(update) });
const msg = (id, extra) => ({ update_id: Date.now(), message: { message_id: 1, chat: { id, type: "private" }, from: { id, first_name: "Алина" }, date: Math.floor(Date.now()/1000), ...extra } });
function signed(user) {
  const data = { ...user, auth_date: Math.floor(Date.now()/1000) };
  const dcs = Object.keys(data).sort().map(k => `${k}=${data[k]}`).join("\n");
  const secret = crypto.createHash("sha256").update(TOKEN).digest();
  return { ...data, hash: crypto.createHmac("sha256", secret).update(dcs).digest("hex") };
}
const exe = `${process.env.HOME}/Library/Caches/ms-playwright/chromium-1234/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing`;
const browser = await chromium.launch({ executablePath: exe, args: ["--headless=new"] });
const mk = async () => { const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } }); const page = await ctx.newPage(); page.on("pageerror", e => log("PAGEERROR", e.message)); return page; };
const s = Date.now();
async function signup(page, name, email) {
  await page.goto(`${BASE}/auth`); await page.getByText("Нет аккаунта? Создать").click();
  await page.getByPlaceholder("Ваше имя").fill(name); await page.getByPlaceholder("Email").fill(email); await page.getByPlaceholder(/Пароль/).fill("secret123");
  await page.getByRole("button", { name: "Создать аккаунт" }).click(); await page.waitForURL(u => !u.pathname.startsWith("/auth"), { timeout: 15000 });
}
const userId = async (page) => page.evaluate(() => { const k = Object.keys(localStorage).find(k => k.includes("auth-token")); return k ? JSON.parse(localStorage[k]).user : null; });

// 1. Seller links Telegram from /notifications
const A = await mk(); await signup(A, "Алина", `seller${s}@test.kg`);
const seller = await userId(A);
await A.goto(`${BASE}/notifications`);
const linkEl = A.getByRole("link", { name: "Подключить Telegram" }); await linkEl.waitFor({ timeout: 15000 });
const href = await linkEl.getAttribute("href"); const tok = new URL(href).searchParams.get("start");
log("link:", href.replace(tok, "<token>"));
const c1 = await calls(); log("webhook registered:", JSON.stringify(c1.find(c => c.method === "setWebhook")?.payload));
await A.screenshot({ path: "shots/tg-connect.png" });
log("wrong secret →", (await hook(msg(111, { text: `/start ${tok}` }), "nope")).status);
log("/start token →", (await hook(msg(111, { text: `/start ${tok}` }))).status);
const [p1] = await rest(`profiles?select=telegram_id,telegram_notify&id=eq.${seller.id}`); log("profile linked:", JSON.stringify(p1));
const sent1 = (await calls()).filter(c => c.method === "sendMessage").at(-1); log("bot replied:", sent1.payload.text.slice(0, 40), "| contact button:", !!sent1.payload.reply_markup?.keyboard);
await A.waitForTimeout(5000); log("card updated:", await A.getByText("Уведомления в Telegram").isVisible());
await hook(msg(111, { text: `/start ${tok}` })); log("reused token reply:", (await calls()).filter(c => c.method === "sendMessage").at(-1).payload.text.slice(0, 30));
// 2. Contact sharing → verified phone
await hook(msg(111, { contact: { phone_number: "996700111222", user_id: 999 } }));
log("someone else's contact →", (await calls()).filter(c => c.method === "sendMessage").at(-1).payload.text.slice(0, 40));
await hook(msg(111, { contact: { phone_number: "+996 700 111 222", user_id: 111 } }));
const [p2] = await rest(`profiles?select=phone,phone_verified_at&id=eq.${seller.id}`); log("phone:", p2.phone, "| verified:", !!p2.phone_verified_at);
// 3. Guard: seller can't fake trust fields via the API
const access = await A.evaluate(() => { const k = Object.keys(localStorage).find(k => k.includes("auth-token")); return JSON.parse(localStorage[k]).access_token; });
await rest(`profiles?id=eq.${seller.id}`, { method: "PATCH", body: JSON.stringify({ verified: true, rating: 5, reviews_count: 99, telegram_id: 4242, phone_verified_at: new Date().toISOString() }) }, env.ANON_KEY, access);
const [p3] = await rest(`profiles?select=verified,rating,reviews_count,telegram_id,phone_verified_at&id=eq.${seller.id}`);
log("guard (expect false/0/0/111/kept):", p3.verified, p3.rating, p3.reviews_count, p3.telegram_id, !!p3.phone_verified_at);
await rest(`profiles?id=eq.${seller.id}`, { method: "PATCH", body: JSON.stringify({ phone: "+996555000111" }) }, env.ANON_KEY, access);
const [p4] = await rest(`profiles?select=phone_verified_at&id=eq.${seller.id}`); log("phone changed → verification dropped:", p4.phone_verified_at === null);
await hook(msg(111, { contact: { phone_number: "996700111222", user_id: 111 } }));
// 4. Buyer writes → seller gets a Telegram message
const [L] = await rest("listings", { method: "POST", body: JSON.stringify({ seller_id: seller.id, title: "Пионы", price: 2500, category: "Смешанные", district: "Центр" }) });
const B = await mk(); await signup(B, "Бакыт", `buyer${s}@test.kg`);
await B.goto(`${BASE}/listing/${L.id}`); await B.waitForTimeout(1500);
log("anon/buyer sees 'Номер подтверждён':", await B.getByText("Номер подтверждён").isVisible());
await B.getByRole("button", { name: /^Написать/ }).last().click(); await B.waitForURL(/conversation/);
await B.locator("textarea").fill("Здравствуйте! Пионы ещё есть?"); await B.keyboard.press("Enter"); await B.waitForTimeout(3000);
const tgMsg = (await calls()).filter(c => c.method === "sendMessage" && c.payload.chat_id === 111).at(-1);
log("seller Telegram notification:", JSON.stringify({ text: tgMsg.payload.text, button: tgMsg.payload.reply_markup?.inline_keyboard?.[0]?.[0]?.url?.replace(/[0-9a-f-]{36}/, "<id>") }));
// 5. /stop → no more Telegram messages
await hook(msg(111, { text: "/stop" }));
const before = (await calls()).length;
await B.locator("textarea").fill("Ау?"); await B.keyboard.press("Enter"); await B.waitForTimeout(3000);
log("after /stop, messages to seller:", (await calls()).slice(before).filter(c => c.method === "sendMessage" && c.payload.chat_id === 111 && !c.payload.text.includes("выключены")).length);
// 6. Telegram login: existing linked user → same account; new user → new account; forged → rejected
const C = await mk(); await C.goto(`${BASE}/auth`); await C.waitForFunction(() => typeof window.onTelegramAuth === "function", null, { timeout: 15000 });
await C.evaluate((d) => window.onTelegramAuth(d), signed({ id: 111, first_name: "Алина", username: "alina_kg" })); await C.waitForTimeout(3000);
log("TG login (linked) → same account:", (await userId(C))?.id === seller.id, "| url:", new URL(C.url()).pathname);
const D = await mk(); await D.goto(`${BASE}/auth`); await D.waitForFunction(() => typeof window.onTelegramAuth === "function");
await D.evaluate((d) => window.onTelegramAuth(d), signed({ id: 222, first_name: "Нурай", last_name: "А.", username: "nurai" })); await D.waitForTimeout(3000);
const newUser = await userId(D); const [p5] = await rest(`profiles?select=display_name,telegram_id&id=eq.${newUser?.id}`);
log("TG login (new) → account:", !!newUser, JSON.stringify(p5));
const E = await mk(); await E.goto(`${BASE}/auth`); await E.waitForFunction(() => typeof window.onTelegramAuth === "function");
const forged = signed({ id: 111, first_name: "Алина" }); forged.id = 333;
await E.evaluate((d) => window.onTelegramAuth(d), forged); await E.waitForTimeout(2500);
log("forged signature → no session:", !(await userId(E)), "| toast:", await E.getByText("Не удалось проверить вход").isVisible());
await D.goto(`${BASE}/auth`); await D.waitForTimeout(1000);
await E.screenshot({ path: "shots/tg-auth.png" });
await browser.close();
