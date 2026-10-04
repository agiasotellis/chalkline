import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useData } from '../lib/data.jsx';
import { useAuth } from '../lib/auth.jsx';
import { useToast } from '../lib/toast.jsx';
import { isDemo } from '../lib/store/index.js';
import { Icon } from '../components/ui.jsx';

export default function Settings() {
  const { settings, saveSettings } = useData();
  const { user, signOut } = useAuth();
  const toast = useToast();
  const [f, setF] = useState(settings || {});
  const [busy, setBusy] = useState(false);
  useEffect(() => { if (settings) setF(settings); }, [settings]);
  const inp = (k, label, props = {}) => (
    <div className="field"><label htmlFor={`s-${k}`}>{label}</label><input className="inp" id={`s-${k}`} value={f[k] ?? ''} onChange={e => setF({ ...f, [k]: e.target.value })} {...props} /></div>
  );
  const save = async e => {
    e.preventDefault(); setBusy(true);
    try {
      await saveSettings({ ...f, vatRate: Number(f.vatRate) || 0, paymentTermsDays: parseInt(f.paymentTermsDays, 10) || 14, quoteValidDays: parseInt(f.quoteValidDays, 10) || 30 });
      toast('Settings saved');
    } catch (er) { toast(er.message, 'bad'); } finally { setBusy(false); }
  };
  return (
    <div className="page">
      <div className="page-head"><div><h1>Settings</h1><p>These details appear on your quotes and invoices.</p></div></div>
      <form onSubmit={save} style={{ display: 'flex', flexDirection: 'column', gap: 16 }} noValidate>
        <section className="panel" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div className="panel-h" style={{ marginBottom: 0 }}><h2>Business</h2></div>
          <div className="grid2">{inp('businessName', 'Business name')}{inp('ownerName', 'Your name')}</div>
          <div className="grid2">{inp('email', 'Email', { type: 'email' })}{inp('phone', 'Phone', { type: 'tel' })}</div>
          <div className="grid2">{inp('address', 'Business address')}{inp('vatNumber', 'VAT number')}</div>
        </section>
        <section className="panel" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div className="panel-h" style={{ marginBottom: 0 }}><h2>Quotes and invoices</h2></div>
          <div className="grid2">
            {inp('vatRate', 'Default VAT %', { type: 'number', min: 0, max: 30 })}
            {inp('paymentTermsDays', 'Payment due after (days)', { type: 'number', min: 0 })}
            {inp('quoteValidDays', 'Quotes valid for (days)', { type: 'number', min: 1 })}
          </div>
          <div className="field"><label htmlFor="s-bank">How customers pay you</label><textarea className="inp" id="s-bank" value={f.bankDetails ?? ''} onChange={e => setF({ ...f, bankDetails: e.target.value })} placeholder="Bank name, IBAN, account name" /></div>
          <button className="btn btn-chalk" type="submit" disabled={busy} style={{ alignSelf: 'flex-start' }}>Save settings</button>
        </section>
      </form>
      <section className="panel">
        <ul className="rows">
          <li><Link className="row" to="/prices"><span className="r-t">Price list</span><span className="r-r"><Icon name="chev" style={{ width: 18, height: 18, stroke: 'var(--muted)', fill: 'none', strokeWidth: 2 }} /></span><span className="r-s">Saved items for faster quotes</span></Link></li>
          <li><Link className="row" to="/customers"><span className="r-t">Customers</span><span className="r-r"><Icon name="chev" style={{ width: 18, height: 18, stroke: 'var(--muted)', fill: 'none', strokeWidth: 2 }} /></span><span className="r-s">Contacts and job history</span></Link></li>
        </ul>
      </section>
      <section className="panel" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div className="panel-h" style={{ marginBottom: 0 }}><h2>Account</h2></div>
        {isDemo
          ? <p className="note">You’re in demo mode. Connect Supabase to sign in and keep your data safely online. The README explains how.</p>
          : <><p className="note">Signed in as {user?.email}</p><button className="btn btn-ghost" style={{ alignSelf: 'flex-start' }} onClick={signOut}><Icon name="out" />Sign out</button></>}
      </section>
    </div>
  );
}
