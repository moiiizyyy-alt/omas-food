import { useEffect, useMemo, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useApp } from '../lib/store.jsx';
import { useUI } from '../lib/ui.jsx';
import { useSeo } from '../lib/seo.js';
import FoodCard from '../components/FoodCard.jsx';
import { Skeletons } from './Home.jsx';
import { Icon } from '../components/Navbar.jsx';

export default function Menu() {
  const { items, categories, loading, error, reload } = useApp();
  const { openProduct } = useUI();
  const [sp, setSp] = useSearchParams();
  const searchRef = useRef(null);
  const cat = sp.get('cat') || 'all', q = sp.get('q') || '', sort = sp.get('sort') || 'popular', diet = sp.get('diet') || '';
  const spicy = sp.get('spicy') === '1', popular = sp.get('popular') === '1';
  useSeo({ title: 'Menu', description: 'Browse our full menu: pizzas, burgers, pasta, appetizers, sandwiches, drinks, desserts and combo deals. Updated live.' });

  const set = (k, v) => setSp(p => { const n = new URLSearchParams(p); if (v === '' || v == null || v === 'all' || v === false) n.delete(k); else n.set(k, v === true ? '1' : v); return n; }, { replace: true });

  useEffect(() => { if (sp.get('focus') === 'search') searchRef.current?.focus(); }, [sp]);
  useEffect(() => { const id = sp.get('item'); if (id) { openProduct(id); set('item', ''); } /* deep link */ // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const counts = useMemo(() => { const m = {}; items.forEach(i => { m[i.category] = (m[i.category] || 0) + 1; }); return m; }, [items]);
  const list = useMemo(() => {
    const t = q.trim().toLowerCase();
    let r = items.filter(i =>
      (cat === 'all' || i.category === cat) &&
      (!t || `${i.name} ${i.description} ${i.category} ${i.subCategory}`.toLowerCase().includes(t)) &&
      (!diet || i.diet === diet) && (!spicy || i.spicy !== 'None') && (!popular || i.bestSeller || i.reviews >= 100));
    if (sort === 'low') r = [...r].sort((a, b) => a.finalPrice - b.finalPrice);
    else if (sort === 'high') r = [...r].sort((a, b) => b.finalPrice - a.finalPrice);
    else r = [...r].sort((a, b) => (b.bestSeller - a.bestSeller) || (b.reviews - a.reviews));
    return r;
  }, [items, cat, q, sort, diet, spicy, popular]);

  const clear = () => setSp({}, { replace: true });
  const filtered = cat !== 'all' || q || diet || spicy || popular;

  return (
    <div className="container menu-page">
      <div className="menu-head"><h1>Our menu</h1><p className="hint">{loading ? 'Loading...' : `${list.length} ${list.length === 1 ? 'dish' : 'dishes'}`}</p></div>

      <div className="filters">
        <div className="search"><Icon name="search" size={18} /><input ref={searchRef} type="search" className="input" placeholder="Search pizza, burgers, drinks..." aria-label="Search the menu" value={q} onChange={e => set('q', e.target.value)} /></div>
        <div className="rail chips-rail" role="group" aria-label="Categories">
          <button className="chip" aria-pressed={cat === 'all'} onClick={() => set('cat', 'all')}>All</button>
          {categories.map(c => <button key={c.id} className="chip" aria-pressed={cat === c.name} onClick={() => set('cat', c.name)}>{c.name}{counts[c.name] ? <small> {counts[c.name]}</small> : null}</button>)}
        </div>
        <div className="rail chips-rail" role="group" aria-label="Filters">
          <button className="chip" aria-pressed={diet === 'veg'} onClick={() => set('diet', diet === 'veg' ? '' : 'veg')}><span className="diet veg" /> Vegetarian</button>
          <button className="chip" aria-pressed={diet === 'nonveg'} onClick={() => set('diet', diet === 'nonveg' ? '' : 'nonveg')}><span className="diet nonveg" /> Non-veg</button>
          <button className="chip" aria-pressed={spicy} onClick={() => set('spicy', !spicy)}><Icon name="flame" size={14} /> Spicy</button>
          <button className="chip" aria-pressed={popular} onClick={() => set('popular', !popular)}>Popular</button>
          <label className="sort"><span className="sr-only">Sort by</span>
            <select className="select" value={sort} onChange={e => set('sort', e.target.value === 'popular' ? '' : e.target.value)}>
              <option value="popular">Most popular</option><option value="low">Price: low to high</option><option value="high">Price: high to low</option>
            </select>
          </label>
        </div>
      </div>

      {error && <div className="form-error">{error} <button className="linklike" onClick={reload}>Try again</button></div>}
      {loading ? <Skeletons n={10} /> : list.length === 0 ? (
        <div className="empty"><Icon name="search" size={40} /><h3>Nothing matches</h3><p>{items.length === 0 ? 'The menu is empty right now.' : 'Try a different search or clear the filters.'}</p>{filtered && <button className="btn" onClick={clear}>Clear filters</button>}</div>
      ) : <div className="masonry" aria-live="polite">{list.map(i => <div className="mitem" key={i.id}><FoodCard item={i} /></div>)}</div>}
    </div>
  );
}

