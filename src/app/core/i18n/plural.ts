export type Lang = 'uz' | 'ru';
export const LANGS: readonly Lang[] = ['uz', 'ru'];

/**
 * Picks the form of a word for a number. Russian has three forms (1 комната, 2 комнаты, 5 комнат), written `one|few|many`;
 * Uzbek does not change the word after a number, so its text is a single form.
 */
export function pluralForm(forms: string, n: number, lang: Lang): string {
  const list = forms.split('|');
  if (lang !== 'ru' || list.length < 3) return list[0];
  const abs = Math.abs(Math.trunc(n));
  const last = abs % 10;
  const lastTwo = abs % 100;
  if (last === 1 && lastTwo !== 11) return list[0];
  if (last >= 2 && last <= 4 && (lastTwo < 12 || lastTwo > 14)) return list[1];
  return list[2];
}
