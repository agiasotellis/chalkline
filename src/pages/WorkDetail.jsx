import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useData } from '../lib/data.jsx';
import { useToast } from '../lib/toast.jsx';
import { DAY, eur, fmtDate } from '../lib/format.js';
import { DOC_TYPE, FLOW, GROUP, flowStep, isOverdue, ref, totals } from '../lib/workflow.js';
import { Confirm, Icon, Pill, copyText } from '../components/ui.jsx';
import { isDemo } from '../lib/store/index.js';

import { customerLink, validEmail } from '../lib/links.js';
import { useSendEmail } from '../lib/useSendEmail.js';
export { customerLink };
const inFrame = (() => { try { return window.self !== window.top; } catch { return true; } })();

export function Document({ w, customer, settings, children }) {
  const g = GROUP[w.stage];
  const { sub, vat, total } = totals(w);
  const meta = g === 'invoices'
    ? [['Invoice date', fmtDate(w.invoicedAt)], ['Due', fmtDate(w.dueAt)]]
    : g === 'jobs' ? [['Approved', `${fmtDate(w.approvedAt)}${w.approvedBy ? ` by ${w.approvedBy}` : ''}`], ['Started', fmtDate(w.startedAt)]]
    : [['Quote date', fmtDate(w.sentAt || w.createdAt)], ['Valid for', `${settings?.quoteValidDays || 30} days`]];
  return (
    <article className="doc">
      <div className="doc-head">
        <div><div className="doc-type num">{DOC_TYPE[g]} · {ref(w)}</div><h2>{w.title}</h2></div>
        <div className="doc-biz">{settings?.logoUrl && <img className="doc-logo" src={settings.logoUrl} alt={settings.businessName} />}<b>{settings?.businessName}</b><br />{settings?.address}{settings?.vatNumber ? <><br />VAT {settings.vatNumber}</> : null}</div>
      </div>
      <div className="doc-meta">
        <div><small>Customer</small>{customer?.name || '—'}</div>
        <div><small>Site</small>{customer?.address || '—'}</div>
        {meta.map(([k, v]) => <div key={k}><small>{k}</small>{v}</div>)}
      </div>
      {children || (
        <>
          <div className="tbl-wrap">
            <table className="items">
              <thead><tr><th>Description</th><th className="r">Qty</th><th className="r">Rate</th><th className="r">Amount</th></tr></thead>
              <tbody>{w.items.map((i, k) => <tr key={k}><td>{i.desc}</td><td className="r">{Number(i.qty)} {i.unit}</td><td className="r">{eur(i.rate)}</td><td className="r">{eur(i.qty * i.rate)}</td></tr>)}</tbody>
            </table>
          </div>
          <div className="totals">
            <span>Subtotal</span><span>{eur(sub)}</span><span>VAT {Number(w.vat)}%</span><span>{eur(vat)}</span>
            <span className="grand">{g === 'invoices' ? 'Amount due' : 'Total'}</span><span className="grand">{eur(w.stage === 'paid' ? 0 : total)}</span>
          </div>
          {w.notes && <p className="note" style={{ marginTop: 16, whiteSpace: 'pre-wrap' }}>{w.notes}</p>}
          {g === 'invoices' && settings?.bankDetails && <div className="doc-foot"><b style={{ color: 'var(--ink)' }}>How to pay</b><span>{settings.bankDetails}</span><span>Please use {ref(w)} as the reference.</span></div>}
        </>
      )}
      {w.stage === 'approved' && <div className="stamp ok">APPROVED<small>{w.approvedBy}</small></div>}
      {w.stage === 'paid' && <div className="stamp chalk">PAID<small>{fmtDate(w.paidAt)}</small></div>}
    </article>
  );
}

