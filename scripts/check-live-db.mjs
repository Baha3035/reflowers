// Read-only check that recent migrations reached a database, using only the public API key
// (the same access any website visitor has). Run: node scripts/check-live-db.mjs
// Defaults to SUPABASE_URL / SUPABASE_PUBLISHABLE_KEY from .env; override with env vars.
import fs from "node:fs";

const env = {
  ...Object.fromEntries(
    (fs.existsSync(".env") ? fs.readFileSync(".env", "utf8") : "")
      .split("\n")
      .filter((l) => l.includes("="))
      .map((l) => {
        const i = l.indexOf("=");
        return [
          l.slice(0, i).trim(),
          l
            .slice(i + 1)
            .trim()
            .replace(/^"|"$/g, ""),
        ];
      }),
  ),
  ...process.env,
};
const URL_ = env.SUPABASE_URL || env.VITE_SUPABASE_URL;
const KEY = env.SUPABASE_PUBLISHABLE_KEY || env.VITE_SUPABASE_PUBLISHABLE_KEY;
if (!URL_ || !KEY) throw new Error("SUPABASE_URL / SUPABASE_PUBLISHABLE_KEY not found");
const headers = { apikey: KEY, Authorization: `Bearer ${KEY}`, "Content-Type": "application/json" };
const ZERO = "00000000-0000-0000-0000-000000000000";

// PostgREST answers PGRST205 / PGRST202 / 42703 when a table, function or column doesn't exist.
// "permission denied" means it exists but visitors can't use it, which is fine for private tables.
async function probe(path, init) {
  const res = await fetch(`${URL_}/rest/v1/${path}`, { headers, ...init });
  const body = await res.json().catch(() => ({}));
  if (res.ok) return "ok";
  if (["PGRST205", "PGRST202", "42703", "42883"].includes(body.code)) return "missing";
  if (body.code === "42501" || res.status === 401 || res.status === 403) return "exists (private)";
  return `? ${res.status} ${body.code ?? ""} ${body.message ?? ""}`.trim();
}
const rpc = (name, args) => probe(`rpc/${name}`, { method: "POST", body: JSON.stringify(args) });

const checks = [
  [
    "20261012090000 boost review",
    () => rpc("admin_review_boost", { _boost_id: ZERO, _approve: false }),
  ],
  ["20261012090000 ai_usage table", () => probe("ai_usage?select=user_id&limit=1")],
  ["20261012100000 push_subscriptions", () => probe("push_subscriptions?select=id&limit=1")],
  ["20261012100000 push_outbox", () => probe("push_outbox?select=id&limit=1")],
  ["20261013090000 listings.expires_at", () => probe("listings?select=expires_at&limit=1")],
  [
    "20261013090000 get_listing_contacts()",
    () => rpc("get_listing_contacts", { _listing_id: ZERO }),
  ],
  ["20261013090000 extend_listing()", () => rpc("extend_listing", { _listing_id: ZERO })],
  // Must be readable by visitors, not just exist.
  ["20261015090000 reviews public", () => probe("reviews?select=id&limit=1"), { publicOnly: true }],
  ["20261021090000 public_profiles.phone_verified", () => probe("public_profiles?select=phone_verified&limit=1")],
  ["20261021090000 telegram_link_tokens", () => probe("telegram_link_tokens?select=token&limit=1")],
];

console.log(`Database: ${URL_}\n`);
let missing = 0;
for (const [name, run, opts] of checks) {
  const r = await run();
  // admin_review_boost raises "Only admin" for visitors: that also proves it exists.
  const status = r.startsWith("?") && r.includes("Only admin") ? "exists (private)" : r;
  const good = status === "ok" || (!opts?.publicOnly && status.startsWith("exists"));
  if (!good) missing++;
  console.log(`${good ? "✅" : "❌"} ${name}: ${status}`);
}
console.log(
  missing
    ? `\n${missing} check(s) failed — ask Lovable to apply the pending migrations.`
    : "\nAll migrations are applied.",
);
