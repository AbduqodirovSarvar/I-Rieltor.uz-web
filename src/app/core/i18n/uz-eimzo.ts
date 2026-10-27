/** Texts of signing with E-IMZO, Uzbek. Joined with the others in `uz.ts`. */
export const uzEimzo = {
  'cabinet.eimzo': 'E-IMZO',
  'eimzo.title': 'E-IMZO kaliti',
  'eimzo.key': 'Kalitni tanlang',
  'eimzo.loading': 'E-IMZO kalitlari qidirilmoqda…',
  'eimzo.retry': 'Qayta qidirish',
  'eimzo.until': 'amal qiladi: {date}',
  'eimzo.fake':
    'Sinov rejimi: E-IMZO o‘rniga soxta imzo ishlatilmoqda. Haqiqiy saytda bunday bo‘lmaydi.',
  'eimzo.err.library-missing':
    'E-IMZO bu saytga hali ulanmagan. Iltimos, keyinroq urinib ko‘ring yoki biz bilan bog‘laning.',
  'eimzo.err.not-installed':
    'Kompyuteringizda E-IMZO dasturi topilmadi. Dasturni o‘rnating va ishga tushiring, so‘ng “Qayta qidirish” tugmasini bosing.',
  'eimzo.err.outdated':
    'Kompyuteringizdagi E-IMZO dasturi eskirgan. Yangi versiyasini e-imzo.uz saytidan yuklab o‘rnating.',
  'eimzo.err.no-keys':
    'Kompyuteringizda E-IMZO kaliti topilmadi. Kalit fayli yoki ID-kartani ulang va qayta qidiring.',
  'eimzo.err.cancelled': 'Imzolash bekor qilindi.',
  'eimzo.err.bad-password': 'Kalit paroli noto‘g‘ri.',
  'eimzo.err.failed': 'E-IMZO bilan imzolab bo‘lmadi. Qayta urinib ko‘ring.',
  'eimzo.err.pickKey': 'Avval kalitni tanlang.',

  'eimzo.signIn.title': 'E-IMZO bilan kirish',
  'eimzo.signIn.intro': 'Parolsiz: kalitingiz bilan imzo qo‘yib kirasiz.',
  'eimzo.signIn.submit': 'E-IMZO bilan kirish',
  'eimzo.signIn.signUp': 'E-IMZO bilan ro‘yxatdan o‘tish',
  'eimzo.signIn.notRegistered':
    'Bu kalit bilan hisob topilmadi. Yangi hisob yaratish uchun “E-IMZO bilan ro‘yxatdan o‘tish” tugmasini bosing.',
  'eimzo.signIn.taken':
    'Bu kalit bilan hisob allaqachon bor. “E-IMZO bilan kirish” tugmasini bosing.',
  'eimzo.signUp.done': 'Hisob yaratildi. E-IMZO orqali tasdiqlangan hisob bilan kirdingiz.',

  'eimzo.link.title': 'E-IMZO ni ulash',
  'eimzo.link.intro':
    'Auksionda ishtirok etish uchun hisobingiz E-IMZO kaliti bilan tasdiqlanishi kerak. Ism va identifikator (PINFL yoki INN) kalitdan olinadi.',
  'eimzo.link.submit': 'Kalitni ulash',
  'eimzo.link.done': 'E-IMZO ulandi. Hisobingiz tasdiqlandi.',
  'eimzo.link.taken': 'Bu kalit boshqa hisobga ulangan.',
  'eimzo.link.status': 'Holat',
  'eimzo.link.verifiedAs': 'Tasdiqlangan: {name}',
  'eimzo.link.identifier': 'Identifikator',
  'eimzo.link.back': 'Auksionga qaytish',

  'eimzo.reset.title': 'E-IMZO orqali tiklash',
  'eimzo.reset.intro':
    'E-IMZO ulangan hisobning parolini kalit bilan imzo qo‘yib yangilash mumkin (elektron pochta kerak emas).',
  'eimzo.reset.submit': 'Imzolab, parolni yangilash',
  'eimzo.reset.notRegistered': 'Bu kalit bilan hisob topilmadi.',
  'eimzo.reset.done': 'Parol o‘zgartirildi. Yangi parol bilan kiring.',

  'apply.title': 'Auksionga ariza',
  'apply.intro':
    'Arizaning matnini o‘qing. Roziligingizni E-IMZO kaliti bilan imzolab tasdiqlaysiz; imzo yuridik kuchga ega.',
  'apply.text': 'Ariza matni',
  'apply.deadline': 'Ariza qabul qilish muddati: {date}',
  'apply.agree': 'Matnni o‘qib chiqdim va roziman',
  'apply.mustAgree': 'Davom etish uchun matn bilan rozilikni belgilang.',
  'apply.submit': 'Imzolab, ariza berish',
  'apply.done': 'Ariza yuborildi. Xodim uni ko‘rib chiqadi.',
  'apply.verify': 'Ariza berish uchun avval E-IMZO ni ulang.',
  'apply.toVerify': 'E-IMZO ni ulash',
  'apply.back': 'Auksion sahifasiga qaytish',
  'apply.err.conflict': 'Siz bu auksionga allaqachon ariza bergansiz yoki muddat tugagan.',
  'apply.err.forbidden':
    'Imzo boshqa shaxsga tegishli: ariza hisobingizga ulangan kalit bilan imzolanishi kerak.',
  'apply.err.textChanged': 'Ariza matni o‘zgargan. Sahifani yangilab, qayta urinib ko‘ring.',
} as const;
