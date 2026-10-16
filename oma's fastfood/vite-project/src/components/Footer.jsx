import React from 'react';

export default function Footer({ onSelectCategory, onOpenAdmin }) {
  return (
    <footer className="restaurant-footer">
      <div className="container">
        <div className="footer-grid">
          {/* Brand Info */}
          <div>
            <div className="logo-brand" style={{ marginBottom: '1rem' }}>
              <div className="logo-icon-wrap">
                <span>🔥</span>
              </div>
              <div className="logo-text-col">
                <span className="logo-title">Oma's</span>
                <span className="logo-subtitle">Pizza &amp; Fast Food</span>
              </div>
            </div>
            <p className="footer-desc">
              Home of authentic artisan pizzas, crispy zinger &amp; beef smash burgers, aromatic charcoal tikka boti, handi karahi, and sizzling Chinese wok flavors. Quality you can taste in every single bite.
            </p>
          </div>

          {/* Menu Sections */}
          <div>
            <h4 className="footer-col-title">Our Menu</h4>
            <ul className="footer-links-list">
              <li className="footer-link-item" onClick={() => onSelectCategory('Fast Food')}>
                🍕 Fast Food &amp; Pizzas
              </li>
              <li className="footer-link-item" onClick={() => onSelectCategory('Desi Food & BBQ')}>
                🍗 Desi BBQ &amp; Karahi
              </li>
              <li className="footer-link-item" onClick={() => onSelectCategory('Chinese')}>
                🥢 Authentic Chinese
              </li>
              <li className="footer-link-item" onClick={() => onSelectCategory('Beverages')}>
                🥤 Shakes &amp; Chilled Drinks
              </li>
            </ul>
          </div>

          {/* Timings & Service */}
          <div>
            <h4 className="footer-col-title">Service Hours</h4>
            <ul className="footer-links-list">
              <li style={{ color: 'var(--text-muted)', fontSize: '0.88rem' }}>
                <strong>Monday - Thursday:</strong><br />12:00 PM – 02:00 AM
              </li>
              <li style={{ color: 'var(--text-muted)', fontSize: '0.88rem', marginTop: '0.5rem' }}>
                <strong>Friday - Sunday:</strong><br />01:00 PM – 04:00 AM
              </li>
              <li style={{ color: '#10b981', fontSize: '0.85rem', marginTop: '0.5rem', fontWeight: 700 }}>
                🟢 Kitchen Live &bull; Fast Delivery
              </li>
            </ul>
          </div>

          {/* Contact & Hotline */}
          <div>
            <h4 className="footer-col-title">Order Hotline</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', color: '#fff', fontSize: '1.1rem', fontWeight: 800 }}>
                <span>📞</span>
                <span>0300-888-OMAS</span>
              </div>
              <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                📍 Main Commercial Boulevard, Restaurant Hub
              </div>
              <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                📧 Order Dispatches: <strong>moiiizyyy@gmail.com</strong>
              </div>
              <div style={{ marginTop: '0.5rem' }}>
                <button
                  type="button"
                  onClick={onOpenAdmin}
                  style={{
                    background: 'transparent',
                    border: '1px solid rgba(255,255,255,0.1)',
                    color: '#6b7280',
                    fontSize: '0.75rem',
                    padding: '0.35rem 0.75rem',
                    borderRadius: '6px',
                    cursor: 'pointer'
                  }}
                >
                  🔒 Staff Portal Login
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="footer-bottom-bar">
          <div>
            &copy; {new Date().getFullYear()} <strong>Oma's Pizza &amp; Fast Food</strong>. All Rights Reserved.
          </div>
          <div style={{ display: 'flex', gap: '1.25rem' }}>
            <span>💵 100% Cash On Delivery</span>
            <span>⚡ Fresh &amp; Hygienic</span>
            <span>🔥 Halal Certified</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
