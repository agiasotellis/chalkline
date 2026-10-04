import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Tour, { DASHBOARD_STEPS } from '../components/Tour.jsx';
import { useAuth } from '../lib/auth.jsx';
import { useData } from '../lib/data.jsx';
import { DAY, ago, money, moneyShort, moneyCompact, fmtShort, monthShort } from '../lib/format.js';
import { useT } from '../lib/i18n.jsx';
import { isOverdue, ref, totals } from '../lib/workflow.js';
import { Icon, Pill } from '../components/ui.jsx';

const sum = list => list.reduce((a, w) => a + totals(w).total, 0);

function attention(work, customerById, t) {
  const name = w => customerById[w.customerId]?.name || t('c.customer');
  const out = [];
  work.filter(isOverdue).forEach(w => out.push({ w, tone: 'var(--bad)', t: t('att.overdue', { ref: ref(w), n: Math.ceil((Date.now() - new Date(w.dueAt)) / DAY) }), s: `${name(w)} · ${money(totals(w).total)}` }));
  work.filter(w => w.stage === 'sent' && w.changeRequest).forEach(w => out.push({ w, tone: 'var(--warn)', t: t('att.change', { name: name(w) }), s: `${ref(w)} · ${w.title}` }));
  work.filter(w => w.stage === 'done').forEach(w => out.push({ w, tone: 'var(--ok)', t: t('att.ready', { ref: ref(w) }), s: `${name(w)} · ${money(totals(w).total)}` }));
  work.filter(w => w.stage === 'approved').forEach(w => out.push({ w, tone: 'var(--chalk)', t: t('att.approved', { ref: ref(w) }), s: t('att.approvedSub', { name: name(w), ago: ago(w.approvedAt) }) }));
  work.filter(w => w.stage === 'sent' && !w.changeRequest && Date.now() - new Date(w.sentAt) > 3 * DAY).forEach(w => out.push({ w, tone: 'var(--warn)', t: t('att.noReply', { ref: ref(w) }), s: t('att.noReplySub', { name: name(w), ago: ago(w.sentAt) }) }));
  return out;
}

function RevenueChart({ work, t }) {
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
    <svg className="chart" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`${t('dash.chart')}: ${months.map((m, i) => `${monthShort(m)} ${money(vals[i])}`).join(', ')}`}>
      {ticks.map(tk => <g key={tk}><line className="gl" x1={L} x2={W} y1={y(tk)} y2={y(tk)} /><text x={L - 8} y={y(tk) + 4} textAnchor="end">{moneyCompact(tk)}</text></g>)}
      {vals.map((v, i) => {
        const x = L + i * bw + bw * 0.2, w = bw * 0.6, h = Math.max(v ? 2 : 0, H - B - y(v));
        return (
          <g key={i}>
            <g className="bar-g" style={{ animationDelay: `${i * 60}ms` }}><rect className={`bar${i === 5 ? ' cur' : ''}`} x={x} y={H - B - h} width={w} height={h} rx="5" /></g>
            {v > 0 && <text className="val" x={x + w / 2} y={H - B - h - 6} textAnchor="middle">{moneyShort(v)}</text>}
            <text x={x + w / 2} y={H - 8} textAnchor="middle">{monthShort(months[i])}</text>
          </g>
        );
      })}
    </svg>
  );
}

