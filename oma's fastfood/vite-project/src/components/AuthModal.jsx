import { useEffect, useState } from 'react';
import { useApp } from '../lib/store.jsx';
import { useUI } from '../lib/ui.jsx';
import { api } from '../lib/api.js';
import { Icon } from './Navbar.jsx';

export default function AuthModal() {
  const { auth, closeAuth, openAuth, resetToken } = useUI();
  const { login, register, notify } = useApp();
  const [f, setF] = useState({ name: '', email: '', phone: '', password: '' });
  const [err, setErr] = useState(''); const [ok, setOk] = useState(''); const [busy, setBusy] = useState(false);
  useEffect(() => { setErr(''); setOk(''); }, [auth]);
  useEffect(() => {
    if (!auth) return;
    const k = (e) => e.key === 'Escape' && closeAuth();
    document.addEventListener('keydown', k); return () => document.removeEventListener('keydown', k);
  }, [auth, closeAuth]);
  if (!auth) return null;
  const set = (k) => (e) => setF(v => ({ ...v, [k]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault(); setErr(''); setOk(''); setBusy(true);
    try {
      if (auth === 'login') { const u = await login(f.email, f.password); notify(`Welcome back, ${u.name.split(' ')[0]}!`); closeAuth(); }
      else if (auth === 'register') { const u = await register({ name: f.name, email: f.email, phone: f.phone, password: f.password }); notify(`Welcome, ${u.name.split(' ')[0]}!`); closeAuth(); }
      else if (auth === 'forgot') {
        const r = await api('/auth/forgot-password', { method: 'POST', body: { email: f.email } });
        setOk(r.message + (r.devResetLink ? ` (dev link: ${r.devResetLink})` : ''));
      } else if (auth === 'reset') {
        await api('/auth/reset-password', { method: 'POST', body: { token: resetToken, password: f.password } });
        window.history.replaceState({}, '', window.location.pathname); setOk('Password updated. You can log in now.'); setTimeout(() => openAuth('login'), 1200);
      }
    } catch (x) { setErr(x.message); } finally { setBusy(false); }
  };
  const titles = { login: 'Welcome back', register: 'Create your account', forgot: 'Reset your password', reset: 'Choose a new password' };

  return (
    <div className="overlay" onClick={closeAuth} role="presentation">
      <div className="modal" role="dialog" aria-modal="true" aria-label={titles[auth]} onClick={e => e.stopPropagation()}>
        <div className="modal-head"><h2>{titles[auth]}</h2><button className="icon-btn" onClick={closeAuth} aria-label="Close"><Icon name="x" /></button></div>
        <form className="modal-body" onSubmit={submit} noValidate>
          {err && <div className="form-error" role="alert">{err}</div>}
          {ok && <div className="form-ok" role="status">{ok}</div>}
          {auth === 'register' && <div className="field"><label htmlFor="a-name">Full name</label><input id="a-name" className="input" autoComplete="name" required value={f.name} onChange={set('name')} /></div>}
          {auth !== 'reset' && <div className="field"><label htmlFor="a-email">Email</label><input id="a-email" type="email" className="input" autoComplete="email" required value={f.email} onChange={set('email')} /></div>}
          {auth === 'register' && <div className="field"><label htmlFor="a-phone">Phone</label><input id="a-phone" type="tel" className="input" autoComplete="tel" value={f.phone} onChange={set('phone')} /></div>}
          {auth !== 'forgot' && <div className="field"><label htmlFor="a-pw">{auth === 'reset' ? 'New password' : 'Password'}</label><input id="a-pw" type="password" className="input" autoComplete={auth === 'login' ? 'current-password' : 'new-password'} required minLength={auth === 'login' ? 1 : 8} value={f.password} onChange={set('password')} />{auth !== 'login' && <span className="hint">At least 8 characters, with a letter and a number.</span>}</div>}
          <button className="btn btn-lg btn-block" disabled={busy}>{busy ? 'Please wait...' : { login: 'Log in', register: 'Create account', forgot: 'Send reset link', reset: 'Update password' }[auth]}</button>
          <div className="auth-links">
            {auth === 'login' && <><button type="button" className="linklike" onClick={() => openAuth('forgot')}>Forgot password?</button><button type="button" className="linklike" onClick={() => openAuth('register')}>New here? Register</button></>}
            {auth === 'register' && <button type="button" className="linklike" onClick={() => openAuth('login')}>Already have an account? Log in</button>}
            {auth === 'forgot' && <button type="button" className="linklike" onClick={() => openAuth('login')}>Back to log in</button>}
          </div>
        </form>
      </div>
    </div>
  );
}

