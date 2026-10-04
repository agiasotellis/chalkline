import { createClient } from '@supabase/supabase-js';

// Live store backed by Supabase. Column names are snake_case in the database, camelCase in the app.
const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY;
export const supabase = url && key ? createClient(url, key) : null;

const snake = s => s.replace(/[A-Z]/g, m => '_' + m.toLowerCase());
const camel = s => s.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
const toRow = o => Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined).map(([k, v]) => [snake(k), v]));
const fromRow = r => (r ? Object.fromEntries(Object.entries(r).map(([k, v]) => [camel(k), v])) : r);
const num = (o, keys) => { keys.forEach(k => { if (o && o[k] != null) o[k] = Number(o[k]); }); return o; };
const ok = ({ data, error }) => { if (error) throw new Error(error.message); return data; };

const SETTINGS_DEFAULT = { businessName: 'My business', vatRate: 24, paymentTermsDays: 14, quoteValidDays: 30 };
const strip = o => { const { id, ownerId, createdAt, updatedAt, ...rest } = o; return rest; };

export const supabaseStore = {
  mode: 'live',
  async getSettings() {
    const r = ok(await supabase.from('settings').select('*').maybeSingle());
    return r ? num(fromRow(r), ['vatRate']) : { ...SETTINGS_DEFAULT };
  },
  async saveSettings(s) {
    const { ownerId, updatedAt, ...rest } = s;
    return num(fromRow(ok(await supabase.from('settings').upsert(toRow(rest)).select().single())), ['vatRate']);
  },

  async listWork() { return ok(await supabase.from('work').select('*').order('no', { ascending: false })).map(r => num(fromRow(r), ['vat'])); },
  async getWork(id) { return num(fromRow(ok(await supabase.from('work').select('*').eq('id', id).maybeSingle())), ['vat']); },
  async createWork(data) { return num(fromRow(ok(await supabase.from('work').insert(toRow({ no: 0, ...strip(data) })).select().single())), ['vat']); },
  async updateWork(id, patch) { return num(fromRow(ok(await supabase.from('work').update(toRow(strip(patch))).eq('id', id).select().single())), ['vat']); },
  async deleteWork(id) { ok(await supabase.from('work').delete().eq('id', id)); return true; },

  async listCustomers() { return ok(await supabase.from('customers').select('*').order('name')).map(fromRow); },
  async saveCustomer(c) {
    const q = c.id ? supabase.from('customers').update(toRow(strip(c))).eq('id', c.id) : supabase.from('customers').insert(toRow(strip(c)));
    return fromRow(ok(await q.select().single()));
  },
  async deleteCustomer(id) { ok(await supabase.from('customers').delete().eq('id', id)); return true; },

  async listPrices() { return ok(await supabase.from('price_items').select('*').order('description')).map(r => num(fromRow(r), ['rate'])); },
  async savePrice(p) {
    const q = p.id ? supabase.from('price_items').update(toRow(strip(p))).eq('id', p.id) : supabase.from('price_items').insert(toRow(strip(p)));
    return num(fromRow(ok(await q.select().single())), ['rate']);
  },
  async deletePrice(id) { ok(await supabase.from('price_items').delete().eq('id', id)); return true; },

  async getPublicQuote(token) { const d = ok(await supabase.rpc('get_public_quote', { p_token: token })); return d ? num(d, ['vat']) : null; },
  async approvePublicQuote(token, name) { return ok(await supabase.rpc('approve_public_quote', { p_token: token, p_name: name })); },
  async requestChange(token, note) { return ok(await supabase.rpc('request_quote_change', { p_token: token, p_note: note })); }
};
