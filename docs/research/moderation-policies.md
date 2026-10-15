# Moderation and ban policies: what other platforms do, and a proposal for ReFlowers

Research date: 2026-10-15. Roadmap item: #9 (safe-deal checklist, terms page, report and ban flow).
Legend: **[seen]** = read in the platform's own rules/help. **[2nd]** = secondary source (press, blogs, user complaints). **[inferred]** = my own reading.

Source gaps:
- avito.ru and the OLX help centres would not load for my fetcher (blocked, or a JS-only app), so the Avito and OLX rows come from secondary sources.
- Buket.kg and t.me/flowers_kgz have **no public rules** that I could find. The group preview lists only the bot @buket_kgbot and manager @aruuke_admin (https://t.me/s/flowers_kgz), and buket.kg links only a privacy page (https://buket.kg).

## 1. Comparison: offence → what each platform does

| Offence | Second Bloom (TAS) | lalafo.kg | Avito | OLX | Vinted / Facebook | Flowwow |
|---|---|---|---|---|---|---|
| Fraud / took prepayment, sent nothing | Account blocked, no refund of paid posts (Terms §8.1). Data handed to police "per the law" (§6.2–6.3). Card number and initials **published in the channel** (https://t.me/s/second_bloom/9899) [seen] | Prohibited content "способствовать мошенничеству" (§2.23). Account blocked or deleted (§2.28) [seen] | Usually a permanent ban ("Нечестное поведение и попытки обмана", unreturned prepayment) [2nd: elama.ru, ppc.world] | Block, including a block by phone number [2nd: vidhuk.ua] | Vinted: permanent ban for fraud; payouts may be frozen (https://www.vinted.co.uk/help/92) [seen]. FB: account can be disabled after a single severe violation (Meta "counting strikes") [seen] | n/a (Flowwow holds the money) |
| Fake or internet photos / selling what you don't have | Proof photo with a code word [press, see second-bloom.md] | "Only real photos, not from the internet" (https://lalafo.az/ru/page/how-to-sell). Misleading info is banned (§2.23) [seen] | Listed as a block reason (internet photos, item not available) [2nd] | n/a | FB: misleading listings are removed or access is restricted (https://www.facebook.com/policies_center/commerce) [seen] | Item must match its photo; substitution without the buyer's consent → complaint or dispute; random QC checks of photo reports → temporary or permanent block (seller-docs §9) [seen] |
| Hidden defect / not fresh | No wilted bouquets; a "justified complaint" about a hidden defect → temporary restriction or block (§2.1–2.4) [seen] | n/a | n/a | n/a | n/a | Buyer can open a dispute within 3 days. If the seller is silent for 3 days, the buyer wins. Outcomes: promo code, replacement or refund (https://seller-docs.flowwow.com/7.-pravila-platformy) [seen] |
| No-show / refusal after agreeing | Auction winner who refuses: "аккаунт удаляется из канала без возврата" (https://t.me/s/second_bloom/152) [seen] | n/a | n/a | n/a | n/a | Seller cancellation: 1st in a month = warning (shop may be hidden). Later ones = fine of 100–150% of commission. Missed order (45 min) = 1-star rating + temporary block until support unlocks it (seller-docs §9.3, "Оценки и отзывы") [seen] |
| Off-platform payment / steering | Card numbers in comments → delete + ban (/152) [seen] | Links banned in listings (§2.19) [seen] | Chats and calls restricted until a date for actions that "reduce Avito Delivery deals" (https://vc.ru/2691890-avito-ogranichili-soobsheniya-za-samovyvoz) [2nd] | n/a | Vinted: suggesting payment outside Vinted is grounds for a block (https://fripio.app/en/blog/vinted-account-suspended) [2nd] | Banned: moving buyers to other services, using their contacts outside the platform, asking for extra payment (seller-docs §9.1) [seen] |
| Spam / ads for other shops | Delete + ban (/152) [seen] | Duplicates deleted; no company names or ads in photos (Appendix 1) [seen] | Mass identical messages → usually permanent [2nd] | n/a | n/a | n/a |
| Insults / harassment | "мат/оскорбление" → delete + ban (/152) [seen] | Vulgarity and threats banned (§2.23) [seen] | Obscene language is a block reason [2nd] | n/a | Vinted: 7–30 day temporary ban, automatic unban (help/92) [seen] | n/a |
| Contacts in listing text/photo | n/a (contact happens in DMs) | Phone, email, URL or QR in text or photo is not allowed (Appendix 1) [seen] | Messages containing contacts or addresses are sometimes blocked [2nd] | n/a | n/a | n/a |
| Multiple accounts / ban evasion | n/a | One account per user (lalafo.az §1.2.4). A blocked user may not re-register (§1.20–1.21). Clones are "удаляются без уведомления" [seen] | "1 phone = 1 account". New accounts can be flagged for passport/face check [2nd] | One active account per person, relatives included. Linked by contacts or identical listings → block [2nd] | Vinted: permanent [seen] | n/a |
| Price manipulation / joke bids | "Слишком резкие скачки в аукционе" → delete + ban. Bid cap is 2× the start price [seen + press] | n/a | n/a | n/a | n/a | Price must equal the seller's own shop price, otherwise block [2nd: tbank] |
| Review manipulation | n/a | n/a | Fake reviews removed, account demoted; at volume, block plus loss of rating [2nd] | n/a | n/a | "Самовыкупы для накрутки рейтинга" banned, temporary or permanent block (§9.1) [seen] |
| Appeal | Write to support for the reason and send evidence (§8.3) [seen] | Can refuse "без указания причин" (§2.30). Paid services not refunded (§2.18) [seen] | "Пройти проверку" (passport or face) or the support form [2nd] | Support [2nd] | Vinted: appeal **once**, within 6 months, with evidence (help/92). FB: "request review" [seen] | Support chat [seen] |

## 2. Common patterns

1. **Three tiers.**
   - Content-only fixes: delete or reject the listing (lalafo, FB, Flowwow).
   - Strikes and temporary restrictions: Vinted 7–30 days. Meta: 1st strike is a warning, then feature limits, then 1 → 3 → 7 → 30 days; strikes expire after 1 year (https://transparency.meta.com/enforcement/taking-action/restricting-accounts/).
   - Instant permanent ban for fraud, multiple accounts and repeat offences (Vinted, Avito, lalafo).
2. **The first minor offence is a warning** (Meta's first strike; Flowwow's first cancellation each month).
3. **Partial restrictions come before a full ban.** Avito limits chats/calls until a date. Flowwow hides the shop. Meta blocks posting only.
4. **Bans attach to the person, not the login.** That means the phone number (Avito, OLX), linked contacts or listings (OLX), and ID checks for appeals (Avito). Paid extras are not refunded (Second Bloom, lalafo).
5. **Evidence comes from inside the platform.** Flowwow judges disputes on the listing description, photos and video, chat history and the pre-delivery photo. Silence counts against you (3 days).
6. **Appeals are narrow.** Usually one appeal, to support, with evidence. Some platforms say they may act without giving a reason (lalafo §2.30). [inferred] Small platforms keep it informal.
7. **Fraud data goes to the authorities, not to the public.** Big platforms do this. Second Bloom is the outlier: it posted a scammer's card number and initials publicly (/9899).

## 3. Legal caution (Kyrgyzstan)

- The **Digital Code** has been in force since 5 Feb 2026 and replaced the 2008 personal-data law (https://www.icnl.org/post/news/kyrgyzstans-digital-code-understanding-and-complying-with-personal-data-provisions).
- Administrative fines for personal-data violations were introduced in 2025 (https://economist.kg/novosti/2025/05/22/v-kyrghyzstanie-vviedieny-shtrafy-za-narushieniie-pravil-obrabotki-piersonalnykh-dannykh/). Law No. 150, signed 9 Oct 2026, raises them to as much as 140,000 som for repeat violations by legal entities (https://economist.kg/vlast/2026/10/13/personalnye-dannye-shtrafy-140-tys-2.md).
- **We must not copy Second Bloom's public posting of card numbers, phones or names.** A wrongly named "scammer" would also expose us to an honour-and-dignity claim [inferred].
- Fraud falls under УК КР ст. 209 «Мошенничество». Victims file a заявление with the district УВД (example cases: https://24.kg/proisshestvija/374383_vbishkeke_zaderjan_podozrevaemyiy_vkibermoshennichestve/) [2nd].
- Our terms must say up front that moderators may read the chat of a reported deal [inferred: needed for consent and transparency].

## 4. Proposed ReFlowers policy (ready to paste into the terms page)

> **Правила сообщества ReFlowers**
>
> ReFlowers не принимает и не хранит деньги: покупатель и продавец рассчитываются напрямую. Поэтому мы строго следим за честностью сделок.
>
> **Как работают предупреждения.** За нарушения из списка Б начисляется «страйк». Страйк действует 180 дней.
> - 1 страйк — предупреждение.
> - 2 страйка — блокировка на 3 дня: нельзя публиковать букеты и писать в чат.
> - 3 страйка — блокировка на 30 дней.
> - 4 страйка — бессрочная блокировка.
>
> «Тяжёлый» страйк (отмечен **×2**) считается за два. Блокируется человек, а не только аккаунт: номер телефона, Telegram и все связанные профили.
>
> **А. Бессрочная блокировка сразу**
> 1. Мошенничество: взяли предоплату и не передали букет; пропали после оплаты; получили букет и не заплатили.
> 2. Продажа букета, которого у вас нет: чужие или скачанные фото, фото из ленты магазина, выдаваемые за свои.
> 3. Просьба оплатить на карту третьего лица вместе с отказом показать букет вживую (видео/кружок) или передать через курьера, которого вызвал покупатель.
> 4. Создание нового аккаунта после блокировки или для обхода ограничений. Блокируются все связанные аккаунты.
> 5. Угрозы, сексуальные домогательства, шантаж, публикация чужих персональных данных.
> 6. Массовые накрутки: отзывы с собственных или подставных аккаунтов, фиктивные сделки.
>
> **Б. Страйки**
> 1. Не пришли на встречу или не отдали букет после того, как договорились в чате (продавец или покупатель). Первый случай за 30 дней — только предупреждение. Дальше — страйк.
> 2. Отказ от покупки после согласия на цену без уважительной причины — страйк.
> 3. Свежесть или состояние указаны неверно (например, «вчера» вместо «4 дня»), скрытые дефекты. Подтверждённая жалоба покупателя — страйк. Повтор — **×2**.
> 4. Просьба перевести деньги на карту, оформленную не на продавца, или требование доплаты сверх договорённого — **×2**.
> 5. Оскорбления, мат, грубость в чате — страйк.
> 6. Реклама других магазинов, каналов, ботов; массовая рассылка одинаковых сообщений — страйк. Массовый спам — бессрочно.
> 7. Шуточные или заведомо издевательские предложения цены, многократно после просьбы прекратить — страйк.
> 8. Один-два ненастоящих отзыва (друзья, обмен отзывами) — отзывы удаляются, страйк.
>
> **В. Только удаление объявления (без страйка, с объяснением)**
> - Телефон, @username, ссылки или QR в тексте или на фото объявления. Контакты показываются только через кнопку «Связаться». При повторе — страйк.
> - Дубликаты одного букета, неверный район или размер, не цветы.
> - Букет продан, но объявление не закрыто.
> - Фото низкого качества или с чужими водяными знаками, если букет реально у вас — просим переснять.
>
> **Как пожаловаться.** Кнопка «Пожаловаться» есть в объявлении, профиле и чате. Выберите причину и опишите, что произошло. Можно приложить скриншоты переводов или переписки в WhatsApp/Telegram. Чек о переводе видит только модератор. Мы отвечаем в течение 24 часов.
>
> **Что проверяет модератор.**
> - Переписку в чате ReFlowers по этой сделке. Отправляя жалобу, вы соглашаетесь, что модератор её прочитает.
> - Историю сделки (договорились / встретились / оплачено).
> - Фото объявления: поиск по картинке, повторы.
> - Прошлые жалобы и страйки.
> - Ответ второй стороны: на него даём 48 часов. Без ответа решаем по имеющимся данным.
>
> Скриншоты из других мессенджеров учитываем, но слово против слова без переписки в ReFlowers страйком не наказываем.
>
> **Обжалование.** Один раз, в течение 30 дней. Напишите в поддержку (Telegram @…) и приложите доказательства. Жалобу рассматривает другой модератор, ответ — в течение 3 дней. Решение после обжалования окончательное.
>
> **Если вас обманули.**
> 1. Мы сразу блокируем аккаунт и скрываем его объявления.
> 2. Мы лично предупреждаем всех, кто переписывался с этим пользователем.
> 3. Мы советуем подать заявление в милицию: 102 или районное УВД, статья 209 УК КР.
> 4. Данные передаём правоохранительным органам только по официальному запросу.
>
> Мы **не публикуем** номера карт, телефоны, имена или фото мошенников. Публикуем только обезличенные предупреждения о схемах, например: «просят оплату на чужую карту и не показывают букет вживую».

### Implementation notes [inferred]
- We already have a `reports` table (reason, details, status) and `reviews` tied to `orders`.
- Still missing:
  - a `strikes` / `sanctions` table: user, reason, weight, expiry, moderator, evidence link, appeal status;
  - an `is_banned` / `restricted_until` check in RLS for inserting listings and messages;
  - a phone/Telegram blocklist that is checked at signup.
- Only count no-show strikes when there is an in-app deal event, i.e. both sides tapped "договорились". This keeps strikes backed by data.
- Strip or flag `+996…`, `@…` and links in listing text when it's submitted.
- Add a short "Безопасная сделка" checklist before contacts are revealed. Second Bloom and Flowwow show that evidence inside the app (chat and the photo before handoff) is what makes moderation possible.
