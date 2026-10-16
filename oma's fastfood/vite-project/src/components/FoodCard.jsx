import React, { useState } from 'react';

export default function FoodCard({ item, cartItem, onAddToCart, onUpdateQuantity }) {
  const [clickedFeedback, setClickedFeedback] = useState(false);
  const quantity = cartItem ? cartItem.quantity : 0;

  // Handle clicking on the image directly as a button
  const handleImageClick = () => {
    onAddToCart(item);
    setClickedFeedback(true);
    setTimeout(() => setClickedFeedback(false), 600);
  };

  const getBadgeClass = (badge) => {
    if (!badge) return '';
    const lower = badge.toLowerCase();
    if (lower.includes('chef') || lower.includes('special')) return 'chef-special';
    if (lower.includes('bestseller') || lower.includes('must') || lower.includes('popular')) return 'bestseller';
    return '';
  };

  return (
    <article className="food-card">
      {/* Interactive Image (Acts as Button) */}
      <div 
        className="food-card-image-wrap" 
        onClick={handleImageClick}
        title={`Click to add "${item.name}" to cart`}
      >
        <img 
          src={item.image} 
          alt={item.name} 
          className="food-card-img"
          loading="lazy"
          onError={(e) => {
            // Fallback image if custom URL breaks
            e.target.src = 'https://images.unsplash.com/photo-1513104890138-7c749659a591?w=600&auto=format&fit=crop&q=80';
          }}
        />

        {/* Floating Badge */}
        {item.badge && (
          <span className={`card-badge ${getBadgeClass(item.badge)}`}>
            <span>⭐</span>
            <span>{item.badge}</span>
          </span>
        )}

        {/* Spice Level Indicator */}
        {item.spicy && item.spicy !== 'None' && (
          <span className="card-spice-badge">
            🌶️ {item.spicy}
          </span>
        )}

        {/* Hover / Tap Overlay (Image Button Indicator) */}
        <div className="food-image-overlay-btn">
          <span className="quick-add-image-tag">
            <span>{clickedFeedback ? '✓ Added!' : '➕ Quick Add'}</span>
          </span>
        </div>
      </div>

      {/* Card Details */}
      <div className="food-card-body">
        <div className="food-card-header">
          <div className="food-card-category">{item.category}</div>
          <h3 className="food-card-title">{item.name}</h3>
        </div>

        <p className="food-card-desc">
          {item.description}
        </p>

        {/* Price & Cart Actions */}
        <div className="food-card-footer">
          <div className="food-card-price-col">
            <span className="food-price-currency">Price</span>
            <span className="food-price-val">Rs. {Number(item.price).toLocaleString()}</span>
          </div>

          <div>
            {quantity > 0 ? (
              /* If in cart, show interactive plus/minus stepper */
              <div className="card-qty-stepper">
                <button
                  type="button"
                  className="stepper-btn"
                  onClick={() => onUpdateQuantity(item.id, quantity - 1)}
                  aria-label="Decrease quantity"
                >
                  -
                </button>
                <span className="stepper-val">{quantity}</span>
                <button
                  type="button"
                  className="stepper-btn"
                  onClick={() => onUpdateQuantity(item.id, quantity + 1)}
                  aria-label="Increase quantity"
                >
                  +
                </button>
              </div>
            ) : (
              /* If not in cart, show Add to Cart button */
              <button
                type="button"
                className="btn-add-cart"
                onClick={() => onAddToCart(item)}
              >
                <span>➕</span>
                <span>Add</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </article>
  );
}
