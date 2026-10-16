import React, { useState } from 'react';

export default function Navbar({ 
  searchQuery, 
  setSearchQuery, 
  cartItemsCount, 
  cartTotal, 
  onOpenCart, 
  onOpenAdmin,
  isAdminLoggedIn
}) {
  const [showMobileSearch, setShowMobileSearch] = useState(false);

  return (
    <header className="navbar">
      <div className="container navbar-container">
        {/* Brand Logo */}
        <div className="logo-brand" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
          <div className="logo-icon-wrap">
            <span>🔥</span>
          </div>
          <div className="logo-text-col">
            <span className="logo-title">Oma's</span>
            <span className="logo-subtitle">Pizza &amp; Fast Food</span>
          </div>
        </div>

        {/* Desktop Search Bar */}
        <div className="nav-search-wrap">
          <span className="nav-search-icon">🔍</span>
          <input
            type="text"
            className="nav-search-input"
            placeholder="Search pizza, burger, karahi, chowmein..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        {/* Right Nav Actions */}
        <div className="nav-actions">
          {/* Mobile Search Toggle Icon */}
          <button
            type="button"
            className="nav-mobile-search-btn"
            onClick={() => setShowMobileSearch(!showMobileSearch)}
            aria-label="Toggle Search"
          >
            🔍
          </button>

          {/* Live Order Status Badge (Desktop/Tablet) */}
          <div className="status-badge-live">
            <span className="status-dot-pulse"></span>
            <span>Open</span>
          </div>

          {/* Discreet Admin Lock Button */}
          <button 
            type="button"
            className={`admin-discreet-btn ${isAdminLoggedIn ? 'active' : ''}`}
            onClick={onOpenAdmin}
            title={isAdminLoggedIn ? "Admin Dashboard (Logged In)" : "Staff Access"}
            aria-label="Staff Access"
          >
            {isAdminLoggedIn ? '⚙️' : '🔒'}
          </button>

          {/* Cart Trigger */}
          <button 
            type="button"
            className="cart-trigger-btn"
            onClick={onOpenCart}
            aria-label="View Cart"
          >
            <span>🛒</span>
            <span className="cart-text-label">Cart</span>
            {cartItemsCount > 0 && (
              <span className="cart-counter-bubble">{cartItemsCount}</span>
            )}
            {cartTotal > 0 && (
              <span className="cart-price-tag">
                Rs. {cartTotal.toLocaleString()}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Mobile Search Bar Expandable Drawer */}
      {showMobileSearch && (
        <div className="nav-mobile-search-row">
          <div className="container">
            <div className="mobile-search-input-wrap">
              <span className="mobile-search-icon">🔍</span>
              <input
                type="text"
                autoFocus
                className="mobile-search-input"
                placeholder="Search food by name or category..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              {searchQuery && (
                <button
                  type="button"
                  className="mobile-search-clear"
                  onClick={() => setSearchQuery('')}
                >
                  ✕
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
