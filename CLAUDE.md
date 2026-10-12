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
- `src/integrations/supabase/*` (client, server client, auth middleware, `types.ts`)
- `src/routeTree.gen.ts`
- `vite.config.ts` plugins — the Lovable config already adds them; duplicates break the app.

## Database
- Schema changes go in a new file in `supabase/migrations/` (timestamped). Never edit an existing migration.
- Every table has RLS. New tables must enable RLS with explicit policies.
- Deal state changes go through `deal_events` inserts; the `tg_deal_events_apply` trigger moves `orders.deal_status`.
- `profiles.phone` is private — read other users through the `public_profiles` view.
- Confirm in Lovable that a migration pushed via GitHub was actually applied to the live database.

## Server functions
- Use `createServerFn` + `.middleware([requireSupabaseAuth])` for anything user-specific; `context.supabase` runs with the user's RLS.
- `supabaseAdmin` (service role, bypasses RLS) only via dynamic import inside a handler, and only after an explicit permission check.
- Validate inputs in `.inputValidator` (zod is available).

## Known issues / current priorities
1. Home (`src/routes/index.tsx`) and catalog (`src/routes/catalog.tsx`) merge mock `LISTINGS` from `src/lib/mock-data.ts` with real DB listings; checkout, shop pages and shop dashboard still use mock data. Remove mocks before launch.
2. `src/routes/boost-checkout.tsx` lets the client insert `listing_boosts` and set `boost_*_until` on its own listing — paid boosts are effectively free. Boosts must be pending until an admin approves the receipt.
3. `analyzeBouquet` (`src/lib/analyze-bouquet.functions.ts`) has no auth middleware — anyone can spend AI credits.
4. Listings never expire; bouquets should expire after ~72h.
5. Auth is email + password only; phone/Telegram login is wanted.
6. No PWA yet (manifest, icons, service worker, web push).
