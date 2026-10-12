# Roadmap

Goal: launch in Bishkek as soon as possible on Lovable hosting. People resell bouquets they were given;
shops sell leftovers at a discount. Model: a Telegram-native resale channel (like Second Bloom in
Tashkent and Buket.kg in Bishkek) with a proper site behind it.

Every item is a GitHub issue; the issue is the source of truth for scope and status. GitHub Project:
"ReFlowers roadmap" (owner Baha3035). Labels: `P0` launch blocker · `P1` next · `P2` soon · `P3` later ·
`owner-action` · `needs-decision` · `area:*`.

## Done (pending merge)
- PWA (manifest, service worker, offline page, install banner) + web push — PR #1, with the fixes from testing.
- Launch fixes — PR #24 (stacked on #1):
  - removed all mock listings, shops, reviews and fake trust badges
  - 24h listing expiry plus extend
  - link previews for listings, and a working Share button
  - photo shrinking before upload
  - price required (no silent 1900 default)
  - seller contacts (call / WhatsApp / Telegram) behind sign-in
  - seller names and ratings now visible to buyers (`public_profiles` fix)
  - «Для магазинов» landing page
  - `/auth?redirect=`

## P0: launch
- #2 Launch checklist: merge, apply migrations, VAPID secrets, publish *(owner)*
- #3 Hide the "Edit with Lovable" badge *(owner)*

## P1: next (copying what works for Second Bloom / Buket.kg)
- #4 Log in with Telegram (verified phone)
- #5 Telegram bot notifications
- #6 Auto-post listings to a ReFlowers Telegram channel. This is the growth engine.
- #7 Structured attributes (size, freshness, flowers, colour) + restore catalog filters
- #8 Proof-of-possession photo (handwritten "ReFlowers" note)
- #9 Safe-deal checklist, terms page, report and ban flow *(decision)*
- #10 Expiry reminders + scheduled push flush
- #11 Public seller reviews *(decision)*

## P2: soon
- #12 "🤝 Продан" badge, then hide
- #13 Favourites synced to the DB
- #14 Price guidance per size
- #15 Buyer "wanted" requests
- #16 2-hour auction mode for holidays *(decision)*
- #17 Monetization: free posting vs fee, QR payments *(decision)*
- #18 Shops: verification, real dashboard, leftovers section
- #20 Custom domain, before promoting install or push *(owner)*
- #21 Reproducible local setup

## P3: later
- #19 SMS one-time-code login
- #22 Kyrgyz / English for new strings
- #23 Referral program, holiday promos

## Suggested order
1. #2 and #3, then publish. Seed the feed: ask 10–20 friends to post real bouquets.
2. #6 + #5 (Telegram channel and bot, one bot token), then #4 (Telegram login).
3. #7 + #8 + #9 (trust and structure), then #10.
4. Decide #11, #16, #17. Then shops (#18) and the custom domain (#20) before any marketing push.
