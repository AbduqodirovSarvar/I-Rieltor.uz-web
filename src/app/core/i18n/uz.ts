/**
 * Interface texts, Uzbek (Latin). The Russian dictionary (`ru.ts`) must have exactly the same keys: the compiler checks it.
 * A text with several forms (Russian plurals) is written `one|few|many` and read with `I18n.plural`.
 * `{name}` is a placeholder.
 */
import { uzPages } from './uz-pages';

const uzBase = {
  'site.name': 'I-Rieltor',
  'site.tagline': 'Ko‘chmas mulk auksionlari',
  'site.description':
    'I-Rieltor: ko‘chmas mulk auksionlari. Obyektlarni ko‘ring, ariza bering va onlayn savdoda ishtirok eting.',

  'nav.home': 'Bosh sahifa',
  'nav.catalog': 'Katalog',
  'nav.about': 'Biz haqimizda',
  'nav.signIn': 'Kirish',
  'nav.signUp': 'Ro‘yxatdan o‘tish',
  'nav.cabinet': 'Kabinet',
  'nav.signOut': 'Chiqish',
  'nav.menu': 'Menyu',
  'nav.closeMenu': 'Menyuni yopish',
  'nav.main': 'Asosiy menyu',
  'nav.skip': 'Asosiy mazmunga o‘tish',
  'nav.top': 'Tepaga',
  'nav.language': 'Til',

  'theme.label': 'Mavzu',
  'theme.system': 'Tizim',
  'theme.light': 'Yorug‘',
  'theme.dark': 'Qorong‘i',

  'footer.contacts': 'Aloqa',
  'footer.pages': 'Sahifalar',
  'footer.rights': 'Barcha huquqlar himoyalangan.',

  'common.loading': 'Yuklanmoqda…',
  'common.retry': 'Qayta urinish',
  'common.close': 'Yopish',
  'common.cancel': 'Bekor qilish',
  'common.confirm': 'Tasdiqlash',
  'common.yes': 'Ha',
  'common.no': 'Yo‘q',
  'common.save': 'Saqlash',
  'common.back': 'Orqaga',
  'common.next': 'Keyingi',
  'common.previous': 'Oldingi',
  'common.search': 'Qidirish',
  'common.clear': 'Tozalash',
  'common.more': 'Batafsil',
  'common.all': 'Hammasi',
  'common.notSpecified': 'Ko‘rsatilmagan',
  'common.requestId': 'So‘rov raqami',

  'error.notFound.title': 'Sahifa topilmadi',
  'error.notFound.text': 'Bunday sahifa yo‘q yoki u ko‘chirilgan.',
  'error.forbidden.title': 'Ruxsat yo‘q',
  'error.forbidden.text': 'Bu sahifani ko‘rish uchun huquqingiz yetarli emas.',
  'error.server.title': 'Server xatosi',
  'error.server.text': 'Nimadir noto‘g‘ri ketdi. Birozdan keyin qayta urinib ko‘ring.',
  'error.signInRequired.title': 'Kirish kerak',
  'error.signInRequired.text': 'Bu sahifani ko‘rish uchun tizimga kiring.',
  'error.offline.title': 'Ulanish yo‘q',
  'error.offline.text': 'Serverga ulanib bo‘lmadi. Internetni tekshiring va qayta urinib ko‘ring.',
  'error.goHome': 'Bosh sahifaga',

  'api.network': 'Serverga ulanib bo‘lmadi. Internetni tekshiring.',
  'api.unauthorized': 'Sessiya tugadi. Qayta kiring.',
  'api.forbidden': 'Bu amal uchun ruxsat yo‘q.',
  'api.notFound': 'So‘ralgan ma’lumot topilmadi.',
  'api.conflict': 'Amalni bajarib bo‘lmadi: holat o‘zgargan.',
  'api.validation': 'Kiritilgan ma’lumotlarni tekshiring.',
  'api.tooMany': 'Juda ko‘p urinish. {seconds} soniyadan keyin qayta urinib ko‘ring.',
  'api.tooManyNoTime': 'Juda ko‘p urinish. Birozdan keyin qayta urinib ko‘ring.',
  'api.server': 'Server xatosi. Birozdan keyin qayta urinib ko‘ring.',
  'api.unknown': 'Kutilmagan xato.',

  'toast.close': 'Xabarni yopish',
  'toast.region': 'Xabarlar',

  'unit.som': 'so‘m',
  'unit.sqm': 'm²',
  'unit.sotix': 'sotix',
  'unit.rooms': 'xona',
  'unit.floor': '{floor}/{total}-qavat',
  'unit.days': 'kun',
  'unit.hours': 'soat',
  'unit.minutes': 'daqiqa',
  'unit.seconds': 'soniya',
  'unit.bytes': 'B',
  'unit.kb': 'KB',
  'unit.mb': 'MB',

  'enum.AuctionStatus.DRAFT': 'Qoralama',
  'enum.AuctionStatus.SCHEDULED': 'Boshlanishi kutilmoqda',
  'enum.AuctionStatus.ONGOING': 'Savdo ketmoqda',
  'enum.AuctionStatus.FINISHED': 'Yakunlangan',
  'enum.AuctionStatus.FAILED': 'O‘tmadi',
  'enum.AuctionStatus.CANCELLED': 'Bekor qilingan',
  'enum.PropertyStatus.DRAFT': 'Qoralama',
  'enum.PropertyStatus.PUBLISHED': 'E’lon qilingan',
  'enum.PropertyStatus.IN_AUCTION': 'Auksionda',
  'enum.PropertyStatus.SOLD': 'Sotilgan',
  'enum.PropertyStatus.ARCHIVED': 'Arxivda',

  'card.startingPrice': 'Boshlang‘ich narx',
  'card.currentPrice': 'Joriy narx',
  'card.finalPrice': 'Yakuniy narx',
  'card.lot': 'Lot {number}',
  'card.noPhoto': 'Rasm yo‘q',
  'card.location': 'Joylashuv',
  'card.area': 'Maydon',
  'card.endsIn': 'Tugashiga',
  'card.startsIn': 'Boshlanishiga',
  'card.applicationEndsIn': 'Ariza muddatiga',

  'countdown.ended': 'Tugadi',
  'countdown.started': 'Boshlandi',
  'countdown.days': '{n} kun',
  'countdown.label': 'Qolgan vaqt',

  'pagination.label': 'Sahifalar',
  'pagination.page': '{page}-sahifa',
  'pagination.current': 'Joriy sahifa, {page}-sahifa',
  'pagination.of': '{page} / {pages}',

  'empty.title': 'Hech narsa topilmadi',
  'empty.text': 'Filtrlarni o‘zgartirib ko‘ring.',

  'form.required': 'Majburiy maydon',
  'form.optional': 'ixtiyoriy',

  'upload.choose': 'Faylni tanlang',
  'upload.hint': 'Ruxsat etilgan: {types}. Hajmi {size} dan oshmasin.',
  'upload.tooBig': 'Fayl juda katta (eng ko‘pi bilan {size}).',
  'upload.badType': 'Bu turdagi fayl ruxsat etilmagan.',
  'upload.remove': 'Faylni olib tashlash',

  'gallery.label': 'Galereya',
  'gallery.open': 'Rasmni kattalashtirish: {n}',
  'gallery.close': 'Yopish',
  'gallery.previous': 'Oldingi rasm',
  'gallery.next': 'Keyingi rasm',
  'gallery.counter': '{n} / {total}',
  'gallery.video': 'Video',

  'map.open': 'Xaritada ochish',
  'map.coordinates': 'Koordinatalar',
} as const;

export const uz = { ...uzBase, ...uzPages } as const;

export type TextKey = keyof typeof uz;
export type Dictionary = Record<TextKey, string>;
