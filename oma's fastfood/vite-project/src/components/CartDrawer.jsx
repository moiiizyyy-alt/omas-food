import React from 'react';

export default function CartDrawer({
  isOpen,
  onClose,
  cartItems,
  onUpdateQuantity,
  onRemoveItem,
  onClearCart,
  onProceedToCheckout
}) {
  if (!isOpen) return null;

  const subtotal = cartItems.reduce((acc, item) => acc + (item.price * item.quantity), 0);
  const deliveryFee = subtotal > 0 ? (subtotal >= 2500 ? 0 : 100) : 0;
  const grandTotal = subtotal + deliveryFee;

  return (
    <div className="cart-drawer-backdrop" onClick={onClose}>
      <aside className="cart-drawer" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="cart-drawer-header">
          <div className="cart-drawer-title-wrap">
            <span style={{ fontSize: '1.4rem' }}>🛒</span>
            <div>
              <h2 className="cart-drawer-title">Your Order Cart</h2>
              <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                {cartItems.length} unique item{cartItems.length !== 1 ? 's' : ''}
              </span>
            </div>
          </div>
          <button 
            type="button" 
            className="btn-drawer-close"
            onClick={onClose}
            aria-label="Close cart"
          >
            ✕
          </button>
        </div>

        {/* Item List */}
        <div className="cart-items-list">
          {cartItems.length === 0 ? (
            <div className="cart-empty-state">
              <span className="cart-empty-icon">🍕</span>
              <h3 className="cart-empty-title">Your Cart is Empty</h3>
              <p style={{ fontSize: '0.9rem', maxWidth: '280px' }}>
                Add delicious pizzas, juicy burgers, tikka karahi, or chowmein from the menu!
              </p>
            </div>
          ) : (
            cartItems.map((item) => (
              <div key={item.id} className="cart-item-card">
                <img 
                  src={item.image} 
                  alt={item.name} 
                  className="cart-item-thumb" 
                />
                
                <div className="cart-item-info">
                  <div className="cart-item-name" title={item.name}>{item.name}</div>
                  <div className="cart-item-price-unit">
                    Rs. {Number(item.price).toLocaleString()} each
                  </div>
                </div>

                <div className="cart-item-total-col">
                  <span className="cart-item-line-total">
                    Rs. {(item.price * item.quantity).toLocaleString()}
                  </span>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <div className="cart-item-stepper">
                      <button
                        type="button"
                        className="cart-stepper-btn"
                        onClick={() => onUpdateQuantity(item.id, item.quantity - 1)}
                        aria-label="Decrease"
                      >
                        -
                      </button>
                      <span className="cart-stepper-qty">{item.quantity}</span>
                      <button
                        type="button"
                        className="cart-stepper-btn"
                        onClick={() => onUpdateQuantity(item.id, item.quantity + 1)}
                        aria-label="Increase"
                      >
                        +
                      </button>
                    </div>

                    <button
                      type="button"
                      className="cart-remove-btn"
                      onClick={() => onRemoveItem(item.id)}
                      title="Remove item"
                      aria-label="Remove item"
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Bill Summary & Checkout */}
        {cartItems.length > 0 && (
          <div className="cart-drawer-footer">
            <div className="bill-row">
              <span>Subtotal:</span>
              <span style={{ color: '#fff', fontWeight: 600 }}>Rs. {subtotal.toLocaleString()}</span>
            </div>
            
            <div className="bill-row">
              <span>Delivery Charges:</span>
              <span style={{ color: deliveryFee === 0 ? '#10b981' : '#fff', fontWeight: 600 }}>
                {deliveryFee === 0 ? 'FREE (Special Offer)' : `Rs. ${deliveryFee}`}
              </span>
            </div>

            <div className="bill-row total-row">
              <span>Total Amount:</span>
              <span className="bill-total-price">Rs. {grandTotal.toLocaleString()}</span>
            </div>

            <div className="payment-method-badge">
              <span>💵</span>
              <span>Payment Mode: Cash On Delivery (COD)</span>
            </div>

            <button
              type="button"
              className="btn-checkout-proceed"
              onClick={onProceedToCheckout}
            >
              <span>Proceed to Checkout</span>
              <span>➔</span>
            </button>
          </div>
        )}
      </aside>
    </div>
  );
}
