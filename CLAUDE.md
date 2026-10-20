# ReFlowers (Gül Bishkek)

Mobile-first marketplace for buying and reselling flower bouquets in Bishkek, Kyrgyzstan.
Private resellers + flower shops. P2P deals: the platform never takes money, it only records
what each side did (see `.lovable/plan.md`). UI copy is Russian first; `src/lib/i18n.ts` has ru / ky / en.

## Stack
- TanStack Start (React 19, SSR) + TanStack Router (file routes in `src/routes/`) + React Query
- Tailwind 4 + shadcn/ui (`src/components/ui/`), marketplace components in `src/components/marketplace/`
- Backend: Lovable Cloud (managed Supabase, project `pbkbayermrznkumaqwyj`) — Postgres + RLS, Auth, Storage
- Server code: TanStack server functions in `src/lib/*.functions.ts` (deals, admin, AI bouquet analysis)
- Build: Vite via `@lovable.dev/vite-tanstack-config`, Nitro → Cloudflare Workers target
- Package manager: bun (`bun.lock`)

## Commands
- `bun install` · `bun run dev` · `bun run build` · `bun run lint` · `bun run format`

## Lovable sync rules (important)
- `main` is two-way synced with Lovable. Never force-push, rebase, amend or squash pushed commits on `main`.
- Work on a branch and open a PR; merging to `main` syncs into Lovable. Keep `main` buildable.
- Hosting/publishing, secrets (e.g. `LOVABLE_API_KEY`, service role key) and the database live in Lovable Cloud.

## Do not edit (generated)
- `src/integrations/supabase/*` (client, server client, auth middleware). Exception: when you add a
  migration, mirror its tables/columns/functions in `types.ts` by hand so the build type-checks;
  Lovable regenerates the file from the live schema later.
- `src/routeTree.gen.ts`
- `vite.config.ts` plugins — the Lovable config already adds them; duplicates break the app.

## Database
- Schema changes go in a new file in `supabase/migrations/` (timestamped). Never edit an existing migration.
- Every table has RLS. New tables must enable RLS with explicit policies.
- Deal state changes go through `deal_events` inserts; the `tg_deal_events_apply` trigger moves `orders.deal_status`.
- `profiles.phone` is private. Read other users through the `public_profiles` view. It is deliberately
  *not* `security_invoker`, so anyone can read the safe columns; never add `phone` to it.
- Seller contacts: `profiles.contact_call` / `contact_whatsapp` / `telegram_username` (+ `phone` in
  `+996XXXXXXXXX` form). Buyers get them only through `get_listing_contacts(listing_id)`: channel flags for
  everyone, phone/username only when signed in and only for an active listing.
- Listing expiry: `listings.expires_at` is set by the DB (24h on insert, trigger `tg_listings_guard_expiry`);
  only `extend_listing()` moves it (+24h, bouquet must be < 5 days old). RLS hides expired listings
  from everyone except the seller, chat participants and admins. Client queries also filter `expires_at > now()`.
- Paid boosts: sellers insert `listing_boosts` rows (always `pending`, price/duration set by DB);
  only `admin_review_boost()` applies them. Sellers cannot write `boost_*_until` / `urgent` on listings.
- Migrations that arrive via GitHub are **not** applied automatically. After merging, the owner asks Lovable's chat
  to apply them, then runs `node scripts/check-live-db.mjs`.
- `drizzle/` (`drizzle.config.ts`, `drizzle/migrations/*`, `meta/_journal.json`) is Lovable's own record of applied
  migrations (it copies applied files there as `0000_…`, `0001_…`). Don't edit it by hand. Keep writing migrations in
  `supabase/migrations/`.

## Server functions
- Use `createServerFn` + `.middleware([requireSupabaseAuth])` for anything user-specific; `context.supabase` runs with the user's RLS.
- `supabaseAdmin` (service role, bypasses RLS) only via dynamic import inside a handler, and only after an explicit permission check.
- Validate inputs in `.inputValidator` (zod is available).

