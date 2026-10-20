# Decisions

Newest first. Format: decision, why, consequences. Add an entry whenever you make a product or
architecture choice that a future agent could otherwise undo.

## 2026-10-15: No public Telegram channel; the bot is private only
- **Why (owner):** a channel that reposts every bouquet would just copy the existing Telegram resale channels («Re Bloom Flowers Бишкек», Buket.kg). Our product is the site: search, expiry, chat, contacts, trust.
- **The bot does only:** login and phone verification (#4) and personal notifications to the user (#5).
- **Consequences:**
  - #6 is closed.
  - Growth relies on shared listing links (link previews work), word of mouth, Instagram and shops.

## 2026-10-15: Seller reviews are public
- **Why (owner):** buyers decide whom to trust from reviews. Every marketplace shows them.
- **How:** migration `20261015090000_public_reviews.sql` lets everyone read reviews; who can write them is unchanged.
- **Caution:** a Lovable security pass made them private earlier (twice). Don't revert it.

## 2026-10-15: Moderation follows the strike model in `docs/research/moderation-policies.md` §4
- **Why (owner):** copy what established platforms do (Second Bloom, lalafo, Avito, OLX, Vinted, Meta, Flowwow).
- **Rules:**
  - **Instant permanent ban:** fraud; selling a bouquet you don't have; third-party card + refusing to show the bouquet; ban evasion; threats or doxxing; mass fake reviews.
  - **Strikes:** last 180 days. 1 = warning, 2 = 3-day block, 3 = 30-day block, 4 = permanent.
  - **Listing removal only:** contacts in the listing text, duplicates, wrong data.
- **Evidence:** the in-app chat and deal history. A report means a moderator may read the chat. One appeal within 30 days.
- **Never publish** scammers' card numbers, phones or names. Second Bloom does; it's risky under the Kyrgyz Digital Code. Fraud goes to the police only on official request.
- The numbers are a proposal from the research; the owner may tune them. Implementation: #9.

## 2026-10-15: Free posting; revenue only from promotion
- **Why (owner):** win sellers from Buket.kg (150 som per post) and Second Bloom (about $2.50 per post).
- **Consequence:** #17 is now "automate paying for boosts" (QR / MBank), not a posting fee.

## 2026-10-15: No auctions in v1
- **Why (owner):** not needed for launch. Second Bloom's own volume moved to fixed price. #16 stays at P3.

## 2026-10-15: The brand will change from "ReFlowers"
- **Why:** too close to the existing Telegram channels in Bishkek.
- **Status:** candidates in #25. Don't create the bot, domain or handles until the name is chosen.

## 2026-10-12: Stay on Lovable hosting and Lovable Cloud (Supabase)
- **Why:** fastest path to users. `main` is two-way synced with Lovable.
- **Consequences:**
  - Auth providers and Supabase settings are limited to what Lovable Cloud exposes. For example, phone OTP only works through Twilio, Vonage, MessageBird or TextLocal; custom OIDC isn't confirmed.
  - Secrets are set in Lovable.
  - Migrations pushed from GitHub must be confirmed as applied in Lovable.

## 2026-10-12: No mock data in the product
- **Why:** real users tried to buy demo bouquets ("Это демо-объявление"), and hardcoded trust badges claimed things that weren't true.
- **Consequences:**
  - Empty states instead of filler.
  - Badges only when backed by data.
  - Catalog filters that need attributes we don't store yet (flower type, colour, freshness) are hidden until #7.

## 2026-10-12: Listings live 24h; sellers can extend while the bouquet is under 5 days old
- **Why:** the sell page already promised 24h. Gifted bouquets last about 5–7 days. Second Bloom and Buket.kg also keep the feed fresh.
- **How:**
  - `listings.expires_at` is owned by the DB (trigger + `extend_listing()`).
  - RLS hides expired listings from buyers. Nothing is deleted.
- **Open:** a reminder before expiry and a scheduled job (#10).

## 2026-10-12: Seller contacts are opt-in, and the phone number is shown only to signed-in users
- **Why:** local classifieds (lalafo, house.kg) put a Call button first, and WhatsApp/Telegram are how people talk. Requiring sign-in keeps scrapers and spammers away from sellers' numbers, and buyers need an account for chat anyway.
- **How:**
  - Seller turns on call / WhatsApp / Telegram in the sell form or profile.
  - `get_listing_contacts()` returns the channel flags to everyone, but phone/username only to signed-in users.
  - The WhatsApp link pre-fills a message with the listing link.
  - Telegram can't pre-fill a DM, so the text is copied to the clipboard.
- In-app chat stays on for everyone.

## 2026-10-12: `public_profiles` is a definer view (not `security_invoker`)
- **Why:** `profiles` is readable only by its owner, admins and chat partners. With `security_invoker` the view returned nothing for other users, so every seller showed as "Продавец" with a fake 5★.
- **Rule:** the view exposes only safe columns. Never add `phone` or contact fields to it.
- **Caution:** a Lovable security scan may flag this view. That's intended; don't "fix" it back.

## 2026-10-12: Price is required; the AI estimate is only a suggestion
- **Why:** when the AI was unavailable, listings were published at a silent default of 1900 som.

## 2026-10-12: Favourites stay on the device for launch
- **Why:** good enough to start. The `favorites` table already exists, so syncing is #13.

## 2026-10-12: No escrow; buyer and seller pay each other directly
- **Why:** no marketplace in Kyrgyzstan holds money; people pay by MBank or ELQR QR, or cash. ReFlowers records deal steps only (`deal_events`).
- **Revisit:** if we add delivery (Second Bloom's roadmap has escrow).

## 2026-10-12: Telegram first for login and notifications; SMS later
- **Why:**
  - Telegram login is free and can return a verified phone.
  - A bot reaches iPhone users without "Add to Home Screen".
  - The competing resale communities live in Telegram.
  - SMS via Twilio is about $0.32 per message to +996.
- **Order:** bot notifications (#5), then Telegram login (#4), then SMS (#19). No public channel (see 2026-10-15).

## 2026-10-12: Web push accepts any Google push host
- **Why:** Chrome now issues `jmt17.google.com` endpoints. The original `fcm.googleapis.com`-only allowlist silently broke push on Chrome and Android.
