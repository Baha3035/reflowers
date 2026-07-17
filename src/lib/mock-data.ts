import redRoses from "@/assets/bouquet-red-roses.jpg";
import whiteRoses from "@/assets/bouquet-white-roses.jpg";
import pinkPeonies from "@/assets/bouquet-pink-peonies.jpg";
import mixed from "@/assets/bouquet-mixed.jpg";
import tulips from "@/assets/bouquet-tulips.jpg";
import box from "@/assets/bouquet-box.jpg";
import white51 from "@/assets/bouquet-51-white.jpg";
import spray from "@/assets/bouquet-spray.jpg";
import hydrangea from "@/assets/bouquet-hydrangea.jpg";
import heroPeonies from "@/assets/hero-peonies.jpg";

export const IMAGES = {
  redRoses, whiteRoses, pinkPeonies, mixed, tulips, box, white51, spray, hydrangea, heroPeonies,
};

export type SellerType = "private" | "shop";

export interface Listing {
  id: string;
  title: string;
  price: number;
  oldPrice?: number;
  image: string;
  gallery?: string[];
  district: string;
  freshness: string;
  sellerType: SellerType;
  sellerId: string;
  delivery: boolean;
  badge?: "Сегодня" | "Проверенный магазин" | "Срочная продажа" | "Скидка";
  flowerType: string;
  color: string;
  size: string;
  count?: number;
  hoursLeft?: number;
  description?: string;
  reason?: string;
  urgent?: boolean;
  boostTopUntil?: string | null;
  boostHighlightUntil?: string | null;
  boostBumpUntil?: string | null;
}

export interface Seller {
  id: string;
  type: SellerType;
  name: string;
  avatar?: string;
  rating: number;
  sales: number;
  responseTime: string;
  memberSince: string;
  verified: boolean;
  district?: string;
  deliveryTime?: string;
  workingHours?: string;
  address?: string;
  minOrder?: number;
  reviewsCount: number;
  instagram?: string;
  whatsapp?: string;
  about?: string;
}

// Sort priority for boosted listings: top > urgent > highlight > bump > none.
// Lower number = higher in the feed.
export function boostRank(l: Listing): number {
  const now = Date.now();
  const active = (v?: string | null) => !!v && new Date(v).getTime() > now;
  if (active(l.boostTopUntil)) return 1;
  if (l.urgent) return 2;
  if (active(l.boostHighlightUntil)) return 3;
  if (active(l.boostBumpUntil)) return 4;
  return 5;
}

export const DISTRICTS = [
  "Асанбай", "Джал", "Восток-5", "Центр", "12 микрорайон",
  "Южные микрорайоны", "Аламедин-1", "Тунгуч",
];

export const CATEGORIES = [
  { id: "today", label: "Получены сегодня", icon: "🌸" },
  { id: "u1000", label: "До 1000 сом", icon: "💸" },
  { id: "u3000", label: "До 3000 сом", icon: "🌷" },
  { id: "big", label: "Большие букеты", icon: "💐" },
  { id: "hour", label: "Доставка за час", icon: "⚡️" },
  { id: "roses", label: "Розы", icon: "🌹" },
  { id: "peonies", label: "Пионы", icon: "🌺" },
  { id: "date", label: "Для свидания", icon: "💕" },
  { id: "bday", label: "День рождения", icon: "🎂" },
  { id: "sale", label: "Скидки до 70%", icon: "🔥" },
];

