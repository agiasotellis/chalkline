import { DAY } from './format.js';
import { tr } from './i18n-core.js';

// One record follows the work: draft → sent → approved → job → done → invoiced → paid
export const STAGES = ['draft', 'sent', 'approved', 'job', 'done', 'invoiced', 'paid'];
export const GROUP = { draft: 'quotes', sent: 'quotes', approved: 'quotes', job: 'jobs', done: 'jobs', invoiced: 'invoices', paid: 'invoices' };
export const PREFIX = { quotes: 'Q', jobs: 'J', invoices: 'INV' };
export const ref = w => `${PREFIX[GROUP[w.stage]]}-${w.no}`;

export const isOverdue = w => w.stage === 'invoiced' && w.dueAt && new Date(w.dueAt) < new Date();

export function status(w) {
  if (isOverdue(w)) return { key: 'st.overdue', tone: 'bad' };
  if (w.stage === 'sent' && w.changeRequest) return { key: 'st.change', tone: 'warn' };
  const tone = { draft: 'muted', sent: 'warn', approved: 'chalk', job: 'chalk', done: 'ok', invoiced: 'warn', paid: 'ok' }[w.stage];
  return { key: `st.${w.stage}`, tone };
}

export function totals(w) {
  const sub = (w.items || []).reduce((a, i) => a + (Number(i.qty) || 0) * (Number(i.rate) || 0), 0);
  const vat = (sub * (Number(w.vat) || 0)) / 100;
  return { sub, vat, total: sub + vat };
}

export const FLOW = ['flow.0', 'flow.1', 'flow.2', 'flow.3'];
export const flowStep = s => ({ draft: 0, sent: 0, approved: 1, job: 1, done: 2, invoiced: 2, paid: 3 })[s];

// Each transition returns the patch to save.
export const transitions = {
  send: () => ({ stage: 'sent', sentAt: new Date().toISOString(), changeRequest: null }),
  approve: name => ({ stage: 'approved', approvedAt: new Date().toISOString(), approvedBy: name, changeRequest: null }),
  toJob: w => ({
    stage: 'job',
    startedAt: new Date().toISOString(),
    tasks: [...(w.items || []).map(i => ({ t: i.desc, done: false })), { t: tr('task.final'), done: false }]
  }),
  complete: () => ({ stage: 'done', doneAt: new Date().toISOString() }),
  invoice: termsDays => ({
    stage: 'invoiced',
    invoicedAt: new Date().toISOString(),
    dueAt: new Date(Date.now() + (Number(termsDays) || 14) * DAY).toISOString()
  }),
  paid: () => ({ stage: 'paid', paidAt: new Date().toISOString() })
};
