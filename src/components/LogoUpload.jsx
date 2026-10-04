import { useRef, useState } from 'react';
import { useData } from '../lib/data.jsx';
import { useToast } from '../lib/toast.jsx';
import { Confirm } from './ui.jsx';
import { Upsell } from './Billing.jsx';
import { useBilling } from '../lib/billing.jsx';
import { useT } from '../lib/i18n.jsx';
import { tr } from '../lib/i18n-core.js';

const TYPES = ['image/png', 'image/jpeg', 'image/webp'];
const MAX_IN = 5 * 1024 * 1024;

// Shrink to fit 600×600, keep transparency. WebP where the browser can encode it, PNG otherwise.
function resize(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const k = Math.min(1, 600 / Math.max(img.naturalWidth, img.naturalHeight));
      const w = Math.max(1, Math.round(img.naturalWidth * k)), h = Math.max(1, Math.round(img.naturalHeight * k));
      const c = document.createElement('canvas'); c.width = w; c.height = h;
      c.getContext('2d').drawImage(img, 0, 0, w, h);
      URL.revokeObjectURL(url);
      c.toBlob(b => (b ? resolve(b) : reject(new Error(tr('lo.errProc')))), 'image/webp', 0.92);
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error(tr('lo.errRead'))); };
    img.src = url;
  });
}

export default function LogoUpload() {
  const { settings, setLogo } = useData();
  const toast = useToast();
  const { t } = useT();
  const input = useRef(null);
  const [over, setOver] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [confirm, setConfirm] = useState(false);
  const logo = settings?.logoUrl;
  const canLogo = useBilling().can('logo');

  const take = async file => {
    setErr('');
    if (!file) return;
    if (!TYPES.includes(file.type)) return setErr(t('lo.errType'));
    if (file.size > MAX_IN) return setErr(t('lo.errSize'));
    setBusy(true);
    try { await setLogo(await resize(file)); toast(t('lo.updated')); }
    catch (e) { setErr(e.message); }
    finally { setBusy(false); if (input.current) input.current.value = ''; }
  };
  const remove = async () => {
    setBusy(true);
    try { await setLogo(null); toast(t('lo.removed')); } catch (e) { setErr(e.message); } finally { setBusy(false); }
  };

  if (!canLogo) return <Upsell feature="logo" />;
  return (
    <div className="logo-row">
      <button type="button" className={`logo-drop${over ? ' over' : ''}${busy ? ' busy' : ''}`} aria-label={logo ? t('lo.replace') : t('lo.upload')}
        onClick={() => input.current?.click()}
        onDragOver={e => { e.preventDefault(); setOver(true); }} onDragLeave={() => setOver(false)}
        onDrop={e => { e.preventDefault(); setOver(false); take(e.dataTransfer.files?.[0]); }}>
        {logo ? <img src={logo} alt={t('lo.alt')} key={logo} />
          : <span className="ph"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 16V4M7 9l5-5 5 5M4 16v3a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-3" /></svg>{t('lo.drop')}</span>}
        {busy && <span className="spin" aria-label={t('lo.uploading')} />}
      </button>
      <div className="logo-info">
        <div><b>{t('lo.title')}</b><p className="note">{t('lo.help')}</p></div>
        <div className="logo-btns">
          <button type="button" className="btn btn-ghost btn-sm" disabled={busy} onClick={() => input.current?.click()}>{logo ? t('lo.replace') : t('lo.upload')}</button>
          {logo && <button type="button" className="btn btn-danger btn-sm" disabled={busy} onClick={() => setConfirm(true)}>{t('lo.remove')}</button>}
        </div>
        {err && <p className="err" role="alert">{err}</p>}
      </div>
      <input ref={input} id="logo-file" type="file" accept="image/png,image/jpeg,image/webp" hidden onChange={e => take(e.target.files?.[0])} />
      <Confirm open={confirm} title={t('lo.cfT')} body={t('lo.cfB')} confirmLabel={t('lo.cfC')} danger onConfirm={remove} onClose={() => setConfirm(false)} />
    </div>
  );
}
