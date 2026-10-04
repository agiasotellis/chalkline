import { useState } from 'react';
import { useData } from '../lib/data.jsx';
import { useToast } from '../lib/toast.jsx';
import { eur } from '../lib/format.js';
import { Confirm, Icon, Modal } from '../components/ui.jsx';

const UNITS = ['ea', 'hr', 'm', 'm²', 'day', 'kg', 'l'];

export default function Prices() {
  const { prices, savePrice, deletePrice } = useData();
  const toast = useToast();
  const [form, setForm] = useState(null);
  const [del, setDel] = useState(null);
  const [err, setErr] = useState('');
  const [q, setQ] = useState('');
  const list = prices.filter(p => p.description.toLowerCase().includes(q.toLowerCase())).sort((a, b) => a.description.localeCompare(b.description));
  const save = async () => {
    if (!form.description?.trim()) return setErr('Add a description.');
    try { await savePrice({ ...form, description: form.description.trim(), rate: Number(form.rate) || 0 }); toast(form.id ? 'Price updated' : 'Price added'); setForm(null); }
    catch (e) { setErr(e.message); }
  };
  return (
    <div className="page">
      <div className="page-head">
        <div><h1>Price list</h1><p>Saved items you can drop into any quote.</p></div>
        <div className="head-actions"><button className="btn btn-chalk" onClick={() => { setErr(''); setForm({ description: '', unit: 'ea', rate: '' }); }}><Icon name="plus" />Add price</button></div>
      </div>
      <div className="toolbar"><label className="search"><Icon name="search" /><input className="inp" id="price-search" placeholder="Search prices" value={q} onChange={e => setQ(e.target.value)} aria-label="Search prices" /></label></div>
      <section className="panel">
        {list.length ? (
          <ul className="rows">
            {list.map(p => (
              <li key={p.id}><button className="row" type="button" onClick={() => { setErr(''); setForm({ ...p }); }} style={{ width: '100%', border: 0, background: 'none', textAlign: 'left', cursor: 'pointer' }}>
                <span className="r-t">{p.description}</span>
                <span className="r-r"><span className="r-amt num">{eur(p.rate)}</span><span className="r-s">per {p.unit}</span></span>
                <span className="r-s">Tap to edit</span>
              </button></li>
            ))}
          </ul>
        ) : <div className="empty">{q ? `No prices match “${q}”.` : 'No saved prices yet. Add the things you quote for most.'}</div>}
      </section>
      <Modal open={!!form} title={form?.id ? 'Edit price' : 'Add price'} onClose={() => setForm(null)}
        footer={<>{form?.id && <button className="btn btn-danger" style={{ marginRight: 'auto' }} onClick={() => { setDel(form); setForm(null); }}>Delete</button>}<button className="btn btn-ghost" onClick={() => setForm(null)}>Cancel</button><button className="btn btn-chalk" onClick={save}>Save price</button></>}>
        {form && <>
          <div className="field"><label htmlFor="p-desc">Description</label><input className="inp" id="p-desc" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="e.g. Fit mixer tap" /></div>
          <div className="grid2">
            <div className="field"><label htmlFor="p-rate">Rate €</label><input className="inp" id="p-rate" type="number" inputMode="decimal" min="0" step="0.5" value={form.rate} onChange={e => setForm({ ...form, rate: e.target.value })} /></div>
            <div className="field"><label htmlFor="p-unit">Per</label><select className="inp" id="p-unit" value={form.unit} onChange={e => setForm({ ...form, unit: e.target.value })}>{UNITS.map(u => <option key={u}>{u}</option>)}</select></div>
          </div>
          {err && <p className="err">{err}</p>}
        </>}
      </Modal>
      <Confirm open={!!del} title="Delete this price?" body={del ? `“${del.description}” will be removed from your price list. Existing quotes keep their lines.` : ''} confirmLabel="Delete price" danger
        onConfirm={async () => { await deletePrice(del.id); toast('Price deleted'); }} onClose={() => setDel(null)} />
    </div>
  );
}
