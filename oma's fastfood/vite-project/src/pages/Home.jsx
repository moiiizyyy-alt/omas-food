import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useApp } from '../lib/store.jsx';
import { api, assetUrl } from '../lib/api.js';
import { on, onResync } from '../lib/realtime.js';
import { useSeo } from '../lib/seo.js';
import FoodCard from '../components/FoodCard.jsx';
import { Hours } from '../components/Footer.jsx';
import { Icon } from '../components/Navbar.jsx';

export function Stars({ n }) {
  return <span className="stars" role="img" aria-label={`${n} out of 5 stars`}>{[1, 2, 3, 4, 5].map(i => <span key={i} className={i <= n ? 'on' : ''}><Icon name="star" size={15} /></span>)}</span>;
}

export function useReviews() {
  const [data, setData] = useState({ reviews: [], average: 0, count: 0 });
  useEffect(() => {
    const load = () => api('/reviews').then(setData).catch(() => {});
    load();
    const offs = [on('reviews:updated', load), onResync(load)];
    return () => offs.forEach(f => f());
  }, []);
  return data;
}

export function Skeletons({ n = 8 }) {
  return <div className="masonry">{Array.from({ length: n }).map((_, i) => <div key={i} className="mitem"><div className="skeleton" style={{ aspectRatio: ['4/5', '1/1', '5/6', '3/4'][i % 4] }} /></div>)}</div>;
}

const WHY = [
  ['Fresh dough daily', 'Hand-stretched every morning and baked on blazing hot stone.'],
  ['Real ingredients', 'Fresh mozzarella, crisp local produce, zero shortcuts ever.'],
  ['Fast hot delivery', 'From our stone oven straight to your doorstep, piping hot.'],
  ['Family recipes', "Oma's secret sauce and spice blends — unchanged since day one."]
];

