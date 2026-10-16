import React, { useState } from 'react';

export default function AdminLoginModal({ isOpen, onClose, onLoginSuccess }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setIsLoading(true);

    const trimmedEmail = email.trim();
    const trimmedPass = password.trim();

    try {
      // Try backend authentication first
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: trimmedEmail, password: trimmedPass })
      });

      const data = await res.json();

      if (data.success) {
        onLoginSuccess();
        setEmail('');
        setPassword('');
        return;
      } else {
        setErrorMsg(data.message || 'Invalid credentials');
      }
    } catch (err) {
      // Fallback local check if backend is offline
      if (trimmedEmail === 'admin@omas.com' && trimmedPass === 'Adminofomas1') {
        onLoginSuccess();
        setEmail('');
        setPassword('');
        return;
      } else {
        setErrorMsg('Invalid email or password. Access denied.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '420px' }}>
        {/* Mobile Sheet Drag Indicator */}
        <div className="modal-drag-indicator" aria-hidden="true"></div>

        {/* Header */}
        <div className="modal-header">
          <div className="modal-title-col">
            <span style={{ fontSize: '1.4rem', flexShrink: 0 }}>🔐</span>
            <div style={{ minWidth: 0, flex: 1 }}>
              <h2 className="modal-title">Admin Staff Verification</h2>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block' }}>
                Restricted menu management access
              </span>
            </div>
          </div>
          <button 
            type="button" 
            className="btn-drawer-close"
            onClick={onClose}
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="modal-body">
          {errorMsg && (
            <div style={{
              background: 'rgba(239, 68, 68, 0.15)',
              border: '1px solid #ef4444',
              color: '#fca5a5',
              padding: '0.65rem 0.85rem',
              borderRadius: '8px',
              fontSize: '0.82rem',
              marginBottom: '1rem'
            }}>
              ⚠️ {errorMsg}
            </div>
          )}

          <div className="form-group">
            <label className="form-label">
              Admin Email Address <span className="required">*</span>
            </label>
            <input
              type="email"
              required
              className="form-input"
              placeholder="admin@omas.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoFocus
            />
          </div>

          <div className="form-group">
            <label className="form-label">
              Admin Security Password <span className="required">*</span>
            </label>
            <input
              type="password"
              required
              className="form-input"
              placeholder="••••••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          <div style={{
            fontSize: '0.75rem',
            color: 'var(--text-subtle)',
            background: 'rgba(255, 255, 255, 0.03)',
            padding: '0.65rem',
            borderRadius: '6px',
            marginBottom: '1.25rem',
            lineHeight: 1.4
          }}>
            ℹ️ Only authorized personnel can upload items, adjust prices, or view live order tickets.
          </div>

          {/* Modal Actions */}
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
              disabled={isLoading}
            >
              {isLoading ? 'Verifying...' : 'Unlock Panel 🔓'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
