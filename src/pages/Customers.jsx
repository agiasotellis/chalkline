import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useData } from '../lib/data.jsx';
import { useToast } from '../lib/toast.jsx';
import { useT } from '../lib/i18n.jsx';
import { money, fmtShort } from '../lib/format.js';
import { ref, totals } from '../lib/workflow.js';
import { Confirm, Icon, Modal, Pill } from '../components/ui.jsx';

function CustomerForm({ value, onChange }) {
  const { t } = useT();
  const f = (k, label, type = 'text') => (
    <div className="field"><label htmlFor={`c-${k}`}>{label}</label><input className="inp" id={`c-${k}`} type={type} value={value[k] || ''} onChange={e => onChange({ ...value, [k]: e.target.value })} /></div>
  );
  return (
    <>
      {f('name', t('cu.name'))}
      <div className="grid2">{f('email', t('cu.email'), 'email')}{f('phone', t('cu.phone'), 'tel')}</div>
      {f('address', t('cu.site'))}
      <div className="field"><label htmlFor="c-notes">{t('cu.notes')}</label><textarea className="inp" id="c-notes" value={value.notes || ''} onChange={e => onChange({ ...value, notes: e.target.value })} placeholder={t('cu.notesPh')} /></div>
    </>
  );
}

export function Customers() {
  const { customers, work, saveCustomer } = useData();
  const { t, locale } = useT();
  const toast = useToast();
  const nav = useNavigate();
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({});
  const [err, setErr] = useState('');
  const stats = id => {
    const mine = work.filter(w => w.customerId === id);
    return { n: mine.length, paid: mine.filter(w => w.stage === 'paid').reduce((a, w) => a + totals(w).total, 0) };
  };
  const list = customers.filter(c => [c.name, c.email, c.address].join(' ').toLowerCase().includes(q.toLowerCase())).sort((a, b) => a.name.localeCompare(b.name, locale.intl));
  const add = async () => {
    if (!form.name?.trim()) return setErr(t('cu.errName'));
    try { const c = await saveCustomer({ ...form, name: form.name.trim() }); setOpen(false); setForm({}); toast(t('cu.added', { name: c.name })); nav(`/customers/${c.id}`); }
    catch (e) { setErr(e.message); }
  };
  return (
    <div className="page">
      <div className="page-head">
        <div><h1>{t('cu.title')}</h1><p>{t('cu.count', { n: customers.length })}</p></div>
        <div className="head-actions"><button className="btn btn-chalk" onClick={() => { setErr(''); setOpen(true); }}><Icon name="plus" />{t('cu.add')}</button></div>
      </div>
      <div className="toolbar"><label className="search"><Icon name="search" /><input className="inp" id="cust-search" placeholder={t('cu.search')} value={q} onChange={e => setQ(e.target.value)} aria-label={t('cu.search')} /></label></div>
      <section className="panel">
        {list.length ? (
          <ul className="rows">
            {list.map(c => { const s = stats(c.id); return (
              <li key={c.id}><Link className="row" to={`/customers/${c.id}`}>
                <span className="r-t">{c.name}</span>
                <span className="r-r"><span className="r-amt num">{money(s.paid)}</span><span className="r-s num">{t('cu.jobs', { n: s.n })}</span></span>
                <span className="r-s">{[c.address, c.phone].filter(Boolean).join(' · ') || c.email}</span>
              </Link></li>
            ); })}
          </ul>
        ) : <div className="empty">{q ? t('cu.noMatch', { q }) : t('cu.empty')}</div>}
      </section>
      <Modal open={open} title={t('cu.add')} onClose={() => setOpen(false)}
        footer={<><button className="btn btn-ghost" onClick={() => setOpen(false)}>{t('c.cancel')}</button><button className="btn btn-chalk" onClick={add}>{t('cu.add')}</button></>}>
        <CustomerForm value={form} onChange={setForm} />
        {err && <p className="err">{err}</p>}
      </Modal>
    </div>
  );
}

