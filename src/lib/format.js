import { LOCALES, getLang, translate } from './i18n-core.js';

export const DAY = 864e5;
const L = lang => LOCALES[lang] || LOCALES[getLang()];
export const money = (n, lang = getLang()) =>
  new Intl.NumberFormat(L(lang).intl, { style: 'currency', currency: L(lang).currency }).format(Number(n) || 0);
export const moneyShort = (n, lang = getLang()) =>
  new Intl.NumberFormat(L(lang).intl, { style: 'currency', currency: L(lang).currency, maximumFractionDigits: 0 }).format(Number(n) || 0);
export const fmtDate = (t, lang = getLang()) => (t ? new Date(t).toLocaleDateString(L(lang).intl, { day: 'numeric', month: 'short', year: 'numeric' }) : '—');
export const fmtShort = (t, lang = getLang()) => (t ? new Date(t).toLocaleDateString(L(lang).intl, { day: 'numeric', month: 'short' }) : '—');
export const monthShort = (d, lang = getLang()) => d.toLocaleDateString(L(lang).intl, { month: 'short' });
export const ago = (t, lang = getLang()) => {
  if (!t) return '';
  const d = Math.round((Date.now() - new Date(t)) / DAY);
  if (d <= 0) return translate(lang, 'ago.today');
  if (d === 1) return translate(lang, 'ago.yesterday');
  if (d < 30) return translate(lang, 'ago.days', { n: d });
  return fmtDate(t, lang);
};
export const unitLabel = (u, lang = getLang()) => translate(lang, `u.${u}`) .replace(/^u\./, '');
export const uid = () => (crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2) + Date.now().toString(36));
export const moneyCompact = (n, lang = getLang()) =>
  new Intl.NumberFormat(L(lang).intl, { style: 'currency', currency: L(lang).currency, notation: 'compact', maximumFractionDigits: 1 }).format(Number(n) || 0);
