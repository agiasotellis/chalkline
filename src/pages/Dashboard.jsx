import { Link } from 'react-router-dom';
import { useData } from '../lib/data.jsx';
import { DAY, ago, eur, fmtShort } from '../lib/format.js';
import { isOverdue, ref, totals } from '../lib/workflow.js';
import { Icon, Pill } from '../components/ui.jsx';

const sum = list => list.reduce((a, w) => a + totals(w).total, 0);

function attention(work, customerById) {
  const name = w => customerById[w.customerId]?.name || 'Customer';
  const out = [];
  work.filter(isOverdue).forEach(w => out.push({ w, tone: 'var(--bad)', t: `${ref(w)} is ${Math.ceil((Date.now() - new Date(w.dueAt)) / DAY)} days overdue`, s: `${name(w)} · ${eur(totals(w).total)}` }));
  work.filter(w => w.stage === 'sent' && w.changeRequest).forEach(w => out.push({ w, tone: 'var(--warn)', t: `${name(w)} asked for a change`, s: `${ref(w)} · ${w.title}` }));
  work.filter(w => w.stage === 'done').forEach(w => out.push({ w, tone: 'var(--ok)', t: `${ref(w)} is ready to invoice`, s: `${name(w)} · ${eur(totals(w).total)}` }));
  work.filter(w => w.stage === 'approved').forEach(w => out.push({ w, tone: 'var(--chalk)', t: `${ref(w)} approved, not started`, s: `${name(w)} approved ${ago(w.approvedAt)}` }));
  work.filter(w => w.stage === 'sent' && !w.changeRequest && Date.now() - new Date(w.sentAt) > 3 * DAY).forEach(w => out.push({ w, tone: 'var(--warn)', t: `No reply on ${ref(w)}`, s: `Sent to ${name(w)} ${ago(w.sentAt)}` }));
  return out;
}

function RevenueChart({ work }) {
  const now = new Date();
  const months = Array.from({ length: 6 }, (_, i) => new Date(now.getFullYear(), now.getMonth() - 5 + i, 1));
  const vals = months.map(m => sum(work.filter(w => w.stage === 'paid' && w.paidAt && new Date(w.paidAt).getFullYear() === m.getFullYear() && new Date(w.paidAt).getMonth() === m.getMonth())));
  const max = Math.max(100, ...vals);
  const step = max > 2000 ? 1000 : max > 800 ? 500 : max > 400 ? 200 : 100;
  const top = Math.ceil(max / step) * step;
  const W = 560, H = 200, L = 44, B = 26, T = 20, bw = (W - L) / 6;
  const y = v => T + (H - T - B) * (1 - v / top);
  const ticks = Array.from({ length: Math.floor(top / step) + 1 }, (_, i) => i * step);
  return (
    <svg className="chart" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`Paid per month: ${months.map((m, i) => `${m.toLocaleString('en-GB', { month: 'short' })} ${eur(vals[i])}`).join(', ')}`}>
      {ticks.map(t => <g key={t}><line className="gl" x1={L} x2={W} y1={y(t)} y2={y(t)} /><text x={L - 8} y={y(t) + 4} textAnchor="end">€{t >= 1000 ? t / 1000 + 'k' : t}</text></g>)}
      {vals.map((v, i) => {
        const x = L + i * bw + bw * 0.2, w = bw * 0.6, h = Math.max(v ? 2 : 0, H - B - y(v));
        return (
          <g key={i}>
            <g className="bar-g" style={{ animationDelay: `${i * 60}ms` }}><rect className={`bar${i === 5 ? ' cur' : ''}`} x={x} y={H - B - h} width={w} height={h} rx="5" /></g>
            {v > 0 && <text className="val" x={x + w / 2} y={H - B - h - 6} textAnchor="middle">{eur(v).replace(/\.\d\d$/, '')}</text>}
            <text x={x + w / 2} y={H - 8} textAnchor="middle">{months[i].toLocaleString('en-GB', { month: 'short' })}</text>
          </g>
        );
      })}
    </svg>
  );
}

