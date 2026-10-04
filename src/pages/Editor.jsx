import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useData } from '../lib/data.jsx';
import { useToast } from '../lib/toast.jsx';
import { useT } from '../lib/i18n.jsx';
import { money, unitLabel } from '../lib/format.js';
import { totals, transitions } from '../lib/workflow.js';
import { Icon } from '../components/ui.jsx';
import { validEmail } from '../lib/links.js';
import { useSendEmail } from '../lib/useSendEmail.js';

// Units people use in each version. Stored as codes; labels come from the dictionaries.
export const UNITS = {
  en: ['ea', 'hr', 'ft', 'sqft', 'day', 'lb', 'gal'],
  el: ['ea', 'hr', 'm', 'm²', 'day', 'kg', 'l']
};
const blank = () => ({ desc: '', qty: 1, unit: 'ea', rate: 0, key: Math.random() });

function PricePicker({ prices, onPick }) {
  const { t } = useT();
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
      <button type="button" className="btn btn-ghost btn-sm" onClick={() => setOpen(o => !o)} aria-expanded={open}><Icon name="tag" />{t('ed.fromPrices')}</button>
      {open && (
        <div className="pick-menu" role="listbox">
          <input className="inp" id="price-filter" autoFocus placeholder={t('ed.searchPrices')} value={q} onChange={e => setQ(e.target.value)} style={{ marginBottom: 6 }} />
          {list.length ? list.map(p => (
            <button type="button" key={p.id} onClick={() => { onPick(p); setOpen(false); setQ(''); }}>
              <span>{p.description}</span><span className="muted num">{money(p.rate)} / {unitLabel(p.unit)}</span>
            </button>
          )) : <p className="note" style={{ padding: 10 }}>{t('ed.noPrices')}</p>}
        </div>
      )}
    </div>
  );
}