export default function WorkDetail() {
  const { id } = useParams();
  const { work, customerById, settings, move, patchWork, deleteWork } = useData();
  const toast = useToast();
  const nav = useNavigate();
  const [busy, setBusy] = useState(false);
  const [confirm, setConfirm] = useState(null);
  const [alsoEmail, setAlsoEmail] = useState(true);
  const sendE = useSendEmail();
  const w = work.find(x => x.id === id);
  if (!w) return <div className="page"><div className="panel empty">This item doesn’t exist or was deleted.<Link className="btn btn-ghost btn-sm" to="/">Back to home</Link></div></div>;
  const c = customerById[w.customerId];
  const g = GROUP[w.stage];
  const fi = flowStep(w.stage);
  const back = { quotes: '/quotes', jobs: '/jobs', invoices: '/invoices' }[g];

  const canEmail = validEmail(c?.email);
  const run = async (action, arg, msg, emailKind) => {
    setBusy(true);
    try {
      const n = await move(w, action, arg);
      if (emailKind && alsoEmail && canEmail) sendE(n, emailKind, msg(n)); else toast(msg(n));
    }
    catch (e) { toast(e.message, 'bad'); }
    finally { setBusy(false); }
  };
  const emailOnly = async kind => { setBusy(true); try { await sendE(w, kind, null); } finally { setBusy(false); } };
  const emailBox = text => canEmail
    ? <label className="check" htmlFor={`also-${w.id}`}><input type="checkbox" id={`also-${w.id}`} checked={alsoEmail} onChange={e => setAlsoEmail(e.target.checked)} /><span>{text} <b>{c.email}</b></span></label>
    : <p className="note">{c ? <>No email for {c.name}. <Link to={`/customers/${c.id}`}>Add one</Link> to send it by email.</> : 'No customer linked.'}</p>;
  const sentLine = (at, label) => at ? <p className="sent-line"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12.5 10 17 19 7" /></svg>{label} {fmtDate(at)}</p> : null;
  const toggleTask = async (i, done) => {
    const tasks = w.tasks.map((t, k) => (k === i ? { ...t, done } : t));
    try { await patchWork(w.id, { tasks }); } catch (e) { toast(e.message, 'bad'); }
  };
  const copy = async () => { const okc = await copyText(customerLink(w)); toast(okc ? 'Customer link copied' : 'Select the link and copy it'); };
  const doneN = w.tasks?.filter(t => t.done).length || 0;
  const allDone = w.tasks?.length > 0 && doneN === w.tasks.length;

  const timeline = [
    ['Quote created', w.createdAt], ['Sent to customer', w.sentAt], ['Quote emailed', w.emailedAt], [`Approved${w.approvedBy ? ` by ${w.approvedBy}` : ''}`, w.approvedAt],
    ['Job started', w.startedAt], ['Job completed', w.doneAt], ['Invoice created', w.invoicedAt], ['Invoice emailed', w.invoiceEmailedAt],
    ['Reminder emailed', w.remindedAt], ['Paid', w.paidAt]
  ].filter(([, t]) => t).sort((a, b) => new Date(a[1]) - new Date(b[1]));

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <Link to={back} className="muted" style={{ textDecoration: 'none', fontSize: 14, display: 'inline-flex', alignItems: 'center', gap: 4 }}><Icon name="back" style={{ width: 16, height: 16, stroke: 'currentColor', fill: 'none', strokeWidth: 2 }} />{DOC_TYPE[g]}s</Link>
          <h1 style={{ marginTop: 6 }} className="num">{ref(w)}</h1>
        </div>
        <div className="head-actions"><Pill work={w} /></div>
      </div>
      <ol className="flow" aria-label="Progress">
        {FLOW.map((f, i) => <li key={f} className={i < fi || (i === fi && w.stage === 'paid') ? 'on' : i === fi ? 'on cur' : ''}>{f}</li>)}
      </ol>

      <div className="detail">
        <Document w={w} customer={c} settings={settings} key={w.stage}>
          {g === 'jobs' ? (
            <>
              <div className="prog"><span className="num">{doneN} of {w.tasks.length} tasks done</span><span className="meter"><i style={{ width: `${(doneN / (w.tasks.length || 1)) * 100}%` }} /></span></div>
              <div className="tasks">
                {w.tasks.map((t, i) => (
                  <label className="task" key={i}><input type="checkbox" id={`task-${w.id}-${i}`} checked={t.done} disabled={w.stage === 'done'} onChange={e => toggleTask(i, e.target.checked)} /><span>{t.t}</span></label>
                ))}
              </div>
              <div className="totals"><span className="grand">Job value</span><span className="grand">{eur(totals(w).total)}</span></div>
            </>
          ) : null}
        </Document>

        <aside className="side-col">
          <section className="panel">
            <div className="panel-h"><h2>Next step</h2></div>
            <div className="act">
              {w.stage === 'draft' && <>
                <button className="btn btn-chalk" disabled={busy || !w.items.length} onClick={() => run('send', null, () => `Quote ${ref(w)} sent`, 'quote')}><Icon name="send" />Send to customer</button>
                {emailBox('Also email it to')}
                <Link className="btn btn-ghost" to={`/work/${w.id}/edit`}><Icon name="edit" />Edit quote</Link>
                <button className="btn btn-danger" onClick={() => setConfirm('delete')}>Delete draft</button>
                <p className="note">Sending creates a private link your customer opens to approve.</p>
              </>}
              {w.stage === 'sent' && <>
                {w.changeRequest && <div className="callout"><b>{c?.name?.split(' ')[0] || 'Customer'} asked for a change</b>{w.changeRequest}</div>}
                <label className="lbl" htmlFor="cust-link">Customer link</label>
                <div className="link-box"><input className="inp" id="cust-link" readOnly value={customerLink(w)} onFocus={e => e.target.select()} /><button className="icon-btn" aria-label="Copy link" onClick={copy}><Icon name="copy" /></button></div>
                {sentLine(w.emailedAt, `Emailed to ${c?.email}`)}
                {canEmail && <button className="btn btn-ghost" disabled={busy} onClick={() => emailOnly('quote')}><Icon name="send" />{w.emailedAt ? 'Email it again' : `Email to ${c.email}`}</button>}
                <a className="btn btn-chalk" href={`#/q/${w.token}`} target={isDemo ? undefined : '_blank'} rel="noreferrer"><Icon name="link" />Open customer view</a>
                <Link className="btn btn-ghost" to={`/work/${w.id}/edit`}><Icon name="edit" />Edit quote</Link>
                <button className="btn btn-ghost" disabled={busy} onClick={() => setConfirm('approve')}>Mark approved by phone</button>
                <p className="note">Sent {fmtDate(w.sentAt)}. You’ll see it here as soon as {c?.name?.split(' ')[0] || 'they'} approves.</p>
              </>}
              {w.stage === 'approved' && <>
                <button className="btn btn-chalk" disabled={busy} onClick={() => run('toJob', null, n => `Job ${ref(n)} created with ${n.tasks.length} tasks`)}>Convert to job</button>
                <p className="note">Each quote line becomes a task on the job sheet.</p>
              </>}
              {w.stage === 'job' && <>
                <button className="btn btn-chalk" disabled={busy || !allDone} onClick={() => run('complete', null, () => `Job ${ref(w)} marked complete`)}>Mark job complete</button>
                <p className="note">{allDone ? 'All tasks done.' : `Tick every task to complete the job. ${w.tasks.length - doneN} left.`}</p>
              </>}
              {w.stage === 'done' && <>
                <button className="btn btn-tape" disabled={busy} onClick={() => run('invoice', settings?.paymentTermsDays, n => `Invoice ${ref(n)} created for ${eur(totals(n).total)}`, 'invoice')}>Generate invoice</button>
                {emailBox('Email the invoice to')}
                <p className="note">Same lines and prices. Payment due in {settings?.paymentTermsDays || 14} days.</p>
              </>}
              {w.stage === 'invoiced' && <>
                <button className="btn btn-chalk" disabled={busy} onClick={() => run('paid', null, () => `${ref(w)} marked as paid`)}>Mark as paid</button>
                {sentLine(w.invoiceEmailedAt, `Invoice emailed to ${c?.email}`)}
                {sentLine(w.remindedAt, 'Reminder sent')}
                {canEmail && !w.invoiceEmailedAt && <button className="btn btn-ghost" disabled={busy} onClick={() => emailOnly('invoice')}><Icon name="send" />Email invoice</button>}
                {canEmail ? <button className="btn btn-ghost" disabled={busy} onClick={() => emailOnly('reminder')}>Send reminder</button>
                  : <p className="note">{c ? <>Add an email for {c.name} to send reminders. <Link to={`/customers/${c.id}`}>Edit customer</Link></> : null}</p>}
                <label className="lbl" htmlFor="inv-link">Invoice link for the customer</label>
                <div className="link-box"><input className="inp" id="inv-link" readOnly value={customerLink(w)} onFocus={e => e.target.select()} /><button className="icon-btn" aria-label="Copy link" onClick={copy}><Icon name="copy" /></button></div>
                {isOverdue(w) ? <p className="note" style={{ color: 'var(--bad)' }}>{Math.ceil((Date.now() - new Date(w.dueAt)) / DAY)} days overdue.</p> : <p className="note">Due {fmtDate(w.dueAt)}.</p>}
              </>}
              {w.stage === 'paid' && <p className="note">Paid {fmtDate(w.paidAt)}. Nothing left to do.</p>}
              {g === 'invoices' && !inFrame && <button className="btn btn-ghost" onClick={() => window.print()}><Icon name="print" />Print or save PDF</button>}
            </div>
          </section>
          <section className="panel">
            <div className="panel-h"><h2>Customer</h2>{c && <Link to={`/customers/${c.id}`}>View</Link>}</div>
            {c ? <div style={{ fontSize: 14, display: 'flex', flexDirection: 'column', gap: 2 }}><b>{c.name}</b><span className="muted">{c.email}</span><span className="muted">{c.phone}</span></div> : <p className="note">No customer linked.</p>}
          </section>
          <section className="panel">
            <div className="panel-h"><h2>History</h2></div>
            <ul className="timeline">
              {timeline.map(([l, t]) => <li key={l} className="done"><span>{l}<small>{fmtDate(t)}</small></span></li>)}
            </ul>
          </section>
        </aside>
      </div>

      <Confirm open={confirm === 'delete'} title="Delete this draft?" body={`${ref(w)} will be removed. This can’t be undone.`} confirmLabel="Delete draft" danger
        onConfirm={async () => { await deleteWork(w.id); toast(`Draft ${ref(w)} deleted`); nav('/quotes'); }} onClose={() => setConfirm(null)} />
      <Confirm open={confirm === 'approve'} title="Mark as approved?" body={`Use this when ${c?.name || 'the customer'} approved by phone or in person.`} confirmLabel="Mark approved"
        onConfirm={() => run('approve', `${c?.name || 'Customer'} (by phone)`, () => `${ref(w)} marked approved`)} onClose={() => setConfirm(null)} />
    </div>
  );
}
