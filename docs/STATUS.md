# Status

Update at the end of every session: what changed, what's open, what's next. Newest first.

## 2026-10-12

**Live:** https://reflowers.lovable.app (Lovable hosting).
- Still the older build: it shows demo bouquets mixed with real ones and has no PWA.
- Nothing from the PRs below is live until they're merged and published.

**Open PRs (merge in this order):**
1. #1: PWA + web push, boost approval, AI limits.
   - Tested end to end against a local Supabase.
   - Testing found three bugs, now fixed in commit `ba5e73c`: Chrome push endpoints rejected, offline page broken, Android install banner lost.
2. #24 (stacked on #1): launch fixes. Real data only, 24h expiry, link previews, seller contacts, `public_profiles` fix, photo shrinking, required price.

**Waiting on the owner:** #2 (merge, migrations, VAPID secrets, publish), #3 (badge). Then BotFather and a channel for #4–#6. See `docs/OWNER_ACTIONS.md`.

**Next for agents:** #6 + #5 (Telegram channel and bot) once the bot token exists, then #4 (Telegram login), #7, #8, #9, #10. Order and reasoning are in `docs/ROADMAP.md`.

**Known gaps:**
- Signed-out visitors can't see reviews (#11, needs a decision).
- Push is only flushed when a user acts (#10).
- Local setup needs a workaround (#21, `docs/TESTING.md`).

**Competition:** Buket.kg already runs a 15k-member Telegram resale group in Bishkek, charging 150 som per post. Details in `docs/research/`.
