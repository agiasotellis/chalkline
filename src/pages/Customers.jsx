import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useData } from '../lib/data.jsx';
import { useToast } from '../lib/toast.jsx';
import { eur, fmtShort } from '../lib/format.js';
import { ref, totals } from '../lib/workflow.js';
import { Confirm, Icon, Modal, Pill } from '../components/ui.jsx';

function CustomerForm({ value, onChange }) {
  const f = (k, label, type = 'text') => (
    <div className="field"><label htmlFor={`c-${k}`}>{label}</label><input className="inp" id={`c-${k}`} type={type} value={value[k] || ''} onChange={e => onChange({ ...value, [k]: e.target.value })} /></div>
  );
  return (
    <>
      {f('name', 'Name')}
      <div className="grid2">{f('email', 'Email', 'email')}{f('phone', 'Phone', 'tel')}</div>
      {f('address', 'Site address')}
      <div className="field"><label htmlFor="c-notes">Notes</label><textarea className="inp" id="c-notes" value={value.notes || ''} onChange={e => onChange({ ...value, notes: e.target.value })} placeholder="Gate code, parking, pets…" /></div>
    </>
  );
}

export function Customers() {
  const { customers, work, saveCustomer } = useData();
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
  const list = customers.filter(c => [c.name, c.email, c.address].join(' ').toLowerCase().includes(q.toLowerCase())).sort((a, b) => a.name.localeCompare(b.name));
  const add = async () => {
    if (!form.name?.trim()) return setErr('Add a name.');
    try { const c = await saveCustomer({ ...form, name: form.name.trim() }); setOpen(false); setForm({}); toast(`${c.name} added`); nav(`/customers/${c.id}`); }
    catch (e) { setErr(e.message); }
  };
  return (
    <div className="page">
      <div className="page-head">
        <div><h1>Customers</h1><p>{customers.length} customer{customers.length === 1 ? '' : 's'}</p></div>
        <div className="head-actions"><button className="btn btn-chalk" onClick={() => { setErr(''); setOpen(true); }}><Icon name="plus" />Add customer</button></div>
      </div>
      <div className="toolbar"><label className="search"><Icon name="search" /><input className="inp" id="cust-search" placeholder="Search customers" value={q} onChange={e => setQ(e.target.value)} aria-label="Search customers" /></label></div>
      <section className="panel">
        {list.length ? (
          <ul className="rows">
            {list.map(c => { const s = stats(c.id); return (
              <li key={c.id}><Link className="row" to={`/customers/${c.id}`}>
                <span className="r-t">{c.name}</span>
                <span className="r-r"><span className="r-amt num">{eur(s.paid)}</span><span className="r-s num">{s.n} job{s.n === 1 ? '' : 's'}</span></span>
                <span className="r-s">{[c.address, c.phone].filter(Boolean).join(' · ') || c.email}</span>
              </Link></li>
            ); })}
          </ul>
        ) : <div className="empty">{q ? `No customers match “${q}”.` : 'No customers yet. They’re added when you write a quote, or here.'}</div>}
      </section>
      <Modal open={open} title="Add customer" onClose={() => setOpen(false)}
        footer={<><button className="btn btn-ghost" onClick={() => setOpen(false)}>Cancel</button><button className="btn btn-chalk" onClick={add}>Add customer</button></>}>
        <CustomerForm value={form} onChange={setForm} />
        {err && <p className="err">{err}</p>}
      </Modal>
    </div>
  );
}

export function CustomerDetail() {
  const { id } = useParams();
  const { customers, work, saveCustomer, deleteCustomer } = useData();
  const toast = useToast();
  const nav = useNavigate();
  const c = customers.find(x => x.id === id);
  const [form, setForm] = useState(null);
  const [confirm, setConfirm] = useState(false);
  if (!c) return <div className="page"><div className="panel empty">This customer doesn’t exist.<Link className="btn btn-ghost btn-sm" to="/customers">All customers</Link></div></div>;
  const mine = work.filter(w => w.customerId === id).sort((a, b) => b.no - a.no);
  const paid = mine.filter(w => w.stage === 'paid').reduce((a, w) => a + totals(w).total, 0);
  const owed = mine.filter(w => w.stage === 'invoiced').reduce((a, w) => a + totals(w).total, 0);
  const save = async () => { if (!form.name?.trim()) return; await saveCustomer(form); setForm(null); toast('Customer saved'); };

  return (
    <div className="page">
      <div className="page-head">
        <div><Link to="/customers" className="muted" style={{ textDecoration: 'none', fontSize: 14 }}>Customers</Link><h1 style={{ marginTop: 6 }}>{c.name}</h1><p>{[c.address, c.phone, c.email].filter(Boolean).join(' · ')}</p></div>
        <div className="head-actions">
          <Link className="btn btn-chalk" to={`/quotes/new?customer=${c.id}`}><Icon name="plus" />New quote</Link>
          <button className="btn btn-ghost" onClick={() => setForm({ ...c })}><Icon name="edit" />Edit</button>
        </div>
      </div>
      <div className="kpis" style={{ gridTemplateColumns: 'repeat(auto-fit,minmax(min(100%,160px),1fr))' }}>
        <div className="kpi"><small>Jobs</small><b className="num">{mine.length}</b></div>
        <div className="kpi"><small>Paid to date</small><b className="num">{eur(paid)}</b></div>
        <div className={`kpi${owed ? ' k-bad' : ''}`}><small>Owed</small><b className="num">{eur(owed)}</b></div>
      </div>
      {c.notes && <section className="panel"><div className="panel-h"><h2>Notes</h2></div><p style={{ whiteSpace: 'pre-wrap' }}>{c.notes}</p></section>}
      <section className="panel">
        <div className="panel-h"><h2>Work history</h2></div>
        {mine.length ? (
          <ul className="rows">
            {mine.map(w => (
              <li key={w.id}><Link className="row" to={`/work/${w.id}`}>
                <span className="r-t">{w.title}</span>
                <span className="r-r"><span className="r-amt num">{eur(totals(w).total)}</span><Pill work={w} /></span>
                <span className="r-s num">{ref(w)} · {fmtShort(w.createdAt)}</span>
              </Link></li>
            ))}
          </ul>
        ) : <div className="empty">No work for {c.name} yet.</div>}
      </section>
      {!mine.length && <button className="btn btn-danger" style={{ alignSelf: 'flex-start' }} onClick={() => setConfirm(true)}>Delete customer</button>}

      <Modal open={!!form} title="Edit customer" onClose={() => setForm(null)}
        footer={<><button className="btn btn-ghost" onClick={() => setForm(null)}>Cancel</button><button className="btn btn-chalk" onClick={save}>Save customer</button></>}>
        {form && <CustomerForm value={form} onChange={setForm} />}
      </Modal>
      <Confirm open={confirm} title={`Delete ${c.name}?`} body="Their details will be removed. This can’t be undone." confirmLabel="Delete customer" danger
        onConfirm={async () => { await deleteCustomer(c.id); toast('Customer deleted'); nav('/customers'); }} onClose={() => setConfirm(false)} />
    </div>
  );
}
