# Owner actions

Things only the project owner can do: accounts, paid settings, secrets. Agents: list new items here
and in a GitHub issue labelled `owner-action`. Don't mark them done yourself.

## Now (launch): issues #2, #3, #25

### 1. Merge
On GitHub, merge **PR #1** first. PR #24 then switches its target to `main` by itself; merge it too.
Merging to `main` syncs the code into Lovable within a minute or two; the commits show up in Lovable's history.

### 2. Apply the database changes, then verify
Code syncs automatically, but **database migrations that arrive from GitHub are not reliably applied**.
1. In the Lovable chat, send:
   > Apply the pending Supabase migrations from supabase/migrations exactly as written, without changing them:
   > 20261012090000_boost_review_and_ai_usage.sql, 20261012100000_push_notifications.sql,
   > 20261013090000_listing_expiry_and_contacts.sql, 20261015090000_public_reviews.sql

   Approve the database change when Lovable asks.
2. Verify from your Mac, in the project folder:
   ```sh
   node scripts/check-live-db.mjs
   ```
   It only reads, using the public website key. Every line must be ✅. Before the migrations it prints ❌ for each missing piece.
3. Alternative check without a terminal: Lovable → **More → Cloud → Database**:
   - tables `push_subscriptions`, `push_outbox` and `ai_usage` exist
   - table `listings` has a column `expires_at`

   Or in the SQL editor:
   ```sql
   select to_regclass('public.push_outbox') is not null as push,
          exists(select 1 from information_schema.columns where table_name='listings' and column_name='expires_at') as expiry,
          to_regprocedure('public.get_listing_contacts(uuid)') is not null as contacts;
   ```

Heads-up: existing listings get `expires_at = created_at + 24h`, so old test listings leave the feed right away.

### 3. Push secrets
1. On your Mac, in the project folder (after `git pull`), run:
   ```sh
   node scripts/generate-vapid-keys.mjs
   ```
   It prints three lines: `VAPID_PUBLIC_KEY=…`, `VAPID_PRIVATE_KEY=…`, `VAPID_SUBJECT=…`.
2. Lovable → **More → Cloud → Secrets → Add secret**, three times. Name = the part before `=`, value = the part after it.
   - For `VAPID_SUBJECT`, use `mailto:` plus a support address you own, e.g. `mailto:support@<domain>`.
   - Keep the private key secret: don't paste it into any chat, and don't commit it.
   - Generate the keys once. Changing them later turns off push for everyone who already enabled it.
3. **Publish** (top-right Publish → Update).
4. Test:
   - Android Chrome: open the site → /notifications → «Включить» → «Проверить». A notification should appear.
   - iPhone: Safari → Share → «На экран „Домой"», open from the icon, then the same steps.

### 4. Hide the Lovable badge
Project settings → Publishing → "Hide Lovable badge" (paid plan), then publish again.

### 5. Seed the feed (pending)
The site no longer shows demo bouquets, so ask friends to post real ones on launch day.

### 6. Pick the brand name (#25)
Do this before creating the bot. The shortlist with availability is in the issue.

## Next: Telegram bot (#4 login, #5 notifications)
The bot is private: login/phone verification and personal notifications only. **No public channel** (see `docs/DECISIONS.md`).
1. In Telegram, open @BotFather:
   - `/newbot` → the new brand name and username (e.g. `kairagulbot`)
   - `/setdomain` → the site domain (needed for the login button)
2. Add secrets in Lovable: `TELEGRAM_BOT_TOKEN`, `TELEGRAM_BOT_USERNAME`. Never paste the token into chat or commit it.

## Later
- **Custom domain (#20):** paid plan.
  - A record `@` → `185.158.133.1`
  - TXT `_lovable` → the `lovable_verify=…` value Lovable shows

  Do it before promoting install or push, because installs and push subscriptions belong to the domain.
- **SMS login (#19):** needs a Twilio (or similar) account; estimate the cost first.
