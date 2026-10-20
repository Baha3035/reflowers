# Market research: Kyrgyzstan and comparable platforms (Oct 2026)

Summary of the research behind `docs/ROADMAP.md`. Second Bloom has its own deep dive in
`second-bloom.md`. Some figures come from secondary sources; recheck before relying on prices.

## Direct competitors in Bishkek
- **Buket.kg** (https://buket.kg):
  - Telegram group t.me/flowers_kgz, "Цветы Бишкек | Перепродажа цветов Бишкек", about 15k members.
  - Posts go through a bot (@buket_kgbot / @flowers_kgzbot). **150 som per post**, plus **50 som per post** from people you referred.
  - The website separates «Магазины» from «Перепродажа».
  - City channels for Osh, Karakol, Tokmok.
- **lalafo.kg:** resold bouquets appear under "Дом и сад"; there's no flower category. It has a Call button plus in-app chat, paid VIP/boosts, no escrow, no delivery.
- **The original "reflowers" Telegram channel** that inspired the project: not publicly indexed (probably small or private).

## Comparable platforms
- **Second Bloom** (Tashkent): see `second-bloom.md`.
  - Started as a Telegram channel + bot, then an app.
  - About $2.50 per post, a proof note in the photo, 2h auctions, fixed price + purchase request.
- **Flowwow** (CIS flower marketplace):
  - Separate seller app with phone + SMS login.
  - Shops deliver themselves; in-app chat; payment through the platform; 5–25% commission.
- **Too Good To Go:** florists sell discounted leftover "surprise bags" for pickup. A model for the shops side.
- **Vinted / Avito:** in-app chat only. Escrow-like buyer protection exists only because they ship items.
- **house.kg / mashina.kg:** one-tap call is the core action; paid "raise to top".

## Login options in Kyrgyzstan
- **Lovable Cloud phone OTP:** only Twilio, Twilio Verify, Vonage, MessageBird, TextLocal. Twilio is about $0.32 per SMS to +996 (aggregator figure).
- **Local SMS** (Beeline/MegaCom via e.g. smspro.nikita.kg): about 1–2 som, but needs Supabase's Send-SMS hook, which Lovable Cloud may not expose.
- **Telegram Login:** free. OIDC at oauth.telegram.org can return a verified phone (`phone` scope) and allow the bot to message the user. **Telegram Gateway** sends OTP codes for about $0.01.
- **Google sign-in:** supported natively by Lovable Cloud.

## Messengers
- An older (2020) survey had WhatsApp at about 88% vs Telegram about 4% in Kyrgyzstan. Telegram is much bigger now among young urban users, and every resale community above runs on it.
- Conclusion: support WhatsApp and Telegram contact buttons; use Telegram for the channel, bot and login.

## Payments
- ELQR (the National Bank's QR standard) works across all banks and wallets. MBank leads in QR users.
- Local marketplaces don't hold money in escrow; buyers pay sellers directly.

## Notifications
- iOS web push only works after "Add to Home Screen" (iOS 16.4+); expect low opt-in on iPhone.
- Android/Chrome push works normally.
- A Telegram bot reaches everyone without installing anything.

## Sources
- Second Bloom: https://www.spot.uz/ru/2026/05/27/second-bloom/ · https://forbes.kz/articles/kak-ustroena-platforma-po-pereprodazhe-buketov-v-uzbekistane-ff6ae9 · https://www.bfm.ru/news/607818
- Buket.kg: https://buket.kg · https://t.me/buket_kg_bishkek/16
- Lovable: https://docs.lovable.dev/features/phone-auth · https://docs.lovable.dev/features/custom-domain · https://lovable.dev/faq/projects/settings/hide-lovable-badge
- Telegram: https://core.telegram.org/bots/telegram-login · https://core.telegram.org/gateway
- Supabase phone auth: https://supabase.com/docs/guides/auth/phone-login
- SMS pricing (aggregator): https://www.sent.dm/en/resources/sms-pricing/kyrgyzstan-sms-pricing
- Messengers: https://ca-barometer.org/en/publications/which-messaging-apps-are-popular-in-uzbekistan-kyrgyzstan-and-kazakhstan
- ELQR: https://economist.kg/novosti-kompanii/2026/03/02/qr-vmiesto-nalichnykh-kak-elqr-za-6-liet-pieriestroil-platiezhnyi-rynok-kyrghyzstana/
- iOS web push: https://www.magicbell.com/blog/pwa-ios-limitations-safari-support-complete-guide
- Flowwow: https://allo.tochka.com/start-flowwow · Too Good To Go: https://toogoodtogo.com/de-at/press/blumen-und-pflanzen-retten-mit-too-good-to-go
