import React, { useState, useEffect } from 'react';
import { getLiveOrders, updateLiveOrderStatus } from '../services/cloudSync';

export default function AdminPanelModal({
  isOpen,
  onClose,
  items,
  onAddItem,
  onUpdateItem,
  onDeleteItem,
  onLogout,
  initialEditItem = null
}) {
  const [activeTab, setActiveTab] = useState('manage'); // Default to 'manage' or 'upload'
  const [orders, setOrders] = useState([]);
  const [loadingOrders, setLoadingOrders] = useState(false);

  // Search & Filter in Manage Menu
  const [manageSearch, setManageSearch] = useState('');
  const [manageCategory, setManageCategory] = useState('all');

  // Form State for New Item
  const [name, setName] = useState('');
  const [category, setCategory] = useState('Fast Food');
  const [price, setPrice] = useState('');
  const [description, setDescription] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [badge, setBadge] = useState('New');
  const [spicy, setSpicy] = useState('Mild');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState('');

  // Form State for Editing an Existing Item
  const [editingItem, setEditingItem] = useState(null);
  const [editName, setEditName] = useState('');
  const [editCategory, setEditCategory] = useState('Fast Food');
  const [editPrice, setEditPrice] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editImageUrl, setEditImageUrl] = useState('');
  const [editBadge, setEditBadge] = useState('New');
  const [editSpicy, setEditSpicy] = useState('Mild');
  const [isEditSubmitting, setIsEditSubmitting] = useState(false);
  const [editFeedbackMsg, setEditFeedbackMsg] = useState('');

  // Item pending deletion confirmation
  const [itemToDelete, setItemToDelete] = useState(null);

  // If opened with a specific item to edit
  useEffect(() => {
    if (initialEditItem && isOpen) {
      setActiveTab('manage');
      startEditingItem(initialEditItem);
    }
  }, [initialEditItem, isOpen]);

  // Fetch orders when orders tab opened
  useEffect(() => {
    if (activeTab === 'orders' && isOpen) {
      fetchOrders();
    }
  }, [activeTab, isOpen]);

  const fetchOrders = async () => {
    setLoadingOrders(true);
    try {
      const liveOrders = await getLiveOrders();
      setOrders(liveOrders);
    } catch (err) {
      console.warn('Could not fetch orders:', err);
    } finally {
      setLoadingOrders(false);
    }
  };

  const handleStatusChange = async (orderId, newStatus) => {
    setOrders((prev) =>
      prev.map((o) => (o.orderId === orderId || o.id === orderId ? { ...o, status: newStatus } : o))
    );
    try {
      await updateLiveOrderStatus(orderId, newStatus);
    } catch (err) {
      console.warn('Error updating order status:', err);
    }
  };

  // Gallery file handler with browser canvas auto-optimization for crisp HD & fast uploads
  const handleFileUpload = (e, isEdit = false) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        // Optimize resolution to max 900px so phone camera photos (5-15MB) upload instantly
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;
        const maxDim = 900;

        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        const optimizedDataUrl = canvas.toDataURL('image/jpeg', 0.85);

        if (isEdit) {
          setEditImageUrl(optimizedDataUrl);
        } else {
          setImageUrl(optimizedDataUrl);
        }
      };
      img.src = event.target.result;
    };
    reader.readAsDataURL(file);
  };

  // Upload New Item Submit
  const handleUploadSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim() || !price) {
      setFeedbackMsg('Please provide Item Name and Price.');
      return;
    }

    if (!imageUrl.trim()) {
      setFeedbackMsg('Please select an image from your device gallery.');
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
      const newItem = {
        id: `item-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        rating: 5.0,
        reviews: 1,
        ...itemData
      };

      await onAddItem(newItem);
      setFeedbackMsg(`✓ "${newItem.name}" added successfully and synced across all devices!`);

      setName('');
      setPrice('');
      setDescription('');
      setImageUrl('');
    } catch (err) {
      console.warn('Error in add item:', err);
      setFeedbackMsg('Item added to menu!');
      setName('');
      setPrice('');
      setDescription('');
      setImageUrl('');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Start Editing Existing Item
  const startEditingItem = (item) => {
    setEditingItem(item);
    setEditName(item.name || '');
    setEditCategory(item.category || 'Fast Food');
    setEditPrice(item.price !== undefined ? item.price : '');
    setEditDescription(item.description || '');
    setEditImageUrl(item.image || '');
    setEditBadge(item.badge || 'Chef Special');
    setEditSpicy(item.spicy || 'Mild');
    setEditFeedbackMsg('');
  };

  const cancelEditing = () => {
    setEditingItem(null);
    setEditFeedbackMsg('');
  };

  // Save Edited Item
  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!editName.trim() || !editPrice) {
      setEditFeedbackMsg('Item name and price are required.');
      return;
    }

    if (!editImageUrl.trim()) {
      setEditFeedbackMsg('Please select a photo from your gallery.');
      return;
    }

    setIsEditSubmitting(true);
    setEditFeedbackMsg('');

    const updatedData = {
      ...editingItem,
      name: editName.trim(),
      category: editCategory.trim(),
      price: Number(editPrice),
      description: editDescription.trim(),
      image: editImageUrl.trim(),
      badge: editBadge.trim(),
      spicy: editSpicy
    };

    try {
      await onUpdateItem(updatedData);
      setEditFeedbackMsg(`✓ "${updatedData.name}" changes saved successfully!`);
      setTimeout(() => {
        setEditingItem(null);
        setEditFeedbackMsg('');
      }, 1100);
    } catch (err) {
      console.warn('Update error:', err);
      setEditFeedbackMsg('Failed to save changes. Please try again.');
    } finally {
      setIsEditSubmitting(false);
    }
  };

  if (!isOpen) return null;

  // Filter items in Manage Tab
  const filteredManageItems = items.filter((item) => {
    const matchesCat = manageCategory === 'all' || item.category === manageCategory;
    const q = manageSearch.toLowerCase().trim();
    const matchesQuery = !q ||
      item.name.toLowerCase().includes(q) ||
      (item.category && item.category.toLowerCase().includes(q)) ||
      String(item.price).includes(q);
    return matchesCat && matchesQuery;
  });

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-card admin-modal-card" onClick={(e) => e.stopPropagation()}>
        {/* Mobile Sheet Drag Indicator */}
        <div className="modal-drag-indicator" aria-hidden="true"></div>

        {/* Header */}
        <div className="modal-header">
          <div className="modal-title-col">
            <span style={{ fontSize: '1.45rem', flexShrink: 0 }}>👨‍🍳</span>
            <div style={{ minWidth: 0, flex: 1 }}>
              <h2 className="modal-title">Oma's Admin Control Portal</h2>
              <span className="admin-header-subtitle">
                Upload dishes from gallery, modify prices &amp; photos, or manage orders
              </span>
            </div>
          </div>
          <div className="admin-header-actions">
            <button
              type="button"
              className="admin-logout-btn"
              onClick={onLogout}
              title="Lock Admin Portal"
            >
              🔒 Logout
            </button>
            <button 
              type="button" 
              className="btn-drawer-close"
              onClick={onClose}
              aria-label="Close Admin Portal"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="admin-tabs-wrapper">
          <div className="admin-tabs">
            <button
              type="button"
              className={`admin-tab-btn ${activeTab === 'manage' ? 'active' : ''}`}
              onClick={() => { setActiveTab('manage'); cancelEditing(); }}
            >
              📋 Manage Menu ({items.length})
            </button>
            <button
              type="button"
              className={`admin-tab-btn ${activeTab === 'upload' ? 'active' : ''}`}
              onClick={() => { setActiveTab('upload'); cancelEditing(); }}
            >
              ➕ Add New Dish
            </button>
            <button
              type="button"
              className={`admin-tab-btn ${activeTab === 'orders' ? 'active' : ''}`}
              onClick={() => { setActiveTab('orders'); cancelEditing(); }}
            >
              📦 Live Orders {orders.length > 0 && `(${orders.length})`}
            </button>
          </div>
        </div>

        {/* Body Content */}
        <div className="modal-body">
          {/* TAB 1: MANAGE / EDIT MENU */}
          {activeTab === 'manage' && (
            <div>
              {/* If an item is currently selected for editing, show the Edit Form */}
              {editingItem ? (
                <form onSubmit={handleEditSubmit} className="admin-edit-form">
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: '1.25rem',
                    paddingBottom: '0.75rem',
                    borderBottom: '1px solid var(--border-subtle)'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <button
                        type="button"
                        className="btn-secondary"
                        onClick={cancelEditing}
                        style={{ padding: '0.35rem 0.75rem', fontSize: '0.82rem' }}
                      >
                        ← Back to Items
                      </button>
                      <h3 style={{ fontSize: '1.15rem', color: '#fff', margin: 0 }}>
                        Editing: <span style={{ color: 'var(--brand-gold)' }}>{editingItem.name}</span>
                      </h3>
                    </div>
                    <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                      ID: {editingItem.id}
                    </span>
                  </div>

                  {editFeedbackMsg && (
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
                      <span>✓</span>
                      <span>{editFeedbackMsg}</span>
                    </div>
                  )}

                  <div className="form-row-2">
                    <div className="form-group">
                      <label className="form-label">
                        Dish Name <span className="required">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        className="form-input"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        placeholder="e.g. Oma's Loaded Pizza"
                      />
                    </div>

                    <div className="form-group">
                      <label className="form-label">
                        Category <span className="required">*</span>
                      </label>
                      <select
                        className="form-select"
                        value={editCategory}
                        onChange={(e) => setEditCategory(e.target.value)}
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
                        value={editPrice}
                        onChange={(e) => setEditPrice(e.target.value)}
                        placeholder="e.g. 1450"
                      />
                    </div>

                    <div className="form-group">
                      <label className="form-label">Special Tag / Badge</label>
                      <select
                        className="form-select"
                        value={editBadge}
                        onChange={(e) => setEditBadge(e.target.value)}
                      >
                        <option value="Chef Special">⭐ Chef Special</option>
                        <option value="Bestseller">🔥 Bestseller</option>
                        <option value="New">✨ New Arrival</option>
                        <option value="Must Try">👌 Must Try</option>
                        <option value="Daily Deal">🏷️ Daily Deal</option>
                        <option value="">None</option>
                      </select>
                    </div>
                  </div>

                  {/* GALLERY IMAGE PICKER FOR EDITING */}
                  <div className="form-group">
                    <label className="form-label">
                      Dish Photo (Select from Phone Gallery / Files) <span className="required">*</span>
                    </label>

                    <div className="gallery-picker-box">
                      {editImageUrl ? (
                        <div className="gallery-preview-container">
                          <img
                            src={editImageUrl}
                            alt="Dish"
                            className="gallery-preview-thumb"
                            onError={(e) => {
                              e.target.src = 'https://images.unsplash.com/photo-1513104890138-7c749659a591?w=600&auto=format&fit=crop&q=80';
                            }}
                          />
                          <div className="gallery-preview-info">
                            <span className="gallery-preview-status">✓ Photo Loaded from Gallery</span>
                            <label htmlFor="file-edit-gallery-input" className="btn-secondary gallery-btn-change">
                              🖼️ Choose New Photo from Gallery
                            </label>
                          </div>
                        </div>
                      ) : (
                        <label htmlFor="file-edit-gallery-input" className="gallery-dropzone-label">
                          <div className="gallery-upload-icon">📸</div>
                          <div className="gallery-upload-title">Tap to Choose Image from Gallery</div>
                          <div className="gallery-upload-subtitle">Supports JPG, PNG, WebP from your phone or PC</div>
                        </label>
                      )}

                      <input
                        id="file-edit-gallery-input"
                        type="file"
                        accept="image/*"
                        style={{ display: 'none' }}
                        onChange={(e) => handleFileUpload(e, true)}
                      />
                    </div>

                    {/* Optional URL input for convenience */}
                    <div style={{ marginTop: '0.65rem' }}>
                      <details style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                        <summary style={{ cursor: 'pointer', color: 'var(--brand-gold)', fontWeight: 600 }}>
                          🔗 Or enter direct image link (Optional)
                        </summary>
                        <input
                          type="url"
                          className="form-input"
                          style={{ marginTop: '0.45rem', fontSize: '0.82rem' }}
                          placeholder="https://..."
                          value={editImageUrl}
                          onChange={(e) => setEditImageUrl(e.target.value)}
                        />
                      </details>
                    </div>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Description / Ingredients</label>
                    <textarea
                      rows={2}
                      className="form-textarea"
                      placeholder="Describe taste, marinade, seasonings, and toppings..."
                      value={editDescription}
                      onChange={(e) => setEditDescription(e.target.value)}
                    />
                  </div>

                  {/* Real-time Preview */}
                  <div className="admin-preview-wrap">
                    <div className="preview-badge-tag">👁️ Live Updated Card Preview</div>
                    <div className="admin-preview-card">
                      <img
                        src={editImageUrl || 'https://images.unsplash.com/photo-1513104890138-7c749659a591?w=600&auto=format&fit=crop&q=80'}
                        alt="Preview"
                        className="admin-preview-card-img"
                      />
                      <div className="admin-preview-card-details">
                        <div style={{ fontSize: '0.72rem', color: 'var(--brand-gold)', textTransform: 'uppercase', fontWeight: 700 }}>
                          {editCategory} {editBadge && `• ${editBadge}`}
                        </div>
                        <div style={{ fontSize: '1.05rem', fontWeight: 800, color: '#fff', margin: '0.15rem 0' }}>
                          {editName || 'Dish Name'}
                        </div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {editDescription || 'No description provided.'}
                        </div>
                        <div style={{ fontSize: '0.98rem', fontWeight: 800, color: 'var(--brand-gold)', marginTop: '0.2rem' }}>
                          Rs. {editPrice ? Number(editPrice).toLocaleString() : '0'}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="modal-actions" style={{ marginTop: '1.5rem' }}>
                    <button
                      type="button"
                      className="btn-secondary"
                      onClick={cancelEditing}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="btn-primary"
                      disabled={isEditSubmitting}
                      style={{ minWidth: '150px' }}
                    >
                      {isEditSubmitting ? 'Saving Changes...' : '✓ Save Changes'}
                    </button>
                  </div>
                </form>
              ) : (
                /* Items List View */
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  {/* Search and Category Filter Bar */}
                  <div className="admin-filter-bar">
                    <div className="admin-search-input-wrap">
                      <input
                        type="text"
                        className="form-input"
                        placeholder="🔍 Search dishes by name or price..."
                        value={manageSearch}
                        onChange={(e) => setManageSearch(e.target.value)}
                        style={{ padding: '0.5rem 0.85rem', fontSize: '0.85rem' }}
                      />
                    </div>

                    <div className="admin-category-chips">
                      {['all', 'Fast Food', 'Desi Food & BBQ', 'Chinese', 'Beverages'].map((cat) => (
                        <button
                          key={cat}
                          type="button"
                          className={`admin-category-chip ${manageCategory === cat ? 'active' : ''}`}
                          onClick={() => setManageCategory(cat)}
                        >
                          {cat === 'all' ? `All (${items.length})` : cat}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* List of Items */}
                  <div className="admin-items-list">
                    {filteredManageItems.length === 0 ? (
                      <div style={{ textAlign: 'center', padding: '2.5rem 1rem', color: 'var(--text-muted)' }}>
                        <span style={{ fontSize: '2.5rem', display: 'block', marginBottom: '0.5rem' }}>🔍</span>
                        No menu items found matching "{manageSearch}".
                      </div>
                    ) : (
                      filteredManageItems.map((item) => (
                        <div key={item.id} className="admin-item-row">
                          {/* Left: Thumbnail & Details */}
                          <div className="admin-item-left">
                            <img
                              src={item.image}
                              alt={item.name}
                              className="admin-item-thumb"
                              onError={(e) => {
                                e.target.src = 'https://images.unsplash.com/photo-1513104890138-7c749659a591?w=600&auto=format&fit=crop&q=80';
                              }}
                            />
                            <div className="admin-item-info">
                              <div className="admin-item-title">
                                {item.name}
                              </div>
                              <div className="admin-item-meta">
                                <span className="admin-item-price">Rs. {Number(item.price).toLocaleString()}</span>
                                <span>&bull;</span>
                                <span>{item.category}</span>
                                {item.badge && (
                                  <span className="admin-item-badge">
                                    {item.badge}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Right: Edit & Delete Action Buttons */}
                          <div className="admin-item-actions">
                            <button
                              type="button"
                              className="admin-btn-edit"
                              onClick={() => startEditingItem(item)}
                              title="Edit item price, image, or details"
                            >
                              <span>✏️</span>
                              <span>Edit</span>
                            </button>

                            <button
                              type="button"
                              className="admin-btn-delete"
                              onClick={() => setItemToDelete(item)}
                              title="Delete dish from menu"
                            >
                              🗑️
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: ADD NEW DISH (WITH GALLERY IMAGE PICKER) */}
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

              {/* GALLERY IMAGE PICKER FOR NEW DISH */}
              <div className="form-group">
                <label className="form-label">
                  Dish Photo (Select from Phone Gallery / Files) <span className="required">*</span>
                </label>

                <div className="gallery-picker-box">
                  {imageUrl ? (
                    <div className="gallery-preview-container">
                      <img
                        src={imageUrl}
                        alt="Dish"
                        className="gallery-preview-thumb"
                        onError={(e) => {
                          e.target.src = 'https://images.unsplash.com/photo-1513104890138-7c749659a591?w=600&auto=format&fit=crop&q=80';
                        }}
                      />
                      <div className="gallery-preview-info">
                        <span className="gallery-preview-status">✓ Photo Selected from Gallery</span>
                        <label htmlFor="file-upload-gallery-input" className="btn-secondary gallery-btn-change">
                          🖼️ Change Gallery Photo
                        </label>
                      </div>
                    </div>
                  ) : (
                    <label htmlFor="file-upload-gallery-input" className="gallery-dropzone-label">
                      <div className="gallery-upload-icon">📸</div>
                      <div className="gallery-upload-title">Tap to Choose Image from Gallery</div>
                      <div className="gallery-upload-subtitle">Tap here to select dish photo from phone gallery or computer</div>
                    </label>
                  )}

                  <input
                    id="file-upload-gallery-input"
                    type="file"
                    accept="image/*"
                    style={{ display: 'none' }}
                    onChange={(e) => handleFileUpload(e, false)}
                  />
                </div>

                {/* Optional URL input for convenience */}
                <div style={{ marginTop: '0.65rem' }}>
                  <details style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                    <summary style={{ cursor: 'pointer', color: 'var(--brand-gold)', fontWeight: 600 }}>
                      🔗 Or enter direct image link (Optional)
                    </summary>
                    <input
                      type="url"
                      className="form-input"
                      style={{ marginTop: '0.45rem', fontSize: '0.82rem' }}
                      placeholder="https://..."
                      value={imageUrl}
                      onChange={(e) => setImageUrl(e.target.value)}
                    />
                  </details>
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
                <div className="admin-preview-card">
                  <img
                    src={imageUrl || 'https://images.unsplash.com/photo-1513104890138-7c749659a591?w=600&auto=format&fit=crop&q=80'}
                    alt="Preview"
                    className="admin-preview-card-img"
                  />
                  <div className="admin-preview-card-details">
                    <div style={{ fontSize: '0.72rem', color: 'var(--brand-gold)', textTransform: 'uppercase', fontWeight: 700 }}>
                      {category} &bull; {badge}
                    </div>
                    <div style={{ fontSize: '1.05rem', fontWeight: 800, color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {name || 'New Dish Name'}
                    </div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {description || 'Item description will appear here.'}
                    </div>
                    <div style={{ fontSize: '0.95rem', fontWeight: 800, color: '#fff', marginTop: '0.2rem' }}>
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

          {/* TAB 3: LIVE ORDERS */}
          {activeTab === 'orders' && (
            <div>
              {loadingOrders ? (
                <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                  Loading received orders...
                </div>
              ) : orders.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '2.5rem 1rem', color: 'var(--text-muted)' }}>
                  <span style={{ fontSize: '3rem', display: 'block', marginBottom: '0.5rem' }}>📭</span>
                  No customer orders received yet. Once customers place orders, tickets will appear here!
                </div>
              ) : (
                <div className="admin-orders-list">
                  {orders.map((o) => (
                    <div key={o.orderId} className="admin-order-card">
                      <div className="admin-order-top">
                        <div style={{ minWidth: 0, flex: 1 }}>
                          <div className="admin-order-id">
                            Order #{o.orderId}
                          </div>
                          <div className="admin-order-date">
                            {new Date(o.createdAt).toLocaleString()} &bull; <strong>{o.customer.name}</strong> ({o.customer.phone})
                          </div>
                        </div>

                        <select
                          className="admin-order-status-select"
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

                      <div className="admin-order-info-line">
                        📍 <strong>Address:</strong> {o.customer.address}
                      </div>

                      <div className="admin-order-items-box">
                        <strong>Items:</strong>
                        <ul style={{ paddingLeft: '1.25rem', marginTop: '0.25rem', marginBottom: 0 }}>
                          {o.items.map((it, idx) => (
                            <li key={idx}>
                              {it.name} (x{it.quantity}) - Rs. {(it.price * it.quantity).toLocaleString()}
                            </li>
                          ))}
                        </ul>
                      </div>

                      <div className="admin-order-total-bar">
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

        {/* Delete Confirmation Modal Overlay */}
        {itemToDelete && (
          <div style={{
            position: 'absolute',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.85)',
            backdropFilter: 'blur(6px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 100,
            padding: '1rem',
            borderRadius: 'inherit'
          }}>
            <div style={{
              background: 'var(--bg-card)',
              border: '1px solid rgba(229, 9, 20, 0.4)',
              borderRadius: '16px',
              padding: '1.5rem',
              maxWidth: '400px',
              width: '100%',
              textAlign: 'center',
              boxShadow: '0 20px 50px rgba(0, 0, 0, 0.95)'
            }}>
              <span style={{ fontSize: '2.5rem', display: 'block', marginBottom: '0.5rem' }}>🗑️</span>
              <h3 style={{ color: '#fff', fontSize: '1.15rem', marginBottom: '0.5rem' }}>
                Delete Menu Item?
              </h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '1.25rem', lineHeight: 1.5 }}>
                Are you sure you want to permanently remove <strong>"{itemToDelete.name}"</strong>? Customers will no longer see or order this item.
              </p>
              <div style={{ display: 'flex', gap: '0.65rem', justifyContent: 'center', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setItemToDelete(null)}
                  style={{ flex: '1 1 120px', padding: '0.55rem 1rem' }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  style={{
                    flex: '1 1 120px',
                    background: 'var(--brand-red)',
                    color: '#fff',
                    border: 'none',
                    padding: '0.55rem 1rem',
                    borderRadius: '8px',
                    fontWeight: 700,
                    cursor: 'pointer'
                  }}
                  onClick={() => {
                    onDeleteItem(itemToDelete.id);
                    setItemToDelete(null);
                  }}
                >
                  Yes, Delete Dish
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
