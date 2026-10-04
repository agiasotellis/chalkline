import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { LANG_KEY, LOCALES, getLang, setCurrentLang, translate } from './i18n-core.js';

const Ctx = createContext(null);

export function I18nProvider({ children }) {
  const [lang, setLangState] = useState(getLang());
  const setLang = useCallback(l => {
    try { localStorage.setItem(LANG_KEY, l); } catch { /* storage blocked */ }
    setCurrentLang(l);
    setLangState(l);
  }, []);
  const t = useCallback((k, v) => translate(lang, k, v), [lang]);
  const value = useMemo(() => ({ lang, setLang, t, locale: LOCALES[lang] }), [lang, setLang, t]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export const useT = () => useContext(Ctx);
