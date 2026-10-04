import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useData } from '../lib/data.jsx';
import { useToast } from '../lib/toast.jsx';
import { eur } from '../lib/format.js';
import { totals, transitions } from '../lib/workflow.js';
import { Icon } from '../components/ui.jsx';

const UNITS = ['ea', 'hr', 'm', 'm²', 'day', 'kg', 'l'];
const blank = () => ({ desc: '', qty: 1, unit: 'ea', rate: 0, key: Math.random() });

function PricePicker({ prices, onPick }) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const ref = useRef(null);
  useEffect(() => {
    const h = e => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('pointerdown', h); return () => document.removeEventListener('pointerdown', h);
  }, []);
  const list = prices.filter(p => p.description.toLowerCase().includes(q.toLowerCase()));
  return (
    <div className="pick" ref={ref}>
      <button type="button" className="btn btn-ghost btn-sm" onClick={() => setOpen(o => !o)} aria-expanded={open}><Icon name="tag" />From price list</button>
      {open && (
        <div className="pick-menu" role="listbox">
          <input className="inp" id="price-filter" autoFocus placeholder="Search your prices" value={q} onChange={e => setQ(e.target.value)} style={{ marginBottom: 6 }} />
          {list.length ? list.map(p => (
            <button type="button" key={p.id} onClick={() => { onPick(p); setOpen(false); setQ(''); }}>
              <span>{p.description}</span><span className="muted num">{eur(p.rate)} / {p.unit}</span>
            </button>
          )) : <p className="note" style={{ padding: 10 }}>No saved prices match. Add them under Price list.</p>}
        </div>
      )}
    </div>
  );
}

