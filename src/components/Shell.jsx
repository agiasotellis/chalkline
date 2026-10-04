import { useEffect, useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { Icon, LangButton, LangDialog, Logo, ThemeButton } from './ui.jsx';
import { useAuth } from '../lib/auth.jsx';
import { useData } from '../lib/data.jsx';
import { useT } from '../lib/i18n.jsx';
import { isDemo } from '../lib/store/index.js';
import { isOverdue } from '../lib/workflow.js';
import { useToast } from '../lib/toast.jsx';

const NAV = [
  { to: '/', key: 'nav.home', icon: 'home', end: true },
  { to: '/quotes', key: 'nav.quotes', icon: 'quote', tour: 'flow' },
  { to: '/jobs', key: 'nav.jobs', icon: 'job', tour: 'flow' },
  { to: '/invoices', key: 'nav.invoices', icon: 'invoice', tour: 'flow' },
  { to: '/customers', key: 'nav.customers', icon: 'users' },
  { to: '/prices', key: 'nav.prices', icon: 'tag' },
  { to: '/settings', key: 'nav.settings', icon: 'cog', tour: 'settings' }
];

export default function Shell() {
  const { user, signOut } = useAuth();
  const { work, settings, reset, saveSettings } = useData();
  const { t, lang } = useT();
  const nav = useNavigate();
  const toast = useToast();
  const [langOpen, setLangOpen] = useState(false);
  const badge = {
    '/quotes': work.filter(w => w.stage === 'approved').length,
    '/jobs': work.filter(w => w.stage === 'done').length,
    '/invoices': work.filter(isOverdue).length
  };
  const name = settings?.businessName || t('biz.default');

  // Keep the business language in step with the app, so the customer page and emails match.
  useEffect(() => {
    if (!isDemo && settings && settings.locale !== lang) saveSettings({ locale: lang }).catch(() => {});
  }, [lang, settings?.locale]); // eslint-disable-line react-hooks/exhaustive-deps

  const doReset = async () => {
    try { localStorage.removeItem(`chalkline.tourDone.${user?.id}`); } catch { /* ignore */ }
    await reset(); toast(t('demo.restored')); nav('/');
  };

  return (
    <>
      <div className="shell">
        <aside className="side">
          <NavLink to="/" className="brand" aria-label="Ergo"><Logo height={26} /></NavLink>
          <nav className="side-nav" aria-label={t('nav.main')}>
            {NAV.map(n => (
              <NavLink key={n.to} to={n.to} end={n.end} data-tour={n.tour} className={({ isActive }) => `nav-a${isActive ? ' active' : ''}`}>
                <Icon name={n.icon} />{t(n.key)}{badge[n.to] ? <span className="nav-badge num">{badge[n.to]}</span> : null}
              </NavLink>
            ))}
          </nav>
          <div className="side-foot">
            <div className="who">{settings?.logoUrl ? <span className="av av-img"><img src={settings.logoUrl} alt="" /></span> : <span className="av">{name[0]?.toUpperCase()}</span>}<div><b>{name}</b><small>{user?.email}</small></div></div>
            <div className="side-actions">
              <ThemeButton />
              <LangButton onClick={() => setLangOpen(true)} />
              {!isDemo && <button className="icon-btn" type="button" aria-label={t('nav.signOut')} onClick={signOut}><Icon name="out" /></button>}
            </div>
          </div>
        </aside>

        <header className="topbar">
          <NavLink to="/" className="brand" aria-label="Ergo"><Logo height={26} /></NavLink>
          <span style={{ flex: 1 }} />
          <LangButton onClick={() => setLangOpen(true)} />
          <NavLink to="/settings" className="icon-btn" aria-label={t('nav.settings')} data-tour="settings"><Icon name="cog" /></NavLink>
          <ThemeButton />
        </header>

        <main className="main">
          {isDemo && <div className="demo-banner"><span><b>{t('demo.banner')}</b><span className="hide-sm">{t('demo.bannerMore')}</span></span><button type="button" onClick={doReset}>{t('demo.reset')}</button></div>}
          <Outlet />
        </main>

        <nav className="bottom-nav" aria-label={t('nav.main')}>
          {NAV.slice(0, 5).map(n => (
            <NavLink key={n.to} to={n.to} end={n.end} data-tour={n.tour} className={({ isActive }) => (isActive ? 'active' : '')}>
              <Icon name={n.icon} /><span className="bn-l">{t(n.key)}</span>{badge[n.to] ? <span className="dotb" aria-label={t('nav.attn', { n: badge[n.to] })} /> : null}
            </NavLink>
          ))}
        </nav>
      </div>
      <LangDialog open={langOpen} onClose={() => setLangOpen(false)} />
    </>
  );
}
