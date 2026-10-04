import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { store, isDemo } from '../lib/store/index.js';
import { money, fmtDate, unitLabel } from '../lib/format.js';
import { getLang, normLang, translate } from '../lib/i18n-core.js';
import { totals } from '../lib/workflow.js';
import { ThemeButton } from '../components/ui.jsx';

// What the customer sees from their link. No login. Shown in the business's language and currency.
export default function PublicQuote() {
  const { token } = useParams();
  const [q, setQ] = useState(undefined);
  const [name, setName] = useState('');
  const [note, setNote] = useState('');
  const [mode, setMode] = useState('view');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const load = () => store.getPublicQuote(token).then(setQ).catch(() => setQ(null));
  useEffect(() => { load(); }, [token]); // eslint-disable-line react-hooks/exhaustive-deps

  const L = normLang(q?.business?.locale) || getLang();
  const t = (k, v) => translate(L, k, v);
  const m = n => money(n, L);
  const d = x => fmtDate(x, L);
  useEffect(() => { document.documentElement.lang = L; }, [L]);

  if (q === undefined) return <div className="loading"><div className="spin" /></div>;
  if (!q) return <div className="public"><div className="panel empty">{t('pq.invalid')}</div></div>;
  const tot = totals(q);
  const b = q.business || {};
  const isInvoice = ['invoiced', 'paid'].includes(q.stage);
  const ref = `${isInvoice ? 'INV' : 'Q'}-${q.no}`;
  const approve = async e => {
    e.preventDefault(); setErr('');
    if (name.trim().length < 2) return setErr(t('pq.errName'));
    setBusy(true);
    try { const ok = await store.approvePublicQuote(token, name.trim()); if (!ok) setErr(t('pq.errLate')); await load(); }
    catch (er) { setErr(er.message); } finally { setBusy(false); }
  };
  const change = async e => {
    e.preventDefault(); if (!note.trim()) return setErr(t('pq.errNote'));
    setBusy(true);
    try { await store.requestChange(token, note.trim()); setMode('sentChange'); } catch (er) { setErr(er.message); } finally { setBusy(false); }
  };

  return (
    <div className="public" lang={L}>
      {isDemo && <div className="demo-banner" style={{ borderRadius: 12 }}>{t('pq.demo')} <a href="#/" style={{ fontWeight: 700 }}>{t('pq.back')}</a></div>}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        {b.logo ? <span className="av av-img" style={{ width: 52, height: 52 }}><img src={b.logo} alt="" /></span> : <span className="av" style={{ width: 44, height: 44, fontSize: 20 }}>{b.name?.[0]}</span>}
        <div style={{ minWidth: 0, flex: 1 }}><b style={{ fontSize: 17 }}>{b.name}</b><div className="note">{[b.phone, b.email].filter(Boolean).join(' · ')}</div></div>
        <ThemeButton />
      </div>
      <article className="doc">
        <div className="doc-head">
          <div><div className="doc-type num">{t(isInvoice ? 'doc.invoices' : 'doc.quotes')} · {ref}</div><h2>{q.title}</h2></div>
          <div className="doc-biz">{t('pq.for')} <b>{q.customer?.name}</b><br />{q.customer?.address}</div>
        </div>
        <div className="tbl-wrap" style={{ marginTop: 12 }}>
          <table className="items" style={{ minWidth: 0 }}>
            <tbody>{q.items.map((i, k) => <tr key={k}><td>{i.desc}<br /><span className="note num">{Number(i.qty)} {unitLabel(i.unit, L)} × {m(i.rate)}</span></td><td className="r">{m(i.qty * i.rate)}</td></tr>)}</tbody>
          </table>
        </div>
        <div className="totals"><span>{t('d.subtotal')}</span><span>{m(tot.sub)}</span><span>{t('tax')} {Number(q.vat)}%</span><span>{m(tot.vat)}</span><span className="grand">{t('d.total')}</span><span className="grand">{m(tot.total)}</span></div>
        {q.notes && <p className="note" style={{ marginTop: 14, whiteSpace: 'pre-wrap' }}>{q.notes}</p>}
        {isInvoice && b.bank && <div className="doc-foot"><b style={{ color: 'var(--ink)' }}>{t('d.howToPay')}</b><span>{b.bank}</span><span>{t('pq.dueRef', { date: d(q.dueAt), ref })}</span></div>}
        {q.stage === 'paid' && <div className="stamp chalk">{t('d.stampPaid')}<small>{d(q.paidAt)}</small></div>}
      </article>

      {q.stage === 'sent' && mode === 'view' && (
        <form className="approve" onSubmit={approve} noValidate>
          <div className="field"><label htmlFor="ap-name">{t('pq.nameL')}</label><input className="inp" id="ap-name" autoComplete="name" value={name} onChange={e => setName(e.target.value)} placeholder={q.customer?.name} /></div>
          {err && <p className="err" role="alert">{err}</p>}
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <button className="btn btn-chalk" type="submit" disabled={busy} style={{ flex: '1 1 180px' }}>{t('pq.approve', { amount: m(tot.total) })}</button>
            <button className="btn btn-ghost" type="button" onClick={() => { setErr(''); setMode('change'); }} style={{ flex: '1 1 160px' }}>{t('pq.change')}</button>
          </div>
          <p className="note">{t('pq.valid', { n: b.validDays || 30, date: d(q.sentAt) })}</p>
        </form>
      )}
      {q.stage === 'sent' && mode === 'change' && (
        <form className="approve" onSubmit={change} noValidate>
          <div className="field"><label htmlFor="ap-note">{t('pq.changeL')}</label><textarea className="inp" id="ap-note" value={note} onChange={e => setNote(e.target.value)} placeholder={t('pq.changePh')} /></div>
          {err && <p className="err" role="alert">{err}</p>}
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <button className="btn btn-chalk" type="submit" disabled={busy}>{t('pq.sendReq')}</button>
            <button className="btn btn-ghost" type="button" onClick={() => setMode('view')}>{t('c.back')}</button>
          </div>
        </form>
      )}
      {mode === 'sentChange' && <div className="panel done-box"><b>{t('pq.reqSent')}</b><p className="note">{t('pq.reqSentB', { biz: b.name })}</p></div>}
      {q.stage !== 'sent' && !isInvoice && (
        <div className="panel done-box">
          <span className="big-tick"><svg viewBox="0 0 24 24"><path d="M5 12.5 10 17 19 7" /></svg></span>
          <b style={{ fontSize: 18 }}>{q.approvedBy ? t('pq.approvedBy', { name: q.approvedBy }) : t('pq.approved')}</b>
          <p className="note">{t('pq.approvedB', { date: d(q.approvedAt), biz: b.name })}</p>
        </div>
      )}
    </div>
  );
}
