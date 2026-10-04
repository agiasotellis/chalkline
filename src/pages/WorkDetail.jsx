import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useData } from '../lib/data.jsx';
import { useToast } from '../lib/toast.jsx';
import { useT } from '../lib/i18n.jsx';
import { DAY, money, fmtDate, unitLabel } from '../lib/format.js';
import { FLOW, GROUP, flowStep, isOverdue, ref, totals } from '../lib/workflow.js';
import { Confirm, Icon, Pill, copyText } from '../components/ui.jsx';
import { isDemo } from '../lib/store/index.js';
import { customerLink, validEmail } from '../lib/links.js';
import { useSendEmail } from '../lib/useSendEmail.js';

export { customerLink };
const inFrame = (() => { try { return window.self !== window.top; } catch { return true; } })();

export function Document({ w, customer, settings, children }) {
  const { t } = useT();
  const g = GROUP[w.stage];
  const { sub, vat, total } = totals(w);
  const meta = g === 'invoices'
    ? [[t('d.invoiceDate'), fmtDate(w.invoicedAt)], [t('d.due'), fmtDate(w.dueAt)]]
    : g === 'jobs' ? [[t('d.approved'), `${fmtDate(w.approvedAt)}${w.approvedBy ? t('d.by', { name: w.approvedBy }) : ''}`], [t('d.started'), fmtDate(w.startedAt)]]
    : [[t('d.quoteDate'), fmtDate(w.sentAt || w.createdAt)], [t('d.validFor'), t('d.days', { n: settings?.quoteValidDays || 30 })]];
  return (
    <article className="doc">
      <div className="doc-head">
        <div><div className="doc-type num">{t(`doc.${g}`)} · {ref(w)}</div><h2>{w.title}</h2></div>
        <div className="doc-biz">{settings?.logoUrl && <img className="doc-logo" src={settings.logoUrl} alt={settings.businessName} />}<b>{settings?.businessName}</b><br />{settings?.address}{settings?.vatNumber ? <><br />{t('taxId')} {settings.vatNumber}</> : null}</div>
      </div>
      <div className="doc-meta">
        <div><small>{t('d.customer')}</small>{customer?.name || '—'}</div>
        <div><small>{t('d.site')}</small>{customer?.address || '—'}</div>
        {meta.map(([k, v]) => <div key={k}><small>{k}</small>{v}</div>)}
      </div>
      {children || (
        <>
          <div className="tbl-wrap">
            <table className="items">
              <thead><tr><th>{t('d.desc')}</th><th className="r">{t('d.qty')}</th><th className="r">{t('d.rate')}</th><th className="r">{t('d.amount')}</th></tr></thead>
              <tbody>{w.items.map((i, k) => <tr key={k}><td>{i.desc}</td><td className="r">{Number(i.qty)} {unitLabel(i.unit)}</td><td className="r">{money(i.rate)}</td><td className="r">{money(i.qty * i.rate)}</td></tr>)}</tbody>
            </table>
          </div>
          <div className="totals">
            <span>{t('d.subtotal')}</span><span>{money(sub)}</span><span>{t('tax')} {Number(w.vat)}%</span><span>{money(vat)}</span>
            <span className="grand">{g === 'invoices' ? t('d.amountDue') : t('d.total')}</span><span className="grand">{money(w.stage === 'paid' ? 0 : total)}</span>
          </div>
          {w.notes && <p className="note" style={{ marginTop: 16, whiteSpace: 'pre-wrap' }}>{w.notes}</p>}
          {g === 'invoices' && settings?.bankDetails && <div className="doc-foot"><b style={{ color: 'var(--ink)' }}>{t('d.howToPay')}</b><span>{settings.bankDetails}</span><span>{t('d.reference', { ref: ref(w) })}</span></div>}
        </>
      )}
      {w.stage === 'approved' && <div className="stamp ok">{t('d.stampApproved')}<small>{w.approvedBy}</small></div>}
      {w.stage === 'paid' && <div className="stamp chalk">{t('d.stampPaid')}<small>{fmtDate(w.paidAt)}</small></div>}
    </article>
  );
}

