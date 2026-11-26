import { useCallback, useEffect, useState } from 'react';
import { Link, useLocation, useParams, useSearchParams } from 'react-router-dom';
import { api, money } from '../lib/api.js';
import { on, onResync, trackOrders } from '../lib/realtime.js';
import { useSeo } from '../lib/seo.js';
import { Icon } from '../components/Navbar.jsx';

const STEPS_DELIVERY = ['Pending', 'Confirmed', 'Preparing', 'Out for Delivery', 'Delivered'];
const STEPS_PICKUP = ['Pending', 'Confirmed', 'Preparing', 'Ready for Pickup', 'Delivered'];

export default function Track() {
  const { num } = useParams();
  const [sp] = useSearchParams();
  const loc = useLocation();
  const confirmed = sp.get('confirmed') === '1';
  useSeo({ title: confirmed ? `Order Confirmed #${num}` : num ? `Order ${num}` : 'Track order' });
  const [input, setInput] = useState(num || '');
  const [order, setOrder] = useState(loc.state?.order || null);
  const [loading, setLoading] = useState(!!num && !loc.state?.order);
  const [err, setErr] = useState('');
  const [recent] = useState(() => {
    try { return JSON.parse(localStorage.getItem('omas_recent_orders') || '[]'); } catch { return []; }
  });

  const tokenParam = sp.get('token') || '';
  const storedToken = num ? (sessionStorage.getItem(`track_${num}`) || recent.find(x => x.orderNumber === num)?.token || '') : '';
  const activeToken = tokenParam || storedToken;

  const fetchOrder = useCallback(async (orderNum = num, explicitToken = '') => {
    if (!orderNum) return;
    setLoading(true); setErr('');
    try {
      const tk = explicitToken || tokenParam || sessionStorage.getItem(`track_${orderNum}`) || recent.find(x => x.orderNumber === orderNum)?.token || '';
      const q = tk ? `?token=${encodeURIComponent(tk)}` : '';
      const r = await api(`/orders/track/${encodeURIComponent(orderNum)}${q}`);
      setOrder(r.order);
      if (tk) trackOrders([{ orderNumber: orderNum, token: tk }]);
    } catch (e) { setErr(e.message); setOrder(null); } finally { setLoading(false); }
  }, [num, tokenParam, recent]);

  useEffect(() => {
    if (num && !loc.state?.order) fetchOrder(num);
  }, [num, loc.state?.order, fetchOrder]);

  useEffect(() => {
    if (num && activeToken) trackOrders([{ orderNumber: num, token: activeToken }]);
  }, [num, activeToken]);

  useEffect(() => {
    if (!order) return;
    const offs = [
      on('order:status', (d) => { if (d.orderNumber === order.orderNumber) setOrder(o => (o ? { ...o, status: d.status, paymentStatus: d.paymentStatus || o.paymentStatus } : o)); }),
      onResync(() => fetchOrder(order.orderNumber))
    ];
    return () => offs.forEach(f => f());
  }, [order, fetchOrder]);

  const steps = order?.orderType === 'delivery' ? STEPS_DELIVERY : STEPS_PICKUP;
  const idx = order ? steps.indexOf(order.status) : -1;
  const fullAddr = order ? [order.customer?.address, order.customer?.area, order.customer?.city].filter(Boolean).join(', ') : '';

  return (
    <div className="container page" style={{ maxWidth: 740 }}>
      {confirmed && order && (
        <div className="card confirm-banner anim-rise">
          <div className="confirm-ico"><Icon name="check" size={28} /></div>
          <div>
            <h1>Order Confirmed!</h1>
            <p style={{ margin: 0 }}>
              Thank you, <b>{order.customer?.name}</b>! Your order <b>#{order.orderNumber}</b> has been confirmed and sent to <b>moiiizyyy@gmail.com</b> so our kitchen can start preparing it right away.
            </p>
          </div>
        </div>
      )}

      {!confirmed && (
        <>
          <h1>Track your order</h1>
          <form className="coupon" style={{ marginBottom: 16 }} onSubmit={(e) => { e.preventDefault(); fetchOrder(input.trim()); }}>
            <input className="input" placeholder="Order number (e.g. OMA-1000001)" value={input} onChange={e => setInput(e.target.value)} />
            <button className="btn">Track</button>
          </form>
          {recent.length > 0 && (
            <div style={{ marginBottom: 20 }}>
              <p className="hint" style={{ marginBottom: 8 }}>Your recent orders (tap to view live status):</p>
              <div className="rail chips-rail">
                {recent.map(r => (
                  <button key={r.orderNumber} type="button" className={`chip ${order?.orderNumber === r.orderNumber ? 'active' : ''}`} onClick={() => { setInput(r.orderNumber); fetchOrder(r.orderNumber, r.token); }}>
                    #{r.orderNumber} · {money(r.total)}
                  </button>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {err && <div className="form-error">{err}</div>}
      {loading && <div className="spinner" />}

      {order && (
        <div className="card anim-rise" style={{ padding: 24, display: 'grid', gap: 18 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10, borderBottom: '1px solid var(--line)', paddingBottom: 14 }}>
            <div>
              <h2 style={{ margin: 0 }}>Order #{order.orderNumber}</h2>
              <p className="hint" style={{ margin: 0 }}>{new Date(order.createdAt).toLocaleString()} · <span style={{ textTransform: 'capitalize' }}>{order.orderType}</span></p>
            </div>
            <span className={`badge ${order.status === 'Cancelled' ? 'badge-danger' : order.status === 'Delivered' ? 'badge-green' : 'badge-red'}`}>{order.status}</span>
          </div>

          <div className="cust-box">
            <h3>Customer &amp; Delivery Details</h3>
            <div className="cust-grid">
              <div><small>Customer Name</small><b>{order.customer?.name}</b></div>
              <div><small>Contact / Phone</small><b>{order.customer?.phone}</b></div>
              {order.customer?.email && <div><small>Email</small><b>{order.customer.email}</b></div>}
              <div><small>Payment Method</small><b>{order.paymentMethod === 'cash_on_delivery' ? 'Cash on Delivery' : order.paymentMethod === 'cash_at_pickup' ? 'Cash at Pickup' : 'Cash'}</b></div>
              {fullAddr && <div style={{ gridColumn: '1 / -1' }}><small>Full Delivery Address</small><b>{fullAddr}</b></div>}
              {order.tableNumber && <div><small>Table</small><b>{order.tableNumber}</b></div>}
              {order.customer?.notes && <div style={{ gridColumn: '1 / -1' }}><small>Special Notes</small><b>{order.customer.notes}</b></div>}
            </div>
          </div>

          <div>
            <h3>Ordered Items</h3>
            {order.items.map((i, k) => (
              <div key={k} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px dashed var(--line)' }}>
                <span><b>{i.quantity}x</b> {i.name}{i.size ? ` (${i.size})` : ''}{i.toppings?.length ? ` · ${i.toppings.join(', ')}` : ''}</span>
                <b>{money(i.lineTotal)}</b>
              </div>
            ))}
            <div style={{ display: 'grid', gap: 4, marginTop: 12, fontSize: '.92rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Subtotal</span><span>{money(order.subtotal)}</span></div>
              {order.discount > 0 && <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--basil)' }}><span>Discount</span><span>-{money(order.discount)}</span></div>}
              {order.deliveryFee > 0 && <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Delivery Fee</span><span>{money(order.deliveryFee)}</span></div>}
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1.14rem', fontWeight: 800, paddingTop: 8, borderTop: '1px solid var(--line)' }}>
                <span>Grand Total</span><span>{money(order.grandTotal)}</span>
              </div>
            </div>
          </div>

          {order.status === 'Cancelled' ? (
            <div className="form-error">This order was cancelled.</div>
          ) : (
            <div>
              <h3>Live Order Status</h3>
              <div className="steps">
                {steps.map((s, i) => <div key={s} className={`step ${i < idx ? 'done' : i === idx ? 'curr' : ''}`}><span>{i < idx ? '✓' : i + 1}.</span> {s}</div>)}
              </div>
            </div>
          )}

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
            <button type="button" className="btn btn-ghost" onClick={() => window.print()}>Print Order Receipt</button>
            <Link className="btn" to="/menu">Order More Food</Link>
          </div>
        </div>
      )}
    </div>
  );
}
