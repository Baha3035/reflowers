# Owner actions

Things only the project owner can do: accounts, paid settings, secrets. Agents: list new items here
and in a GitHub issue labelled `owner-action`. Don't mark them done yourself.

## How database changes reach the live site (every time a PR adds a migration)
Code syncs to Lovable automatically when a PR is merged into `main`. **Database migrations don't.**
1. After merging, send this in the Lovable chat (with the file names from the PR):
   > Apply the pending Supabase migrations from supabase/migrations exactly as written, without changing them: `<file names>`. They are intended changes from GitHub.
2. Check from your Mac, in the project folder, after `git pull`:
   ```sh
   node scripts/check-live-db.mjs
   ```
   It only reads, using the public website key. Every line must be ✅.

   You can also ask Lovable "which migrations in supabase/migrations are not applied yet?"; it compares the folder with its applied-migrations journal.

## Now (launch): issue #2
1. **Merge PR #26.** It carries the work from #24, which merged into an old branch instead of `main`.
2. **Apply its two migrations** using the steps above:
   - `20261013090000_listing_expiry_and_contacts.sql`
   - `20261015090000_public_reviews.sql`

   Lovable may warn that public reviews undo an earlier security fix. Making them public is your decision (see `docs/DECISIONS.md`), so confirm.
3. **Push secrets**, if not added yet:
   1. Run `node scripts/generate-vapid-keys.mjs` in the project folder. It prints three lines.
   2. Lovable → **More → Cloud → Secrets → Add secret**:
      - `VAPID_PUBLIC_KEY`: the value after `=`
      - `VAPID_PRIVATE_KEY`: the value after `=`
      - `VAPID_SUBJECT`: `mailto:` plus an email you own

      Generate the keys only once: changing them later turns off push for everyone who already enabled it.
4. **Publish** (top-right Publish → Update).
5. **Test push on the published site** `https://reflowers.lovable.app`. Not in the Lovable editor preview, where push is deliberately off.
   - **Mac, Chrome or Safari** (no phone needed):
     1. Open the site and sign in.
     2. Go to /notifications → «Включить» → allow → «Проверить».
     3. A macOS notification should appear. If not, check System Settings → Notifications → Chrome/Safari is allowed.
   - **iPhone:**
     1. Safari → the site → Share → «На экран „Домой"».
     2. Open ReFlowers **from the new icon** and sign in again (the icon has its own session).
     3. /notifications → «Включить» → «Проверить».
   - **Android Chrome:** same as Mac.
6. **Hide the Lovable badge** (#3): Project settings → Publishing → "Hide Lovable badge" (paid plan), then publish again.
7. **Seed the feed** (pending): the site no longer shows demo bouquets.

## Telegram bot (#4 login, #5 notifications), done in code; to switch on
Secrets and `/setdomain` are already done (2026-10-21).
1. Merge the Telegram PR, then apply its migration (steps at the top): `20261021090000_telegram.sql`. Run `node scripts/check-live-db.mjs`; all lines ✅.
2. **Publish.**
3. On the published site, sign in → **/notifications → «Подключить Telegram»** → Telegram opens → **Start**. The card switches to "Telegram подключён".
   - This first click also registers the bot's webhook automatically. Until someone does it, the bot doesn't answer messages.
4. In the bot, send **/phone** and tap «📱 Подтвердить номер». Your listings then show «Номер подтверждён».
5. Try **«Войти через Telegram»** on /auth in a private window. It needs the published site; the Lovable preview shows "Bot domain invalid", which is expected.
6. If something doesn't work: Lovable → Cloud → Logs (look for `[telegram]`).

## Later
- **Custom domain (#20):** not now. When you do it (paid plan):
  - A record `@` → `185.158.133.1`
  - TXT `_lovable` → the value Lovable shows
  - then BotFather `/setdomain` to the new domain

  Users will need to reinstall the app and re-enable push.
- **SMS login (#19):** needs a Twilio (or similar) account; estimate the cost first.
