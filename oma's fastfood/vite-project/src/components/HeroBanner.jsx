import React from 'react';

export default function HeroBanner({ onSelectCategory }) {
  const scrollToMenu = () => {
    const el = document.getElementById('menu-section');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  return (
    <section className="hero-section">
      <div className="container">
        <div className="hero-card hero-card-branded">
          <div className="hero-glow-blob"></div>
          <div className="hero-glow-blob-secondary"></div>

          <div className="hero-brand-center">
            {/* Minimalist Top Flame Pill */}
            <div className="hero-tag">
              <span className="hero-fire-icon">🔥</span>
              <span>Freshly Baked &bull; Charcoal Grilled &bull; Sizzling Taste</span>
            </div>

            {/* Oma's Pizza & Fast Food - The Main Hero Showcase */}
            <div className="hero-brand-title-box">
              <h1 className="hero-brand-title">
                <span className="brand-word-omas">Oma's</span>{' '}
                <span className="highlight-red">Pizza</span>{' '}
                <span className="hero-amp">&amp;</span>{' '}
                <span className="highlight-gold">Fast Food</span>
              </h1>
            </div>

            {/* Clean, Elegant Tagline */}
            <p className="hero-desc-clean">
              Crispy Hand-Tossed Pizzas &bull; Sizzling Charcoal BBQ &bull; Smash Burgers &bull; Desi Specialties
            </p>

            {/* Clean Hero Call to Actions */}
            <div className="hero-cta-group">
              <button
                type="button"
                className="btn-hero-primary"
                onClick={scrollToMenu}
              >
                <span>🍕 Explore Menu</span>
              </button>
              <button
                type="button"
                className="btn-hero-secondary"
                onClick={() => {
                  onSelectCategory('all');
                  scrollToMenu();
                }}
              >
                <span>⭐ Today's Specials</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
