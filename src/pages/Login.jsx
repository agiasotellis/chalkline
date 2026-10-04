import { useState } from 'react';
import { useAuth } from '../lib/auth.jsx';
import { Logo, ThemeButton } from '../components/ui.jsx';

export default function Login() {
  const { signIn, signUp, resetPassword } = useAuth();
  const [mode, setMode] = useState('in');
  const [email, setEmail] = useState('');
  const [pw, setPw] = useState('');
  const [err, setErr] = useState('');
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);
  const submit = async e => {
    e.preventDefault(); setErr(''); setMsg('');
    if (!/^\S+@\S+\.\S+$/.test(email)) return setErr('Enter a valid email address.');
    if (mode !== 'reset' && pw.length < 8) return setErr('Use a password of at least 8 characters.');
    setBusy(true);
    try {
      if (mode === 'in') await signIn(email, pw);
      if (mode === 'up') { const r = await signUp(email, pw); if (r.needsConfirm) setMsg('Check your email and tap the link to confirm your account.'); }
      if (mode === 'reset') { await resetPassword(email); setMsg('We’ve emailed you a link to reset your password.'); }
    } catch (er) { setErr(er.message); } finally { setBusy(false); }
  };
  return (
    <div className="auth">
      <div className="auth-art">
        <div className="brand" style={{ padding: 0, color: 'var(--bg)' }}><Logo />Chalkline</div>
        <div><h2>Quote it.<br />Do it.<br />Get paid.</h2><div className="line" /></div>
        <p style={{ opacity: .7, maxWidth: 360 }}>Quotes your customers approve online, jobs with checklists and invoices that write themselves.</p>
      </div>
      <div className="auth-form">
        <form className="auth-card" onSubmit={submit} noValidate>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h1>{mode === 'in' ? 'Sign in' : mode === 'up' ? 'Start your free trial' : 'Reset password'}</h1><ThemeButton />
          </div>
          <div className="field"><label htmlFor="l-email">Email</label><input className="inp" id="l-email" type="email" autoComplete="email" value={email} onChange={e => setEmail(e.target.value)} /></div>
          {mode !== 'reset' && <div className="field"><label htmlFor="l-pw">Password</label><input className="inp" id="l-pw" type="password" autoComplete={mode === 'in' ? 'current-password' : 'new-password'} value={pw} onChange={e => setPw(e.target.value)} /></div>}
          {err && <p className="err" role="alert">{err}</p>}
          {msg && <p className="note" role="status" style={{ color: 'var(--ok)', fontWeight: 600 }}>{msg}</p>}
          <button className="btn btn-chalk" type="submit" disabled={busy}>{mode === 'in' ? 'Sign in' : mode === 'up' ? 'Create account' : 'Send reset link'}</button>
          <p className="note">
            {mode === 'in' ? <>New to Chalkline? <button type="button" className="linkish" onClick={() => setMode('up')}>Create an account</button> · <button type="button" className="linkish" onClick={() => setMode('reset')}>Forgot password</button></>
              : <>Already have an account? <button type="button" className="linkish" onClick={() => setMode('in')}>Sign in</button></>}
          </p>
        </form>
      </div>
    </div>
  );
}
