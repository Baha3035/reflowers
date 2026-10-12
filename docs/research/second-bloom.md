# Second Bloom (Tashkent): reverse-engineered for ReFlowers

Research date: 2026-10-12. Legend: **[seen]** = I read it directly in a primary source (channel posts, terms, store listing). **[press]** = taken from an interview or article. **[inferred]** = my own reading of the evidence.

Primary handles:
- Channel **t.me/second_bloom** ("Second Bloom - лучшие цены на букет", 28.2K subscribers, about 28,000 posts since 2025-10-25)
- Submission and purchase bot **@our_auction_bot** (bio: "Большинство букетов продаются уже в первые 30 минут🚀🔥")
- Single admin **@secondbloomsupport**
- Comments/chat group **@secondbloom_uz** (413 members)
- Public offer: https://telegra.ph/Second-Bloom---Terms-of-Use-12-02
- App: https://secondbloom.onelink.me/zCMt/vnbn7ldy, Android package `com.secondbloom.app`
- Legal entity SECONDBLOOM MCHJ, info@secondbloom.uz
- Instagram @secondbloom_uz. Founder: Tamila Falina.

---

## 1. Funnel & flows

**Seller flow, v1 (Nov 2025), [seen] in the rules post https://t.me/second_bloom/152:**
1. Send the bot a ready message with a photo and a video. They say it's better if you are in the shot with the bouquet ("это часть эстетики проекта").
2. Add a short description: the flowers' condition (e.g. "стоял 2 дня в вазе") and an optional start price.
3. Moderation runs, the seller pays for the post, and the bouquet appears in the channel.

