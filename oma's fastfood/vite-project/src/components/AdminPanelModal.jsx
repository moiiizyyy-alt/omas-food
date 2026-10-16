import React, { useState, useEffect } from 'react';
import { QUICK_IMAGE_PRESETS } from '../data/defaultMenu';

export default function AdminPanelModal({
  isOpen,
  onClose,
  items,
  onAddItem,
  onDeleteItem,
  onLogout
}) {
  const [activeTab, setActiveTab] = useState('upload'); // 'upload' | 'manage' | 'orders'
  const [orders, setOrders] = useState([]);
  const [loadingOrders, setLoadingOrders] = useState(false);

  // Form State for New Item
  const [name, setName] = useState('');
  const [category, setCategory] = useState('Fast Food');
  const [price, setPrice] = useState('');
  const [description, setDescription] = useState('');
  const [imageUrl, setImageUrl] = useState(QUICK_IMAGE_PRESETS[0].url);
  const [badge, setBadge] = useState('New');
  const [spicy, setSpicy] = useState('Mild');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState('');

  // Fetch orders when orders tab opened
  useEffect(() => {
    if (activeTab === 'orders' && isOpen) {
      fetchOrders();
    }
  }, [activeTab, isOpen]);

  const fetchOrders = async () => {
    setLoadingOrders(true);
    try {
      const res = await fetch('/api/orders');
      const data = await res.json();
      if (data.success && data.orders) {
        setOrders(data.orders);
      }
    } catch (err) {
      console.warn('Could not fetch orders:', err);
    } finally {
      setLoadingOrders(false);
    }
  };

  const handleStatusChange = async (orderId, newStatus) => {
    try {
      const res = await fetch(`/api/orders/${orderId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      });
      const data = await res.json();
      if (data.success) {
        setOrders(orders.map(o => o.orderId === orderId ? { ...o, status: newStatus } : o));
      }
    } catch (err) {
      console.warn('Error updating order status:', err);
    }
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImageUrl(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleUploadSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim() || !price || !imageUrl.trim()) {
      setFeedbackMsg('Please provide Item Name, Price, and Image.');
      return;
    }

    setIsSubmitting(true);
    setFeedbackMsg('');

    const itemData = {
      name: name.trim(),
      category: category.trim(),
      price: Number(price),
      description: description.trim() || 'Freshly prepared specialty crafted in Oma\'s kitchen with premium ingredients.',
      image: imageUrl.trim(),
      badge: badge.trim(),
      spicy
    };

    try {
      // POST to backend API
      const res = await fetch('/api/items', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(itemData)
      });

      const data = await res.json();

      if (data.success && data.item) {
        onAddItem(data.item);
        setFeedbackMsg(`✓ "${data.item.name}" uploaded successfully! It is now live in the ${data.item.category} menu.`);
      } else {
        // Fallback local addition
        const localItem = {
          id: `item-${Date.now()}`,
          rating: 5.0,
          reviews: 1,
          ...itemData
        };
        onAddItem(localItem);
        setFeedbackMsg(`✓ "${localItem.name}" added to menu!`);
      }

      // Reset form
      setName('');
      setPrice('');
      setDescription('');
    } catch (err) {
      console.warn('Backend /api/items POST error, adding locally:', err);
      const fallbackItem = {
        id: `item-${Date.now()}`,
        rating: 5.0,
        reviews: 1,
        ...itemData
      };
      onAddItem(fallbackItem);
      setFeedbackMsg(`✓ "${fallbackItem.name}" added to menu!`);
      setName('');
      setPrice('');
      setDescription('');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '720px' }}>
        {/* Mobile Sheet Drag Indicator */}
        <div className="modal-drag-indicator" aria-hidden="true"></div>

        {/* Header */}
        <div className="modal-header">
          <div className="modal-title-col">
            <span style={{ fontSize: '1.5rem', flexShrink: 0 }}>👨‍🍳</span>
            <div style={{ minWidth: 0, flex: 1 }}>
              <h2 className="modal-title">Oma's Admin Control Portal</h2>
              <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', display: 'block' }}>
                Upload new dishes, modify prices, and monitor customer orders
              </span>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <button
              type="button"
              className="btn-secondary"
              style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem' }}
              onClick={onLogout}
              title="Lock Admin Portal"
            >
              🔒 Logout
            </button>
            <button 
              type="button" 
              className="btn-drawer-close"
              onClick={onClose}
            >
              ✕
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div style={{ padding: '0 1.75rem', background: 'var(--bg-main)' }}>
          <div className="admin-tabs" style={{ marginBottom: 0 }}>
            <button
              type="button"
              className={`admin-tab-btn ${activeTab === 'upload' ? 'active' : ''}`}
              onClick={() => setActiveTab('upload')}
            >
              ➕ Upload New Item
            </button>
            <button
              type="button"
              className={`admin-tab-btn ${activeTab === 'manage' ? 'active' : ''}`}
              onClick={() => setActiveTab('manage')}
            >
              📋 Manage Menu ({items.length})
            </button>
            <button
              type="button"
              className={`admin-tab-btn ${activeTab === 'orders' ? 'active' : ''}`}
              onClick={() => setActiveTab('orders')}
            >
              📦 Live Orders {orders.length > 0 && `(${orders.length})`}
            </button>
          </div>
        </div>

        {/* Body Content */}
        <div className="modal-body">
          {/* TAB 1: UPLOAD NEW ITEM */}
          {activeTab === 'upload' && (
            <form onSubmit={handleUploadSubmit}>
              {feedbackMsg && (
                <div style={{
                  background: 'rgba(16, 185, 129, 0.15)',
                  border: '1px solid #10b981',
                  color: '#6ee7b7',
                  padding: '0.75rem 1rem',
                  borderRadius: '8px',
                  fontSize: '0.88rem',
                  marginBottom: '1.25rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem'
                }}>
                  <span>🎉</span>
                  <span>{feedbackMsg}</span>
                </div>
              )}

              <div className="form-row-2">
                <div className="form-group">
                  <label className="form-label">
                    Item Name <span className="required">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    className="form-input"
                    placeholder="e.g. Oma's Loaded Stuffed Pizza"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">
                    Category <span className="required">*</span>
                  </label>
                  <select
                    className="form-select"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                  >
                    <option value="Fast Food">🍕 Fast Food (Pizza, Burgers, Shawarma)</option>
                    <option value="Desi Food & BBQ">🍗 Desi Food &amp; BBQ (Karahi, Tikka, Boti)</option>
                    <option value="Chinese">🥢 Chinese (Chowmein, Fried Rice, Gravy)</option>
                    <option value="Beverages">🥤 Beverages &amp; Shakes</option>
                  </select>
                </div>
              </div>

              <div className="form-row-2">
                <div className="form-group">
                  <label className="form-label">
                    Price in PKR (Rs.) <span className="required">*</span>
                  </label>
                  <input
                    type="number"
                    required
                    min={1}
                    className="form-input"
                    placeholder="e.g. 1250"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Special Tag / Badge</label>
                  <select
                    className="form-select"
                    value={badge}
                    onChange={(e) => setBadge(e.target.value)}
                  >
                    <option value="Chef Special">⭐ Chef Special</option>
                    <option value="Bestseller">🔥 Bestseller</option>
                    <option value="New">✨ New Arrival</option>
                    <option value="Must Try">👌 Must Try</option>
                    <option value="Daily Deal">🏷️ Daily Deal</option>
                  </select>
                </div>
              </div>

              {/* Image Input Section */}
              <div className="form-group">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.45rem' }}>
                  <label className="form-label" style={{ marginBottom: 0 }}>
                    Food Image URL / Quick Presets <span className="required">*</span>
                  </label>
                  <label 
                    htmlFor="file-upload-input" 
                    style={{ fontSize: '0.78rem', color: 'var(--brand-gold)', cursor: 'pointer', fontWeight: 600 }}
                  >
                    📁 Upload from Computer
                  </label>
                  <input
                    id="file-upload-input"
                    type="file"
                    accept="image/*"
                    style={{ display: 'none' }}
                    onChange={handleFileUpload}
                  />
                </div>

                <input
                  type="url"
                  required
                  className="form-input"
                  placeholder="https://images.unsplash.com/photo-..."
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                />

                {/* Quick Royalty-Free Preset Food Photos */}
                <div style={{ marginTop: '0.5rem' }}>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    Or select a royalty-free HD food photo preset:
                  </span>
                  <div className="image-presets-grid">
                    {QUICK_IMAGE_PRESETS.map((preset, idx) => (
                      <button
                        key={idx}
                        type="button"
                        className={`preset-thumb-btn ${imageUrl === preset.url ? 'selected' : ''}`}
                        onClick={() => setImageUrl(preset.url)}
                        title={preset.label}
                      >
                        <img src={preset.url} alt={preset.label} />
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Description / Ingredients</label>
                <textarea
                  rows={2}
                  className="form-textarea"
                  placeholder="Describe delicious taste, marinade, seasonings, and toppings..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>

              {/* Real-time Card Preview */}
              <div className="admin-preview-wrap">
                <div className="preview-badge-tag">👁️ Live Card Preview in Menu</div>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '1rem',
                  background: 'var(--bg-card)',
                  padding: '0.85rem',
                  borderRadius: '10px',
                  border: '1px solid var(--border-subtle)'
                }}>
                  <img
                    src={imageUrl || 'https://images.unsplash.com/photo-1513104890138-7c749659a591?w=600&auto=format&fit=crop&q=80'}
                    alt="Preview"
                    style={{ width: '80px', height: '80px', borderRadius: '8px', objectFit: 'cover' }}
                  />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '0.72rem', color: 'var(--brand-gold)', textTransform: 'uppercase', fontWeight: 700 }}>
                      {category} &bull; {badge}
                    </div>
                    <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#fff' }}>
                      {name || 'New Dish Name'}
                    </div>
                    <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {description || 'Item description will appear here.'}
                    </div>
                    <div style={{ fontSize: '1rem', fontWeight: 800, color: '#fff', marginTop: '0.2rem' }}>
                      Rs. {price ? Number(price).toLocaleString() : '0'}
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="modal-actions">
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={onClose}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-primary"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? 'Uploading to Menu...' : '✓ Upload & Add to Menu'}
                </button>
              </div>
            </form>
          )}

          {/* TAB 2: MANAGE MENU */}
          {activeTab === 'manage' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
                All active items on the restaurant menu. You can remove or adjust items anytime.
              </div>
              <div style={{ maxHeight: '420px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                {items.map((item) => (
                  <div
                    key={item.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      background: 'var(--bg-main)',
                      border: '1px solid var(--border-subtle)',
                      padding: '0.65rem 0.95rem',
                      borderRadius: '10px'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                      <img
                        src={item.image}
                        alt={item.name}
                        style={{ width: '45px', height: '45px', borderRadius: '6px', objectFit: 'cover' }}
                      />
                      <div>
                        <div style={{ fontWeight: 700, fontSize: '0.92rem', color: '#fff' }}>
                          {item.name}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                          <span style={{ color: 'var(--brand-gold)' }}>{item.category}</span> &bull; Rs. {Number(item.price).toLocaleString()}
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      className="cart-remove-btn"
                      onClick={() => onDeleteItem(item.id)}
                      title="Delete item from menu"
                      style={{ fontSize: '1.1rem', padding: '0.35rem 0.65rem' }}
                    >
                      🗑️
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 3: LIVE ORDERS */}
          {activeTab === 'orders' && (
            <div>
              {loadingOrders ? (
                <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                  Loading received orders...
                </div>
              ) : orders.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '2.5rem', color: 'var(--text-muted)' }}>
                  <span style={{ fontSize: '3rem', display: 'block', marginBottom: '0.5rem' }}>📭</span>
                  No customer orders received yet. Once customers place orders, tickets will appear here!
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', maxHeight: '440px', overflowY: 'auto' }}>
                  {orders.map((o) => (
                    <div
                      key={o.orderId}
                      style={{
                        background: 'var(--bg-main)',
                        border: '1px solid var(--border-subtle)',
                        borderRadius: '12px',
                        padding: '1rem'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.65rem' }}>
                        <div>
                          <div style={{ fontWeight: 800, fontSize: '1.05rem', color: '#fff' }}>
                            Order #{o.orderId}
                          </div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                            {new Date(o.createdAt).toLocaleString()} &bull; <strong>{o.customer.name}</strong> ({o.customer.phone})
                          </div>
                        </div>

                        <select
                          className="form-select"
                          style={{ width: 'auto', padding: '0.35rem 0.65rem', fontSize: '0.8rem' }}
                          value={o.status}
                          onChange={(e) => handleStatusChange(o.orderId, e.target.value)}
                        >
                          <option value="Pending">🟡 Pending</option>
                          <option value="Preparing">🟠 In Kitchen / Preparing</option>
                          <option value="Out for Delivery">🚚 Out for Delivery</option>
                          <option value="Completed">🟢 Delivered &amp; Paid</option>
                          <option value="Cancelled">🔴 Cancelled</option>
                        </select>
                      </div>

                      <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: '0.45rem' }}>
                        📍 <strong>Address:</strong> {o.customer.address}
                      </div>

                      <div style={{ background: 'rgba(255, 255, 255, 0.03)', borderRadius: '8px', padding: '0.65rem', fontSize: '0.82rem' }}>
                        <strong>Items:</strong>
                        <ul style={{ paddingLeft: '1.25rem', marginTop: '0.25rem' }}>
                          {o.items.map((it, idx) => (
                            <li key={idx}>
                              {it.name} (x{it.quantity}) - Rs. {it.price * it.quantity}
                            </li>
                          ))}
                        </ul>
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.65rem', fontWeight: 800, fontSize: '0.95rem' }}>
                        <span>Total (Cash on Delivery):</span>
                        <span style={{ color: 'var(--brand-gold)' }}>Rs. {o.grandTotal.toLocaleString()}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
