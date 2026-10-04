import { useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useData } from '../lib/data.jsx';
import { eur, fmtShort } from '../lib/format.js';
import { GROUP, isOverdue, ref, totals } from '../lib/workflow.js';
import { Icon, Pill } from '../components/ui.jsx';

const META = {
  quotes: { title: 'Quotes', sub: 'Drafts, quotes waiting on customers, and approvals.', filters: [['all', 'All'], ['draft', 'Drafts'], ['sent', 'Awaiting approval'], ['approved', 'Approved']], date: w => w.sentAt || w.createdAt, dateL: 'Date' },
  jobs: { title: 'Jobs', sub: 'Approved work. Tick off tasks, then invoice.', filters: [['all', 'All'], ['job', 'In progress'], ['done', 'Ready to invoice']], date: w => w.startedAt || w.approvedAt, dateL: 'Started' },
  invoices: { title: 'Invoices', sub: 'What you’re owed and what’s been paid.', filters: [['all', 'All'], ['invoiced', 'Unpaid'], ['overdue', 'Overdue'], ['paid', 'Paid']], date: w => w.dueAt, dateL: 'Due' }
};

export default function WorkList({ group }) {
  const { work, customerById } = useData();
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
        <div><h1>{m.title}</h1><p>{m.sub}</p></div>
        {group === 'quotes' && <div className="head-actions"><Link className="btn btn-chalk" to="/quotes/new"><Icon name="plus" />New quote</Link></div>}
      </div>
      <div className="toolbar">
        <div className="seg" role="group" aria-label="Filter">
          {m.filters.map(([k, l]) => (
            <button key={k} type="button" aria-pressed={f === k} onClick={() => setParams(k === 'all' ? {} : { f: k }, { replace: true })}>
              {l}<span className="ct num">{inGroup.filter(w => match(w, k)).length}</span>
            </button>
          ))}
        </div>
        <label className="search"><Icon name="search" /><input className="inp" id="list-search" placeholder="Search by job, customer or number" value={q} onChange={e => setQ(e.target.value)} aria-label="Search" /></label>
      </div>

      {rows.length === 0 ? (
        <div className="panel empty">
          {q ? `Nothing matches “${q}”.` : group === 'quotes' ? 'No quotes here yet.' : group === 'jobs' ? 'No jobs here. Approved quotes become jobs.' : 'No invoices here. Finished jobs become invoices.'}
          {group === 'quotes' && !q && <Link className="btn btn-chalk btn-sm" to="/quotes/new">Write a quote</Link>}
        </div>
      ) : (
        <>
          <div className="panel list-tbl-wrap" style={{ padding: 0, overflow: 'hidden' }}>
            <table className="list-tbl">
              <thead><tr><th>Number</th><th>Job</th><th>Status</th><th>{m.dateL}</th><th className="r">Total</th></tr></thead>
              <tbody>
                {rows.map((w, i) => (
                  <tr key={w.id} onClick={() => nav(`/work/${w.id}`)} style={{ animationDelay: `${Math.min(i, 12) * 25}ms` }}>
                    <td className="num s" style={{ fontWeight: 600 }}><Link to={`/work/${w.id}`} style={{ textDecoration: 'none' }}>{ref(w)}</Link></td>
                    <td><div className="t">{w.title}</div><div className="s">{customerById[w.customerId]?.name || 'No customer'}</div></td>
                    <td><Pill work={w} /></td>
                    <td className="s num">{fmtShort(m.date(w))}</td>
                    <td className="r num" style={{ fontWeight: 700 }}>{eur(totals(w).total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <ul className="cards">
            {rows.map((w, i) => (
              <li key={w.id}><Link className="card" to={`/work/${w.id}`} style={{ animationDelay: `${Math.min(i, 12) * 30}ms` }}>
                <span className="c-no num">{ref(w)}</span><span style={{ justifySelf: 'end' }}><Pill work={w} /></span>
                <span className="c-t">{w.title}</span><span className="c-amt num">{eur(totals(w).total)}</span>
                <span className="c-s">{customerById[w.customerId]?.name}</span><span className="c-s num" style={{ textAlign: 'right' }}>{m.dateL} {fmtShort(m.date(w))}</span>
              </Link></li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
