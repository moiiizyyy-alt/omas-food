import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useApp } from '../lib/store.jsx';
import { useUI } from '../lib/ui.jsx';
import { api, money } from '../lib/api.js';
import { on } from '../lib/realtime.js';
import { useSeo } from '../lib/seo.js';

export default function Account() {
  const { user, setUser, logout, notify } = useApp();
  const { openAuth } = useUI();
  useSeo({ title: 'My account' });
  const [tab, setTab] = useState('orders');
  const [orders, setOrders] = useState([]);
  const [resv, setResv] = useState([]);
  const [prof, setProf] = useState({ name: '', email: '', phone: '' });
  const [addr, setAddr] = useState({ label: 'Home', address: '', city: '', area: '' });
  const [rev, setRev] = useState(null);
  const [revForm, setRevForm] = useState({ rating: 5, comment: '' });
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!user) return;
    setProf({ name: user.name, email: user.email, phone: user.phone || '' });
    api('/orders/mine').then(r => setOrders(r.orders)).catch(() => {});
    api('/reservations/mine').then(r => setResv(r.reservations)).catch(() => {});
    const offs = [
      on('order:status', (d) => setOrders(list => list.map(o => (o.orderNumber === d.orderNumber ? { ...o, status: d.status } : o)))),
      on('reservation:status', (d) => setResv(list => list.map(r => (r._id === d.id ? { ...r, status: d.status } : r))))
    ];
    return () => offs.forEach(f => f());
  }, [user]);

  if (user === undefined) return <div className="container empty page"><div className="spinner" /></div>;
  if (!user) return <div className="container empty page"><h1>Sign in to your account</h1><p>View orders, saved addresses and reservations across any device.</p><button className="btn" onClick={() => openAuth('login')}>Log in / Register</button></div>;

  const saveProf = async (e) => {
    e.preventDefault(); setBusy(true);
    try { const r = await api('/auth/me', { method: 'PATCH', body: prof }); setUser(r.user); notify('Profile saved'); }
    catch (x) { notify(x.message, 'err'); } finally { setBusy(false); }
  };
  const addAddr = async (e) => {
    e.preventDefault(); setBusy(true);
    try { const r = await api('/auth/me/addresses', { method: 'POST', body: addr }); setUser(r.user); setAddr({ label: 'Home', address: '', city: '', area: '' }); notify('Address saved'); }
    catch (x) { notify(x.message, 'err'); } finally { setBusy(false); }
  };
  const delAddr = async (id) => {
    try { const r = await api(`/auth/me/addresses/${id}`, { method: 'DELETE' }); setUser(r.user); notify('Address removed'); }
    catch (x) { notify(x.message, 'err'); }
  };
  const submitReview = async (e) => {
    e.preventDefault();
    try { await api('/reviews', { method: 'POST', body: { orderId: rev, rating: revForm.rating, comment: revForm.comment } }); notify('Review submitted for moderation!'); setRev(null); setRevForm({ rating: 5, comment: '' }); }
    catch (x) { notify(x.message, 'err'); }
  };

  return (
    <div className="container page">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12, marginBottom: 16 }}>
        <div><h1 style={{ margin: 0 }}>Hi, {user.name}</h1><p className="hint">{user.email}</p></div>
        <button className="btn btn-ghost btn-sm" onClick={logout}>Log out</button>
      </div>
      <div className="tabs">
        {[['orders', `Orders (${orders.length})`], ['reservations', `Reservations (${resv.length})`], ['addresses', 'Addresses'], ['profile', 'Profile']].map(([k, l]) => (
          <button key={k} className={tab === k ? 'on' : ''} onClick={() => setTab(k)}>{l}</button>
        ))}
      </div>

      {tab === 'orders' && (orders.length === 0 ? <p className="empty">No orders yet. <Link className="linklike" to="/menu">Order now</Link></p> : (
        <div style={{ display: 'grid', gap: 12 }}>
          {orders.map(o => (
            <div className="card" style={{ padding: 18, display: 'grid', gap: 8 }} key={o.id}>
              <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
                <b>#{o.orderNumber} <small className="hint">· {new Date(o.createdAt).toLocaleString()}</small></b>
                <span className={`badge ${o.status === 'Delivered' ? 'badge-green' : o.status === 'Cancelled' ? 'badge-danger' : 'badge-red'}`}>{o.status}</span>
              </div>
              <p className="hint" style={{ margin: 0 }}>{o.items.map(i => `${i.quantity}x ${i.name}`).join(', ')}</p>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
                <b>{money(o.grandTotal)}</b>
                <div style={{ display: 'flex', gap: 8 }}>
                  <Link className="btn btn-sm btn-ghost" to={`/track/${o.orderNumber}`}>Track live</Link>
                  {o.status === 'Delivered' && <button className="btn btn-sm" onClick={() => setRev(o.id)}>Leave review</button>}
                </div>
              </div>
            </div>
          ))}
        </div>
      ))}

      {tab === 'reservations' && (resv.length === 0 ? <p className="empty">No reservations yet. <Link className="linklike" to="/reservations">Book a table</Link></p> : (
        <div style={{ display: 'grid', gap: 12 }}>
          {resv.map(r => (
            <div className="card" style={{ padding: 16, display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }} key={r._id}>
              <div><b>{r.reference}</b> · {r.date} at {r.time} ({r.guests} guests)</div>
              <span className={`badge ${r.status === 'Confirmed' ? 'badge-green' : r.status === 'Cancelled' ? 'badge-danger' : 'badge-warn'}`}>{r.status}</span>
            </div>
          ))}
        </div>
      ))}

      {tab === 'addresses' && (
        <div className="checkout-grid">
          <div style={{ display: 'grid', gap: 10 }}>
            {(user.addresses || []).length === 0 ? <p className="hint">No saved addresses yet.</p> : user.addresses.map(a => (
              <div className="card" style={{ padding: 14, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }} key={a.id}>
                <div><b>{a.label}</b><p className="hint" style={{ margin: 0 }}>{[a.address, a.area, a.city].filter(Boolean).join(', ')}</p></div>
                <button className="btn btn-sm btn-ghost" onClick={() => delAddr(a.id)}>Remove</button>
              </div>
            ))}
          </div>
          <form className="card" style={{ padding: 20 }} onSubmit={addAddr}>
            <h3>Add address</h3>
            <div className="field"><label>Label</label><input className="input" value={addr.label} onChange={e => setAddr(v => ({ ...v, label: e.target.value }))} /></div>
            <div className="field"><label>Street address</label><input className="input" required value={addr.address} onChange={e => setAddr(v => ({ ...v, address: e.target.value }))} /></div>
            <div className="row row-2">
              <div className="field"><label>Area</label><input className="input" value={addr.area} onChange={e => setAddr(v => ({ ...v, area: e.target.value }))} /></div>
              <div className="field"><label>City</label><input className="input" value={addr.city} onChange={e => setAddr(v => ({ ...v, city: e.target.value }))} /></div>
            </div>
            <button className="btn" disabled={busy}>Save address</button>
          </form>
        </div>
      )}

      {tab === 'profile' && (
        <form className="card" style={{ padding: 24, maxWidth: 520 }} onSubmit={saveProf}>
          <div className="field"><label>Name</label><input className="input" required value={prof.name} onChange={e => setProf(v => ({ ...v, name: e.target.value }))} /></div>
          <div className="field"><label>Email</label><input className="input" type="email" required value={prof.email} onChange={e => setProf(v => ({ ...v, email: e.target.value }))} /></div>
          <div className="field"><label>Phone</label><input className="input" value={prof.phone} onChange={e => setProf(v => ({ ...v, phone: e.target.value }))} /></div>
          <button className="btn" disabled={busy}>Save changes</button>
        </form>
      )}

      {rev && (
        <div className="overlay" onClick={() => setRev(null)}>
          <form className="modal" onClick={e => e.stopPropagation()} onSubmit={submitReview}>
            <div className="modal-head"><h2>Rate your order</h2></div>
            <div className="modal-body">
              <div className="field"><label>Rating (1-5)</label><select className="select" value={revForm.rating} onChange={e => setRevForm(v => ({ ...v, rating: Number(e.target.value) }))}>{[5, 4, 3, 2, 1].map(n => <option key={n} value={n}>{n} stars</option>)}</select></div>
              <div className="field"><label>Comment</label><textarea className="textarea" value={revForm.comment} onChange={e => setRevForm(v => ({ ...v, comment: e.target.value }))} /></div>
              <button className="btn btn-block">Submit review</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

