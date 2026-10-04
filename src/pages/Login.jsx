import { useState } from 'react';
import { useAuth } from '../lib/auth.jsx';
import { useT } from '../lib/i18n.jsx';
import { LangButton, LangDialog, Logo, ThemeButton } from '../components/ui.jsx';

export default function Login() {
  const { signIn, signUp, resetPassword } = useAuth();
  const { t } = useT();
  const [mode, setMode] = useState('in');
  const [email, setEmail] = useState('');
  const [pw, setPw] = useState('');
  const [err, setErr] = useState('');
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);
  const [langOpen, setLangOpen] = useState(false);
  const submit = async e => {
    e.preventDefault(); setErr(''); setMsg('');
    if (!/^\S+@\S+\.\S+$/.test(email)) return setErr(t('li.errEmail'));
    if (mode !== 'reset' && pw.length < 8) return setErr(t('li.errPw'));
    setBusy(true);
    try {
      if (mode === 'in') await signIn(email, pw);
      if (mode === 'up') { const r = await signUp(email, pw); if (r.needsConfirm) setMsg(t('li.confirm')); }
      if (mode === 'reset') { await resetPassword(email); setMsg(t('li.resetSent')); }
    } catch (er) { setErr(er.message); } finally { setBusy(false); }
  };
  return (
    <div className="auth">
      <div className="auth-art">
        <div className="brand" style={{ padding: 0, color: 'var(--bg)' }}><Logo height={30} /></div>
        <div><h2>{t('li.h1')}<br />{t('li.h2')}<br />{t('li.h3')}</h2><div className="line" /></div>
        <p style={{ opacity: .7, maxWidth: 360 }}>{t('li.tagline')}</p>
      </div>
      <div className="auth-form">
        <form className="auth-card" onSubmit={submit} noValidate>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
            <h1>{mode === 'in' ? t('li.in') : mode === 'up' ? t('li.up') : t('li.reset')}</h1>
            <span style={{ display: 'flex', gap: 8 }}><LangButton onClick={() => setLangOpen(true)} /><ThemeButton /></span>
          </div>
          <div className="field"><label htmlFor="l-email">{t('li.email')}</label><input className="inp" id="l-email" type="email" autoComplete="email" value={email} onChange={e => setEmail(e.target.value)} /></div>
          {mode !== 'reset' && <div className="field"><label htmlFor="l-pw">{t('li.pw')}</label><input className="inp" id="l-pw" type="password" autoComplete={mode === 'in' ? 'current-password' : 'new-password'} value={pw} onChange={e => setPw(e.target.value)} /></div>}
          {err && <p className="err" role="alert">{err}</p>}
          {msg && <p className="note" role="status" style={{ color: 'var(--ok)', fontWeight: 600 }}>{msg}</p>}
          <button className="btn btn-chalk" type="submit" disabled={busy}>{mode === 'in' ? t('li.in') : mode === 'up' ? t('li.create') : t('li.sendReset')}</button>
          <p className="note">
            {mode === 'in' ? <>{t('li.new')} <button type="button" className="linkish" onClick={() => setMode('up')}>{t('li.createLink')}</button> · <button type="button" className="linkish" onClick={() => setMode('reset')}>{t('li.forgot')}</button></>
              : <>{t('li.have')} <button type="button" className="linkish" onClick={() => setMode('in')}>{t('li.in')}</button></>}
          </p>
        </form>
      </div>
      <LangDialog open={langOpen} onClose={() => setLangOpen(false)} />
    </div>
  );
}

// Shown after the person follows a password reset link.
export function SetPassword() {
  const { updatePassword } = useAuth();
  const { t } = useT();
  const [pw, setPw] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const submit = async e => {
    e.preventDefault(); setErr('');
    if (pw.length < 8) return setErr(t('li.errPw'));
    setBusy(true);
    try { await updatePassword(pw); } catch (er) { setErr(er.message); } finally { setBusy(false); }
  };
  return (
    <div className="auth-form" style={{ minHeight: '100dvh' }}>
      <form className="auth-card" onSubmit={submit} noValidate>
        <div className="brand" style={{ padding: 0 }}><Logo height={28} /></div>
        <h1>{t('li.newPw')}</h1>
        <div className="field"><label htmlFor="np">{t('li.newPwL')}</label><input className="inp" id="np" type="password" autoComplete="new-password" value={pw} onChange={e => setPw(e.target.value)} /></div>
        {err && <p className="err" role="alert">{err}</p>}
        <button className="btn btn-chalk" type="submit" disabled={busy}>{t('li.savePw')}</button>
      </form>
    </div>
  );
}
