import { useState } from 'react';
import { useApp } from '../lib/store.jsx';
import { useUI } from '../lib/ui.jsx';
import { assetUrl, money } from '../lib/api.js';
import { hashStr } from '../lib/seo.js';
import { Icon } from './Navbar.jsx';

const RATIOS = ['4 / 5', '1 / 1', '5 / 6', '3 / 4', '1 / 1', '4 / 5']; // varied heights = masonry rhythm

export const hasOptions = (p) => !!(p.sizes?.length > 1 || p.toppings?.length || p.cheeseOptions?.length);

export function Thumb({ src, alt, ratio, eager }) {
  const [bad, setBad] = useState(false);
  return (
    <div className="thumb" style={{ aspectRatio: ratio }}>
      {src && !bad
        ? <img src={assetUrl(src)} alt={alt} loading={eager ? 'eager' : 'lazy'} decoding="async" onError={() => setBad(true)} />
        : <div className="thumb-fallback" role="img" aria-label={alt}><Icon name="pizza" size={36} /></div>}
    </div>
  );
}

export function DietDot({ diet }) {
  return <span className={`diet ${diet === 'veg' ? 'veg' : 'nonveg'}`} title={diet === 'veg' ? 'Vegetarian' : 'Non-vegetarian'} aria-label={diet === 'veg' ? 'Vegetarian' : 'Non-vegetarian'} />;
}

export default function FoodCard({ item, compact = false }) {
  const { addToCart, cart } = useApp();
  const { openProduct } = useUI();
  const ratio = compact ? '1 / 1' : RATIOS[hashStr(item.id) % RATIOS.length];
  const inCart = cart.filter(l => l.productId === item.id).reduce((s, l) => s + l.quantity, 0);
  const from = item.sizes?.length > 1 ? Math.min(...item.sizes.map(s => s.price * (item.discountPrice != null && item.price ? item.discountPrice / item.price : 1))) : null;
  const price = from ?? item.finalPrice;
  const quick = () => (hasOptions(item) ? openProduct(item.id) : addToCart(item));

  return (
    <article className={`fcard ${item.available ? '' : 'sold'}`}>
      <button className="fcard-img" onClick={() => openProduct(item.id)} aria-label={`View details for ${item.name}`}>
        <Thumb src={item.image} alt={item.name} ratio={ratio} />
        <div className="fcard-badges">
          {item.bestSeller && <span className="badge badge-red">Best Seller</span>}
          {item.discountPrice != null && <span className="badge badge-gold">{Math.round((1 - item.discountPrice / item.price) * 100)}% off</span>}
        </div>
        {item.spicy && item.spicy !== 'None' && <span className="spice" title={`${item.spicy} spicy`}><Icon name="flame" size={13} />{item.spicy}</span>}
        {!item.available && <span className="soldout">Sold out</span>}
      </button>
      <div className="fcard-body">
        <h3 className="fcard-title"><DietDot diet={item.diet} /> {item.name}</h3>
        {!compact && <p className="fcard-desc">{item.description}</p>}
        <div className="fcard-foot">
          <div className="price">
            {from != null && <small>from </small>}
            <b>{money(price)}</b>
            {item.discountPrice != null && from == null && <s>{money(item.price)}</s>}
          </div>
          <button className="add-btn" onClick={quick} disabled={!item.available} aria-label={hasOptions(item) ? `Customise ${item.name}` : `Add ${item.name} to cart`}>
            {inCart > 0 ? <span>{inCart}</span> : <Icon name="plus" size={18} />}
          </button>
        </div>
      </div>
    </article>
  );
}
