# Testing locally

Never test against the live Lovable Cloud database (the `.env` in the repo points at it). Use a local
Supabase and the production build running in the Workers runtime, like Lovable hosting.

## 1. Local Supabase (Docker required)
```sh
# One-time workaround (#21): a migration grants admin to a production user id. Create that user
# first with a throwaway migration, and delete the file right after `start`. Never commit it.
cat > supabase/migrations/20260716081000_LOCALTEST_DELETE_ME.sql <<'EOF'
INSERT INTO auth.users (id, instance_id, aud, role, email, created_at, updated_at, raw_app_meta_data, raw_user_meta_data)
VALUES ('80f701a9-ef98-4877-b898-3a36c4479ca1','00000000-0000-0000-0000-000000000000','authenticated','authenticated',
        'admin@local.test', now(), now(), '{"provider":"email","providers":["email"]}', '{}') ON CONFLICT DO NOTHING;
EOF
npx supabase@latest start -x studio,imgproxy,edge-runtime,logflare,vector,supavisor,mailpit
rm supabase/migrations/20260716081000_LOCALTEST_DELETE_ME.sql
npx supabase status -o env > /tmp/rf-sb.env      # API_URL, ANON_KEY, SERVICE_ROLE_KEY

# Storage buckets are created outside migrations (#21):
. /tmp/rf-sb.env
for b in listing-photos chat-photos; do
  curl -s -X POST "$API_URL/storage/v1/bucket" -H "apikey: $SERVICE_ROLE_KEY" -H "Authorization: Bearer $SERVICE_ROLE_KEY" \
    -H "Content-Type: application/json" -d "{\"id\":\"$b\",\"name\":\"$b\",\"public\":false}"
done
```
A clean `start` applying every migration is itself the migration test. Stop with `npx supabase stop --no-backup`.

## 2. Build against it and serve in the Workers runtime
```sh
. /tmp/rf-sb.env
printf "VITE_SUPABASE_URL=%s\nVITE_SUPABASE_PUBLISHABLE_KEY=%s\nVITE_SUPABASE_PROJECT_ID=local\n" "$API_URL" "$ANON_KEY" > .env.local
bun run build
printf "SUPABASE_URL=%s\nSUPABASE_PUBLISHABLE_KEY=%s\nSUPABASE_SERVICE_ROLE_KEY=%s\n" "$API_URL" "$ANON_KEY" "$SERVICE_ROLE_KEY" > .output/server/.dev.vars
# optional push: append the output of `node scripts/generate-vapid-keys.mjs` to .dev.vars
(cd .output/server && npx -y wrangler@latest dev -c wrangler.json --ip 127.0.0.1 --port 4173)
rm .env.local   # afterwards, so normal dev builds use .env again
```
- `npx vite preview` does **not** work: the build targets Cloudflare.
- Use `wrangler@latest`. The build stamps today's compatibility date, and an older cached Wrangler refuses to start ("requires compatibility date …").
- Use `127.0.0.1`, not `localhost`. `src/lib/pwa.ts` turns the service worker off on `localhost`.
- The AI bouquet analyzer needs `LOVABLE_API_KEY`. Without it, the sell page shows "Умная оценка недоступна", which is the expected fallback.

## 3. Browser
Automated run of the main flows: `scripts/e2e/launch-flows.mjs`. It covers signup → sell → listing → contacts → buy → chat → expiry → extend.
```sh
mkdir -p .context/e2e/shots && cd .context/e2e && npm init -y >/dev/null && npm i playwright@1.60.0
cp ../../scripts/e2e/launch-flows.mjs . && sips -z 3000 4000 ../../src/assets/bouquet-red-roses.jpg --out big.jpg
SB_ENV=/tmp/rf-sb.env node launch-flows.mjs     # every line should read true / sensible values
```
`launch-flows.mjs` needs the local default (sign-up logs in immediately). **The live site requires email
confirmation**, so test auth separately with `scripts/e2e/auth-flows.mjs` against a second local stack that has
it on. Mailpit catches the emails:
```sh
mkdir -p /tmp/rf-confirm/supabase && cp -R supabase/migrations /tmp/rf-confirm/supabase/   # + the admin-user workaround file
cat > /tmp/rf-confirm/supabase/config.toml <<'EOF2'
project_id = "rfconfirm"
[auth]
site_url = "http://127.0.0.1:4173"
additional_redirect_urls = ["http://127.0.0.1:4173/**"]
[auth.email]
enable_confirmations = true
max_frequency = "1s"
[auth.rate_limit]
email_sent = 100
EOF2
(cd /tmp/rf-confirm && npx supabase@latest start -x studio,imgproxy,edge-runtime,logflare,vector,supavisor)
```
- **Playwright with full Chromium**, not the headless shell:
  - The headless shell reports notifications as "denied".
  - Use `launchPersistentContext` for push; push doesn't work in incognito contexts.
- Signing up locally needs no email confirmation, so a test can create seller and buyer accounts in seconds.
- Flows worth covering:
  - sign up → /sell (photo, price, contacts) → publish
  - listing page as signed-out visitor / buyer: contact buttons, «Хочу купить», chat
  - push enable → «Проверить»
  - expire a listing with the service key → the buyer sees «не найден» and the seller can «Продлить»
  - offline: stop the server, then navigate → offline page
- Link previews: `curl http://127.0.0.1:4173/listing/<id> | grep og:` must show the listing title and photo.

### Telegram
`scripts/e2e/telegram-flows.mjs` runs against a mock Bot API (`scripts/e2e/telegram-mock.mjs`, port 4599) and
fake webhook updates. Before `wrangler dev`, add these to `.output/server/.dev.vars`:
```
TELEGRAM_BOT_TOKEN=123456:TEST-TOKEN
TELEGRAM_BOT_USERNAME=reflowwwersBot
TELEGRAM_WEBHOOK_SECRET=s3cret-test
TELEGRAM_API_BASE=http://127.0.0.1:4599
TELEGRAM_WEBHOOK_URL=http://127.0.0.1:4173/api/telegram/webhook
PUBLIC_SITE_URL=https://reflowers.lovable.app
```
It covers:
- linking via `/start <token>`, a reused token, and the wrong webhook secret
- contact → verified phone; someone else's contact is rejected
- the profile guard
- a chat message → Telegram notification; `/stop`
- login widget: linked user, new user, forged signature

It signs the login data itself, because the real widget only renders on the bot's domain.

## 4. Database checks (RLS)
Run SQL as a given user with `docker exec -i <supabase_db container> psql -U postgres`:
```sql
SET ROLE authenticated;
SELECT set_config('request.jwt.claims','{"sub":"<user uuid>","role":"authenticated"}', false);
-- … queries …
RESET ROLE;
```
When editing data as admin, set claims to `{"role":"service_role"}` first. Otherwise guard triggers
(boosts, expiry) treat you as the last user and silently ignore the change.

## Checks before a PR
- `npx tsc --noEmit` (should be clean)
- `npx eslint <changed files>` (the repo isn't prettier-formatted yet; format only files you create)
- `bun run build`
