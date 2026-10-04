import { DAY } from './format.js';

// One record follows the work: draft → sent → approved → job → done → invoiced → paid
export const STAGES = ['draft', 'sent', 'approved', 'job', 'done', 'invoiced', 'paid'];
export const GROUP = { draft: 'quotes', sent: 'quotes', approved: 'quotes', job: 'jobs', done: 'jobs', invoiced: 'invoices', paid: 'invoices' };
export const PREFIX = { quotes: 'Q', jobs: 'J', invoices: 'INV' };
export const ref = w => `${PREFIX[GROUP[w.stage]]}-${w.no}`;
export const DOC_TYPE = { quotes: 'Quote', jobs: 'Job sheet', invoices: 'Invoice' };

export const isOverdue = w => w.stage === 'invoiced' && w.dueAt && new Date(w.dueAt) < new Date();

export function status(w) {
  if (isOverdue(w)) return { label: 'Overdue', tone: 'bad' };
  if (w.stage === 'sent' && w.changeRequest) return { label: 'Change requested', tone: 'warn' };
  return {
    draft: { label: 'Draft', tone: 'muted' },
    sent: { label: 'Awaiting approval', tone: 'warn' },
    approved: { label: 'Approved', tone: 'chalk' },
    job: { label: 'In progress', tone: 'chalk' },
    done: { label: 'Ready to invoice', tone: 'ok' },
    invoiced: { label: 'Unpaid', tone: 'warn' },
    paid: { label: 'Paid', tone: 'ok' }
  }[w.stage];
}

export function totals(w) {
  const sub = (w.items || []).reduce((a, i) => a + (Number(i.qty) || 0) * (Number(i.rate) || 0), 0);
  const vat = (sub * (Number(w.vat) || 0)) / 100;
  return { sub, vat, total: sub + vat };
}

export const FLOW = ['Quote', 'Approved', 'Job done', 'Paid'];
export const flowStep = s => ({ draft: 0, sent: 0, approved: 1, job: 1, done: 2, invoiced: 2, paid: 3 })[s];

// Each transition returns the patch to save.
export const transitions = {
  send: () => ({ stage: 'sent', sentAt: new Date().toISOString(), changeRequest: null }),
  approve: name => ({ stage: 'approved', approvedAt: new Date().toISOString(), approvedBy: name, changeRequest: null }),
  toJob: w => ({
    stage: 'job',
    startedAt: new Date().toISOString(),
    tasks: [...(w.items || []).map(i => ({ t: i.desc, done: false })), { t: 'Test, tidy up and photos', done: false }]
  }),
  complete: () => ({ stage: 'done', doneAt: new Date().toISOString() }),
  invoice: termsDays => ({
    stage: 'invoiced',
    invoicedAt: new Date().toISOString(),
    dueAt: new Date(Date.now() + (Number(termsDays) || 14) * DAY).toISOString()
  }),
  paid: () => ({ stage: 'paid', paidAt: new Date().toISOString() })
};
