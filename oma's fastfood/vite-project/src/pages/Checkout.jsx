import { useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useApp } from '../lib/store.jsx';
import { useUI } from '../lib/ui.jsx';
import { api, money } from '../lib/api.js';
import { useSeo } from '../lib/seo.js';
import { CouponBox, Summary } from '../components/CartDrawer.jsx';

const genKey = () => (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `ord-${Date.now()}-${Math.random().toString(36).slice(2)}`);

export default function Checkout() {
  const { cart, cartSubtotal, settings, user, clearCart, notify } = useApp();
  const { coupon, setCoupon } = useUI();
  const nav = useNavigate();
  useSeo({ title: 'Checkout' });
  const [orderType, setOrderType] = useState('delivery');
  const [f, setF] = useState({
    name: user?.name || '', phone: user?.phone || '', email: user?.email || '',
    address: user?.addresses?.[0]?.address || '', city: user?.addresses?.[0]?.city || '', area: user?.addresses?.[0]?.area || '',
    notes: '', tableNumber: ''
  });
  const [busy, setBusy] = useState(false); const [err, setErr] = useState('');
  const idem = useRef(genKey());

  if (cart.length === 0) {
    return <div className="container empty page"><h1>Your cart is empty</h1><p>Add something delicious from our menu first.</p><Link className="btn" to="/menu">Browse menu</Link></div>;
  }

  const set = (k) => (e) => setF(v => ({ ...v, [k]: e.target.value }));
  const pickAddr = (a) => setF(v => ({ ...v, address: a.address, city: a.city || '', area: a.area || '', notes: a.instructions || v.notes }));
  const min = settings?.minimumOrder || 0;

  const submit = async (e) => {
    e.preventDefault();
    setErr('');
    if (!f.name.trim() || !f.phone.trim()) {
      const msg = 'Please enter your full name and phone number.';
      setErr(msg); notify(msg, 'err'); window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    if (orderType === 'delivery' && !f.address.trim()) {
      const msg = 'Please enter your complete delivery address.';
      setErr(msg); notify(msg, 'err'); window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    setBusy(true);
    try {
      const r = await api('/orders', {
        method: 'POST',
        body: {
          orderType, tableNumber: orderType === 'dine-in' ? f.tableNumber : '',
          customer: { name: f.name.trim(), phone: f.phone.trim(), email: f.email.trim(), address: f.address.trim(), city: f.city.trim(), area: f.area.trim(), notes: f.notes.trim() },
          items: cart.map(l => ({ id: l.productId, quantity: l.quantity, size: l.size, toppings: l.toppings, cheese: l.cheese, instructions: l.instructions })),
          couponCode: coupon?.code || '',
          idempotencyKey: idem.current
        }
      });
      if (r.trackingToken) {
        try { sessionStorage.setItem(`track_${r.order.orderNumber}`, r.trackingToken); } catch { /* ignore */ }
      }
      try {
        const prev = JSON.parse(localStorage.getItem('omas_recent_orders') || '[]');
        const next = [{ orderNumber: r.order.orderNumber, token: r.trackingToken || '', total: r.order.grandTotal, createdAt: r.order.createdAt }, ...prev.filter(x => x.orderNumber !== r.order.orderNumber)].slice(0, 8);
        localStorage.setItem('omas_recent_orders', JSON.stringify(next));
      } catch { /* ignore */ }
      idem.current = genKey();
      clearCart(); setCoupon(null);
      notify(`Order #${r.order.orderNumber} confirmed & sent to moiiizyyy@gmail.com!`);
      nav(`/track/${r.order.orderNumber}?confirmed=1${r.trackingToken ? `&token=${r.trackingToken}` : ''}`, { state: { order: r.order } });
    } catch (x) {
      setErr(x.message);
      notify(x.message, 'err');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } finally { setBusy(false); }
  };

  return (
    <div className="container page">
      <h1>Confirm Your Order</h1>
      <p className="hint" style={{ marginBottom: 18 }}>Fill in your name, contact number, and complete delivery address. Your order details will be sent directly to Oma&apos;s Pizza.</p>
      <div className="checkout-grid">
        <form className="card" style={{ padding: 24 }} onSubmit={submit} noValidate>
          {err && <div className="form-error" role="alert">{err}</div>}
          <div className="seg" role="group" aria-label="Order type">
            {[['delivery', 'Delivery'], ['pickup', 'Pickup'], ['dine-in', 'Dine-in']].map(([k, l]) => (
              <button type="button" key={k} className={orderType === k ? 'on' : ''} onClick={() => setOrderType(k)}>{l}</button>
            ))}
          </div>

          {orderType === 'delivery' && user?.addresses?.length > 0 && (
            <div className="field">
              <label>Saved addresses</label>
              <div className="rail chips-rail">{user.addresses.map(a => <button type="button" key={a.id} className="chip" onClick={() => pickAddr(a)}>{a.label}: {a.address.slice(0, 26)}</button>)}</div>
            </div>
          )}

          <div className="row row-2">
            <div className="field"><label htmlFor="o-name">Full name *</label><input id="o-name" className="input" placeholder="e.g. Ali Khan" required value={f.name} onChange={set('name')} /></div>
            <div className="field"><label htmlFor="o-phone">Contact / Phone number *</label><input id="o-phone" type="tel" className="input" placeholder="e.g. 0300-1234567" required value={f.phone} onChange={set('phone')} /></div>
          </div>
          <div className="field"><label htmlFor="o-email">Email (optional)</label><input id="o-email" type="email" className="input" placeholder="you@example.com" value={f.email} onChange={set('email')} /></div>

          {orderType === 'delivery' && (
            <>
              <div className="field"><label htmlFor="o-addr">Full Delivery Address *</label><input id="o-addr" className="input" placeholder="House #, Street, Block / Landmark" required value={f.address} onChange={set('address')} /></div>
              <div className="row row-2">
                <div className="field"><label htmlFor="o-area">Area / Sector</label><input id="o-area" className="input" placeholder="e.g. Gulberg / DHA" value={f.area} onChange={set('area')} /></div>
                <div className="field"><label htmlFor="o-city">City</label><input id="o-city" className="input" placeholder="e.g. Lahore" value={f.city} onChange={set('city')} /></div>
              </div>
            </>
          )}
          {orderType === 'dine-in' && <div className="field"><label htmlFor="o-tbl">Table number</label><input id="o-tbl" className="input" placeholder="e.g. T4" value={f.tableNumber} onChange={set('tableNumber')} /></div>}
          <div className="field"><label htmlFor="o-notes">Delivery / Kitchen Notes</label><textarea id="o-notes" className="textarea" placeholder="Gate code, doorbell, extra ketchup or spicy preference..." value={f.notes} onChange={set('notes')} /></div>

          <div className="form-ok">Payment method: <b>{orderType === 'delivery' ? 'Cash on Delivery (COD)' : orderType === 'pickup' ? 'Cash at Pickup' : 'Pay at Table (Cash)'}</b></div>
          <button type="submit" className="btn btn-lg btn-block" disabled={busy || cartSubtotal < min}>{busy ? 'Confirming order...' : 'Confirm Order'}</button>
        </form>

        <aside className="card" style={{ padding: 22, display: 'grid', gap: 16 }}>
          <h2 style={{ margin: 0 }}>Order summary</h2>
          {cart.map(l => (
            <div key={l.key} style={{ display: 'flex', justifyContent: 'space-between', gap: 10, fontSize: '.9rem' }}>
              <span>{l.quantity}x <b>{l.name}</b>{l.size ? ` (${l.size})` : ''}</span>
              <span>{money(l.unitPrice * l.quantity)}</span>
            </div>
          ))}
          <CouponBox />
          <Summary orderType={orderType} />
        </aside>
      </div>
    </div>
  );
}