export default function Dashboard() {
  const { work, customerById, settings, saveSettings } = useData();
  const { t } = useT();
  const nav = useNavigate();
  const { user } = useAuth();
  const tourKey = `chalkline.tourDone.${user?.id}`;
  const seen = (() => { try { return localStorage.getItem(tourKey) === '1'; } catch { return false; } })();
  const [tour, setTour] = useState(() => !!settings && !settings.tourDone && !seen);
  const endTour = () => {
    setTour(false);
    try { localStorage.setItem(tourKey, '1'); } catch { /* ignore */ }
    saveSettings({ tourDone: true }).catch(() => {});
  };
  const sent = work.filter(w => w.stage === 'sent');
  const booked = work.filter(w => ['approved', 'job', 'done'].includes(w.stage));
  const unpaid = work.filter(w => w.stage === 'invoiced');
  const overdue = unpaid.filter(isOverdue);
  const paid30 = work.filter(w => w.stage === 'paid' && Date.now() - new Date(w.paidAt) < 30 * DAY);
  const jobs = work.filter(w => w.stage === 'job');
  const att = attention(work, customerById, t);
  const recent = [...work].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 5);
  const hour = new Date().getHours();
  const hi = t(hour < 12 ? 'dash.morning' : hour < 18 ? 'dash.afternoon' : 'dash.evening');
  const first = (settings?.ownerName || '').split(' ')[0];

  return (
    <div className="page">
      <div className="page-head">
        <div><h1>{hi}{first ? `, ${first}` : ''}</h1><p>{att.length ? t('dash.attnCount', { n: att.length }) : t('dash.clear')}</p></div>
        <div className="head-actions"><Link className="btn btn-chalk" to="/quotes/new" data-tour="new-quote"><Icon name="plus" />{t('dash.newQuote')}</Link></div>
      </div>

      <div className="kpis" data-tour="kpis">
        <Link className="kpi" to="/quotes?f=sent"><small>{t('kpi.awaiting')}</small><b className="num">{money(sum(sent))}</b><span>{t('kpi.quotes', { n: sent.length })}</span></Link>
        <Link className="kpi" to="/jobs"><small>{t('kpi.booked')}</small><b className="num">{money(sum(booked))}</b><span>{t('kpi.jobs', { n: booked.length })}</span></Link>
        <Link className={`kpi${overdue.length ? ' k-bad' : ''}`} to="/invoices?f=invoiced"><small>{t('kpi.unpaid')}</small><b className="num">{money(sum(unpaid))}</b><span>{overdue.length ? t('kpi.overdue', { n: overdue.length }) : t('kpi.invoices', { n: unpaid.length })}</span></Link>
        <Link className="kpi" to="/invoices?f=paid"><small>{t('kpi.paid30')}</small><b className="num">{money(sum(paid30))}</b><span>{t('kpi.invoices', { n: paid30.length })}</span></Link>
      </div>

      <div className="dash">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, minWidth: 0 }}>
          <section className="panel" data-tour="attention">
            <div className="panel-h"><h2>{t('dash.attention')}</h2></div>
            {att.length ? (
              <div className="attn">
                {att.slice(0, 6).map((a, i) => (
                  <Link key={i} to={`/work/${a.w.id}`} style={{ animation: `rise .4s ${i * 50}ms both` }}>
                    <i style={{ background: a.tone }} /><span style={{ minWidth: 0 }}><span className="a-t" style={{ display: 'block' }}>{a.t}</span><span className="a-s">{a.s}</span></span>
                    <Icon name="chev" className="chev" />
                  </Link>
                ))}
              </div>
            ) : <div className="empty">{t('dash.caughtUp')}</div>}
          </section>
          <section className="panel">
            <div className="panel-h"><h2>{t('dash.chart')}</h2><span className="muted num" style={{ fontSize: 14 }}>{t('dash.last6')}</span></div>
            <RevenueChart work={work} t={t} />
          </section>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, minWidth: 0 }}>
          <section className="panel">
            <div className="panel-h"><h2>{t('dash.inProgress')}</h2><Link to="/jobs">{t('dash.allJobs')}</Link></div>
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
            ) : <div className="empty">{t('dash.noJobs')}</div>}
          </section>
          <section className="panel">
            <div className="panel-h"><h2>{t('dash.latest')}</h2><Link to="/quotes">{t('dash.allQuotes')}</Link></div>
            <ul className="rows">
              {recent.map(w => (
                <li key={w.id}><Link className="row" to={`/work/${w.id}`}>
                  <span className="r-t">{w.title}</span>
                  <span className="r-r"><span className="r-amt num">{money(totals(w).total)}</span><Pill work={w} /></span>
                  <span className="r-s num">{ref(w)} · {customerById[w.customerId]?.name} · {fmtShort(w.createdAt)}</span>
                </Link></li>
              ))}
            </ul>
          </section>
        </div>
      </div>
      {tour && <Tour steps={DASHBOARD_STEPS} onFinish={endTour} onPrimaryEnd={() => nav('/quotes/new')} />}
    </div>
  );
}
