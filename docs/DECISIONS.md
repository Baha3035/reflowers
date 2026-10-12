# Decisions

Newest first. Format: decision, why, consequences. Add an entry whenever you make a product or
architecture choice that a future agent could otherwise undo.

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
- **Order:** bot + channel (#5, #6), then Telegram login (#4), then SMS (#19).

## 2026-10-12: Web push accepts any Google push host
- **Why:** Chrome now issues `jmt17.google.com` endpoints. The original `fcm.googleapis.com`-only allowlist silently broke push on Chrome and Android.
