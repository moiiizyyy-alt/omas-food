import { useEffect, useState } from 'react';
import { useApp } from '../lib/store.jsx';
import { useUI } from '../lib/ui.jsx';
import { money, unitPrice } from '../lib/api.js';
import { Thumb, DietDot } from './FoodCard.jsx';
import { Icon } from './Navbar.jsx';

export default function ProductModal() {
  const { productId, closeProduct } = useUI();
  const { byId, loading } = useApp();
  const p = productId ? byId.get(productId) : null;
  if (productId && !p && !loading) return <Gone onClose={closeProduct} />;
  if (!p) return null;
  return <Details key={p.id} p={p} onClose={closeProduct} />;
}

function Gone({ onClose }) {
  useEffect(() => { onClose(); }, [onClose]);
  return null;
}

function Details({ p, onClose }) {
  const { addToCart } = useApp();
  const [size, setSize] = useState(p.sizes?.[0]?.name || '');
  const [tops, setTops] = useState([]);
  const [cheese, setCheese] = useState('');
  const [qty, setQty] = useState(1);
  const [note, setNote] = useState('');

  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = ''; };
  }, [onClose]);

  const { unit } = unitPrice(p, { size, toppings: tops, cheese }); // recomputed from the live product, so admin edits apply instantly
  const toggle = (n) => setTops(t => (t.includes(n) ? t.filter(x => x !== n) : [...t, n]));
  const add = () => { addToCart(p, { size, toppings: tops, cheese, quantity: qty, instructions: note.trim() }); onClose(); };

  return (
    <div className="overlay" onClick={onClose} role="presentation">
      <div className="modal modal-wide pmodal" role="dialog" aria-modal="true" aria-label={p.name} onClick={e => e.stopPropagation()}>
        <button className="icon-btn pclose" onClick={onClose} aria-label="Close"><Icon name="x" /></button>
        <div className="pgrid">
          <Thumb src={p.image} alt={p.name} ratio="4 / 3" eager />
          <div className="pinfo">
            <div className="pmeta">
              {p.bestSeller && <span className="badge badge-red">Best Seller</span>}
              <span className="badge">{p.category}</span>
              {p.spicy !== 'None' && <span className="badge badge-warn"><Icon name="flame" size={12} /> {p.spicy}</span>}
              {!p.available && <span className="badge badge-danger">Unavailable</span>}
            </div>
            <h2><DietDot diet={p.diet} /> {p.name}</h2>
            <p className="pdesc">{p.description}</p>

            {p.sizes?.length > 0 && (
              <fieldset className="opt"><legend>Size</legend>
                {p.sizes.map(s => <label key={s.name} className={`optchip ${size === s.name ? 'on' : ''}`}><input type="radio" name="size" checked={size === s.name} onChange={() => setSize(s.name)} />{s.name}</label>)}
              </fieldset>
            )}
            {p.cheeseOptions?.length > 0 && (
              <fieldset className="opt"><legend>Cheese</legend>
                <label className={`optchip ${cheese === '' ? 'on' : ''}`}><input type="radio" name="cheese" checked={cheese === ''} onChange={() => setCheese('')} />Regular</label>
                {p.cheeseOptions.map(c => <label key={c.name} className={`optchip ${cheese === c.name ? 'on' : ''}`}><input type="radio" name="cheese" checked={cheese === c.name} onChange={() => setCheese(c.name)} />{c.name} <small>+{money(c.price)}</small></label>)}
              </fieldset>
            )}
            {p.toppings?.length > 0 && (
              <fieldset className="opt"><legend>Extra toppings</legend>
                {p.toppings.map(t => <label key={t.name} className={`optchip ${tops.includes(t.name) ? 'on' : ''}`}><input type="checkbox" checked={tops.includes(t.name)} onChange={() => toggle(t.name)} />{t.name} <small>+{money(t.price)}</small></label>)}
              </fieldset>
            )}
            <div className="field"><label htmlFor="note">Special instructions</label><textarea id="note" className="textarea" maxLength={300} placeholder="e.g. no onions, well done" value={note} onChange={e => setNote(e.target.value)} style={{ minHeight: 64 }} /></div>

            <div className="pfoot">
              <div className="qty" role="group" aria-label="Quantity">
                <button onClick={() => setQty(q => Math.max(1, q - 1))} aria-label="Decrease quantity"><Icon name="minus" size={16} /></button>
                <output aria-live="polite">{qty}</output>
                <button onClick={() => setQty(q => Math.min(50, q + 1))} aria-label="Increase quantity"><Icon name="plus" size={16} /></button>
              </div>
              <button className="btn btn-lg pbuy" disabled={!p.available} onClick={add}>{p.available ? `Add to cart - ${money(unit * qty)}` : 'Currently unavailable'}</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

