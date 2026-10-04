import { useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useData } from '../lib/data.jsx';
import { money, fmtShort } from '../lib/format.js';
import { useT } from '../lib/i18n.jsx';
import { GROUP, isOverdue, ref, totals } from '../lib/workflow.js';
import { Icon, Pill } from '../components/ui.jsx';

const META = {
  quotes: { filters: ['all', 'draft', 'sent', 'approved'], date: w => w.sentAt || w.createdAt, dateL: 'list.date' },
  jobs: { filters: ['all', 'job', 'done'], date: w => w.startedAt || w.approvedAt, dateL: 'list.started' },
  invoices: { filters: ['all', 'invoiced', 'overdue', 'paid'], date: w => w.dueAt, dateL: 'list.due' }
};

export default function WorkList({ group }) {
  const { work, customerById } = useData();
  const { t } = useT();
  const [params, setParams] = useSearchParams();
  const f = params.get('f') || 'all';
  const [q, setQ] = useState('');
  const nav = useNavigate();
  const m = META[group];

  const inGroup = work.filter(w => GROUP[w.stage] === group);
  const match = (w, key) => key === 'all' || (key === 'overdue' ? isOverdue(w) : w.stage === key);
  const rows = useMemo(() => {
    const s = q.trim().toLowerCase();
    return inGroup
      .filter(w => match(w, f))
      .filter(w => !s || [w.title, ref(w), customerById[w.customerId]?.name].join(' ').toLowerCase().includes(s))
      .sort((a, b) => isOverdue(b) - isOverdue(a) || b.no - a.no);
  }, [inGroup, f, q, customerById]);

  return (
    <div className="page">
      <div className="page-head">
        <div><h1>{t(`nav.${group}`)}</h1><p>{t(`list.${group}.sub`)}</p></div>
        {group === 'quotes' && <div className="head-actions"><Link className="btn btn-chalk" to="/quotes/new"><Icon name="plus" />{t('dash.newQuote')}</Link></div>}
      </div>
      <div className="toolbar">
        <div className="seg" role="group" aria-label={t('list.filter')}>
          {m.filters.map(k => (
            <button key={k} type="button" aria-pressed={f === k} onClick={() => setParams(k === 'all' ? {} : { f: k }, { replace: true })}>
              {t(`f.${k}`)}<span className="ct num">{inGroup.filter(w => match(w, k)).length}</span>
            </button>
          ))}
        </div>
        <label className="search"><Icon name="search" /><input className="inp" id="list-search" placeholder={t('list.search')} value={q} onChange={e => setQ(e.target.value)} aria-label={t('list.search')} /></label>
      </div>

      {rows.length === 0 ? (
        <div className="panel empty">
          {q ? t('list.noMatch', { q }) : t(group === 'quotes' ? 'list.emptyQuotes' : group === 'jobs' ? 'list.emptyJobs' : 'list.emptyInvoices')}
          {group === 'quotes' && !q && <Link className="btn btn-chalk btn-sm" to="/quotes/new">{t('list.write')}</Link>}
        </div>
      ) : (
        <>
          <div className="panel list-tbl-wrap" style={{ padding: 0, overflow: 'hidden' }}>
            <table className="list-tbl">
              <thead><tr><th>{t('th.number')}</th><th>{t('th.job')}</th><th>{t('th.status')}</th><th>{t(m.dateL)}</th><th className="r">{t('th.total')}</th></tr></thead>
              <tbody>
                {rows.map((w, i) => (
                  <tr key={w.id} onClick={() => nav(`/work/${w.id}`)} style={{ animationDelay: `${Math.min(i, 12) * 25}ms` }}>
                    <td className="num s" style={{ fontWeight: 600 }}><Link to={`/work/${w.id}`} style={{ textDecoration: 'none' }}>{ref(w)}</Link></td>
                    <td><div className="t">{w.title}</div><div className="s">{customerById[w.customerId]?.name || t('list.noCustomer')}</div></td>
                    <td><Pill work={w} /></td>
                    <td className="s num">{fmtShort(m.date(w))}</td>
                    <td className="r num" style={{ fontWeight: 700 }}>{money(totals(w).total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <ul className="cards">
            {rows.map((w, i) => (
              <li key={w.id}><Link className="card" to={`/work/${w.id}`} style={{ animationDelay: `${Math.min(i, 12) * 30}ms` }}>
                <span className="c-no num">{ref(w)}</span><span style={{ justifySelf: 'end' }}><Pill work={w} /></span>
                <span className="c-t">{w.title}</span><span className="c-amt num">{money(totals(w).total)}</span>
                <span className="c-s">{customerById[w.customerId]?.name}</span><span className="c-s num" style={{ textAlign: 'right' }}>{t(m.dateL)} {fmtShort(m.date(w))}</span>
              </Link></li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
