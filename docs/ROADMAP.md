# Roadmap

Goal: launch in Bishkek as soon as possible on Lovable hosting. People resell bouquets they were given;
shops sell leftovers at a discount. Unlike the Telegram resale channels (Second Bloom in Tashkent;
Buket.kg and «Re Bloom Flowers» in Bishkek), the product is the site itself: search, expiry, chat, contacts
and trust. The Telegram bot is private (login + notifications), and there is no public channel.
Free posting; revenue only from promotion.

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
  - public seller reviews (#11)
  - `/auth?redirect=`

## P0: launch
- #2 Launch checklist: merge, apply migrations, VAPID secrets, publish *(owner)*
- #3 Hide the "Edit with Lovable" badge *(owner)*
- #25 Choose a new brand name, before the bot, domain and handles *(owner, decision)*

## P1: next (copying what works for Second Bloom / Buket.kg)
- #4 Log in with Telegram (verified phone)
- #5 Telegram bot notifications (private DMs)
- #7 Structured attributes (size, freshness, flowers, colour) + restore catalog filters
- #8 Proof-of-possession photo (handwritten "ReFlowers" note)
- #9 Safe-deal checklist, terms page, report and ban flow. Policy decided: `docs/research/moderation-policies.md` §4.
- #10 Expiry reminders + scheduled push flush

## P2: soon
- #12 "🤝 Продан" badge, then hide
- #13 Favourites synced to the DB
- #14 Price guidance per size
- #15 Buyer "wanted" requests
- #17 Paying for promotion by QR (posting stays free)
- #18 Shops: verification, real dashboard, leftovers section
- #20 Custom domain, before promoting install or push *(owner)*
- #21 Reproducible local setup

## P3: later
- #16 2-hour auction mode for holidays (not in v1)
- #19 SMS one-time-code login
- #22 Kyrgyz / English for new strings
- #23 Referral program, holiday promos

## Suggested order
1. #25 (name), then #2 and #3, then publish. Seed the feed: ask 10–20 friends to post real bouquets.
2. Create the bot with the new name, then #5 (notifications) and #4 (Telegram login).
3. #9 (terms + reports + strikes), #7, #8, then #10.
4. Then #17 (pay for promotion), shops (#18), and the custom domain (#20) before any marketing push.

Not doing: #6 (public channel that reposts listings), closed by owner decision.
