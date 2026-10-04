import { seedData } from '../seed.js';
import { uid } from '../format.js';

// Demo store: everything lives in this browser's localStorage.
const KEY = 'chalkline.app.v1';
let db = null;
const load = () => {
  if (db) return db;
  try { db = JSON.parse(localStorage.getItem(KEY) || 'null'); } catch { db = null; }
  if (!db || !Array.isArray(db.work)) db = seedData();
  return db;
};
const persist = () => { try { localStorage.setItem(KEY, JSON.stringify(db)); } catch { /* storage blocked: keep in memory */ } };
const clone = x => JSON.parse(JSON.stringify(x));
const tick = v => new Promise(r => setTimeout(() => r(clone(v)), 60));

export const localStore = {
  mode: 'demo',
  reset() { db = seedData(); persist(); return tick(true); },

  getSettings: () => tick(load().settings),
  saveSettings: s => { load().settings = { ...db.settings, ...s }; persist(); return tick(db.settings); },

  // Demo: keep the (already resized) logo as a data URL.
  uploadLogo: blob => new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(r.result); r.onerror = () => rej(new Error('Couldn’t read that image.')); r.readAsDataURL(blob); }),
  removeLogo: () => tick(true),

  listWork: () => tick(load().work),
  getWork: id => tick(load().work.find(w => w.id === id) || null),
  createWork(data) {
    const d = load();
    const no = Math.max(1000, ...d.work.map(w => w.no)) + 1;
    const w = { id: uid(), no, stage: 'draft', items: [], tasks: [], vat: d.settings.vatRate, notes: '', token: uid(), changeRequest: null, createdAt: new Date().toISOString(), ...data };
    d.work.push(w); persist(); return tick(w);
  },
  updateWork(id, patch) {
    const w = load().work.find(x => x.id === id);
    if (!w) return Promise.reject(new Error('This item no longer exists.'));
    Object.assign(w, patch); persist(); return tick(w);
  },
  deleteWork(id) { const d = load(); d.work = d.work.filter(w => w.id !== id); persist(); return tick(true); },

  listCustomers: () => tick(load().customers),
  saveCustomer(c) {
    const d = load();
    if (c.id) { const x = d.customers.find(y => y.id === c.id); Object.assign(x, c); persist(); return tick(x); }
    const n = { id: uid(), email: '', phone: '', address: '', notes: '', createdAt: new Date().toISOString(), ...c };
    d.customers.push(n); persist(); return tick(n);
  },
  deleteCustomer(id) { const d = load(); d.customers = d.customers.filter(c => c.id !== id); persist(); return tick(true); },

  listPrices: () => tick(load().prices),
  savePrice(p) {
    const d = load();
    if (p.id) { Object.assign(d.prices.find(x => x.id === p.id), p); persist(); return tick(p); }
    const n = { id: uid(), createdAt: new Date().toISOString(), ...p }; d.prices.push(n); persist(); return tick(n);
  },
  deletePrice(id) { const d = load(); d.prices = d.prices.filter(p => p.id !== id); persist(); return tick(true); },

  // Demo: pretend to send, nothing leaves the browser.
  sendEmail(workId, kind) {
    const d = load(); const w = d.work.find(x => x.id === workId);
    const c = w && d.customers.find(x => x.id === w.customerId);
    if (!c?.email) return Promise.reject(new Error('Add an email address for this customer first.'));
    const at = new Date().toISOString();
    Object.assign(w, kind === 'quote' ? { emailedAt: at } : kind === 'invoice' ? { invoiceEmailedAt: at } : { remindedAt: at });
    persist(); return tick({ ok: true, to: c.email, demo: true });
  },
  emailResult: () => tick({ status: 201 }),
  emailReady: () => tick(true),

  getPublicQuote(token) {
    const d = load(); const w = d.work.find(x => x.token === token && x.stage !== 'draft');
    if (!w) return tick(null);
    const c = d.customers.find(x => x.id === w.customerId) || {};
    const s = d.settings;
    return tick({ ...w, customer: { name: c.name, address: c.address },
      business: { logo: s.logoUrl, name: s.businessName, email: s.email, phone: s.phone, address: s.address, vatNumber: s.vatNumber, bank: s.bankDetails, validDays: s.quoteValidDays } });
  },
  approvePublicQuote(token, name) {
    const w = load().work.find(x => x.token === token && x.stage === 'sent');
    if (!w) return tick(false);
    Object.assign(w, { stage: 'approved', approvedAt: new Date().toISOString(), approvedBy: name, changeRequest: null }); persist(); return tick(true);
  },
  requestChange(token, note) {
    const w = load().work.find(x => x.token === token && x.stage === 'sent');
    if (!w) return tick(false);
    w.changeRequest = note; persist(); return tick(true);
  }
};
