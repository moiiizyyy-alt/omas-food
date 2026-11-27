import { useCallback, useEffect, useMemo, useState } from 'react';
import { useApp } from '../lib/store.jsx';
import { useSeo } from '../lib/seo.js';
import { assetUrl } from '../lib/api.js';
import { Icon } from '../components/Navbar.jsx';
import MasonryGrid from '../components/MasonryGrid.jsx';

const CURATED_GALLERY = [
  { src: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?w=800&auto=format&fit=crop&q=80', alt: 'Fresh Stone-Baked Supreme Pizza' },
  { src: 'https://images.unsplash.com/photo-1574071318508-1cdbab80d002?w=800&auto=format&fit=crop&q=80', alt: 'Wood-Fired Margherita with Fresh Basil' },
  { src: 'https://images.unsplash.com/photo-1628840042765-356cda07504e?w=800&auto=format&fit=crop&q=80', alt: 'Crispy Double Pepperoni Feast' },
  { src: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=800&auto=format&fit=crop&q=80', alt: 'Double Beef Smash Burger' },
  { src: 'https://images.unsplash.com/photo-1645112411341-6c4fd023714a?w=800&auto=format&fit=crop&q=80', alt: 'Creamy Fettuccine Chicken Alfredo' },
  { src: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=800&auto=format&fit=crop&q=80', alt: 'Bubbling Cheese Pull Straight from the Oven' },
  { src: 'https://images.unsplash.com/photo-1590947132387-155cc02f3212?w=800&auto=format&fit=crop&q=80', alt: 'Family Pizza Night Feast' },
  { src: 'https://images.unsplash.com/photo-1527477396000-e27163b481c2?w=800&auto=format&fit=crop&q=80', alt: 'Smoky Honey BBQ Glazed Chicken Wings' },
  { src: 'https://images.unsplash.com/photo-1624353365286-3f8d62daad51?w=800&auto=format&fit=crop&q=80', alt: 'Warm Belgian Chocolate Lava Cake' },
  { src: 'https://images.unsplash.com/photo-1574894709920-11b28e7367e3?w=800&auto=format&fit=crop&q=80', alt: 'Oven-Baked Lasagna Bolognese' },
  { src: 'https://images.unsplash.com/photo-1604382354936-07c5d9983bd3?w=800&auto=format&fit=crop&q=80', alt: 'Hand-Crafted Crust & Loaded Toppings' },
  { src: 'https://images.unsplash.com/photo-1550547660-d9450f859349?w=800&auto=format&fit=crop&q=80', alt: 'Truffle Mushroom Swiss Burger' },
  { src: 'https://images.unsplash.com/photo-1573140401552-3fab0b24306f?w=800&auto=format&fit=crop&q=80', alt: 'Toasted Cheesy Garlic Herb Bread' },
  { src: 'https://images.unsplash.com/photo-1571877227200-a0d98ea607e9?w=800&auto=format&fit=crop&q=80', alt: 'Classic Italian Tiramisu Cup' },
  { src: 'https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?w=800&auto=format&fit=crop&q=80', alt: 'Chilled Strawberry Basil Cooler' },
  { src: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=800&auto=format&fit=crop&q=80', alt: 'Warm Cozy Kitchen Atmosphere' },
  { src: 'https://images.unsplash.com/photo-1528735602780-2552fd46c7af?w=800&auto=format&fit=crop&q=80', alt: 'Toasted Smoked Chicken Panini Melt' },
  { src: 'https://images.unsplash.com/photo-1541745537411-b8046dc6d66c?w=800&auto=format&fit=crop&q=80', alt: 'Hot Freshly Sliced Pepperoni Pizza' }
];

export default function Gallery() {
  const { settings: s, items } = useApp();
  useSeo({ title: 'Gallery', description: "A look inside Oma's Pizza — wood-fired pizzas, gourmet burgers, pasta and kitchen moments." });
  const [open, setOpen] = useState(-1);

  const pics = useMemo(() => {
    const custom = (s?.gallery || []).filter(g => g.image).map(g => ({ src: g.image, alt: g.caption || "Oma's Pizza" }));
    const fromMenu = items.filter(i => i.image).slice(0, 10).map(i => ({ src: i.image, alt: i.name }));
    const seen = new Set();
    return [...custom, ...CURATED_GALLERY, ...fromMenu].filter(p => {
      if (seen.has(p.src)) return false;
      seen.add(p.src);
      return true;
    });
  }, [s, items]);

  const step = useCallback((d) => setOpen(o => (o + d + pics.length) % pics.length), [pics.length]);

  useEffect(() => {
    if (open < 0) return;
    const k = (e) => { if (e.key === 'Escape') setOpen(-1); if (e.key === 'ArrowRight') step(1); if (e.key === 'ArrowLeft') step(-1); };
    document.addEventListener('keydown', k); document.body.style.overflow = 'hidden';
    return () => { document.removeEventListener('keydown', k); document.body.style.overflow = ''; };
  }, [open, step]);

  return (
    <div className="container page">
      <div className="anim-rise" style={{ marginBottom: 24 }}>
        <span className="badge badge-red" style={{ marginBottom: 8 }}>Food Gallery</span>
        <h1>Fresh from Oma&apos;s Oven</h1>
        <p className="hint">Tap any photo to view full size — {pics.length} mouth-watering moments.</p>
      </div>

      <MasonryGrid
        className="gallery"
        items={pics}
        renderItem={(p, i) => (
          <button className="gitem" onClick={() => setOpen(i)} aria-label={`Open photo: ${p.alt}`}>
            <img src={assetUrl(p.src)} alt={p.alt} loading="lazy" decoding="async" style={{ aspectRatio: ['4 / 5', '1 / 1', '3 / 4', '5 / 6'][i % 4], objectFit: 'cover' }} />
            <span className="gcap">{p.alt}</span>
          </button>
        )}
      />

      {open >= 0 && pics[open] && (
        <div className="lightbox" role="dialog" aria-modal="true" aria-label="Photo viewer" onClick={() => setOpen(-1)}>
          <button className="icon-btn lb-x" aria-label="Close" onClick={() => setOpen(-1)}><Icon name="x" /></button>
          <button className="lb-nav prev" aria-label="Previous photo" onClick={(e) => { e.stopPropagation(); step(-1); }}><span style={{ transform: 'rotate(180deg)', display: 'grid' }}><Icon name="chev" size={28} /></span></button>
          <figure onClick={e => e.stopPropagation()}><img src={assetUrl(pics[open].src)} alt={pics[open].alt} /><figcaption>{pics[open].alt} <small>({open + 1}/{pics.length})</small></figcaption></figure>
          <button className="lb-nav next" aria-label="Next photo" onClick={(e) => { e.stopPropagation(); step(1); }}><Icon name="chev" size={28} /></button>
        </div>
      )}
    </div>
  );
}
