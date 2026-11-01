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
import {
  getLiveMenuItems,
  addMenuItemCloud,
  updateMenuItemCloud,
  deleteMenuItemCloud,
  saveLiveOrder,
  subscribeToMenuChange
} from './services/cloudSync';

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

  // Load menu from Cloud & setup real-time live synchronization
  useEffect(() => {
    fetchMenuItems(true);

    // 1. Live background polling every 4 seconds for instant cross-device updates (phones, PCs, tablets)
    const pollTimer = setInterval(() => {
      fetchMenuItems(false);
    }, 4000);

    // 2. Instant cross-tab broadcast synchronization
    const unsubscribeBroadcast = subscribeToMenuChange(() => {
      fetchMenuItems(false);
    });

    // 3. Immediate sync whenever user switches back to this tab/window
    const handleVisibilitySync = () => {
      if (document.visibilityState === 'visible') {
        fetchMenuItems(false);
      }
    };

    window.addEventListener('focus', handleVisibilitySync);
    document.addEventListener('visibilitychange', handleVisibilitySync);

    return () => {
      clearInterval(pollTimer);
      unsubscribeBroadcast();
      window.removeEventListener('focus', handleVisibilitySync);
      document.removeEventListener('visibilitychange', handleVisibilitySync);
    };
  }, []);

  const fetchMenuItems = async (showLoading = false) => {
    if (showLoading) setLoadingItems(true);
    try {
      const liveItems = await getLiveMenuItems();
      if (Array.isArray(liveItems) && liveItems.length > 0) {
        setItems(liveItems);
      }
    } catch (err) {
      console.warn('Sync notice: Using current cached menu', err);
    } finally {
      if (showLoading) setLoadingItems(false);
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
    // Sync order to Cloud & dispatch email in background
    saveLiveOrder(order).catch((err) => console.warn('Order sync note:', err));
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

  // Add new item (Admin) - Syncs to Cloud instantly
  const handleAddNewItem = async (newItem) => {
    const itemWithId = {
      id: newItem.id || `item-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      rating: 5.0,
      reviews: 1,
      ...newItem
    };

    // 1. Instant local update for admin
    setItems((prev) => [itemWithId, ...prev.filter((i) => i.id !== itemWithId.id)]);
    setSelectedCategory(itemWithId.category);
    showToast(`"${itemWithId.name}" is now live on all devices! 🍕`);

    // 2. Push to Cloud Database (real-time to all devices)
    try {
      const updatedList = await addMenuItemCloud(itemWithId);
      if (Array.isArray(updatedList)) setItems(updatedList);
    } catch (err) {
      console.warn('Cloud sync error on add:', err);
    }
  };

  // Update existing item (Admin) - Syncs to Cloud instantly
  const handleUpdateItem = async (updatedItem) => {
    // 1. Instant local update
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

    showToast(`"${updatedItem.name}" updated on all devices! ✏️`);

    // 2. Push to Cloud Database
    try {
      const updatedList = await updateMenuItemCloud(updatedItem);
      if (Array.isArray(updatedList)) setItems(updatedList);
    } catch (err) {
      console.warn('Cloud sync error on update:', err);
    }
  };

  // Delete item (Admin) - Syncs to Cloud instantly
  const handleDeleteItem = async (itemId) => {
    const itemToDelete = items.find((i) => i.id === itemId);
    const itemName = itemToDelete ? itemToDelete.name : 'Item';

    // 1. Instant local removal
    setItems((prev) => prev.filter((i) => i.id !== itemId));
    setCartItems((prev) => prev.filter((i) => i.id !== itemId));
    showToast(`"${itemName}" deleted from menu across all devices.`);

    // 2. Remove from Cloud Database
    try {
      const updatedList = await deleteMenuItemCloud(itemId);
      if (Array.isArray(updatedList)) setItems(updatedList);
    } catch (err) {
      console.warn('Cloud sync error on delete:', err);
    }
  };

  // Trigger quick edit on a specific food card
  const handleQuickAdminEdit = (item) => {
    setEditingItemForAdmin(item);
    setIsAdminPanelOpen(true);
  };

  // Filter items by category & search query, prioritizing newest items to the front
  const isCustomOrNew = (it) => {
    if (!it || !it.id) return false;
    // Admin added items have timestamp IDs (length > 10 e.g. item-179...)
    if (typeof it.id === 'string' && it.id.startsWith('item-') && it.id.length > 10) return true;
    if (it.badge === 'New' || it.badge === 'New Arrival') return true;
    return false;
  };

  const filteredItems = items
    .filter((item) => {
      // Category match (case-insensitive & whitespace-safe)
      const matchesCategory =
        !selectedCategory ||
        selectedCategory === 'all' ||
        (selectedCategory === 'Chef Special' && (item.badge === 'Chef Special' || item.badge === 'Must Try')) ||
        (item.category && item.category.trim().toLowerCase() === selectedCategory.trim().toLowerCase());

      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        (item.name && item.name.toLowerCase().includes(q)) ||
        (item.category && item.category.toLowerCase().includes(q)) ||
        (item.description && item.description.toLowerCase().includes(q));

      return matchesCategory && matchesSearch;
    })
    .sort((a, b) => {
      // Prioritize newly added dishes at the very top
      const aNew = isCustomOrNew(a);
      const bNew = isCustomOrNew(b);
      if (aNew && !bNew) return -1;
      if (!aNew && bNew) return 1;
      if (aNew && bNew) {
        return String(b.id).localeCompare(String(a.id));
      }
      return 0;
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
