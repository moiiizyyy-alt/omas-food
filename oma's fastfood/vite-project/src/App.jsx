import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import HeroBanner from './components/HeroBanner';
import CategoryFilter from './components/CategoryFilter';
import FoodCard from './components/FoodCard';
import CartDrawer from './components/CartDrawer';
import CheckoutModal from './components/CheckoutModal';
import OrderSuccessModal from './components/OrderSuccessModal';
import AdminLoginModal from './components/AdminLoginModal';
import AdminPanelModal from './components/AdminPanelModal';
import Footer from './components/Footer';
import { DEFAULT_MENU } from './data/defaultMenu';

export default function App() {
  // Menu items state
  const [items, setItems] = useState(DEFAULT_MENU);
  const [loadingItems, setLoadingItems] = useState(true);

  // Filters
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Cart State (Persisted in localStorage)
  const [cartItems, setCartItems] = useState(() => {
    try {
      const saved = localStorage.getItem('omas_pos_cart');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Modal Visibility States
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [completedOrder, setCompletedOrder] = useState(null);

  // Admin States
  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState(false);
  const [isAdminLoginOpen, setIsAdminLoginOpen] = useState(false);
  const [isAdminPanelOpen, setIsAdminPanelOpen] = useState(false);

  // Toast Notification
  const [toastMessage, setToastMessage] = useState('');

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage('');
    }, 2800);
  };

  // Sync cart to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('omas_pos_cart', JSON.stringify(cartItems));
    } catch (err) {
      console.warn('Failed to save cart to localStorage:', err);
    }
  }, [cartItems]);

  // Load menu from backend on initial mount
  useEffect(() => {
    fetchMenuItems();
  }, []);

  const fetchMenuItems = async () => {
    setLoadingItems(true);
    try {
      const res = await fetch('/api/items');
      const data = await res.json();
      if (data.success && Array.isArray(data.items) && data.items.length > 0) {
        setItems(data.items);
      }
    } catch (err) {
      console.log('Using pre-seeded default menu data (Backend syncing in background)');
    } finally {
      setLoadingItems(false);
    }
  };

  // Cart operations
  const handleAddToCart = (item) => {
    setCartItems((prev) => {
      const existing = prev.find((i) => i.id === item.id);
      if (existing) {
        return prev.map((i) =>
          i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i
        );
      }
      return [...prev, { ...item, quantity: 1 }];
    });
    showToast(`Added "${item.name}" to cart! 🍕`);
  };

  const handleUpdateQuantity = (itemId, newQty) => {
    if (newQty <= 0) {
      handleRemoveItem(itemId);
      return;
    }
    setCartItems((prev) =>
      prev.map((i) => (i.id === itemId ? { ...i, quantity: newQty } : i))
    );
  };

  const handleRemoveItem = (itemId) => {
    setCartItems((prev) => prev.filter((i) => i.id !== itemId));
    showToast('Item removed from cart');
  };

  const handleClearCart = () => {
    setCartItems([]);
  };

  // Checkout & Order flow
  const handleProceedToCheckout = () => {
    setIsCartOpen(false);
    setIsCheckoutOpen(true);
  };

  const handleOrderSuccess = (order) => {
    setCompletedOrder(order);
    setIsCheckoutOpen(false);
    handleClearCart();
    showToast(`Order #${order.orderId} placed! Notification sent to moiiizyyy@gmail.com 🚀`);
  };

  // Admin flow
  const handleOpenAdminTrigger = () => {
    if (isAdminLoggedIn) {
      setIsAdminPanelOpen(true);
    } else {
      setIsAdminLoginOpen(true);
    }
  };

  const handleAdminLoginSuccess = () => {
    setIsAdminLoggedIn(true);
    setIsAdminLoginOpen(false);
    setIsAdminPanelOpen(true);
    showToast('Admin access granted! Welcome back.');
  };

  const handleAdminLogout = () => {
    setIsAdminLoggedIn(false);
    setIsAdminPanelOpen(false);
    showToast('Admin logged out.');
  };

  const handleAddNewItem = (newItem) => {
    // Prepend new item so it appears at top of its category
    setItems((prev) => [newItem, ...prev]);
    // Switch filter to this category to make the added item instantly visible!
    setSelectedCategory(newItem.category);
    showToast(`Item "${newItem.name}" is now live in menu!`);
  };

  const handleDeleteItem = async (itemId) => {
    try {
      await fetch(`/api/items/${itemId}`, { method: 'DELETE' });
    } catch (err) {
      console.warn('Backend delete error:', err);
    }
    setItems((prev) => prev.filter((i) => i.id !== itemId));
    showToast('Item removed from menu.');
  };

  // Filter items by category & search query
  const filteredItems = items.filter((item) => {
    const matchesCategory =
      selectedCategory === 'all' || item.category === selectedCategory;
    const q = searchQuery.toLowerCase().trim();
    const matchesSearch =
      !q ||
      item.name.toLowerCase().includes(q) ||
      (item.category && item.category.toLowerCase().includes(q)) ||
      (item.description && item.description.toLowerCase().includes(q));

    return matchesCategory && matchesSearch;
  });

  const cartItemsCount = cartItems.reduce((sum, item) => sum + item.quantity, 0);
  const cartTotal = cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);

  return (
    <div className="app-root">
      {/* Top Navbar */}
      <Navbar
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        cartItemsCount={cartItemsCount}
        cartTotal={cartTotal}
        onOpenCart={() => setIsCartOpen(true)}
        onOpenAdmin={handleOpenAdminTrigger}
        isAdminLoggedIn={isAdminLoggedIn}
      />

      {/* Hero Showcase */}
      <HeroBanner onSelectCategory={(cat) => setSelectedCategory(cat)} />

      {/* Categories Bar */}
      <CategoryFilter
        selectedCategory={selectedCategory}
        onSelectCategory={setSelectedCategory}
        items={items}
      />

      {/* Main Menu Grid Section */}
      <main className="container" id="menu-section">
        <div className="section-header">
          <div>
            <h2 className="section-title">
              <span>{selectedCategory === 'all' ? '🍽️ Complete Menu' : selectedCategory}</span>
            </h2>
            <p className="section-subtitle">
              {searchQuery
                ? `Showing search results for "${searchQuery}" (${filteredItems.length} found)`
                : `Choose your favorites with high quality taste and fresh ingredients`}
            </p>
          </div>

          {searchQuery && (
            <button
              type="button"
              className="btn-secondary"
              onClick={() => setSearchQuery('')}
              style={{ padding: '0.45rem 0.85rem', fontSize: '0.82rem' }}
            >
              Clear Search ✕
            </button>
          )}
        </div>

        {/* Food Items Grid */}
        {filteredItems.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '4rem 1rem', color: 'var(--text-muted)' }}>
            <span style={{ fontSize: '3.5rem', display: 'block', marginBottom: '0.85rem' }}>🔍</span>
            <h3 style={{ fontSize: '1.4rem', color: '#fff', marginBottom: '0.5rem' }}>No Items Found</h3>
            <p>Try searching for a different dish name or choose another category above.</p>
          </div>
        ) : (
          <div className="food-grid">
            {filteredItems.map((item) => {
              const cartItem = cartItems.find((i) => i.id === item.id);
              return (
                <FoodCard
                  key={item.id}
                  item={item}
                  cartItem={cartItem}
                  onAddToCart={handleAddToCart}
                  onUpdateQuantity={handleUpdateQuantity}
                />
              );
            })}
          </div>
        )}
      </main>

      {/* Cart Slide-Over Drawer */}
      <CartDrawer
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        cartItems={cartItems}
        onUpdateQuantity={handleUpdateQuantity}
        onRemoveItem={handleRemoveItem}
        onClearCart={handleClearCart}
        onProceedToCheckout={handleProceedToCheckout}
      />

      {/* Checkout Modal */}
      <CheckoutModal
        isOpen={isCheckoutOpen}
        onClose={() => setIsCheckoutOpen(false)}
        cartItems={cartItems}
        onOrderSuccess={handleOrderSuccess}
      />

      {/* Order Success & Printable Receipt Modal */}
      <OrderSuccessModal
        order={completedOrder}
        onClose={() => setCompletedOrder(null)}
      />

      {/* Discreet Admin Login Modal (admin@omas.com / Adminofomas1) */}
      <AdminLoginModal
        isOpen={isAdminLoginOpen}
        onClose={() => setIsAdminLoginOpen(false)}
        onLoginSuccess={handleAdminLoginSuccess}
      />

      {/* Admin Management & Upload Portal */}
      <AdminPanelModal
        isOpen={isAdminPanelOpen}
        onClose={() => setIsAdminPanelOpen(false)}
        items={items}
        onAddItem={handleAddNewItem}
        onDeleteItem={handleDeleteItem}
        onLogout={handleAdminLogout}
      />

      {/* Toast Notification */}
      {toastMessage && (
        <div className="toast-notice">
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Footer */}
      <Footer 
        onSelectCategory={setSelectedCategory} 
        onOpenAdmin={handleOpenAdminTrigger} 
      />
    </div>
  );
}
