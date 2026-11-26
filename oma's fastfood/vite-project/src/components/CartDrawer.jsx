import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../lib/store.jsx';
import { useUI } from '../lib/ui.jsx';
import { api, money } from '../lib/api.js';
import { Thumb } from './FoodCard.jsx';
import { Icon } from './Navbar.jsx';

export function useTotals(orderType = 'delivery') {
  const { cartSubtotal, settings } = useApp();
  const { coupon } = useUI();
  const discount = coupon ? Math.min(coupon.discount, cartSubtotal) : 0;
  const s = settings || {};
  const free = s.freeDeliveryOver > 0 && cartSubtotal >= s.freeDeliveryOver;
  const delivery = orderType === 'delivery' && cartSubtotal > 0 && !free ? (s.deliveryFee || 0) : 0;
  const taxable = cartSubtotal - discount;
  const tax = Math.round(taxable * (s.taxRate || 0)) / 100;
  return { subtotal: cartSubtotal, discount, delivery, tax, total: taxable + tax + delivery, free };
}

export function CouponBox() {
  const { cartSubtotal, couponVersion, notify } = useApp();
  const { coupon, setCoupon } = useUI();
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  const apply = async (c = code) => {
    if (!c.trim()) return;
    setBusy(true); setErr('');
    try { const r = await api('/coupons/validate', { method: 'POST', body: { code: c, subtotal: cartSubtotal } }); setCoupon({ code: r.code, discount: r.discount }); setCode(''); notify(`Coupon ${r.code} applied`); }
    catch (e) { setErr(e.message); setCoupon(null); } finally { setBusy(false); }
  };
  // keep the discount honest when the cart or the admin's coupon changes
  useEffect(() => {
    if (!coupon) return;
    api('/coupons/validate', { method: 'POST', body: { code: coupon.code, subtotal: cartSubtotal } })
      .then(r => setCoupon(c => (c && c.discount !== r.discount ? { code: r.code, discount: r.discount } : c)))
      .catch(e => { setCoupon(null); setErr(e.message); });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cartSubtotal, couponVersion]);

  if (coupon) return <div className="coupon applied"><span><Icon name="check" size={16} /> <b>{coupon.code}</b> applied (-{money(coupon.discount)})</span><button className="linklike" onClick={() => setCoupon(null)}>Remove</button></div>;
  return (
    <div>
      <form className="coupon" onSubmit={(e) => { e.preventDefault(); apply(); }}>
        <input className="input" aria-label="Coupon code" placeholder="Coupon code" value={code} onChange={e => setCode(e.target.value.toUpperCase())} maxLength={30} />
        <button className="btn btn-dark btn-sm" disabled={busy || !code.trim()}>{busy ? '...' : 'Apply'}</button>
      </form>
      {err && <p className="hint err-text">{err}</p>}
    </div>
  );
}

export function Summary({ orderType }) {
  const t = useTotals(orderType);
  const { settings } = useApp();
  return (
    <dl className="summary">
      <div><dt>Subtotal</dt><dd>{money(t.subtotal)}</dd></div>
      {t.discount > 0 && <div className="disc"><dt>Discount</dt><dd>-{money(t.discount)}</dd></div>}
      {t.tax > 0 && <div><dt>Tax ({settings.taxRate}%)</dt><dd>{money(t.tax)}</dd></div>}
      {orderType !== 'pickup' && orderType !== 'dine-in' && <div><dt>Delivery</dt><dd>{t.delivery ? money(t.delivery) : 'Free'}</dd></div>}
      <div className="grand"><dt>Total</dt><dd>{money(t.total)}</dd></div>
    </dl>
  );
}

export default function CartDrawer() {
  const { cartOpen, closeCart } = useUI();
  const { cart, setQty, removeLine, clearCart, cartCount, cartSubtotal, settings } = useApp();
  const nav = useNavigate();
  useEffect(() => {
    if (!cartOpen) return;
    const k = (e) => e.key === 'Escape' && closeCart();
    document.addEventListener('keydown', k); document.body.style.overflow = 'hidden';
    return () => { document.removeEventListener('keydown', k); document.body.style.overflow = ''; };
  }, [cartOpen, closeCart]);
  if (!cartOpen) return null;
  const min = settings?.minimumOrder || 0;
  const bad = cart.some(l => !l.available);
  const go = () => { closeCart(); nav('/checkout'); };

  return (
    <div className="overlay drawer-overlay" onClick={closeCart} role="presentation">
      <aside className="drawer" role="dialog" aria-modal="true" aria-label="Shopping cart" onClick={e => e.stopPropagation()}>
        <div className="modal-head"><h2>Your cart {cartCount > 0 && <small>({cartCount})</small>}</h2><button className="icon-btn" onClick={closeCart} aria-label="Close cart"><Icon name="x" /></button></div>
        <div className="drawer-body">
          {cart.length === 0 ? (
            <div className="empty"><Icon name="bag" size={40} /><p>Your cart is empty.</p><button className="btn" onClick={() => { closeCart(); nav('/menu'); }}>Browse the menu</button></div>
          ) : cart.map(l => (
            <div className={`cline ${l.available ? '' : 'gone'}`} key={l.key}>
              <div className="cline-img"><Thumb src={l.image} alt={l.name} ratio="1 / 1" /></div>
              <div className="cline-main">
                <b>{l.name}</b>
                <small>{[l.size, l.cheese, ...(l.toppings || [])].filter(Boolean).join(' | ')}</small>
                {l.instructions && <small className="note">Note: {l.instructions}</small>}
                {!l.available && <small className="err-text">{l.missing ? 'No longer on the menu' : 'Currently unavailable'} - remove to continue</small>}
                <div className="cline-row">
                  <div className="qty sm" role="group" aria-label={`Quantity of ${l.name}`}>
                    <button onClick={() => setQty(l.key, l.quantity - 1)} aria-label="Decrease"><Icon name="minus" size={14} /></button>
                    <output>{l.quantity}</output>
                    <button onClick={() => setQty(l.key, l.quantity + 1)} aria-label="Increase"><Icon name="plus" size={14} /></button>
                  </div>
                  <b>{money(l.unitPrice * l.quantity)}</b>
                </div>
              </div>
              <button className="icon-btn" onClick={() => removeLine(l.key)} aria-label={`Remove ${l.name}`}><Icon name="x" size={16} /></button>
            </div>
          ))}
        </div>
        {cart.length > 0 && (
          <div className="drawer-foot">
            <CouponBox />
            <Summary orderType="delivery" />
            {min > cartSubtotal && <p className="hint err-text">Minimum order is {money(min)}. Add {money(min - cartSubtotal)} more.</p>}
            <button className="btn btn-lg btn-block" disabled={bad || cartSubtotal < min} onClick={go}>Checkout</button>
            <button className="linklike center" onClick={clearCart}>Clear cart</button>
          </div>
        )}
      </aside>
    </div>
  );
}
