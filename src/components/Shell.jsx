import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { Icon, Logo, ThemeButton } from './ui.jsx';
import { useAuth } from '../lib/auth.jsx';
import { useData } from '../lib/data.jsx';
import { isDemo } from '../lib/store/index.js';
import { isOverdue } from '../lib/workflow.js';
import { useToast } from '../lib/toast.jsx';

const NAV = [
  { to: '/', label: 'Home', icon: 'home', end: true },
  { to: '/quotes', label: 'Quotes', icon: 'quote', tour: 'flow' },
  { to: '/jobs', label: 'Jobs', icon: 'job', tour: 'flow' },
  { to: '/invoices', label: 'Invoices', icon: 'invoice', tour: 'flow' },
  { to: '/customers', label: 'Customers', icon: 'users' },
  { to: '/prices', label: 'Price list', icon: 'tag' },
  { to: '/settings', label: 'Settings', icon: 'cog', tour: 'settings' }
];

export default function Shell() {
  const { user, signOut } = useAuth();
  const { work, settings, reset } = useData();
  const nav = useNavigate();
  const toast = useToast();
  const badge = {
    '/quotes': work.filter(w => w.stage === 'approved').length,
    '/jobs': work.filter(w => w.stage === 'done').length,
    '/invoices': work.filter(isOverdue).length
  };
  const name = settings?.businessName || 'My business';
  const doReset = async () => {
    try { localStorage.removeItem(`chalkline.tourDone.${user?.id}`); } catch { /* ignore */ }
    await reset(); toast('Example data restored'); nav('/');
  };

  return (
    <>
      <div className="shell">
        <aside className="side">
          <NavLink to="/" className="brand"><Logo />Chalkline</NavLink>
          <nav className="side-nav" aria-label="Main">
            {NAV.map(n => (
              <NavLink key={n.to} to={n.to} end={n.end} data-tour={n.tour} className={({ isActive }) => `nav-a${isActive ? ' active' : ''}`}>
                <Icon name={n.icon} />{n.label}{badge[n.to] ? <span className="nav-badge num">{badge[n.to]}</span> : null}
              </NavLink>
            ))}
          </nav>
          <div className="side-foot">
            <div className="who">{settings?.logoUrl ? <span className="av av-img"><img src={settings.logoUrl} alt="" /></span> : <span className="av">{name[0]?.toUpperCase()}</span>}<div><b>{name}</b><small>{user?.email}</small></div></div>
            <div className="side-actions">
              <ThemeButton />
              {!isDemo && <button className="icon-btn" type="button" aria-label="Sign out" onClick={signOut}><Icon name="out" /></button>}
            </div>
          </div>
        </aside>

        <header className="topbar">
          <NavLink to="/" className="brand"><Logo />Chalkline</NavLink>
          <span style={{ flex: 1 }} />
          <NavLink to="/settings" className="icon-btn" aria-label="Settings" data-tour="settings"><Icon name="cog" /></NavLink>
          <ThemeButton />
        </header>

        <main className="main">
          {isDemo && <div className="demo-banner"><span><b>Demo mode</b><span className="hide-sm">: example data, saved only in this browser</span></span><button type="button" onClick={doReset}>Reset examples</button></div>}
          <Outlet />
        </main>

        <nav className="bottom-nav" aria-label="Main">
          {NAV.slice(0, 5).map(n => (
            <NavLink key={n.to} to={n.to} end={n.end} data-tour={n.tour} className={({ isActive }) => (isActive ? 'active' : '')}>
              <Icon name={n.icon} />{n.label}{badge[n.to] ? <span className="dotb" aria-label={`${badge[n.to]} need attention`} /> : null}
            </NavLink>
          ))}
        </nav>
      </div>
    </>
  );
}
