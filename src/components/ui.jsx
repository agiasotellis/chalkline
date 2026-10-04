import { useEffect, useRef, useState } from 'react';
import { status } from '../lib/workflow.js';
import { useT } from '../lib/i18n.jsx';
import { LOCALES } from '../lib/i18n-core.js';

const P = {
  home: 'M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z',
  quote: 'M7 3h7l5 5v12a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1zM14 3v5h5M9 13h6M9 17h4',
  job: 'M14.7 6.3a4 4 0 0 0-5.4 5.4L3 18l3 3 6.3-6.3a4 4 0 0 0 5.4-5.4l-2.5 2.5-2.5-.5-.5-2.5z',
  invoice: 'M6 3h12v18l-3-2-3 2-3-2-3 2zM9 8h6M9 12h6M9 16h3',
  users: 'M16 20v-1.5a3.5 3.5 0 0 0-3.5-3.5h-5A3.5 3.5 0 0 0 4 18.5V20M10 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7zM20 20v-1.5a3.5 3.5 0 0 0-2.5-3.35M15.5 4.15a3.5 3.5 0 0 1 0 6.7',
  tag: 'M20.6 13.4 13.4 20.6a2 2 0 0 1-2.8 0L3 13V3h10l7.6 7.6a2 2 0 0 1 0 2.8zM7.5 7.5h.01',
  cog: 'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z',
  plus: 'M12 5v14M5 12h14',
  search: 'M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16zM21 21l-4.35-4.35',
  chev: 'M9 6l6 6-6 6',
  back: 'M15 18l-6-6 6-6',
  out: 'M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9',
  copy: 'M9 9h11v11H9zM5 15H4a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v1',
  edit: 'M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z',
  print: 'M6 9V2h12v7M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2M6 14h12v8H6z',
  send: 'M22 2 11 13M22 2l-7 20-4-9-9-4z',
  link: 'M10 13a5 5 0 0 0 7.5.5l3-3a5 5 0 0 0-7-7l-1.7 1.7M14 11a5 5 0 0 0-7.5-.5l-3 3a5 5 0 0 0 7 7l1.7-1.7'
};
export const Icon = ({ name, ...p }) => <svg viewBox="0 0 24 24" aria-hidden="true" {...p}><path d={P[name]} /></svg>;

export const Logo = () => (
  <svg viewBox="0 0 28 28" aria-hidden="true"><rect x="1" y="6" width="16" height="16" rx="4" fill="var(--tape)" /><circle cx="9" cy="14" r="3.2" fill="var(--ink)" /><path d="M17 14H27" stroke="var(--chalk)" strokeWidth="2.4" strokeLinecap="round" strokeDasharray="3 2.5" /></svg>
);

export function Pill({ work }) {
  const { t } = useT();
  const s = status(work);
  return <span className={`pill t-${s.tone}`}>{t(s.key)}</span>;
}

// Flags drawn inline so they look the same on every device.
export const FlagUS = () => (
  <svg viewBox="0 0 38 20" aria-hidden="true" className="flag">
    <rect width="38" height="20" fill="#fff" />
    {[0, 2, 4, 6, 8, 10, 12].map(i => <rect key={i} y={(i * 20) / 13} width="38" height={20 / 13} fill="#B22234" />)}
    <rect width="15.2" height={(20 * 7) / 13} fill="#3C3B6E" />
    {[0, 1, 2, 3].map(r => [0, 1, 2, 3, 4].map(c => <circle key={`${r}${c}`} cx={1.6 + c * 3} cy={1.5 + r * 2.6} r=".55" fill="#fff" />))}
  </svg>
);
export const FlagGR = () => (
  <svg viewBox="0 0 27 18" aria-hidden="true" className="flag">
    {[0, 1, 2, 3, 4, 5, 6, 7, 8].map(i => <rect key={i} y={i * 2} width="27" height="2" fill={i % 2 ? '#fff' : '#0D5EAF'} />)}
    <rect width="10" height="10" fill="#0D5EAF" /><rect x="4" width="2" height="10" fill="#fff" /><rect y="4" width="10" height="2" fill="#fff" />
  </svg>
);

