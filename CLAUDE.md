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
- `profiles.phone` is private — read other users through the `public_profiles` view.
- Paid boosts: sellers insert `listing_boosts` rows (always `pending`, price/duration set by DB);
  only `admin_review_boost()` applies them. Sellers cannot write `boost_*_until` / `urgent` on listings.
- Confirm in Lovable that a migration pushed via GitHub was actually applied to the live database.

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

## Known issues / current priorities
1. Home (`src/routes/index.tsx`) and catalog (`src/routes/catalog.tsx`) merge mock `LISTINGS` from `src/lib/mock-data.ts` with real DB listings; checkout, shop pages and shop dashboard still use mock data. Remove mocks before launch.
   Mock listing ids are not UUIDs, so deal buttons on them fail — keep that in mind for demos.
2. Listings never expire; bouquets should expire after ~72h. The `urgent` boost never expires either.
3. Auth is email + password only; phone/Telegram login is wanted.