export default function Editor() {
  const { id } = useParams();
  const { work, customers, prices, settings, saveWork, saveCustomer } = useData();
  const { t, lang, locale } = useT();
  const toast = useToast();
  const nav = useNavigate();
  const existing = id ? work.find(w => w.id === id) : null;
  const [params] = useSearchParams();

  const [title, setTitle] = useState(existing?.title || '');
  const [customerId, setCustomerId] = useState(existing?.customerId || params.get('customer') || '');
  const [newCust, setNewCust] = useState({ name: '', email: '', phone: '', address: '' });
  const [items, setItems] = useState(existing ? existing.items.map(i => ({ ...i, key: Math.random() })) : [blank()]);
  const [vat, setVat] = useState(existing?.vat ?? settings?.vatRate ?? (lang === 'el' ? 24 : 0));
  const [notes, setNotes] = useState(existing?.notes || '');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const [emailIt, setEmailIt] = useState(!existing || existing.stage === 'draft');
  const sendE = useSendEmail();

  if (id && !existing) return <div className="page"><div className="panel empty">{t('ed.missing')}<Link className="btn btn-ghost btn-sm" to="/quotes">{t('ed.backQuotes')}</Link></div></div>;
  if (existing && !['draft', 'sent'].includes(existing.stage)) return <div className="page"><div className="panel empty">{t('ed.locked')}<Link className="btn btn-ghost btn-sm" to={`/work/${existing.id}`}>{t('c.back')}</Link></div></div>;

  const units = UNITS[lang];
  const unitsFor = u => (units.includes(u) ? units : [...units, u]);
  const setItem = (k, patch) => setItems(list => list.map(i => (i.key === k ? { ...i, ...patch } : i)));
  const tot = totals({ items, vat });
  const isNewCust = customerId === '__new';
  const target = isNewCust ? newCust.email.trim() : customers.find(c => c.id === customerId)?.email || '';
  const canEmail = validEmail(target);
  const rateL = t('ed.rate', { cur: locale.symbol });

  const submit = async (send) => {
    setErr('');
    const clean = items.filter(i => i.desc.trim()).map(({ key, ...i }) => ({ ...i, desc: i.desc.trim(), qty: Number(i.qty) || 0, rate: Number(i.rate) || 0 }));
    if (!title.trim()) return setErr(t('ed.errTitle'));
    if (!customerId) return setErr(t('ed.errCust'));
    if (isNewCust && !newCust.name.trim()) return setErr(t('ed.errNewName'));
    if (!clean.length) return setErr(t('ed.errLines'));
    setBusy(true);
    try {
      let cid = customerId;
      if (isNewCust) cid = (await saveCustomer({ ...newCust, name: newCust.name.trim() })).id;
      const payload = { title: title.trim(), customerId: cid, items: clean, vat: Number(vat) || 0, notes };
      if (existing) Object.assign(payload, { id: existing.id }, existing.stage === 'sent' ? { changeRequest: null } : {});
      if (send && (!existing || existing.stage === 'draft')) Object.assign(payload, transitions.send());
      const w = await saveWork(payload);
      const label = send ? t('t.quoteSent', { ref: `Q-${w.no}` }) : existing ? t('t.saved', { ref: `Q-${w.no}` }) : t('t.draftSaved', { ref: `Q-${w.no}` });
      nav(`/work/${w.id}`, { replace: true });
      const emailNow = emailIt && canEmail && (send || existing?.stage === 'sent');
      if (emailNow) sendE(w, 'quote', label); else toast(label);
    } catch (e) { setErr(e.message); } finally { setBusy(false); }
  };

  return (
    <div className="page">
      <div className="page-head">
        <div><h1>{existing ? t('ed.titleEdit', { ref: `Q-${existing.no}` }) : t('ed.titleNew')}</h1><p>{existing?.stage === 'sent' ? t('ed.subSent') : t('ed.subNew')}</p></div>
      </div>
      <form className="editor" onSubmit={e => { e.preventDefault(); submit(false); }} noValidate>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, minWidth: 0 }}>
          <section className="panel" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div className="field"><label htmlFor="q-title">{t('ed.jobTitle')}</label><input className="inp" id="q-title" value={title} onChange={e => setTitle(e.target.value)} placeholder={t('ed.jobPh')} /></div>
            <div className="field">
              <label htmlFor="q-cust">{t('ed.customer')}</label>
              <select className="inp" id="q-cust" value={customerId} onChange={e => setCustomerId(e.target.value)}>
                <option value="">{t('ed.choose')}</option>
                <option value="__new">{t('ed.addNew')}</option>
                {[...customers].sort((a, b) => a.name.localeCompare(b.name, locale.intl)).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            {isNewCust && (
              <div className="grid2" style={{ padding: 14, background: 'var(--surface)', borderRadius: 12, animation: 'rise .3s both' }}>
                <div className="field"><label htmlFor="nc-name">{t('ed.name')}</label><input className="inp" id="nc-name" value={newCust.name} onChange={e => setNewCust({ ...newCust, name: e.target.value })} /></div>
                <div className="field"><label htmlFor="nc-email">{t('ed.email')}</label><input className="inp" id="nc-email" type="email" value={newCust.email} onChange={e => setNewCust({ ...newCust, email: e.target.value })} /></div>
                <div className="field"><label htmlFor="nc-phone">{t('ed.phone')}</label><input className="inp" id="nc-phone" type="tel" value={newCust.phone} onChange={e => setNewCust({ ...newCust, phone: e.target.value })} /></div>
                <div className="field"><label htmlFor="nc-addr">{t('ed.site')}</label><input className="inp" id="nc-addr" value={newCust.address} onChange={e => setNewCust({ ...newCust, address: e.target.value })} /></div>
              </div>
            )}
          </section>

          <section className="panel" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div className="panel-h" style={{ marginBottom: 0 }}><h2>{t('ed.lines')}</h2><PricePicker prices={prices} onPick={p => setItems(list => [...list.filter(i => i.desc.trim()), { desc: p.description, qty: 1, unit: p.unit, rate: p.rate, key: Math.random() }])} /></div>
            <div className="li-head"><span>{t('ed.desc')}</span><span>{t('ed.qty')}</span><span>{t('ed.unit')}</span><span>{rateL}</span><span style={{ textAlign: 'right' }}>{t('ed.amount')}</span><span /></div>
            <div className="lines">
              {items.map(i => (
                <div className="li-row" key={i.key}>
                  <input className="inp desc" id={`d-${i.key}`} aria-label={t('ed.desc')} placeholder={t('ed.descPh')} value={i.desc} onChange={e => setItem(i.key, { desc: e.target.value })} />
                  <label className="li-f"><span>{t('ed.qty')}</span><input className="inp" id={`q-${i.key}`} aria-label={t('ed.qty')} type="number" inputMode="decimal" min="0" step="0.5" value={i.qty} onChange={e => setItem(i.key, { qty: e.target.value })} /></label>
                  <label className="li-f"><span>{t('ed.unit')}</span><select className="inp" id={`u-${i.key}`} aria-label={t('ed.unit')} value={i.unit} onChange={e => setItem(i.key, { unit: e.target.value })}>{unitsFor(i.unit).map(u => <option key={u} value={u}>{unitLabel(u)}</option>)}</select></label>
                  <label className="li-f"><span>{rateL}</span><input className="inp" id={`r-${i.key}`} aria-label={rateL} type="number" inputMode="decimal" min="0" step="0.5" value={i.rate} onChange={e => setItem(i.key, { rate: e.target.value })} /></label>
                  <span className="li-amt" data-label={t('ed.lineTotal')}>{money((Number(i.qty) || 0) * (Number(i.rate) || 0))}</span>
                  <button className="rm" type="button" aria-label={t('ed.remove')} onClick={() => setItems(list => (list.length > 1 ? list.filter(x => x.key !== i.key) : [blank()]))}>×</button>
                </div>
              ))}
            </div>
            <button type="button" className="btn btn-ghost btn-sm" style={{ alignSelf: 'flex-start' }} onClick={() => setItems(l => [...l, blank()])}><Icon name="plus" />{t('ed.addLine')}</button>
          </section>

          <section className="panel field">
            <label htmlFor="q-notes">{t('ed.notes')}</label>
            <textarea className="inp" id="q-notes" value={notes} onChange={e => setNotes(e.target.value)} placeholder={t('ed.notesPh')} />
          </section>
        </div>

        <aside className="sticky-sum">
          <section className="panel" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div className="field"><label htmlFor="q-vat">{t('ed.taxPct')}</label><input className="inp" id="q-vat" type="number" min="0" max="30" step="0.01" value={vat} onChange={e => setVat(e.target.value)} /></div>
            <div className="totals" style={{ justifyContent: 'stretch', gridTemplateColumns: '1fr auto' }}>
              <span>{t('ed.subtotal')}</span><span>{money(tot.sub)}</span><span>{t('tax')}</span><span>{money(tot.vat)}</span>
              <span className="grand">{t('ed.total')}</span><span className="grand">{money(tot.total)}</span>
            </div>
            {customerId && (canEmail ? (
              <label className="check" htmlFor="q-email">
                <input type="checkbox" id="q-email" checked={emailIt} onChange={e => setEmailIt(e.target.checked)} />
                <span>{existing?.stage === 'sent' ? t('ed.emailUpdated') : t('ed.emailQuote')} <b>{target}</b></span>
              </label>
            ) : <p className="note">{target ? t('ed.badEmail') : t('ed.noEmail')}{t('ed.copyAfter')}</p>)}
            {err && <p className="err" role="alert">{err}</p>}
            {(!existing || existing.stage === 'draft') && <button className="btn btn-chalk" type="button" disabled={busy} onClick={() => submit(true)}><Icon name="send" />{t('ed.saveSend')}</button>}
            <button className={`btn ${existing?.stage === 'sent' ? 'btn-chalk' : 'btn-ghost'}`} type="submit" disabled={busy}>{existing?.stage === 'sent' ? t('ed.saveChanges') : t('ed.saveDraft')}</button>
            <Link className="btn btn-ghost" to={existing ? `/work/${existing.id}` : '/quotes'} style={{ boxShadow: 'none' }}>{t('c.cancel')}</Link>
          </section>
        </aside>
      </form>
    </div>
  );
}