// Choose between the US and Greek versions.
export function LangDialog({ open, onClose, required }) {
  const { lang, setLang, t } = useT();
  const ref = useRef(null);
  useEffect(() => { const d = ref.current; if (!d) return; if (open && !d.open) d.showModal(); if (!open && d.open) d.close(); }, [open]);
  const pick = l => { setLang(l); onClose(); };
  return (
    <dialog ref={ref} className="lang-dlg" onCancel={e => { if (required) { e.preventDefault(); pick(lang); } }} onClose={onClose} aria-labelledby="lang-t">
      <div className="dlg">
        <div className="dlg-b" style={{ gap: 18 }}>
          <div><h3 id="lang-t" style={{ fontSize: '1.35rem' }}>{t('lang.title')}</h3><p className="note" style={{ marginTop: 6 }}>{t('lang.sub')}</p></div>
          <div className="lang-opts">
            <button type="button" className={`lang-opt${lang === 'en' ? ' on' : ''}`} onClick={() => pick('en')} lang="en"><FlagUS /><span><b>{t('lang.us')}</b><small>{t('lang.usSub')}</small></span></button>
            <button type="button" className={`lang-opt${lang === 'el' ? ' on' : ''}`} onClick={() => pick('el')} lang="el"><FlagGR /><span><b>{t('lang.gr')}</b><small>{t('lang.grSub')}</small></span></button>
          </div>
        </div>
      </div>
    </dialog>
  );
}

export function LangButton({ onClick }) {
  const { lang, t } = useT();
  return <button className="icon-btn lang-btn" type="button" onClick={onClick} aria-label={t('lang.switch')} title={t('lang.switch')}>{lang === 'el' ? <FlagGR /> : <FlagUS />}<span>{LOCALES[lang].short}</span></button>;
}

export function ThemeButton() {
  const { t } = useT();
  const root = document.documentElement;
  const isDark = () => root.dataset.theme === 'dark';
  const [dark, setDark] = useState(isDark);
  const toggle = () => {
    const next = isDark() ? 'light' : 'dark';
    window.__chalkTheme = next;
    try { localStorage.setItem('chalkline.theme.v2', next); } catch { /* ignore */ }
    root.dataset.theme = next;
    setDark(isDark());
  };
  return (
    <button className="icon-btn theme-btn" type="button" onClick={toggle} aria-label={dark ? t('theme.toLight') : t('theme.toDark')}>
      <svg className="i-sun" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="4.5" /><path d="M12 2v2.5M12 19.5V22M2 12h2.5M19.5 12H22M4.9 4.9l1.8 1.8M17.3 17.3l1.8 1.8M4.9 19.1l1.8-1.8M17.3 6.7l1.8-1.8" /></svg>
      <svg className="i-moon" viewBox="0 0 24 24" aria-hidden="true"><path d="M20.5 14.2A8.5 8.5 0 0 1 9.8 3.5a8.5 8.5 0 1 0 10.7 10.7z" fill="var(--ink)" stroke="none" /></svg>
    </button>
  );
}

// In-page confirm (browser confirm() is unreliable in embedded views).
export function Confirm({ open, title, body, confirmLabel, danger, onConfirm, onClose }) {
  const { t } = useT();
  const ref = useRef(null);
  useEffect(() => { const d = ref.current; if (!d) return; if (open && !d.open) d.showModal(); if (!open && d.open) d.close(); }, [open]);
  return (
    <dialog ref={ref} onClose={onClose} onClick={e => e.target === ref.current && onClose()}>
      <div className="dlg">
        <div className="dlg-h"><h3>{title}</h3></div>
        <div className="dlg-b"><p className="muted">{body}</p></div>
        <div className="dlg-f">
          <button className="btn btn-ghost" type="button" onClick={onClose}>{t('c.cancel')}</button>
          <button className={`btn ${danger ? 'btn-danger' : 'btn-chalk'}`} type="button" onClick={() => { onConfirm(); onClose(); }}>{confirmLabel}</button>
        </div>
      </div>
    </dialog>
  );
}

export function Modal({ open, title, children, footer, onClose }) {
  const { t } = useT();
  const ref = useRef(null);
  useEffect(() => { const d = ref.current; if (!d) return; if (open && !d.open) d.showModal(); if (!open && d.open) d.close(); }, [open]);
  return (
    <dialog ref={ref} onClose={onClose} onClick={e => e.target === ref.current && onClose()}>
      <div className="dlg">
        <div className="dlg-h"><h3>{title}</h3><button className="icon-btn" type="button" aria-label={t('c.close')} onClick={onClose} style={{ width: 34, height: 34 }}>×</button></div>
        <div className="dlg-b">{children}</div>
        {footer && <div className="dlg-f">{footer}</div>}
      </div>
    </dialog>
  );
}

export async function copyText(text) {
  try { await navigator.clipboard.writeText(text); return true; } catch { return false; }
}