export default function Editor() {
  const { id } = useParams();
  const { work, customers, prices, settings, saveWork, saveCustomer } = useData();
  const toast = useToast();
  const nav = useNavigate();
  const existing = id ? work.find(w => w.id === id) : null;
  const [params] = useSearchParams();

  const [title, setTitle] = useState(existing?.title || '');
  const [customerId, setCustomerId] = useState(existing?.customerId || params.get('customer') || '');
  const [newCust, setNewCust] = useState({ name: '', email: '', phone: '', address: '' });
  const [items, setItems] = useState(existing ? existing.items.map(i => ({ ...i, key: Math.random() })) : [blank()]);
  const [vat, setVat] = useState(existing?.vat ?? settings?.vatRate ?? 24);
  const [notes, setNotes] = useState(existing?.notes || '');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  if (id && !existing) return <div className="page"><div className="panel empty">This quote doesn’t exist.<Link className="btn btn-ghost btn-sm" to="/quotes">Back to quotes</Link></div></div>;
  if (existing && !['draft', 'sent'].includes(existing.stage)) return <div className="page"><div className="panel empty">Approved quotes can’t be edited, so the customer’s approval stays valid.<Link className="btn btn-ghost btn-sm" to={`/work/${existing.id}`}>Back</Link></div></div>;

  const setItem = (k, patch) => setItems(list => list.map(i => (i.key === k ? { ...i, ...patch } : i)));
  const draft = { items, vat };
  const t = totals(draft);
  const isNewCust = customerId === '__new';

  const submit = async (send) => {
    setErr('');
    const clean = items.filter(i => i.desc.trim()).map(({ key, ...i }) => ({ ...i, desc: i.desc.trim(), qty: Number(i.qty) || 0, rate: Number(i.rate) || 0 }));
    if (!title.trim()) return setErr('Add a job title so you can find this quote later.');
    if (!customerId) return setErr('Choose a customer, or add a new one.');
    if (isNewCust && !newCust.name.trim()) return setErr('Add the new customer’s name.');
    if (!clean.length) return setErr('Add at least one line with a description.');
    setBusy(true);
    try {
      let cid = customerId;
      if (isNewCust) cid = (await saveCustomer({ ...newCust, name: newCust.name.trim() })).id;
      const payload = { title: title.trim(), customerId: cid, items: clean, vat: Number(vat) || 0, notes };
      if (existing) Object.assign(payload, { id: existing.id }, existing.stage === 'sent' ? { changeRequest: null } : {});
      if (send && (!existing || existing.stage === 'draft')) Object.assign(payload, transitions.send());
      const w = await saveWork(payload);
      toast(send ? `Quote Q-${w.no} sent` : existing ? `Q-${w.no} saved` : `Draft Q-${w.no} saved`);
      nav(`/work/${w.id}`, { replace: true });
    } catch (e) { setErr(e.message); } finally { setBusy(false); }
  };

  return (
    <div className="page">
      <div className="page-head">
        <div><h1>{existing ? `Edit Q-${existing.no}` : 'New quote'}</h1><p>{existing?.stage === 'sent' ? 'Your customer will see the changes on the same link.' : 'Save as a draft or send it straight away.'}</p></div>
      </div>
      <form className="editor" onSubmit={e => { e.preventDefault(); submit(false); }} noValidate>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, minWidth: 0 }}>
          <section className="panel" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div className="field"><label htmlFor="q-title">Job title</label><input className="inp" id="q-title" value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Replace kitchen mixer tap" /></div>
            <div className="field">
              <label htmlFor="q-cust">Customer</label>
              <select className="inp" id="q-cust" value={customerId} onChange={e => setCustomerId(e.target.value)}>
                <option value="">Choose a customer</option>
                <option value="__new">+ Add a new customer</option>
                {[...customers].sort((a, b) => a.name.localeCompare(b.name)).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            {isNewCust && (
              <div className="grid2" style={{ padding: 14, background: 'var(--surface)', borderRadius: 12, animation: 'rise .3s both' }}>
                <div className="field"><label htmlFor="nc-name">Name</label><input className="inp" id="nc-name" value={newCust.name} onChange={e => setNewCust({ ...newCust, name: e.target.value })} /></div>
                <div className="field"><label htmlFor="nc-email">Email</label><input className="inp" id="nc-email" type="email" value={newCust.email} onChange={e => setNewCust({ ...newCust, email: e.target.value })} /></div>
                <div className="field"><label htmlFor="nc-phone">Phone</label><input className="inp" id="nc-phone" type="tel" value={newCust.phone} onChange={e => setNewCust({ ...newCust, phone: e.target.value })} /></div>
                <div className="field"><label htmlFor="nc-addr">Site address</label><input className="inp" id="nc-addr" value={newCust.address} onChange={e => setNewCust({ ...newCust, address: e.target.value })} /></div>
              </div>
            )}
          </section>

          <section className="panel" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div className="panel-h" style={{ marginBottom: 0 }}><h2>Line items</h2><PricePicker prices={prices} onPick={p => setItems(list => [...list.filter(i => i.desc.trim()), { desc: p.description, qty: 1, unit: p.unit, rate: p.rate, key: Math.random() }])} /></div>
            <div className="li-head"><span>Description</span><span>Qty</span><span>Unit</span><span>Rate €</span><span style={{ textAlign: 'right' }}>Amount</span><span /></div>
            <div className="lines">
              {items.map(i => (
                <div className="li-row" key={i.key}>
                  <input className="inp desc" id={`d-${i.key}`} aria-label="Description" placeholder="What you’ll do or supply" value={i.desc} onChange={e => setItem(i.key, { desc: e.target.value })} />
                  <label className="li-f"><span>Qty</span><input className="inp" id={`q-${i.key}`} aria-label="Quantity" type="number" inputMode="decimal" min="0" step="0.5" value={i.qty} onChange={e => setItem(i.key, { qty: e.target.value })} /></label>
                  <label className="li-f"><span>Unit</span><select className="inp" id={`u-${i.key}`} aria-label="Unit" value={i.unit} onChange={e => setItem(i.key, { unit: e.target.value })}>{UNITS.map(u => <option key={u}>{u}</option>)}</select></label>
                  <label className="li-f"><span>Rate €</span><input className="inp" id={`r-${i.key}`} aria-label="Rate in euros" type="number" inputMode="decimal" min="0" step="0.5" value={i.rate} onChange={e => setItem(i.key, { rate: e.target.value })} /></label>
                  <span className="li-amt">{eur((Number(i.qty) || 0) * (Number(i.rate) || 0))}</span>
                  <button className="rm" type="button" aria-label="Remove line" onClick={() => setItems(list => (list.length > 1 ? list.filter(x => x.key !== i.key) : [blank()]))}>×</button>
                </div>
              ))}
            </div>
            <button type="button" className="btn btn-ghost btn-sm" style={{ alignSelf: 'flex-start' }} onClick={() => setItems(l => [...l, blank()])}><Icon name="plus" />Add line</button>
          </section>

          <section className="panel field">
            <label htmlFor="q-notes">Notes for the customer</label>
            <textarea className="inp" id="q-notes" value={notes} onChange={e => setNotes(e.target.value)} placeholder="e.g. Price includes removal of old fittings. Parking needed on the day." />
          </section>
        </div>

        <aside className="sticky-sum">
          <section className="panel" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div className="field"><label htmlFor="q-vat">VAT %</label><input className="inp" id="q-vat" type="number" min="0" max="30" value={vat} onChange={e => setVat(e.target.value)} /></div>
            <div className="totals" style={{ justifyContent: 'stretch', gridTemplateColumns: '1fr auto' }}>
              <span>Subtotal</span><span>{eur(t.sub)}</span><span>VAT</span><span>{eur(t.vat)}</span>
              <span className="grand">Total</span><span className="grand">{eur(t.total)}</span>
            </div>
            {err && <p className="err" role="alert">{err}</p>}
            {(!existing || existing.stage === 'draft') && <button className="btn btn-chalk" type="button" disabled={busy} onClick={() => submit(true)}><Icon name="send" />Save and send</button>}
            <button className={`btn ${existing?.stage === 'sent' ? 'btn-chalk' : 'btn-ghost'}`} type="submit" disabled={busy}>{existing?.stage === 'sent' ? 'Save changes' : 'Save draft'}</button>
            <Link className="btn btn-ghost" to={existing ? `/work/${existing.id}` : '/quotes'} style={{ boxShadow: 'none' }}>Cancel</Link>
          </section>
        </aside>
      </form>
    </div>
  );
}
