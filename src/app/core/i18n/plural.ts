/** The four languages of the site: Uzbek (Latin, the main one, no prefix), Russian, English and Uzbek in Cyrillic. */
export type Lang = 'uz' | 'ru' | 'en' | 'cyrl';
export const LANGS: readonly Lang[] = ['uz', 'ru', 'en', 'cyrl'];

/** Where each language lives in the address: Uzbek (Latin) at the root, the others under their prefix. */
export const LANG_PREFIX: Record<Lang, string> = { uz: '', ru: '/ru', en: '/en', cyrl: '/cyrl' };
/** The language tags of `<html lang>` and `hreflang`. */
export const HTML_LANG: Record<Lang, string> = { uz: 'uz', ru: 'ru', en: 'en', cyrl: 'uz-Cyrl' };
/** The short label of a language in the language menu, and its name in itself. */
export const LANG_LABEL: Record<Lang, string> = { uz: 'UZ', ru: 'RU', en: 'EN', cyrl: 'ЎЗ' };
export const LANG_NAME: Record<Lang, string> = {
  uz: 'O‘zbekcha',
  ru: 'Русский',
  en: 'English',
  cyrl: 'Ўзбекча',
};

/**
 * Picks the form of a word for a number. Russian has three forms (1 комната, 2 комнаты, 5 комнат), written `one|few|many`;
 * English has two (`one|other`); Uzbek does not change the word after a number, so its text is a single form.
 */
export function pluralForm(forms: string, n: number, lang: Lang): string {
  const list = forms.split('|');
  if (lang === 'en' && list.length >= 2) return Math.abs(n) === 1 ? list[0] : list[1];
  if (lang !== 'ru' || list.length < 3) return list[0];
  const abs = Math.abs(Math.trunc(n));
  const last = abs % 10;
  const lastTwo = abs % 100;
  if (last === 1 && lastTwo !== 11) return list[0];
  if (last >= 2 && last <= 4 && (lastTwo < 12 || lastTwo > 14)) return list[1];
  return list[2];
}