export default function Dashboard() {
  const { work, customerById, settings } = useData();
  const sent = work.filter(w => w.stage === 'sent');
  const booked = work.filter(w => ['approved', 'job', 'done'].includes(w.stage));
  const unpaid = work.filter(w => w.stage === 'invoiced');
  const overdue = unpaid.filter(isOverdue);
  const paid30 = work.filter(w => w.stage === 'paid' && Date.now() - new Date(w.paidAt) < 30 * DAY);
  const jobs = work.filter(w => w.stage === 'job');
  const att = attention(work, customerById);
  const recent = [...work].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 5);
  const hour = new Date().getHours();
  const hi = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
  const first = (settings?.ownerName || '').split(' ')[0];

  return (
    <div className="page">
      <div className="page-head">
        <div><h1>{hi}{first ? `, ${first}` : ''}</h1><p>{att.length ? `${att.length} thing${att.length > 1 ? 's' : ''} need${att.length > 1 ? '' : 's'} your attention.` : 'Nothing waiting on you. Nice.'}</p></div>
        <div className="head-actions"><Link className="btn btn-chalk" to="/quotes/new"><Icon name="plus" />New quote</Link></div>
      </div>

      <div className="kpis">
        <Link className="kpi" to="/quotes?f=sent"><small>Awaiting approval</small><b className="num">{eur(sum(sent))}</b><span>{sent.length} quote{sent.length === 1 ? '' : 's'}</span></Link>
        <Link className="kpi" to="/jobs"><small>Work booked</small><b className="num">{eur(sum(booked))}</b><span>{booked.length} job{booked.length === 1 ? '' : 's'}</span></Link>
        <Link className={`kpi${overdue.length ? ' k-bad' : ''}`} to="/invoices?f=invoiced"><small>Unpaid</small><b className="num">{eur(sum(unpaid))}</b><span>{overdue.length ? `${overdue.length} overdue` : `${unpaid.length} invoice${unpaid.length === 1 ? '' : 's'}`}</span></Link>
        <Link className="kpi" to="/invoices?f=paid"><small>Paid, last 30 days</small><b className="num">{eur(sum(paid30))}</b><span>{paid30.length} invoice{paid30.length === 1 ? '' : 's'}</span></Link>
      </div>

      <div className="dash">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, minWidth: 0 }}>
          <section className="panel">
            <div className="panel-h"><h2>Needs attention</h2></div>
            {att.length ? (
              <div className="attn">
                {att.slice(0, 6).map((a, i) => (
                  <Link key={i} to={`/work/${a.w.id}`} style={{ animation: `rise .4s ${i * 50}ms both` }}>
                    <i style={{ background: a.tone }} /><span style={{ minWidth: 0 }}><span className="a-t" style={{ display: 'block' }}>{a.t}</span><span className="a-s">{a.s}</span></span>
                    <Icon name="chev" className="chev" />
                  </Link>
                ))}
              </div>
            ) : <div className="empty">You’re all caught up.</div>}
          </section>
          <section className="panel">
            <div className="panel-h"><h2>Paid per month</h2><span className="muted num" style={{ fontSize: 14 }}>Last 6 months</span></div>
            <RevenueChart work={work} />
          </section>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, minWidth: 0 }}>
          <section className="panel">
            <div className="panel-h"><h2>Jobs in progress</h2><Link to="/jobs">All jobs</Link></div>
            {jobs.length ? (
              <ul className="rows">
                {jobs.map(w => {
                  const d = w.tasks.filter(t => t.done).length, n = w.tasks.length || 1;
                  return (
                    <li key={w.id}><Link className="row" to={`/work/${w.id}`}>
                      <span className="r-t">{w.title}</span>
                      <span className="r-r"><span className="r-amt num" style={{ fontSize: 13.5 }}>{d}/{n}</span></span>
                      <span className="prog"><span className="meter" style={{ maxWidth: 220 }}><i style={{ width: `${(d / n) * 100}%` }} /></span><span className="r-s">{customerById[w.customerId]?.name}</span></span>
                    </Link></li>
                  );
                })}
              </ul>
            ) : <div className="empty">No jobs on the go. Approved quotes turn into jobs.</div>}
          </section>
          <section className="panel">
            <div className="panel-h"><h2>Latest</h2><Link to="/quotes">All quotes</Link></div>
            <ul className="rows">
              {recent.map(w => (
                <li key={w.id}><Link className="row" to={`/work/${w.id}`}>
                  <span className="r-t">{w.title}</span>
                  <span className="r-r"><span className="r-amt num">{eur(totals(w).total)}</span><Pill work={w} /></span>
                  <span className="r-s num">{ref(w)} · {customerById[w.customerId]?.name} · {fmtShort(w.createdAt)}</span>
                </Link></li>
              ))}
            </ul>
          </section>
        </div>
      </div>
    </div>
  );
}