## PWA
- `public/manifest.webmanifest`, `public/icons/*` (placeholder "re" icons), `public/offline.html`, `public/sw.js`.
- `src/lib/pwa.ts` registers the service worker only on the published site — never in dev or the Lovable
  preview iframe (it would serve stale builds there). HTML is never cached (SSR); `/assets/*` and Supabase
  Storage images are. Bump `VERSION` in `sw.js` when changing caching rules.
- Install banner: `src/components/marketplace/InstallPrompt.tsx` (rendered by `AppLayout`).

## Push notifications
- Triggers fill `push_outbox`: every `notifications` row and every chat message (to the other party).
- `src/lib/push.server.ts` sends pending rows (WebCrypto Web Push in `web-push.server.ts`, no Node deps)
  and drops rows older than 1h. It runs after deal events (`deals.functions.ts`), after chat messages
  and admin boost reviews (client calls `flushPush`). Anything new that creates notifications must
  trigger a flush too.
- Devices: `push_subscriptions` (written only by the server, upsert by endpoint). UI: `PushToggle` on
  `/notifications`. Sign-out removes this device's subscription.
- Secrets in Lovable Cloud: `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT`
  (generate with `node scripts/generate-vapid-keys.mjs`). Without them push is simply off.
- iPhone: push works only after "Add to Home Screen" (iOS 16.4+).

## Data in the UI
- **No mock data.** Everything shown comes from the database. `src/lib/marketplace.ts` holds the
  `Listing` type, helpers (`formatSom`, `postedAgo`, `boostRank`, `DISTRICTS`) and stock images used only
  for the hero and as an image fallback. Don't add fake listings, shops, reviews or trust badges.
  Show a badge only when it is backed by data (e.g. `verified`).
- `src/lib/db-listings.ts`: `LISTING_COLUMNS`, `mapDbListing`, `withSellers` (attaches `public_profiles`),
  `useDbListings`, `useListingsByIds`. Use these rather than writing new listing queries.
- Listing page meta tags come from the route loader, so Telegram/WhatsApp link previews show the bouquet.
  Keep `head()` reading `loaderData`.
- Photos are shrunk in the browser before upload (`src/lib/image.ts`, 1600px JPEG).
- `/auth?redirect=/path` returns the user there after sign-in; `/auth?signup=shop` opens shop sign-up.

## Docs and workflow (read before starting)
- `docs/STATUS.md`: what is live, open PRs, what's in progress. **Update it at the end of every session.**
- `docs/ROADMAP.md`: prioritised plan, mirrored in GitHub Issues (labels `P0`–`P3`, `area:*`,
  `owner-action`, `needs-decision`) and the GitHub Project "ReFlowers roadmap".
- `docs/DECISIONS.md`: product/tech decisions with reasons. Add an entry when you make one.
- `docs/OWNER_ACTIONS.md`: things only the owner can do (Lovable settings, secrets, BotFather, domain).
- `docs/TESTING.md`: how to run the app against a local Supabase and test it in a browser.
- `docs/research/`: competitor research (Second Bloom, Buket.kg, Flowwow, lalafo, KG login/payments) and
  `moderation-policies.md` (the adopted ban/strike policy, §4).
- `node scripts/check-live-db.mjs`: read-only check that migrations reached the live DB. Add a line for every
  new migration.
- The brand stays **ReFlowers** (owner decision, #25).
- `scripts/e2e/launch-flows.mjs`: browser test of the main flows (how to run: `docs/TESTING.md` §3).
- One issue per task. Reference it in the branch/PR (`Closes #N`). Ask the owner before closing
  `owner-action` / `needs-decision` issues.
- Branches/PRs: never push to `main` directly. Avoid stacked PRs. GitHub does **not** retarget a stacked PR to `main`
  when its base PR merges unless the base branch is deleted, so #24 merged into a dead branch and had to be
  re-applied (#26). If you must stack, tell the owner to change the base to `main` before merging.
  After merging, the owner applies migrations in Lovable.
