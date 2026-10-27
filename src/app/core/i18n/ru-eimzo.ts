import { uzEimzo } from './uz-eimzo';

/** Texts of signing with E-IMZO, Russian. */
export const ruEimzo: Record<keyof typeof uzEimzo, string> = {
  'cabinet.eimzo': 'E-IMZO',
  'eimzo.title': 'Ключ E-IMZO',
  'eimzo.key': 'Выберите ключ',
  'eimzo.loading': 'Ищем ключи E-IMZO…',
  'eimzo.retry': 'Искать снова',
  'eimzo.until': 'действует до {date}',
  'eimzo.fake':
    'Тестовый режим: вместо E-IMZO используется поддельная подпись. На настоящем сайте так не бывает.',
  'eimzo.err.library-missing':
    'E-IMZO ещё не подключён к сайту. Попробуйте позже или свяжитесь с нами.',
  'eimzo.err.not-installed':
    'Программа E-IMZO на вашем компьютере не найдена. Установите и запустите её, затем нажмите «Искать снова».',
  'eimzo.err.outdated':
    'Программа E-IMZO на вашем компьютере устарела. Скачайте и установите новую версию с сайта e-imzo.uz.',
  'eimzo.err.no-keys':
    'Ключ E-IMZO на компьютере не найден. Подключите файл ключа или ID-карту и повторите поиск.',
  'eimzo.err.cancelled': 'Подписание отменено.',
  'eimzo.err.bad-password': 'Неверный пароль ключа.',
  'eimzo.err.failed': 'Не удалось подписать с помощью E-IMZO. Попробуйте ещё раз.',
  'eimzo.err.pickKey': 'Сначала выберите ключ.',

  'eimzo.signIn.title': 'Вход через E-IMZO',
  'eimzo.signIn.intro': 'Без пароля: вы входите, подписав запрос своим ключом.',
  'eimzo.signIn.submit': 'Войти через E-IMZO',
  'eimzo.signIn.signUp': 'Зарегистрироваться через E-IMZO',
  'eimzo.signIn.notRegistered':
    'Аккаунт с этим ключом не найден. Чтобы создать новый, нажмите «Зарегистрироваться через E-IMZO».',
  'eimzo.signIn.taken': 'Аккаунт с этим ключом уже есть. Нажмите «Войти через E-IMZO».',
  'eimzo.signUp.done': 'Аккаунт создан. Вы вошли в аккаунт, подтверждённый через E-IMZO.',

  'eimzo.link.title': 'Подключить E-IMZO',
  'eimzo.link.intro':
    'Для участия в аукционе аккаунт должен быть подтверждён ключом E-IMZO. Имя и идентификатор (ПИНФЛ или ИНН) берутся из ключа.',
  'eimzo.link.submit': 'Подключить ключ',
  'eimzo.link.done': 'E-IMZO подключён. Аккаунт подтверждён.',
  'eimzo.link.taken': 'Этот ключ подключён к другому аккаунту.',
  'eimzo.link.status': 'Статус',
  'eimzo.link.verifiedAs': 'Подтверждён: {name}',
  'eimzo.link.identifier': 'Идентификатор',
  'eimzo.link.back': 'Вернуться к аукциону',

  'eimzo.reset.title': 'Восстановление через E-IMZO',
  'eimzo.reset.intro':
    'Пароль аккаунта с подключённым E-IMZO можно обновить, подписав запрос ключом (почта не нужна).',
  'eimzo.reset.submit': 'Подписать и обновить пароль',
  'eimzo.reset.notRegistered': 'Аккаунт с этим ключом не найден.',
  'eimzo.reset.done': 'Пароль изменён. Войдите с новым паролем.',

  'apply.title': 'Заявка на аукцион',
  'apply.intro':
    'Прочитайте текст заявки. Своё согласие вы подтверждаете подписью ключом E-IMZO; подпись имеет юридическую силу.',
  'apply.text': 'Текст заявки',
  'apply.deadline': 'Приём заявок до: {date}',
  'apply.agree': 'Я прочитал(а) текст и согласен(на)',
  'apply.mustAgree': 'Чтобы продолжить, отметьте согласие с текстом.',
  'apply.submit': 'Подписать и подать заявку',
  'apply.done': 'Заявка отправлена. Сотрудник её рассмотрит.',
  'apply.verify': 'Чтобы подать заявку, сначала подключите E-IMZO.',
  'apply.toVerify': 'Подключить E-IMZO',
  'apply.back': 'Вернуться к аукциону',
  'apply.err.conflict': 'Вы уже подали заявку на этот аукцион или срок истёк.',
  'apply.err.forbidden':
    'Подпись принадлежит другому лицу: заявку нужно подписать ключом, подключённым к вашему аккаунту.',
  'apply.err.textChanged': 'Текст заявки изменился. Обновите страницу и повторите.',
};
