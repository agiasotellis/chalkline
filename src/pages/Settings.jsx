import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import LogoUpload from '../components/LogoUpload.jsx';
import { useData } from '../lib/data.jsx';
import { useAuth } from '../lib/auth.jsx';
import { useToast } from '../lib/toast.jsx';
import { useT } from '../lib/i18n.jsx';
import { isDemo, store } from '../lib/store/index.js';
import { FlagGR, FlagUS, Icon } from '../components/ui.jsx';

const Chev = () => <Icon name="chev" style={{ width: 18, height: 18, stroke: 'var(--muted)', fill: 'none', strokeWidth: 2 }} />;

export default function Settings() {
  const { settings, saveSettings } = useData();
  const { user, signOut } = useAuth();
  const { t, lang, setLang } = useT();
  const toast = useToast();
  const [f, setF] = useState(settings || {});
  const [busy, setBusy] = useState(false);
  const [emailOn, setEmailOn] = useState(null);
  useEffect(() => { store.emailReady?.().then(setEmailOn).catch(() => setEmailOn(false)); }, []);
  const nav = useNavigate();
  // Logo, tour and language save on their own; don't wipe unsaved edits in the form.
  useEffect(() => { if (settings) setF(prev => ({ ...prev, logoUrl: settings.logoUrl, tourDone: settings.tourDone, locale: settings.locale })); }, [settings]);
  const replayTour = async () => {
    try { localStorage.removeItem(`chalkline.tourDone.${user?.id}`); } catch { /* ignore */ }
    await saveSettings({ tourDone: false }).catch(() => {});
    nav('/');
  };
  const inp = (k, label, props = {}) => (
    <div className="field"><label htmlFor={`s-${k}`}>{label}</label><input className="inp" id={`s-${k}`} value={f[k] ?? ''} onChange={e => setF({ ...f, [k]: e.target.value })} {...props} /></div>
  );
  const save = async e => {
    e.preventDefault(); setBusy(true);
    try {
      await saveSettings({ ...f, vatRate: Number(f.vatRate) || 0, paymentTermsDays: parseInt(f.paymentTermsDays, 10) || 14, quoteValidDays: parseInt(f.quoteValidDays, 10) || 30 });
      toast(t('se.saved'));
    } catch (er) { toast(er.message, 'bad'); } finally { setBusy(false); }
  };
  return (
    <div className="page">
      <div className="page-head"><div><h1>{t('se.title')}</h1><p>{t('se.sub')}</p></div></div>
      <section className="panel" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div className="panel-h" style={{ marginBottom: 0 }}><h2>{t('se.lang')}</h2></div>
        <p className="note">{t('se.langSub')}</p>
        <div className="lang-opts" style={{ gridTemplateColumns: 'repeat(auto-fit,minmax(min(100%,220px),1fr))' }}>
          <button type="button" className={`lang-opt${lang === 'en' ? ' on' : ''}`} aria-pressed={lang === 'en'} onClick={() => setLang('en')} lang="en"><FlagUS /><span><b>{t('lang.us')}</b><small>{t('lang.usSub')}</small></span></button>
          <button type="button" className={`lang-opt${lang === 'el' ? ' on' : ''}`} aria-pressed={lang === 'el'} onClick={() => setLang('el')} lang="el"><FlagGR /><span><b>{t('lang.gr')}</b><small>{t('lang.grSub')}</small></span></button>
        </div>
      </section>
      <form onSubmit={save} style={{ display: 'flex', flexDirection: 'column', gap: 16 }} noValidate>
        <section className="panel" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div className="panel-h" style={{ marginBottom: 0 }}><h2>{t('se.business')}</h2></div>
          <LogoUpload />
          <div className="grid2">{inp('businessName', t('se.bizName'))}{inp('ownerName', t('se.yourName'))}</div>
          <div className="grid2">{inp('email', t('se.email'), { type: 'email' })}{inp('phone', t('se.phone'), { type: 'tel' })}</div>
          <div className="grid2">{inp('address', t('se.address'))}{inp('vatNumber', t('taxId'))}</div>
        </section>
        <section className="panel" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div className="panel-h" style={{ marginBottom: 0 }}><h2>{t('se.qi')}</h2></div>
          <div className="grid2">
            {inp('vatRate', t('se.taxRate'), { type: 'number', min: 0, max: 30, step: 0.01 })}
            {inp('paymentTermsDays', t('se.terms'), { type: 'number', min: 0 })}
            {inp('quoteValidDays', t('se.valid'), { type: 'number', min: 1 })}
          </div>
          <div className="field"><label htmlFor="s-bank">{t('se.bank')}</label><textarea className="inp" id="s-bank" value={f.bankDetails ?? ''} onChange={e => setF({ ...f, bankDetails: e.target.value })} placeholder={t('se.bankPh')} /></div>
          <button className="btn btn-chalk" type="submit" disabled={busy} style={{ alignSelf: 'flex-start' }}>{t('se.save')}</button>
        </section>
      </form>
      <section className="panel">
        <ul className="rows">
          <li><Link className="row" to="/plan"><span className="r-t">{t('se.plan')}</span><span className="r-r"><Chev /></span><span className="r-s">{t('se.planSub')}</span></Link></li>
          <li><Link className="row" to="/prices"><span className="r-t">{t('se.prices')}</span><span className="r-r"><Chev /></span><span className="r-s">{t('se.pricesSub')}</span></Link></li>
          <li><button type="button" className="row" onClick={replayTour} style={{ width: '100%', border: 0, background: 'none', textAlign: 'left', cursor: 'pointer' }}><span className="r-t">{t('se.tour')}</span><span className="r-r"><Chev /></span><span className="r-s">{t('se.tourSub')}</span></button></li>
          <li><Link className="row" to="/customers"><span className="r-t">{t('se.customers')}</span><span className="r-r"><Chev /></span><span className="r-s">{t('se.customersSub')}</span></Link></li>
        </ul>
      </section>
      <section className="panel" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div className="panel-h" style={{ marginBottom: 0 }}><h2>{t('se.emails')}</h2>{emailOn !== null && <span className={`pill ${emailOn ? 't-ok' : 't-muted'}`}>{emailOn ? t('se.on') : t('se.off')}</span>}</div>
        <p className="note">{isDemo ? t('se.emailDemo') : emailOn ? t('se.emailOn', { email: f.email || t('se.theEmail') }) : t('se.emailOff')}</p>
      </section>
      <section className="panel" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div className="panel-h" style={{ marginBottom: 0 }}><h2>{t('se.account')}</h2></div>
        {isDemo
          ? <p className="note">{t('se.demoAcc')}</p>
          : <><p className="note">{t('se.signedIn', { email: user?.email })}</p><button className="btn btn-ghost" style={{ alignSelf: 'flex-start' }} onClick={signOut}><Icon name="out" />{t('nav.signOut')}</button></>}
      </section>
    </div>
  );
}