export default function WorkDetail() {
  const { id } = useParams();
  const { work, customerById, settings, move, patchWork, deleteWork } = useData();
  const { t } = useT();
  const toast = useToast();
  const nav = useNavigate();
  const [busy, setBusy] = useState(false);
  const [confirm, setConfirm] = useState(null);
  const [alsoEmail, setAlsoEmail] = useState(true);
  const sendE = useSendEmail();
  const w = work.find(x => x.id === id);
  if (!w) return <div className="page"><div className="panel empty">{t('w.missing')}<Link className="btn btn-ghost btn-sm" to="/">{t('w.backHome')}</Link></div></div>;
  const c = customerById[w.customerId];
  const g = GROUP[w.stage];
  const fi = flowStep(w.stage);
  const back = { quotes: '/quotes', jobs: '/jobs', invoices: '/invoices' }[g];
  const first = c?.name?.split(' ')[0];

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
    : <p className="note">{c ? <>{t('w.noEmail', { name: c.name })} <Link to={`/customers/${c.id}`}>{t('w.addOne')}</Link>{t('w.toSendEmail')}</> : t('w.noCustomer')}</p>;
  const sentLine = (at, label) => at ? <p className="sent-line"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12.5 10 17 19 7" /></svg>{label} · {fmtDate(at)}</p> : null;
  const toggleTask = async (i, done) => {
    const tasks = w.tasks.map((x, k) => (k === i ? { ...x, done } : x));
    try { await patchWork(w.id, { tasks }); } catch (e) { toast(e.message, 'bad'); }
  };
  const copy = async () => { const okc = await copyText(customerLink(w)); toast(okc ? t('w.copied') : t('w.selectCopy')); };
  const doneN = w.tasks?.filter(x => x.done).length || 0;
  const allDone = w.tasks?.length > 0 && doneN === w.tasks.length;

  const timeline = [
    ['tl.created', w.createdAt], ['tl.sent', w.sentAt], ['tl.emailed', w.emailedAt], ['tl.approved', w.approvedAt, w.approvedBy],
    ['tl.started', w.startedAt], ['tl.done', w.doneAt], ['tl.invoiced', w.invoicedAt], ['tl.invEmailed', w.invoiceEmailedAt],
    ['tl.reminded', w.remindedAt], ['tl.paid', w.paidAt]
  ].filter(([, at]) => at).sort((a, b) => new Date(a[1]) - new Date(b[1]));

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <Link to={back} className="muted" style={{ textDecoration: 'none', fontSize: 14, display: 'inline-flex', alignItems: 'center', gap: 4 }}><Icon name="back" style={{ width: 16, height: 16, stroke: 'currentColor', fill: 'none', strokeWidth: 2 }} />{t(`nav.${g}`)}</Link>
          <h1 style={{ marginTop: 6 }} className="num">{ref(w)}</h1>
        </div>
        <div className="head-actions"><Pill work={w} /></div>
      </div>
      <ol className="flow" aria-label={t('w.progress')}>
        {FLOW.map((f, i) => <li key={f} className={i < fi || (i === fi && w.stage === 'paid') ? 'on' : i === fi ? 'on cur' : ''}>{t(f)}</li>)}
      </ol>

      <div className="detail">
        <Document w={w} customer={c} settings={settings} key={w.stage}>
          {g === 'jobs' ? (
            <>
              <div className="prog"><span className="num">{t('w.tasksDone', { d: doneN, n: w.tasks.length })}</span><span className="meter"><i style={{ width: `${(doneN / (w.tasks.length || 1)) * 100}%` }} /></span></div>
              <div className="tasks">
                {w.tasks.map((x, i) => (
                  <label className="task" key={i}><input type="checkbox" id={`task-${w.id}-${i}`} checked={x.done} disabled={w.stage === 'done'} onChange={e => toggleTask(i, e.target.checked)} /><span>{x.t}</span></label>
                ))}
              </div>
              <div className="totals"><span className="grand">{t('w.jobValue')}</span><span className="grand">{money(totals(w).total)}</span></div>
            </>
          ) : null}
        </Document>

        <aside className="side-col">
          <section className="panel">
            <div className="panel-h"><h2>{t('w.next')}</h2></div>
            <div className="act">
              {w.stage === 'draft' && <>
                <button className="btn btn-chalk" disabled={busy || !w.items.length} onClick={() => run('send', null, () => t('t.quoteSent', { ref: ref(w) }), 'quote')}><Icon name="send" />{t('w.sendCustomer')}</button>
                {emailBox(t('w.alsoEmail'))}
                <Link className="btn btn-ghost" to={`/work/${w.id}/edit`}><Icon name="edit" />{t('w.editQuote')}</Link>
                <button className="btn btn-danger" onClick={() => setConfirm('delete')}>{t('w.deleteDraft')}</button>
                <p className="note">{t('w.sendNote')}</p>
              </>}
              {w.stage === 'sent' && <>
                {w.changeRequest && <div className="callout"><b>{t('w.askedChange', { name: first || t('c.customer') })}</b>{w.changeRequest}</div>}
                <label className="lbl" htmlFor="cust-link">{t('w.custLink')}</label>
                <div className="link-box"><input className="inp" id="cust-link" readOnly value={customerLink(w)} onFocus={e => e.target.select()} /><button className="icon-btn" aria-label={t('w.copyLink')} onClick={copy}><Icon name="copy" /></button></div>
                {sentLine(w.emailedAt, t('w.emailedTo', { email: c?.email }))}
                {canEmail && <button className="btn btn-ghost" disabled={busy} onClick={() => emailOnly('quote')}><Icon name="send" />{w.emailedAt ? t('w.emailAgain') : t('w.emailTo', { email: c.email })}</button>}
                <a className="btn btn-chalk" href={`#/q/${w.token}`} target={isDemo ? undefined : '_blank'} rel="noreferrer"><Icon name="link" />{t('w.openCustomer')}</a>
                <Link className="btn btn-ghost" to={`/work/${w.id}/edit`}><Icon name="edit" />{t('w.editQuote')}</Link>
                <button className="btn btn-ghost" disabled={busy} onClick={() => setConfirm('approve')}>{t('w.markPhone')}</button>
                <p className="note">{t('w.sentNote', { date: fmtDate(w.sentAt), name: first || t('w.they') })}</p>
              </>}
              {w.stage === 'approved' && <>
                <button className="btn btn-chalk" disabled={busy} onClick={() => run('toJob', null, n => t('t.jobCreated', { ref: ref(n), n: n.tasks.length }))}>{t('w.toJob')}</button>
                <p className="note">{t('w.toJobNote')}</p>
              </>}
              {w.stage === 'job' && <>
                <button className="btn btn-chalk" disabled={busy || !allDone} onClick={() => run('complete', null, () => t('t.jobDone', { ref: ref(w) }))}>{t('w.complete')}</button>
                <p className="note">{allDone ? t('w.allDone') : t('w.tickAll', { n: w.tasks.length - doneN })}</p>
              </>}
              {w.stage === 'done' && <>
                <button className="btn btn-tape" disabled={busy} onClick={() => run('invoice', settings?.paymentTermsDays, n => t('t.invCreated', { ref: ref(n), amount: money(totals(n).total) }), 'invoice')}>{t('w.genInvoice')}</button>
                {emailBox(t('w.emailInvoiceTo'))}
                <p className="note">{t('w.invoiceNote', { n: settings?.paymentTermsDays || 14 })}</p>
              </>}
              {w.stage === 'invoiced' && <>
                <button className="btn btn-chalk" disabled={busy} onClick={() => run('paid', null, () => t('t.paid', { ref: ref(w) }))}>{t('w.markPaid')}</button>
                {sentLine(w.invoiceEmailedAt, t('w.invEmailedTo', { email: c?.email }))}
                {sentLine(w.remindedAt, t('w.reminderSent'))}
                {canEmail && !w.invoiceEmailedAt && <button className="btn btn-ghost" disabled={busy} onClick={() => emailOnly('invoice')}><Icon name="send" />{t('w.emailInvoice')}</button>}
                {canEmail ? <button className="btn btn-ghost" disabled={busy} onClick={() => emailOnly('reminder')}>{t('w.sendReminder')}</button>
                  : <p className="note">{c ? <>{t('w.addEmailReminders', { name: c.name })} <Link to={`/customers/${c.id}`}>{t('w.editCustomer')}</Link></> : null}</p>}
                <label className="lbl" htmlFor="inv-link">{t('w.invLink')}</label>
                <div className="link-box"><input className="inp" id="inv-link" readOnly value={customerLink(w)} onFocus={e => e.target.select()} /><button className="icon-btn" aria-label={t('w.copyLink')} onClick={copy}><Icon name="copy" /></button></div>
                {isOverdue(w) ? <p className="note" style={{ color: 'var(--bad)' }}>{t('w.overdueDays', { n: Math.ceil((Date.now() - new Date(w.dueAt)) / DAY) })}</p> : <p className="note">{t('w.dueOn', { date: fmtDate(w.dueAt) })}</p>}
              </>}
              {w.stage === 'paid' && <p className="note">{t('w.paidNote', { date: fmtDate(w.paidAt) })}</p>}
              {g === 'invoices' && !inFrame && <button className="btn btn-ghost" onClick={() => window.print()}><Icon name="print" />{t('w.print')}</button>}
            </div>
          </section>
          <section className="panel">
            <div className="panel-h"><h2>{t('c.customer')}</h2>{c && <Link to={`/customers/${c.id}`}>{t('c.view')}</Link>}</div>
            {c ? <div style={{ fontSize: 14, display: 'flex', flexDirection: 'column', gap: 2 }}><b>{c.name}</b><span className="muted">{c.email}</span><span className="muted">{c.phone}</span></div> : <p className="note">{t('w.noCustomer')}</p>}
          </section>
          <section className="panel">
            <div className="panel-h"><h2>{t('w.history')}</h2></div>
            <ul className="timeline">
              {timeline.map(([k, at, who]) => <li key={k} className="done"><span>{t(k)}{who ? t('d.by', { name: who }) : ''}<small>{fmtDate(at)}</small></span></li>)}
            </ul>
          </section>
        </aside>
      </div>

      <Confirm open={confirm === 'delete'} title={t('cf.delDraft.t')} body={t('cf.delDraft.b', { ref: ref(w) })} confirmLabel={t('w.deleteDraft')} danger
        onConfirm={async () => { await deleteWork(w.id); toast(t('t.draftDeleted', { ref: ref(w) })); nav('/quotes'); }} onClose={() => setConfirm(null)} />
      <Confirm open={confirm === 'approve'} title={t('cf.approve.t')} body={t('cf.approve.b', { name: c?.name || t('cf.theCustomer') })} confirmLabel={t('cf.approve.c')}
        onConfirm={() => run('approve', t('w.byPhone', { name: c?.name || t('c.customer') }), () => t('t.approved', { ref: ref(w) }))} onClose={() => setConfirm(null)} />
    </div>
  );
}
