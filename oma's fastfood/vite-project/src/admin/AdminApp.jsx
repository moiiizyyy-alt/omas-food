import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useApp } from '../lib/store.jsx';
import { AdminCtx } from './components/hooks';
import '../styles/admin.css';

import Products from './sections/Products.jsx';
import Categories from './sections/Categories.jsx';
import Orders from './sections/Orders.jsx';

function StaffLogin() {
  const { login, user, logout, settings } = useApp();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  if (user && !['superadmin', 'manager', 'cashier', 'kitchen'].includes(user.role)) {
    return (
      <div className="adm-login-wrap">
        <div className="card adm-login" style={{ textAlign: 'center' }}>
          <h1>Admin access only</h1>
          <p className="adm-muted" style={{ marginBottom: 18 }}>You are signed in as {user.email}.</p>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
            <Link className="btn btn-ghost" to="/">Back to website</Link>
            <button className="btn" onClick={logout}>Log out</button>
          </div>
        </div>
      </div>
    );
  }

  const submit = async (e) => {
    e.preventDefault(); setErr(''); setBusy(true);
    try { await login(email, password); }
    catch (x) { setErr(x.message); } finally { setBusy(false); }
  };

  return (
    <div className="adm-login-wrap">
      <form className="card adm-login anim-rise" onSubmit={submit}>
        <span className="badge badge-red" style={{ marginBottom: 8 }}>{settings?.restaurantName || "Oma's Pizza"}</span>
        <h1>Admin Panel Login</h1>
        <p className="adm-muted" style={{ marginBottom: 18 }}>Sign in to add, edit, delete items, change prices &amp; upload photos</p>
        {err && <div className="form-error" role="alert">{err}</div>}
        <div className="field"><label htmlFor="sl-email">Admin Email</label><input id="sl-email" type="email" className="input" placeholder="admin@omas.com" required value={email} onChange={e => setEmail(e.target.value)} /></div>
        <div className="field"><label htmlFor="sl-pw">Password</label><input id="sl-pw" type="password" className="input" placeholder="Enter password" required value={password} onChange={e => setPassword(e.target.value)} /></div>
        <button type="submit" className="btn btn-lg btn-block" disabled={busy}>{busy ? 'Signing in...' : 'Sign in to Admin Panel'}</button>
        <p style={{ textAlign: 'center', marginTop: 14, marginBottom: 0 }}><Link className="linklike" to="/">← Back to website</Link></p>
      </form>
    </div>
  );
}

export default function AdminApp() {
  const { user, isStaff, logout, settings, live, notify, toast } = useApp();
  const [tab, setTab] = useState('products');

  const perms = useMemo(() => new Set(user?.permissions || []), [user]);
  const can = (p) => perms.has(p);

  if (user === undefined) return <div className="adm-login-wrap"><div className="spinner" /></div>;
  if (!user || !isStaff) return <StaffLogin />;

  const tabs = [
    can('products.manage') && ['products', 'Products & Menu'],
    can('categories.manage') && ['categories', 'Categories'],
    can('orders.view') && ['orders', 'Live Orders']
  ].filter(Boolean);

  const activeTab = tabs.some(([k]) => k === tab) ? tab : (tabs[0]?.[0] || 'products');

  return (
    <AdminCtx.Provider value={{ user, can, toast: notify }}>
      <div className="adm-noside">
        <header className="adm-top">
          <div className="adm-top-l">
            <span className={`live-dot ${live}`} title={`Live sync: ${live}`} />
            <strong style={{ fontSize: '1rem', fontFamily: 'var(--font-display)' }}>{settings?.restaurantName || "Oma's Pizza"}</strong>
            <span className="badge badge-red">Admin Panel</span>
          </div>

          <nav className="adm-top-tabs" aria-label="Admin sections">
            {tabs.map(([k, label]) => (
              <button key={k} type="button" className={`chip ${activeTab === k ? 'active' : ''}`} onClick={() => setTab(k)}>
                {label}
              </button>
            ))}
          </nav>

          <div className="adm-top-r">
            <Link className="btn btn-sm btn-ghost" to="/">View Website</Link>
            <button type="button" className="btn btn-sm btn-dark" onClick={logout}>Log out</button>
          </div>
        </header>

        <main className="adm-body">
          {activeTab === 'products' && <Products />}
          {activeTab === 'categories' && <Categories />}
          {activeTab === 'orders' && <Orders />}
        </main>
      </div>
      {toast && <div className={`toast ${toast.type === 'err' ? 'err' : ''}`} role="status">{toast.message}</div>}
    </AdminCtx.Provider>
  );
}
