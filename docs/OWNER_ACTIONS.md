# Owner actions

Things only the project owner can do: accounts, paid settings, secrets. Agents: list new items here
and in a GitHub issue labelled `owner-action`. Don't mark them done yourself.

## Now (launch): issue #2, #3
1. **Merge PR #1**, then PR #24 (stacked on it). Merging to `main` syncs to Lovable.
2. **In Lovable, check that the migrations ran** on the live database:
   - `20261012090000_boost_review_and_ai_usage.sql`
   - `20261012100000_push_notifications.sql`
   - `20261013090000_listing_expiry_and_contacts.sql`

   If one didn't apply, ask Lovable's chat to "apply migration <file name>".
3. **Add secrets** in Lovable Cloud: `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT`
   (e.g. `mailto:you@example.com`). Generate the keys locally with `node scripts/generate-vapid-keys.mjs`.
4. **Publish.** Then test:
   - Android Chrome: /notifications → Включить → Проверить.
   - iPhone: Share → На экран «Домой», open from the icon, enable push.
5. **Hide the Lovable badge:** Project settings → Publishing → "Hide Lovable badge" (paid plan), then publish again.
6. **Seed the feed.** The site no longer shows demo bouquets, so ask friends to post real ones on launch day.

## Next: Telegram (#4, #5, #6)
1. In Telegram, open @BotFather:
   - `/newbot` → name "ReFlowers", username e.g. `reflowers_kg_bot`
   - `/setdomain` → the site domain (for the login widget)
2. Create a **public channel** (e.g. @reflowers_kg) and add the bot as an admin that can post.
3. Add secrets in Lovable: `TELEGRAM_BOT_TOKEN`, `TELEGRAM_BOT_USERNAME`, `TELEGRAM_CHANNEL_ID`
   (e.g. `@reflowers_kg`). Never paste the token into chat or commit it.

## Decisions waiting for you
- #11 Should seller reviews be public? (recommended: yes)
- #9 What gets a user banned?
- #16 Auctions for holidays?
- #17 Free posting at launch vs a fee? Buket.kg charges 150 som per post; Second Bloom about $2.50.

## Later
- **Custom domain (#20):** paid plan.
  - A record `@` → `185.158.133.1`
  - TXT `_lovable` → the `lovable_verify=…` value Lovable shows

  Do it before promoting install or push, because installs and push subscriptions belong to the domain.
- **SMS login (#19):** needs a Twilio (or similar) account; estimate the cost first.
