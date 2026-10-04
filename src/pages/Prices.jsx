import { useState } from 'react';
import { useData } from '../lib/data.jsx';
import { useToast } from '../lib/toast.jsx';
import { useT } from '../lib/i18n.jsx';
import { money, unitLabel } from '../lib/format.js';
import { Confirm, Icon, Modal } from '../components/ui.jsx';
import { UNITS } from './Editor.jsx';
import { Upsell } from '../components/Billing.jsx';
import { useBilling } from '../lib/billing.jsx';

export default function Prices() {
  const { prices, savePrice, deletePrice } = useData();
  const { t, lang, locale } = useT();
  const toast = useToast();
  const [form, setForm] = useState(null);
  const [del, setDel] = useState(null);
  const [err, setErr] = useState('');
  const [q, setQ] = useState('');
  const locked = !useBilling().can('prices');
  const list = prices.filter(p => p.description.toLowerCase().includes(q.toLowerCase())).sort((a, b) => a.description.localeCompare(b.description, locale.intl));
  const units = u => (UNITS[lang].includes(u) ? UNITS[lang] : [...UNITS[lang], u]);
  const save = async () => {
    if (!form.description?.trim()) return setErr(t('pr.errDesc'));
    try { await savePrice({ ...form, description: form.description.trim(), rate: Number(form.rate) || 0 }); toast(form.id ? t('pr.updated') : t('pr.added')); setForm(null); }
    catch (e) { setErr(e.message); }
  };
  return (
    <div className="page">
      <div className="page-head">
        <div><h1>{t('pr.title')}</h1><p>{t('pr.sub')}</p></div>
        <div className="head-actions"><button className="btn btn-chalk" disabled={locked} onClick={() => { setErr(''); setForm({ description: '', unit: 'ea', rate: '' }); }}><Icon name="plus" />{t('pr.add')}</button></div>
      </div>
      {locked && <Upsell feature="prices" />}
      <div className="toolbar"><label className="search"><Icon name="search" /><input className="inp" id="price-search" placeholder={t('pr.search')} value={q} onChange={e => setQ(e.target.value)} aria-label={t('pr.search')} /></label></div>
      <section className="panel">
        {list.length ? (
          <ul className="rows">
            {list.map(p => (
              <li key={p.id}><button className="row" type="button" onClick={() => { setErr(''); setForm({ ...p }); }} style={{ width: '100%', border: 0, background: 'none', textAlign: 'left', cursor: 'pointer' }}>
                <span className="r-t">{p.description}</span>
                <span className="r-r"><span className="r-amt num">{money(p.rate)}</span><span className="r-s">{t('pr.per', { unit: unitLabel(p.unit) })}</span></span>
                <span className="r-s">{t('pr.tapEdit')}</span>
              </button></li>
            ))}
          </ul>
        ) : <div className="empty">{q ? t('pr.noMatch', { q }) : t('pr.empty')}</div>}
      </section>
      <Modal open={!!form} title={form?.id ? t('pr.editT') : t('pr.add')} onClose={() => setForm(null)}
        footer={<>{form?.id && <button className="btn btn-danger" style={{ marginRight: 'auto' }} onClick={() => { setDel(form); setForm(null); }}>{t('pr.delC')}</button>}<button className="btn btn-ghost" onClick={() => setForm(null)}>{t('c.cancel')}</button><button className="btn btn-chalk" onClick={save}>{t('pr.save')}</button></>}>
        {form && <>
          <div className="field"><label htmlFor="p-desc">{t('pr.desc')}</label><input className="inp" id="p-desc" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder={t('pr.descPh')} /></div>
          <div className="grid2">
            <div className="field"><label htmlFor="p-rate">{t('ed.rate', { cur: locale.symbol })}</label><input className="inp" id="p-rate" type="number" inputMode="decimal" min="0" step="0.5" value={form.rate} onChange={e => setForm({ ...form, rate: e.target.value })} /></div>
            <div className="field"><label htmlFor="p-unit">{t('pr.perL')}</label><select className="inp" id="p-unit" value={form.unit} onChange={e => setForm({ ...form, unit: e.target.value })}>{units(form.unit).map(u => <option key={u} value={u}>{unitLabel(u)}</option>)}</select></div>
          </div>
          {err && <p className="err">{err}</p>}
        </>}
      </Modal>
      <Confirm open={!!del} title={t('pr.delT')} body={del ? t('pr.delB', { d: del.description }) : ''} confirmLabel={t('pr.delC')} danger
        onConfirm={async () => { await deletePrice(del.id); toast(t('pr.deleted')); }} onClose={() => setDel(null)} />
    </div>
  );
}
