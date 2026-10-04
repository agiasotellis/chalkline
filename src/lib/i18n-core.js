import en from './locales/en.js';
import el from './locales/el.js';

// Two versions of Ergo: United States (English, $) and Greece (Greek, €).
export const LOCALES = {
  en: { intl: 'en-US', currency: 'USD', symbol: '$', short: 'EN', name: 'English (US)', html: 'en' },
  el: { intl: 'el-GR', currency: 'EUR', symbol: '€', short: 'ΕΛ', name: 'Ελληνικά', html: 'el' }
};
const DICTS = { en, el };
export const LANG_KEY = 'chalkline.locale';

export function storedLang() {
  try { const v = localStorage.getItem(LANG_KEY); return v === 'en' || v === 'el' ? v : null; } catch { return null; }
}
export const guessLang = () => (typeof navigator !== 'undefined' && /^el\b/i.test(navigator.language || '') ? 'el' : 'en');
export const normLang = l => (l === 'el' || l === 'el-GR' ? 'el' : l === 'en' || l === 'en-US' ? 'en' : null);

let current = storedLang() || guessLang();
export const getLang = () => current;
export function setCurrentLang(l) {
  current = l;
  if (typeof document !== 'undefined') document.documentElement.lang = LOCALES[l].html;
}
setCurrentLang(current);

export function translate(lang, key, vars) {
  const v = DICTS[lang]?.[key] ?? DICTS.en[key];
  if (v === undefined) return key;
  if (typeof v === 'function') return v(vars || {});
  return vars ? v.replace(/\{(\w+)\}/g, (_, k) => (vars[k] ?? '')) : v;
}
export const tr = (key, vars) => translate(current, key, vars);