export const SELLERS: Seller[] = [
  { id: "s1", type: "private", name: "Алина", rating: 4.9, sales: 12, responseTime: "≈15 мин", memberSince: "март 2024", verified: true, district: "Южные микрорайоны", reviewsCount: 24 },
  { id: "s2", type: "private", name: "Айдана", rating: 4.8, sales: 7, responseTime: "≈30 мин", memberSince: "янв 2024", verified: true, district: "Джал", reviewsCount: 11 },
  { id: "s3", type: "private", name: "Нурайым", rating: 5.0, sales: 21, responseTime: "≈10 мин", memberSince: "нояб 2023", verified: true, district: "Центр", reviewsCount: 34 },
  { id: "s4", type: "private", name: "Диана", rating: 4.7, sales: 4, responseTime: "≈1 час", memberSince: "авг 2024", verified: false, district: "Асанбай", reviewsCount: 6 },
  { id: "s5", type: "private", name: "Сабина", rating: 4.9, sales: 15, responseTime: "≈20 мин", memberSince: "май 2024", verified: true, district: "Восток-5", reviewsCount: 18 },
  { id: "s6", type: "private", name: "Мария", rating: 4.8, sales: 9, responseTime: "≈40 мин", memberSince: "июнь 2024", verified: true, district: "12 микрорайон", reviewsCount: 12 },
  { id: "s7", type: "private", name: "Элина", rating: 5.0, sales: 26, responseTime: "≈5 мин", memberSince: "окт 2023", verified: true, district: "Тунгуч", reviewsCount: 42 },

  { id: "shop1", type: "shop", name: "Bloom Bishkek", rating: 4.9, sales: 1240, responseTime: "≈5 мин", memberSince: "2022", verified: true, deliveryTime: "45–60 мин", workingHours: "09:00–22:00", address: "ул. Чуй 128, Центр", minOrder: 1000, reviewsCount: 328, instagram: "@bloom.bishkek", whatsapp: "+996 555 12 34 56", about: "Авторские букеты и свежие цветы каждый день." },
  { id: "shop2", type: "shop", name: "Gül Studio", rating: 4.8, sales: 890, responseTime: "≈10 мин", memberSince: "2021", verified: true, deliveryTime: "60 мин", workingHours: "10:00–21:00", address: "мкр. Джал, 30", minOrder: 1500, reviewsCount: 214, instagram: "@gul.studio", whatsapp: "+996 700 88 99 00", about: "Флористическая студия премиум-класса." },
  { id: "shop3", type: "shop", name: "Flora House", rating: 4.7, sales: 512, responseTime: "≈20 мин", memberSince: "2023", verified: true, deliveryTime: "1–2 ч", workingHours: "08:00–23:00", address: "ул. Байтик Баатыра 45", minOrder: 800, reviewsCount: 96, instagram: "@florahouse.kg", whatsapp: "+996 550 11 22 33", about: "Свежие цветы 7 дней в неделю." },
  { id: "shop4", type: "shop", name: "Rose Room", rating: 5.0, sales: 640, responseTime: "≈8 мин", memberSince: "2020", verified: true, deliveryTime: "40 мин", workingHours: "круглосуточно", address: "пр. Манаса 78", minOrder: 2000, reviewsCount: 187, instagram: "@roseroom.bishkek", whatsapp: "+996 777 45 67 89", about: "Королевские букеты роз премиум." },
  { id: "shop5", type: "shop", name: "Garden Flowers", rating: 4.6, sales: 320, responseTime: "≈25 мин", memberSince: "2023", verified: true, deliveryTime: "1 ч", workingHours: "09:00–20:00", address: "ул. Токтогула 189", minOrder: 700, reviewsCount: 58, instagram: "@garden.flowers.kg", whatsapp: "+996 559 34 56 78", about: "Уютные букеты в европейском стиле." },
];

const img = [redRoses, whiteRoses, pinkPeonies, mixed, tulips, box, white51, spray, hydrangea];

export const LISTINGS: Listing[] = [
  // Private listings (from people)
  { id: "l1", title: "Букет из 51 розы", price: 3500, oldPrice: 8000, image: white51, gallery: [white51, whiteRoses, redRoses], district: "Южные микрорайоны", freshness: "Получен сегодня в 11:00", sellerType: "private", sellerId: "s1", delivery: true, badge: "Сегодня", flowerType: "Розы", color: "Белые", size: "Большой", count: 51, hoursLeft: 6, reason: "Уезжаю из города", description: "Красивый большой букет из свежих роз. Получен сегодня утром. Стоит в воде. Упаковка в идеальном состоянии.", urgent: true },
  { id: "l2", title: "Нежные розовые пионы", price: 1800, oldPrice: 3200, image: pinkPeonies, gallery: [pinkPeonies, mixed], district: "Джал", freshness: "Получены сегодня в 09:30", sellerType: "private", sellerId: "s2", delivery: true, badge: "Сегодня", flowerType: "Пионы", color: "Розовые", size: "Средний", count: 15, hoursLeft: 12, reason: "Подарили дубликат", description: "Свежайшие пионы, аромат невероятный." },
  { id: "l3", title: "Букет из 25 красных роз", price: 1500, oldPrice: 3500, image: redRoses, gallery: [redRoses, box], district: "Центр", freshness: "1 день", sellerType: "private", sellerId: "s3", delivery: false, badge: "Срочная продажа", flowerType: "Розы", color: "Красные", size: "Средний", count: 25, hoursLeft: 3, reason: "Не могу забрать", urgent: true },
  { id: "l4", title: "Смешанный букет с гортензиями", price: 2200, oldPrice: 4500, image: mixed, district: "Асанбай", freshness: "Получен сегодня", sellerType: "private", sellerId: "s4", delivery: true, badge: "Сегодня", flowerType: "Смешанные", color: "Разноцветные", size: "Большой", hoursLeft: 18 },
  { id: "l5", title: "Тюльпаны в крафтовой упаковке", price: 900, image: tulips, district: "Восток-5", freshness: "Получены сегодня", sellerType: "private", sellerId: "s5", delivery: false, flowerType: "Тюльпаны", color: "Жёлтые", size: "Маленький", count: 9, hoursLeft: 20 },
  { id: "l6", title: "Цветочная композиция в коробке", price: 2400, oldPrice: 3800, image: box, district: "12 микрорайон", freshness: "Получена сегодня", sellerType: "private", sellerId: "s6", delivery: true, badge: "Сегодня", flowerType: "Розы", color: "Розовые", size: "Средний", hoursLeft: 10 },
  { id: "l7", title: "Пионовидные кустовые розы", price: 1700, image: spray, district: "Тунгуч", freshness: "1 день", sellerType: "private", sellerId: "s7", delivery: true, flowerType: "Розы", color: "Розовые", size: "Средний", hoursLeft: 8 },
  { id: "l8", title: "Гортензии сиреневые", price: 2600, oldPrice: 4000, image: hydrangea, district: "Джал", freshness: "Получены сегодня", sellerType: "private", sellerId: "s2", delivery: true, flowerType: "Гортензии", color: "Фиолетовые", size: "Большой", hoursLeft: 14 },
  { id: "l9", title: "Белые розы, 15 шт.", price: 1200, oldPrice: 2500, image: whiteRoses, district: "Центр", freshness: "1 день", sellerType: "private", sellerId: "s3", delivery: false, badge: "Срочная продажа", flowerType: "Розы", color: "Белые", size: "Средний", count: 15, hoursLeft: 2, urgent: true },
  { id: "l10", title: "Букет «Летнее настроение»", price: 1900, image: mixed, district: "Асанбай", freshness: "Получен сегодня", sellerType: "private", sellerId: "s4", delivery: true, badge: "Сегодня", flowerType: "Смешанные", color: "Разноцветные", size: "Средний", hoursLeft: 22 },

  // Shop listings
  { id: "sh1", title: "Авторский букет «Bloom Signature»", price: 4500, image: mixed, district: "Центр", freshness: "Новый от магазина", sellerType: "shop", sellerId: "shop1", delivery: true, badge: "Проверенный магазин", flowerType: "Смешанные", color: "Разноцветные", size: "Большой" },
  { id: "sh2", title: "51 роза Premium", price: 7500, image: white51, district: "Центр", freshness: "Новый от магазина", sellerType: "shop", sellerId: "shop4", delivery: true, badge: "Проверенный магазин", flowerType: "Розы", color: "Белые", size: "Большой", count: 51 },
  { id: "sh3", title: "Букет пионов Grand", price: 5200, image: pinkPeonies, district: "Джал", freshness: "Новый от магазина", sellerType: "shop", sellerId: "shop2", delivery: true, badge: "Проверенный магазин", flowerType: "Пионы", color: "Розовые", size: "Большой" },
  { id: "sh4", title: "Композиция в коробке «Etoile»", price: 3800, image: box, district: "Центр", freshness: "Новый от магазина", sellerType: "shop", sellerId: "shop1", delivery: true, badge: "Проверенный магазин", flowerType: "Розы", color: "Розовые", size: "Средний" },
  { id: "sh5", title: "25 красных роз, длина 70см", price: 3200, image: redRoses, district: "Аламедин-1", freshness: "Новый от магазина", sellerType: "shop", sellerId: "shop3", delivery: true, badge: "Проверенный магазин", flowerType: "Розы", color: "Красные", size: "Средний", count: 25 },
];