export default function Home() {
  const { settings: s, items, categories, loading, error, reload } = useApp();
  const nav = useNavigate();
  const rv = useReviews();
  const [deals, setDeals] = useState([]);
  useSeo({ title: null, description: s?.tagline ? `${s.restaurantName}: ${s.tagline}. Order online for delivery or pickup.` : undefined, image: items[0]?.image });

  useEffect(() => {
    const load = () => api('/coupons/public').then(r => setDeals(r.coupons)).catch(() => {});
    load(); const offs = [on('coupons:updated', load), onResync(load)];
    return () => offs.forEach(f => f());
  }, []);

  const banner = (s?.banners || []).find(b => b.active !== false && b.image) || (s?.banners || []).find(b => b.active !== false);
  const avail = items.filter(i => i.available);
  const best = useMemo(() => {
    const ranked = [...items].sort((a, b) => (b.bestSeller - a.bestSeller) || (b.reviews - a.reviews));
    return ranked.slice(0, 12);
  }, [items]);
  const comboDeals = useMemo(() => {
    const list = items.filter(i => i.category === 'Deals & Combos' || i.discountPrice != null);
    return list.slice(0, 8);
  }, [items]);
  const featured = useMemo(() => {
    const bestIds = new Set(best.map(b => b.id));
    return items.filter(i => !bestIds.has(i.id) && (i.featured || i.rating >= 4.7)).slice(0, 8);
  }, [items, best]);

  const heroImg = banner?.image || best[0]?.image || items[0]?.image;
  const promos = (s?.promotions || []).filter(p => p.active !== false);

  return (
    <>
      <section className="hero">
        <div className="hero-bg">{heroImg && <img src={assetUrl(heroImg)} alt="" fetchPriority="high" />}</div>
        <div className="container hero-in anim-rise">
          <span className="eyebrow">{s?.restaurantName || "Oma's Pizza"}</span>
          <h1>{banner?.title || 'Stone-baked pizza, made with love'}</h1>
          <p>{banner?.subtitle || s?.tagline || 'Fresh hand-stretched dough, real mozzarella, sizzling burgers, creamy pasta and family combo deals.'}</p>
          <div className="hero-cta">
            <button className="btn btn-lg" onClick={() => nav(banner?.link || '/menu')}>Order now</button>
            <Link className="btn btn-lg btn-light" to="/menu">Explore menu</Link>
            <Link className="btn btn-lg btn-outline-light" to="/track">Track Order</Link>
          </div>
        </div>
      </section>

      {promos.length > 0 && <div className="promo-strip" role="region" aria-label="Promotions"><div className="container">{promos.map((p, i) => <span key={i}><b>{p.title}</b> {p.text}</span>)}</div></div>}

      <section className="container section" aria-labelledby="h-coll">
        <h2 id="h-coll" className="sr-only">Menu collections</h2>
        <div className="rail chips-rail">
          {categories.map(c => <Link key={c.id} className="chip" to={`/menu?cat=${encodeURIComponent(c.name)}`}>{c.name}</Link>)}
        </div>
      </section>

      {error && <div className="container"><div className="form-error">{error} <button className="linklike" onClick={reload}>Try again</button></div></div>}

      <section className="container section" aria-labelledby="h-best">
        <div className="sec-head">
          <div><h2 id="h-best">Best sellers</h2><p className="hint">What everyone is ordering right now</p></div>
          <Link to="/menu" className="more">Full menu <Icon name="chev" size={16} /></Link>
        </div>
        {loading ? <Skeletons n={12} /> : best.length === 0 ? <p className="empty">The menu is being updated. Please check back soon.</p> : (
          <div className="masonry">{best.map(i => <div className="mitem" key={i.id}><FoodCard item={i} /></div>)}</div>
        )}
      </section>

      {(comboDeals.length > 0 || deals.length > 0) && (
        <section className="container section" aria-labelledby="h-deals">
          <div className="sec-head">
            <div><h2 id="h-deals">Deals &amp; Combos</h2><p className="hint">Big value boxes &amp; limited-time savings</p></div>
            <Link to="/menu?cat=Deals%20%26%20Combos" className="more">All deals <Icon name="chev" size={16} /></Link>
          </div>
          {deals.length > 0 && <div className="deal-row">{deals.map(d => <div className="deal" key={d.code}><b>{d.type === 'percentage' ? `${d.value}% OFF` : `Rs. ${d.value} OFF`}</b><span>{d.description || 'On your order'}{d.minOrder ? ` over Rs. ${d.minOrder}` : ''}</span><code>{d.code}</code></div>)}</div>}
          {comboDeals.length > 0 && <div className="masonry">{comboDeals.map(i => <div className="mitem" key={i.id}><FoodCard item={i} /></div>)}</div>}
        </section>
      )}

      {featured.length > 0 && (
        <section className="container section" aria-labelledby="h-feat">
          <div className="sec-head">
            <div><h2 id="h-feat">Featured from the kitchen</h2><p className="hint">Fresh pastas, smash burgers, appetizers &amp; sweet finishes</p></div>
            <Link to="/menu" className="more">Explore all <Icon name="chev" size={16} /></Link>
          </div>
          <div className="masonry">{featured.map(i => <div className="mitem" key={i.id}><FoodCard item={i} /></div>)}</div>
        </section>
      )}

      <section className="section why" aria-labelledby="h-why">
        <div className="container">
          <h2 id="h-why">Why choose us</h2>
          <div className="why-grid">{WHY.map(([t, d], i) => <div className="why-card" key={t}><span className="why-n">0{i + 1}</span><h3>{t}</h3><p>{d}</p></div>)}</div>
        </div>
      </section>

      {rv.count > 0 && (
        <section className="container section" aria-labelledby="h-rev">
          <div className="sec-head"><div><h2 id="h-rev">Loved by our guests</h2><p className="hint"><Stars n={Math.round(rv.average)} /> {rv.average} from {rv.count} verified {rv.count === 1 ? 'review' : 'reviews'}</p></div></div>
          <div className="rail">{rv.reviews.slice(0, 8).map(r => (
            <figure className="review" key={r.id}><Stars n={r.rating} /><blockquote>{r.comment || 'Great food!'}</blockquote><figcaption><b>{r.name}</b> <span className="badge badge-green"><Icon name="check" size={11} /> Verified order</span><time dateTime={r.createdAt}>{new Date(r.createdAt).toLocaleDateString()}</time></figcaption></figure>
          ))}</div>
        </section>
      )}

      <section className="container section intro">
        <div className="intro-text">
          <h2>Welcome to {s?.restaurantName || "Oma's Pizza"}</h2>
          <p>{s?.about ? s.about.split('\n')[0] : "A family kitchen with a stone oven and a simple promise: every pizza is made the way Oma taught us — slowly, fresh, and with plenty of real cheese."}</p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
            <Link className="btn" to="/about">Read our story</Link>
            <Link className="btn btn-ghost" to="/gallery">View gallery</Link>
          </div>
        </div>
        <div className="card info-card">
          <h3><Icon name="clock" size={18} /> Opening hours</h3>
          <Hours hours={s?.openingHours} />
          <p className="addr"><Icon name="pin" size={16} /> {s?.address || "Oma's Pizza Kitchen, Main Boulevard"}</p>
          <Link className="btn btn-sm btn-ghost" to="/menu">Order delivery</Link>
        </div>
      </section>
      <div className="sr-only">{avail.length} items available</div>
    </>
  );
}
