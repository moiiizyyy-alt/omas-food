import React from 'react';

export default function HeroBanner({ onSelectCategory }) {
  return (
    <section className="hero-section">
      <div className="container">
        <div className="hero-card hero-card-branded">
          <div className="hero-glow-blob"></div>
          <div className="hero-glow-blob-secondary"></div>

          <div className="hero-brand-center">
            {/* Top Tagline */}
            <div className="hero-tag">
              <span className="hero-fire-icon">🔥</span>
              <span>Fast Food &bull; Desi BBQ &bull; Chinese</span>
            </div>

            {/* Restaurant Branded Name according to theme */}
            <div className="hero-brand-title-box">
              <h1 className="hero-brand-title">
                <span className="brand-word-omas">Oma's</span>{' '}
                <span className="highlight-red">Pizza</span>{' '}
                <span className="hero-amp">&amp;</span>{' '}
                <span className="highlight-gold">BBQ</span>
              </h1>
              <div className="hero-brand-subtitle-badge">
                <span className="hero-sub-star">⭐</span>
                <span>AUTHENTIC OVEN BAKED &amp; CHARCOAL SIZZLING GRILL</span>
                <span className="hero-sub-star">⭐</span>
              </div>
            </div>

            <p className="hero-desc">
              Experience the finest hand-tossed crispy crust pizzas, charcoal grilled smokey BBQ, juicy burgers, and rich savory karahi. 100% fresh taste crafted with premium ingredients.
            </p>

            {/* Quick action category navigation pills */}
            <div className="hero-features-bar">
              <button 
                type="button"
                className="hero-feature-item" 
                onClick={() => onSelectCategory('Fast Food')}
              >
                <span className="hero-feature-icon">🍕</span>
                <span>Fast Food Menu</span>
              </button>
              <button 
                type="button"
                className="hero-feature-item"
                onClick={() => onSelectCategory('Desi Food & BBQ')}
              >
                <span className="hero-feature-icon">🍗</span>
                <span>Desi &amp; BBQ Grill</span>
              </button>
              <button 
                type="button"
                className="hero-feature-item"
                onClick={() => onSelectCategory('Chinese')}
              >
                <span className="hero-feature-icon">🥢</span>
                <span>Chinese Specials</span>
              </button>
              <div className="hero-feature-item hero-feature-item-static">
                <span className="hero-feature-icon">💵</span>
                <span>Cash On Delivery</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