export const REVIEWS = [
  { id: "r1", author: "Айгерим", rating: 5, text: "Букет свежайший, встретили у подъезда. Спасибо!", date: "2 дня назад" },
  { id: "r2", author: "Данияр", rating: 5, text: "Заказал за час до свидания, всё пришло вовремя.", date: "неделю назад" },
  { id: "r3", author: "Асель", rating: 4, text: "Красивый букет, но упаковка слегка помятая.", date: "2 недели назад" },
  { id: "r4", author: "Бек", rating: 5, text: "Продавщица очень приятная, всё честно.", date: "3 недели назад" },
  { id: "r5", author: "Жанна", rating: 5, text: "Цена в два раза ниже магазина, качество топ.", date: "месяц назад" },
  { id: "r6", author: "Тимур", rating: 4, text: "Немного опоздали, но букет шикарный.", date: "месяц назад" },
  { id: "r7", author: "Айым", rating: 5, text: "Куплю ещё!", date: "месяц назад" },
  { id: "r8", author: "Эркин", rating: 5, text: "Магазин быстрый, курьер вежливый.", date: "2 месяца назад" },
];

export const CONVERSATIONS = [
  { id: "c1", sellerId: "s1", listingId: "l1", lastMessage: "Да, ещё доступен. Могу привезти вечером.", time: "12:34", unread: 2 },
  { id: "c2", sellerId: "shop1", listingId: "sh1", lastMessage: "Ваш заказ принят, курьер уже в пути.", time: "11:20", unread: 0 },
  { id: "c3", sellerId: "s3", listingId: "l3", lastMessage: "Могу снизить до 1300.", time: "10:05", unread: 1 },
  { id: "c4", sellerId: "s5", listingId: "l5", lastMessage: "Забирайте у метро.", time: "вчера", unread: 0 },
  { id: "c5", sellerId: "shop2", listingId: "sh3", lastMessage: "Есть ли открытка к букету?", time: "вчера", unread: 0 },
  { id: "c6", sellerId: "s7", listingId: "l14", lastMessage: "Спасибо за покупку!", time: "2 дня назад", unread: 0 },
];

export function formatSom(n: number) {
  return `${n.toLocaleString("ru-RU")} сом`;
}

export function getSeller(id: string) { return SELLERS.find(s => s.id === id); }
export function getListing(id: string) { return LISTINGS.find(l => l.id === id); }