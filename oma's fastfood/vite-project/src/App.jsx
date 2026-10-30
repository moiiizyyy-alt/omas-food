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
  // Menu items state (Persisted with localStorage fallback)
  const [items, setItems] = useState(() => {
    try {
      const saved = localStorage.getItem('omas_pos_menu_items');
      return saved ? JSON.parse(saved) : DEFAULT_MENU;
    } catch {
      return DEFAULT_MENU;
    }
  });
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
  const [editingItemForAdmin, setEditingItemForAdmin] = useState(null);

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

  // Sync items to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('omas_pos_menu_items', JSON.stringify(items));
    } catch (err) {
      console.warn('Failed to save menu items to localStorage:', err);
    }
  }, [items]);

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
    showToast(`Order #${order.orderId} confirmed successfully! 🧾`);
  };

  // Admin flow
  const handleOpenAdminTrigger = () => {
    if (isAdminLoggedIn) {
      setEditingItemForAdmin(null);
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
    setEditingItemForAdmin(null);
    showToast('Admin logged out.');
  };

  // Add new item (Admin)
  const handleAddNewItem = (newItem) => {
    setItems((prev) => [newItem, ...prev]);
    setSelectedCategory(newItem.category);
    showToast(`Item "${newItem.name}" is now live in menu!`);
  };

  // Update existing item (Admin)
  const handleUpdateItem = async (updatedItem) => {
    try {
      await fetch(`/api/items/${updatedItem.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedItem)
      });
    } catch (err) {
      console.warn('Backend update error, updated locally:', err);
    }

    // Update in menu items
    setItems((prev) =>
      prev.map((i) => (i.id === updatedItem.id ? { ...i, ...updatedItem } : i))
    );

    // Sync in cart items if item is currently in cart
    setCartItems((prev) =>
      prev.map((i) =>
        i.id === updatedItem.id
          ? {
              ...i,
              name: updatedItem.name,
              price: Number(updatedItem.price),
              image: updatedItem.image,
              category: updatedItem.category
            }
          : i
      )
    );

    showToast(`"${updatedItem.name}" updated successfully! ✏️`);
  };

  // Delete item (Admin)
  const handleDeleteItem = async (itemId) => {
    const itemToDelete = items.find((i) => i.id === itemId);
    const itemName = itemToDelete ? itemToDelete.name : 'Item';

    try {
      await fetch(`/api/items/${itemId}`, { method: 'DELETE' });
    } catch (err) {
      console.warn('Backend delete error, removed locally:', err);
    }

    setItems((prev) => prev.filter((i) => i.id !== itemId));
    // Remove from cart if present
    setCartItems((prev) => prev.filter((i) => i.id !== itemId));
    showToast(`"${itemName}" deleted from menu.`);
  };

  // Trigger quick edit on a specific food card
  const handleQuickAdminEdit = (item) => {
    setEditingItemForAdmin(item);
    setIsAdminPanelOpen(true);
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

      {/* Hero Showcase (Themed Name, No Pizza Image, No Rating) */}
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

        {/* Food Items Grid (Mobile: Minimum 2 images/cards per row) */}
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
                  isAdminLoggedIn={isAdminLoggedIn}
                  onAdminEdit={handleQuickAdminEdit}
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
      {completedOrder && (
        <OrderSuccessModal
          order={completedOrder}
          onClose={() => setCompletedOrder(null)}
        />
      )}

      {/* Discreet Admin Login Modal (admin@omas.com / Adminofomas1) */}
      <AdminLoginModal
        isOpen={isAdminLoginOpen}
        onClose={() => setIsAdminLoginOpen(false)}
        onLoginSuccess={handleAdminLoginSuccess}
      />

      {/* Admin Management & Upload Portal */}
      <AdminPanelModal
        isOpen={isAdminPanelOpen}
        onClose={() => {
          setIsAdminPanelOpen(false);
          setEditingItemForAdmin(null);
        }}
        items={items}
        onAddItem={handleAddNewItem}
        onUpdateItem={handleUpdateItem}
        onDeleteItem={handleDeleteItem}
        onLogout={handleAdminLogout}
        initialEditItem={editingItemForAdmin}
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