**Seller flow, current (bot or app):**
- **Proof of possession [press]:** the seller photographs the bouquet next to a piece of paper with a check word on it (e.g. «батон»), or records a Telegram video circle saying a code word or making a set gesture (spot.uz, https://www.spot.uz/ru/2026/05/27/second-bloom/). Forbes says the paper reads "Second Bloom", handwritten or printed (https://forbes.kz/articles/kak-ustroena-platforma-po-pereprodazhe-buketov-v-uzbekistane-ff6ae9).
- **Structured form [seen]:** current posts always have the fields City / Size / Freshness / Price. These are picked from enums (see section 2).
- **Sale mode [seen + press]:** the seller picks one of:
  - auction (2 hours)
  - "Решайте сами": no start price, buyers name a price
  - fixed price

**Buyer flow, v1 [seen] (https://t.me/second_bloom/9, /152, /147):**
- The buyer writes a price in the post comments, which live in the linked group.
- The auction starts at the **first priced comment** and runs **2 hours**. The highest last comment wins. The bot posted "Первая ставка принята! Аукцион продлится 2 часа!"
- Sellers must watch the comments and contact the winner. If the winner backs out, the win passes to the previous bidder and the person who refused is banned.

**Buyer flow, current [seen] (Oct 2026 posts):**
- Each listing is followed by a separate button post linking into the bot with a per-listing code:
  - `🛎 Участвовать в аукционе` → `t.me/our_auction_bot?start=AuC26140`
  - `✉️ Заявка на покупку` → `t.me/our_auction_bot?start=YuB26130` (fixed price)
- Live auction status posts show the start price, number of bids, top bid and time left.
- **[inferred]** Bidding and "purchase requests" have moved off public comments into the bot/app. The channel now works as a distribution/notification feed.

**Handoff [seen in terms + press]:** buyer and seller arrange payment and pickup or courier themselves; the service takes no responsibility (spot.uz).
- The terms require the buyer to get a live Telegram video circle, or a photo from a courier **the buyer called**, before paying (Terms §3.1–3.3).
- Payment must come from the buyer's own card or be made in cash (§4.1–4.2).
- A post after a fraud case (https://t.me/second_bloom/9901) recommends a "third party" handoff: the taxi driver takes the bouquet and doesn't leave until the money is sent.
- One fraudster's card number was publicly posted (https://t.me/second_bloom/9899).

**Demand-side "requests" [seen]:**
- Posts tagged `#запрос`.
- A Friday post (https://t.me/second_bloom/24014) listed **79 bouquet requests by Tashkent district**, each with a style and budget (e.g. "Шайхантахурский район — 18 букетов… Бюджет: 250 000–800 000 сум"). It had two CTAs: "Ответить на запрос" (bot) and "Оставить запрос" (support).
- This means buyers can post wanted-requests and sellers fill them.

## 2. Exact listing / post template [seen]

The current template is identical across about 480 posts from Oct 1–12, 2026 (anonymized):

```
[🤝 Букет Продан 🤝]                      ← prepended by edit when sold

<free-text description | "Нет описания">

Город: Ташкент                           ← Ташкент / Самарканд / Не указан
Размер: Средний                          ← Маленький / Средний / Большой / Объёмный / Огромный
Свежесть: Свежайшие                      ← Свежайшие / Хорошее состояние / Теряет свежесть
Цена: 400 000 сум [❤️ благотворительный] ← optional charity flag
[🔝 ТОП-публикация]                       ← paid boost (inferred)

[Данный букет продается по фиксированной цене, для связи с продавцом используйте 👇]
[👥 Было ставок: 1]                       ← shown after an auction ends

Зайди в приложение и забери бесплатную публикацию   ← app-install CTA
[button: ✉️ Заявка на покупку | 🛎 Участвовать в аукционе]
```

Media is 1–4 photos or a video. The live auction ticker post looks like this:

```
Город: Ташкент
Свежесть: Свежайшие
Изначальная Цена: 380 000 сум
👥 Кол-во ставок: 1
⚡️ Топовая ставка: 381,000 сум
⏳ До завершения: 1ч 52м
[🛎 Участвовать в аукционе]
```

How the template changed: the Nov 2025 posts had free-text fields ("Свежесть: 2 часа", "Износ: 1 день", "Размер: Во весь охват рук", "Цена: Решайте сами") and "АУКЦИОН ЗАКРЫТ" when finished (https://t.me/second_bloom/16). **[inferred]** They switched to enums because free text was messy.

## 3. Rules & trust

**Content and conduct rules [seen] (https://t.me/second_bloom/152).** Breaking any of these means deletion and a ban:
- off-topic comments
- posting your own or someone else's card numbers in comments
- swearing or insults
- advertising other flower shops
- "слишком резкие скачки в аукционе… соблюдайте поочередность и реальность цен"
- A winner who refuses to buy is "удаляется из канала без возврата".
- The rules also carry a disclaimer: "Мы не связаны с магазинами, чьи ленты могут быть видны на фото".

**Bid cap [press]:** the maximum bid is 2x the start price (spot.uz).

**Price ceilings by size [press]:**
- small: start price ≤150K sum
- medium: 400–500K max
- large: >1.5M is not accepted (spot.uz)

**Proof photo [press]:** check word on paper, or a video circle with a code word or gesture (see section 1).

**Quality, bans and fraud [seen] (Terms):**
- No wilted or damaged bouquets unless agreed with the buyer.
- Defects must be disclosed before payment.
- After a justified complaint the service may restrict or ban the account, or ban it **without refunding unused paid posts**.
- Fraud data goes to law enforcement (BFM says the police, РУВД: https://www.bfm.ru/news/607818).
- The service is "не является магазином… не принимает и не хранит денежные средства".

**Listing lifetime [seen]:**
- The pinned post (https://t.me/second_bloom/13616) says: "одной публикации за 30 000 сум… букет оставался в продаже до результата… Мы дублируем объявление каждые 2 часа, пока его не купят."
- The earlier rule: if the auction doesn't start within 2 days, you get a free re-post (https://t.me/second_bloom/152).

**Privacy [seen + press]:**
- Sellers would beg to "срочно удалите пост" after selling, because the person who gave the bouquet might see it (spot.uz).
- The app now lets the seller hide a sold listing (Play "What's new").

## 4. Monetization & payments

- **Listing fee [seen + press]:** 30,000 sum (about $2.50) per post, paid via Click or Payme. This is the only fee on the deal itself; there is no GMV commission (spot.uz, Forbes).
- **Paid add-ons:**
  - "🔝 ТОП-publication" **[seen; that it is paid is inferred]**
  - **paid "hide sold listing"** **[seen]** in the Play release notes: "объявление можно скрыть за отдельную плату… Оплата через Payme или Click. Напоминание об оплате приходит при входе в приложение"
- **Acquisition promos [seen]:**
  - "Зайди в приложение и забери бесплатную публикацию" (a free post for installing the app)
  - weekly "Подарок от Second Bloom": a bouquet for 50–400K sum to "тот кто первый сделает ставку через Click mini app или Bir Bir" (https://t.me/second_bloom/27630). **[inferred]** This means they also run as a mini-app inside the Click superapp and Bir Bir.
  - Feb 14: bouquets at 50K sum ("190 ставок за минуту", https://t.me/second_bloom/6159)
  - Jan 2026 UGC contest: 2 sum per view of videos about Second Bloom (https://t.me/second_bloom/3764)
- **B2B [press]:** they work anonymously with premium salons. The salons remove their branded ribbons and sell 3-day-old display bouquets cheaply (spot.uz).
- **Roadmap [press]:**
  - in-app payments with escrow ("freeze funds until buyer confirms")
  - in-app delivery
  - expansion to Kazakhstan, then UAE, Tajikistan and Russia (spot.uz, Forbes)
  - investor X-Togo: $50K pre-seed in the first 10 days (https://kapital.uz/x-togo-investiroval-v-second-bloom/)

## 5. App features / UI components observed

From Google Play (https://play.google.com/store/apps/details?id=com.secondbloom.app). **[seen]**: "Secondbloom", rated 4.3★ from 10 reviews, 1K+ installs, 12+, updated 12 Oct 2026, collects photos/videos and personal info.

Release notes list these concrete screens and components:
- **Sell** section ("Продать") with the seller's bouquet cards; **purchase requests shown on the card**
- **My purchases** ("Мои покупки")
- "Mark as bought" by the buyer, then **seller confirms**
- Paid **Hide listing** (removed from the feed, from search, and by direct link)
- Login **payment reminder** banner
- In-app **camera** capture (one review: "Функция камеры не работает")
- Feed of fresh listings, search, and "buyers contact you directly"

The iOS listing (apps.apple.com/us/app/second-bloom/id6754007367) now returns 404. A search snippet described a "Shopping" app with a **custom-bouquet constructor** plus one-tap resale. **[press/unverified]**

At launch the app had the same features as the bot (spot.uz).

**[inferred]** UI components implied by the channel:
- enum chips for size and freshness
- city picker
- sale-mode selector (auction / name your price / fixed)
- countdown timer
- bid counter and top-bid display
- SOLD badge
- TOP badge
- charity badge

## 6. Numbers

| Metric | Value | Source |
|---|---|---|
| Users (Nov–Feb) | 32,000 (about 1,500 sellers / 30,500 buyers) | Forbes **[press]** |
| Listings, first 4 months | 4,000+; never fewer than 20/day | Forbes |
| GMV, first 4 months | about $150K; revenue about $10K | Forbes, spot.uz |
| Daily posts / success rate | about 45/day; 88–92% sold | BFM, spot.uz |
| Bids per bouquet (average) | 13 | Forbes |
| Average resale vs retail | about $40 vs $100–150 | Forbes |
| Fastest sale | 5 min | spot.uz |
| Subscribers | about 35K (May) → **28.2K now** | BFM; **[seen]** |
| **Observed Oct 1–10, 2026** | 309 listing posts (about 31/day), **75% marked sold**; prices median **380K sum** (p25 250K, p75 500K, range 10K–2M); bids per finished auction mostly 0–3 | **[seen]**, my count from the t.me/s pages |
| Views per post | 10–29K (Nov 2025) → about 0.5–1.6K (Oct 2026) | **[seen]** |

**[inferred]** Activity in the channel is falling because activity is moving to the app. The auction energy seen on Feb 14 (190 bids in a minute) is now rare. Most current sales go through the fixed-price "Заявка на покупку" button. Re-posts every 2 hours inflate the post count, so the true sell-through per bouquet is probably above 75%.

### Competitors / clones

**Bishkek, a direct threat:** Buket.kg (https://buket.kg).
- Telegram group t.me/flowers_kgz, "Цветы Бишкек | Перепродажа цветов Бишкек", with **15,130 members** **[seen]**
- Bots: @buket_kgbot / @flowers_kgzbot, manager @aruuke_admin
- City channels for Osh, Karakol, Tokmok and others
- Paid post costs **150 som**, plus a **referral program paying 50 som per post** from people you referred (https://t.me/buket_kg_bishkek/16)
- The website separates "🏪 Магазины" from "🔁 Перепродажа"
- They advertise prices "50% ниже чем в любом цветочном" (http://pereprodazhasvetovbishkek.tilda.ws/)

**Tajikistan:** ReBuket.tj, Reuse Love, Flora Market, Lily Flowers, Sekond flower. These are concierge-style: the service sets the price and acts as intermediary (https://aifstan.info/vam-ne-ponravilsya-buket-my-ego-prodadim-kak-rabotaet-biznes-po-pereprodazhe-podarkov/).

**Kazakhstan / Russia:** I found no dedicated clone. Resale happens on OLX and in general classifieds channels (https://ru.baribar.kz/25300/posle-8-marta-kazahstantsy-nachali-pereprodavat-podarennye-bukety-na-olx).

## 7. Adopt for ReFlowers (prioritized)

1. **[MVP now] Structured listing form with enums.** Size (5 levels), freshness (3 levels: «Свежайшие / Хорошее состояние / Теряет свежесть»), district, price. Second Bloom moved from free text to enums. This lets you show filter chips and a consistent card.
2. **[MVP now] Proof-of-possession photo.** One required photo with a handwritten "ReFlowers + today's code" note, shown on the listing. It is the cheapest way to stop fake listings.
3. **[MVP now] Two sale modes: fixed price + "Хочу купить" request.** The current Second Bloom volume is mostly fixed price with a purchase-request button. Add auctions later.
4. **[MVP now] SOLD state with a "🤝 Продан" badge, then auto-hide after 24h.** Sellers fear the person who gave them the bouquet will see the listing. Second Bloom charges for hiding; consider making it free as a differentiator against them and Buket.kg.
5. **[MVP now] Safe-deal checklist shown before contact.** Ask for a live video circle or courier photo, and pay from your own card or in cash. This copies their Terms §3–4 and reduces fraud complaints.
6. **[MVP now] Price ceilings per size, plus a "below retail" hint.** For example: small ≤1,500 som, medium ≤4,000, large ≤12,000 (these are my KGS adaptation of the sum limits). This keeps the "second-hand" price feel.
7. **[MVP now] Report/ban flow and a public offer page.** Include a winner-refuses ban and a fraud report. One admin contact only.
8. **[MVP now] Telegram channel mirror plus deep links.** Every listing goes out to a channel with a button to `reflowers.lovable.app/l/<id>`. The channel is their acquisition engine.
9. **[next] 2-hour auction mode.** It starts on the first bid, has a countdown, a bid counter, a top bid, a 2x cap, and a minimum step. Run it on holidays (Feb 14 / Mar 8) when demand spikes.
10. **[next] Buyer "wanted" requests (#запрос) by district and budget.** Sellers answer them. Their 79-request Friday post shows demand pooling works.
11. **[next] Listing fee about 100–150 som via MBank/O!Dengi/Elsom QR.** Make the first post free, re-post every 2h until sold, and give a free relist if there's no interest within 48h. Match or undercut Buket.kg's 150 som.
12. **[next] Paid "🔝 ТОП" boost and a "❤️ благотворительный" charity tag.** Both are cheap to build, and the boost adds revenue.
13. **[next] Florist B2B section.** Unbranded day-3 display bouquets from shops, plus shop discounts. This matches ReFlowers' "flower-shop discounts" pillar and Buket.kg's "Магазины" tab.
14. **[later] Escrow / in-app payment with buyer confirmation**, and courier integration. This is on Second Bloom's own roadmap, and it needs a payment provider and legal setup.
15. **[later] Referral program** (Buket.kg pays 50 som per referred post) and a UGC video contest (Second Bloom pays 2 sum per view).
16. **[later] Native app / Telegram Mini App.** Second Bloom grew to 32K users on a bot and channel alone. Mobile web plus Telegram is enough until there is real traction.
