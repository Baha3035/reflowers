# Сделки P2P без оплаты через платформу

Цель: покупатель нажимает «Хочу купить» → создаётся сделка и чат → внутри чата карточка сделки со статусами и кнопками действий. ReFlowers НЕ принимает деньги, только фиксирует действия сторон.

## 1. База данных

Расширяем существующую таблицу `orders` (уже есть: listing_id, buyer_id, seller_id, price, status, commission…). Заменяем упрощёнными статусами и добавляем поля для условий сделки.

Новый enum `deal_status`:
- `awaiting_confirmation` — ждёт подтверждения продавца
- `awaiting_payment` — продавец подтвердил, указал реквизиты
- `in_progress` — предоплата получена, букет готовится/в доставке
- `awaiting_completion` — букет передан, ждём подтверждения получения и финальной оплаты
- `completed` — завершена
- `cancelled` — отменена
- `disputed` — спор

Новые поля в `orders`:
- `final_price`, `prepayment_amount`, `delivery_cost` (integer, сомы)
- `payment_method` (text: перевод/наличные/…)
- `payment_details` (text: номер телефона / реквизиты)
- `prepayment_deadline` (timestamptz)
- `cancel_reason`, `dispute_reason` (text)

Новая таблица `deal_events` — история сделки (одна строка на каждое действие):
- `id`, `order_id`, `actor_id`, `event_type` (text), `payload` (jsonb, для сумм/чеков), `created_at`

Типы событий: `buyer_requested`, `seller_confirmed`, `seller_declined`, `seller_set_terms`, `buyer_sent_prepayment`, `seller_confirmed_prepayment`, `seller_rejected_prepayment`, `bouquet_ready_pickup`, `bouquet_shipped`, `buyer_received`, `buyer_sent_full`, `seller_confirmed_full`, `cancelled`, `problem_reported`.

Триггер: при вставке событий автоматически двигает `orders.status` по правилам выше.

RLS: только `buyer_id` / `seller_id` видят сделку и события; вставляют события только участники со своей ролью.

Storage bucket `deal-receipts` (private) для чеков предоплаты. RLS на storage.objects — только участники сделки.

Extend `reports` — используется существующая таблица для «Пожаловаться»/«Есть проблема» с причиной.

## 2. Серверные функции (`src/lib/deals.functions.ts`)

Через `createServerFn` + `requireSupabaseAuth`:
- `createDeal({ listing_id })` — покупатель. Создаёт `orders` + `conversations` (или переиспользует существующий) + первое `deal_events.buyer_requested`.
- `sellerRespond({ order_id, accept })` — продавец подтверждает/отклоняет.
- `sellerSetTerms({ order_id, final_price, prepayment_amount, delivery_cost, payment_method, payment_details, prepayment_deadline })`.
- `buyerSentPrepayment({ order_id, amount, receipt_url? })`.
- `sellerConfirmPrepayment({ order_id, ok })`.
- `sellerBouquetStatus({ order_id, mode: 'pickup'|'shipped' })`.
- `buyerReceived({ order_id })`.
- `buyerSentFull({ order_id })` / `sellerConfirmFull({ order_id })`.
- `cancelDeal({ order_id, reason })`.
- `reportProblem({ order_id, reason, details })` — переводит в `disputed` и создаёт `report`.

Все проверки роли (buyer vs seller) и допустимости статуса — в БД-триггере, сервер-функция только вставляет событие.

## 3. UI

**Кнопка «Хочу купить»** в `listing.$id.tsx` (заменяет/дополняет «Написать продавцу»): создаёт сделку, редиректит в `/conversation/{convId}`.

**Карточка сделки в чате** (`conversation.$id.tsx`, новый компонент `DealCard.tsx`) — сверху над сообщениями:
- Текущий статус (badge с 5 основными + 2 финальными)
- Условия сделки (если заданы)
- Предупреждение перед показом реквизитов: «ReFlowers не принимает и не хранит деньги…»
- Кнопки действий по ролям и статусу
- Ссылка «Показать историю сделки» → раскрывает список `deal_events` с датами
- Кнопки «Отменить сделку» и «Есть проблема» (модалка выбора причины)
- Для новых продавцов (без завершённых сделок / не verified) — жёлтое предупреждение и совет не отправлять полную сумму заранее

**Форма условий продавца** (`DealTermsForm.tsx`) — модалка на этапе `awaiting_confirmation`→`awaiting_payment`.

**Форма предоплаты покупателя** — сумма + аплоад чека в `deal-receipts`.

**Профиль/магазин** — уже есть рейтинг и отзывы. Добавить «Завершённых сделок: N» (COUNT по `orders.status = completed`).

## 4. Что НЕ делаем

- Не подключаем Stripe/Paddle для покупок букетов.
- Не пишем «безопасная оплата» / «платёж подтверждён».
- Не отдельный статус на каждую кнопку — движения кнопок логируем в `deal_events`, статус меняем только по крупным вехам.

## Технические детали

- Существующий `tg_orders_enforce_price` / `tg_orders_guard_update` заменяем/адаптируем под новую модель (запрет ручного редактирования финансовых полей, разрешение переходов только через триггер событий).
- Существующая `commission` остаётся 0 для P2P-сделок (комиссия только за продвижение — вне scope этой задачи).
- Realtime подписка на `orders` и `deal_events` в чате, чтобы карточка обновлялась моментально.
- Reviews уже показываются после `listings.status='sold'` — добавим правило: после `orders.status='completed'` тоже открывается возможность оставить отзыв обеим сторонам.

## Порядок реализации

1. Миграция БД (enum, поля, `deal_events`, триггеры, RLS, storage bucket).
2. Server functions.
3. `DealCard` + подкомпоненты форм.
4. Кнопка «Хочу купить» в listing.
5. Обновление `ReviewSection` на новый триггер завершения.
6. Предупреждения для новых продавцов и рекомендации.
