import React from 'react';

export default function HeroBanner({ onSelectCategory }) {
  return (
    <section className="hero-section">
      <div className="container">
        <div className="hero-card">
          <div className="hero-glow-blob"></div>

          {/* Left Hero Details */}
          <div>
            <div className="hero-tag">
              <span>⚡</span>
              <span>Fast Food &bull; Desi BBQ &bull; Chinese</span>
            </div>

            <h1 className="hero-title">
              Fresh Taste, <span className="highlight-red">Crispy Crusts</span> &amp; <span className="highlight-gold">Sizzling Aromas</span>
            </h1>

            <p className="hero-desc">
              Experience the finest hand-tossed pizzas, juicy smash burgers, charcoal grilled tikka boti, rich chicken karahi, and authentic wok-tossed chowmein. Made fresh with premium ingredients.
            </p>

            {/* Quick action badges */}
            <div className="hero-features-bar">
              <div 
                className="hero-feature-item" 
                style={{ cursor: 'pointer' }}
                onClick={() => onSelectCategory('Fast Food')}
              >
                <span className="hero-feature-icon">🍕</span>
                <span>Fast Food Menu</span>
              </div>
              <div 
                className="hero-feature-item"
                style={{ cursor: 'pointer' }}
                onClick={() => onSelectCategory('Desi Food & BBQ')}
              >
                <span className="hero-feature-icon">🍗</span>
                <span>Desi &amp; BBQ Grill</span>
              </div>
              <div 
                className="hero-feature-item"
                style={{ cursor: 'pointer' }}
                onClick={() => onSelectCategory('Chinese')}
              >
                <span className="hero-feature-icon">🥢</span>
                <span>Chinese Specials</span>
              </div>
              <div className="hero-feature-item">
                <span className="hero-feature-icon">💵</span>
                <span>Cash On Delivery</span>
              </div>
            </div>
          </div>

          {/* Right Showcase Image */}
          <div className="hero-image-showcase">
            <img 
              src="https://images.unsplash.com/photo-1513104890138-7c749659a591?w=700&auto=format&fit=crop&q=80" 
              alt="Oma's Supreme Pizza" 
              className="hero-dish-img"
            />
            <div className="hero-floating-badge">
              <span style={{ fontSize: '1.8rem' }}>⭐</span>
              <div>
                <div style={{ fontWeight: 800, fontSize: '0.95rem', color: '#fff' }}>4.9 Star Quality</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Over 5,000+ Happy Foodies</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