export function CustomerDetail() {
  const { id } = useParams();
  const { customers, work, saveCustomer, deleteCustomer } = useData();
  const { t } = useT();
  const toast = useToast();
  const nav = useNavigate();
  const c = customers.find(x => x.id === id);
  const [form, setForm] = useState(null);
  const [confirm, setConfirm] = useState(false);
  if (!c) return <div className="page"><div className="panel empty">{t('cu.missing')}<Link className="btn btn-ghost btn-sm" to="/customers">{t('cu.all')}</Link></div></div>;
  const mine = work.filter(w => w.customerId === id).sort((a, b) => b.no - a.no);
  const paid = mine.filter(w => w.stage === 'paid').reduce((a, w) => a + totals(w).total, 0);
  const owed = mine.filter(w => w.stage === 'invoiced').reduce((a, w) => a + totals(w).total, 0);
  const save = async () => { if (!form.name?.trim()) return; await saveCustomer(form); setForm(null); toast(t('cu.saved')); };

  return (
    <div className="page">
      <div className="page-head">
        <div><Link to="/customers" className="muted" style={{ textDecoration: 'none', fontSize: 14 }}>{t('cu.title')}</Link><h1 style={{ marginTop: 6 }}>{c.name}</h1><p>{[c.address, c.phone, c.email].filter(Boolean).join(' · ')}</p></div>
        <div className="head-actions">
          <Link className="btn btn-chalk" to={`/quotes/new?customer=${c.id}`}><Icon name="plus" />{t('cu.newQuote')}</Link>
          <button className="btn btn-ghost" onClick={() => setForm({ ...c })}><Icon name="edit" />{t('c.edit')}</button>
        </div>
      </div>
      <div className="kpis" style={{ gridTemplateColumns: 'repeat(auto-fit,minmax(min(100%,160px),1fr))' }}>
        <div className="kpi"><small>{t('cu.jobsK')}</small><b className="num">{mine.length}</b></div>
        <div className="kpi"><small>{t('cu.paid')}</small><b className="num">{money(paid)}</b></div>
        <div className={`kpi${owed ? ' k-bad' : ''}`}><small>{t('cu.owed')}</small><b className="num">{money(owed)}</b></div>
      </div>
      {c.notes && <section className="panel"><div className="panel-h"><h2>{t('cu.notes')}</h2></div><p style={{ whiteSpace: 'pre-wrap' }}>{c.notes}</p></section>}
      <section className="panel">
        <div className="panel-h"><h2>{t('cu.history')}</h2></div>
        {mine.length ? (
          <ul className="rows">
            {mine.map(w => (
              <li key={w.id}><Link className="row" to={`/work/${w.id}`}>
                <span className="r-t">{w.title}</span>
                <span className="r-r"><span className="r-amt num">{money(totals(w).total)}</span><Pill work={w} /></span>
                <span className="r-s num">{ref(w)} · {fmtShort(w.createdAt)}</span>
              </Link></li>
            ))}
          </ul>
        ) : <div className="empty">{t('cu.noWork', { name: c.name })}</div>}
      </section>
      {!mine.length && <button className="btn btn-danger" style={{ alignSelf: 'flex-start' }} onClick={() => setConfirm(true)}>{t('cu.delete')}</button>}

      <Modal open={!!form} title={t('cu.editT')} onClose={() => setForm(null)}
        footer={<><button className="btn btn-ghost" onClick={() => setForm(null)}>{t('c.cancel')}</button><button className="btn btn-chalk" onClick={save}>{t('cu.saveBtn')}</button></>}>
        {form && <CustomerForm value={form} onChange={setForm} />}
      </Modal>
      <Confirm open={confirm} title={t('cu.delT', { name: c.name })} body={t('cu.delB')} confirmLabel={t('cu.delete')} danger
        onConfirm={async () => { await deleteCustomer(c.id); toast(t('cu.deleted')); nav('/customers'); }} onClose={() => setConfirm(false)} />
    </div>
  );
}
