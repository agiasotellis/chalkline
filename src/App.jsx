import { useState } from 'react';
import { HashRouter, Navigate, Route, Routes } from 'react-router-dom';
import { I18nProvider, useT } from './lib/i18n.jsx';
import { storedLang } from './lib/i18n-core.js';
import { isDemo } from './lib/store/index.js';
import { LangDialog } from './components/ui.jsx';
import { AuthProvider, useAuth } from './lib/auth.jsx';
import { DataProvider, useData } from './lib/data.jsx';
import { ToastProvider } from './lib/toast.jsx';
import Shell from './components/Shell.jsx';
import Dashboard from './pages/Dashboard.jsx';
import WorkList from './pages/WorkList.jsx';
import WorkDetail from './pages/WorkDetail.jsx';
import Editor from './pages/Editor.jsx';
import { Customers, CustomerDetail } from './pages/Customers.jsx';
import Prices from './pages/Prices.jsx';
import Settings from './pages/Settings.jsx';
import Login, { SetPassword } from './pages/Login.jsx';
import PublicQuote from './pages/PublicQuote.jsx';

function Loaded({ children }) {
  const { loading, error, reload } = useData();
  const { t } = useT();
  if (loading) return <div className="loading"><div className="spin" aria-label="Loading" /></div>;
  if (error) return (
    <div className="loading"><div className="panel empty" style={{ maxWidth: 420 }}>
      <b>{t('app.loadErr')}</b><span>{error}</span><span>{t('app.checkConn')}</span>
      <button className="btn btn-chalk btn-sm" onClick={reload}>{t('app.retry')}</button>
    </div></div>
  );
  return children;
}

function Private() {
  const { user, recovery } = useAuth();
  const { lang } = useT();
  const [askLang, setAskLang] = useState(() => !storedLang());
  if (recovery) return <SetPassword />;
  if (user === undefined) return <div className="loading"><div className="spin" aria-label="Loading" /></div>;
  if (!user) return <Login />;
  return (
    <>
    <DataProvider key={isDemo ? `${user.id}-${lang}` : user.id}>
      <Loaded>
        <Routes>
          <Route element={<Shell />}>
            <Route index element={<Dashboard />} />
            <Route path="quotes" element={<WorkList group="quotes" />} />
            <Route path="quotes/new" element={<Editor />} />
            <Route path="jobs" element={<WorkList group="jobs" />} />
            <Route path="invoices" element={<WorkList group="invoices" />} />
            <Route path="work/:id" element={<WorkDetail />} />
            <Route path="work/:id/edit" element={<Editor />} />
            <Route path="customers" element={<Customers />} />
            <Route path="customers/:id" element={<CustomerDetail />} />
            <Route path="prices" element={<Prices />} />
            <Route path="settings" element={<Settings />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </Loaded>
    </DataProvider>
    <LangDialog open={askLang} required onClose={() => setAskLang(false)} />
    </>
  );
}

export default function App() {
  return (
    <I18nProvider>
    <HashRouter>
      <ToastProvider>
        <AuthProvider>
          <Routes>
            <Route path="/q/:token" element={<PublicQuote />} />
            <Route path="/*" element={<Private />} />
          </Routes>
        </AuthProvider>
      </ToastProvider>
    </HashRouter>
    </I18nProvider>
  );
}
