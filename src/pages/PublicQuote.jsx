import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { store, isDemo } from '../lib/store/index.js';
import { eur, fmtDate } from '../lib/format.js';
import { totals } from '../lib/workflow.js';
import { ThemeButton } from '../components/ui.jsx';

// What the customer sees from their link. No login.
export default function PublicQuote() {
  const { token } = useParams();
  const [q, setQ] = useState(undefined);
  const [name, setName] = useState('');
  const [note, setNote] = useState('');
  const [mode, setMode] = useState('view');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const load = () => store.getPublicQuote(token).then(setQ).catch(() => setQ(null));
  useEffect(() => { load(); }, [token]);

  if (q === undefined) return <div className="loading"><div className="spin" /></div>;
  if (!q) return <div className="public"><div className="panel empty">This link isn’t valid any more. Ask your tradesperson to send it again.</div></div>;
  const t = totals(q);
  const b = q.business || {};
  const isInvoice = ['invoiced', 'paid'].includes(q.stage);
  const approve = async e => {
    e.preventDefault(); setErr('');
    if (name.trim().length < 2) return setErr('Type your full name to approve. It works as your signature.');
    setBusy(true);
    try { const ok = await store.approvePublicQuote(token, name.trim()); if (!ok) setErr('This quote can no longer be approved. It may have been changed.'); await load(); }
    catch (er) { setErr(er.message); } finally { setBusy(false); }
  };
  const change = async e => {
    e.preventDefault(); if (!note.trim()) return setErr('Tell them what you’d like changed.');
    setBusy(true);
    try { await store.requestChange(token, note.trim()); setMode('sentChange'); } catch (er) { setErr(er.message); } finally { setBusy(false); }
  };

  return (
    <div className="public">
      {isDemo && <div className="demo-banner" style={{ borderRadius: 12 }}>Customer view (demo). <a href="#/" style={{ fontWeight: 700 }}>Back to your dashboard</a></div>}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        {b.logo ? <span className="av av-img" style={{ width: 52, height: 52 }}><img src={b.logo} alt="" /></span> : <span className="av" style={{ width: 44, height: 44, fontSize: 20 }}>{b.name?.[0]}</span>}
        <div style={{ minWidth: 0, flex: 1 }}><b style={{ fontSize: 17 }}>{b.name}</b><div className="note">{[b.phone, b.email].filter(Boolean).join(' · ')}</div></div>
        <ThemeButton />
      </div>
      <article className="doc">
        <div className="doc-head">
          <div><div className="doc-type num">{isInvoice ? 'Invoice' : 'Quote'} · {isInvoice ? 'INV' : 'Q'}-{q.no}</div><h2>{q.title}</h2></div>
          <div className="doc-biz">For <b>{q.customer?.name}</b><br />{q.customer?.address}</div>
        </div>
        <div className="tbl-wrap" style={{ marginTop: 12 }}>
          <table className="items" style={{ minWidth: 0 }}>
            <tbody>{q.items.map((i, k) => <tr key={k}><td>{i.desc}<br /><span className="note num">{Number(i.qty)} {i.unit} × {eur(i.rate)}</span></td><td className="r">{eur(i.qty * i.rate)}</td></tr>)}</tbody>
          </table>
        </div>
        <div className="totals"><span>Subtotal</span><span>{eur(t.sub)}</span><span>VAT {Number(q.vat)}%</span><span>{eur(t.vat)}</span><span className="grand">Total</span><span className="grand">{eur(t.total)}</span></div>
        {q.notes && <p className="note" style={{ marginTop: 14, whiteSpace: 'pre-wrap' }}>{q.notes}</p>}
        {isInvoice && b.bank && <div className="doc-foot"><b style={{ color: 'var(--ink)' }}>How to pay</b><span>{b.bank}</span><span>Due {fmtDate(q.dueAt)}. Reference INV-{q.no}.</span></div>}
        {q.stage === 'paid' && <div className="stamp chalk">PAID<small>{fmtDate(q.paidAt)}</small></div>}
      </article>

      {q.stage === 'sent' && mode === 'view' && (
        <form className="approve" onSubmit={approve} noValidate>
          <div className="field"><label htmlFor="ap-name">Type your full name to approve</label><input className="inp" id="ap-name" autoComplete="name" value={name} onChange={e => setName(e.target.value)} placeholder={q.customer?.name} /></div>
          {err && <p className="err" role="alert">{err}</p>}
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <button className="btn btn-chalk" type="submit" disabled={busy} style={{ flex: '1 1 180px' }}>Approve quote · {eur(t.total)}</button>
            <button className="btn btn-ghost" type="button" onClick={() => { setErr(''); setMode('change'); }} style={{ flex: '1 1 160px' }}>Request a change</button>
          </div>
          <p className="note">Valid for {b.validDays || 30} days from {fmtDate(q.sentAt)}.</p>
        </form>
      )}
      {q.stage === 'sent' && mode === 'change' && (
        <form className="approve" onSubmit={change} noValidate>
          <div className="field"><label htmlFor="ap-note">What would you like changed?</label><textarea className="inp" id="ap-note" value={note} onChange={e => setNote(e.target.value)} placeholder="e.g. Can you quote for a chrome tap instead?" /></div>
          {err && <p className="err" role="alert">{err}</p>}
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <button className="btn btn-chalk" type="submit" disabled={busy}>Send request</button>
            <button className="btn btn-ghost" type="button" onClick={() => setMode('view')}>Back</button>
          </div>
        </form>
      )}
      {mode === 'sentChange' && <div className="panel done-box"><b>Request sent</b><p className="note">{b.name} will update the quote and the same link will show the new version.</p></div>}
      {q.stage !== 'sent' && !isInvoice && (
        <div className="panel done-box">
          <span className="big-tick"><svg viewBox="0 0 24 24"><path d="M5 12.5 10 17 19 7" /></svg></span>
          <b style={{ fontSize: 18 }}>Approved{q.approvedBy ? ` by ${q.approvedBy}` : ''}</b>
          <p className="note">{fmtDate(q.approvedAt)}. {b.name} has been told and will be in touch to book the work.</p>
        </div>
      )}
    </div>
  );
}
