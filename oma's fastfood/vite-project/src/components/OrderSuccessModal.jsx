import React, { useState } from 'react';

export default function OrderSuccessModal({ order, onClose }) {
  const [copied, setCopied] = useState(false);
  if (!order) return null;

  const recipientEmail = 'moiiizyyy@gmail.com';
  const formattedDate = new Date(order.createdAt || Date.now()).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
    hour12: true
  });

  const itemsSummary = order.items.map(i => `${i.name} (Qty: ${i.quantity}) - Rs. ${i.price * i.quantity}`).join('\n');
  const emailSubject = `🚨 NEW ORDER #${order.orderId} - Oma's Pizza & Fast Food (Rs. ${order.grandTotal})`;

  const emailBodyText = 
`==============================================
OMA'S PIZZA & FAST FOOD - ORDER #${order.orderId}
==============================================
Date: ${formattedDate}
Payment: Cash on Delivery (COD)

CUSTOMER DETAILS:
Name: ${order.customer.name}
Phone: ${order.customer.phone}
Address: ${order.customer.address}
Notes: ${order.customer.notes || 'None'}

ITEMS:
${itemsSummary}

----------------------------------------------
Subtotal: Rs. ${order.subtotal}
Delivery Fee: Rs. ${order.deliveryFee}
GRAND TOTAL: Rs. ${order.grandTotal}
==============================================`;

  const handlePrint = () => {
    window.print();
  };

  const handleWhatsApp = () => {
    const msg = encodeURIComponent(emailBodyText);
    window.open(`https://wa.me/?text=${msg}`, '_blank');
  };

  // Open Gmail web composer directly with recipient, subject, and body
  const handleOpenGmail = () => {
    const gmailUrl = `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(recipientEmail)}&su=${encodeURIComponent(emailSubject)}&body=${encodeURIComponent(emailBodyText)}`;
    window.open(gmailUrl, '_blank');
  };

  // Open default mail client (Outlook, Apple Mail, Thunderbird, etc.)
  const handleMailto = () => {
    const mailtoUrl = `mailto:${recipientEmail}?subject=${encodeURIComponent(emailSubject)}&body=${encodeURIComponent(emailBodyText)}`;
    window.location.href = mailtoUrl;
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(emailBodyText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '520px' }}>
        {/* Mobile Sheet Drag Indicator */}
        <div className="modal-drag-indicator" aria-hidden="true"></div>

        {/* Header */}
        <div className="modal-header">
          <div className="modal-title-col">
            <span style={{ fontSize: '1.6rem', flexShrink: 0 }}>🎉</span>
            <div style={{ minWidth: 0, flex: 1 }}>
              <h2 className="modal-title" style={{ color: '#10b981' }}>Order Confirmed!</h2>
              <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', display: 'block' }}>
                Order #{order.orderId} registered successfully
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

        {/* Modal Body with Printable Receipt */}
        <div className="modal-body">
          {/* Email notice box */}
          <div style={{
            background: 'rgba(239, 68, 68, 0.12)',
            border: '1px solid rgba(239, 68, 68, 0.4)',
            borderRadius: '12px',
            padding: '1rem',
            marginBottom: '1.25rem'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 800, color: '#ff6b75', fontSize: '0.95rem' }}>
              <span>📧</span>
              <span>Email Target: {recipientEmail}</span>
            </div>
            
            <p style={{ fontSize: '0.82rem', color: '#e2e8f0', margin: '0.4rem 0 0.75rem', lineHeight: 1.5 }}>
              Agar FormSubmit ki verification email inbox ya spam folder me aayi ha to ek baar <strong>"Activate Form"</strong> link confirm kr lein, phir har order auto-deliver hoga. Ya neechay <strong>"Open in Gmail"</strong> pr click kr k turant email bhej saktay hain:
            </p>

            {/* Direct Gmail & Email Buttons */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
              <button
                type="button"
                onClick={handleOpenGmail}
                style={{
                  background: '#ea4335',
                  color: '#fff',
                  border: 'none',
                  padding: '0.5rem 0.9rem',
                  borderRadius: '8px',
                  fontWeight: 700,
                  fontSize: '0.82rem',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  boxShadow: '0 2px 8px rgba(234, 67, 53, 0.4)'
                }}
              >
                <span>✉️</span>
                <span>Open &amp; Send in Gmail</span>
              </button>

              <button
                type="button"
                onClick={handleMailto}
                className="btn-secondary"
                style={{ fontSize: '0.8rem', padding: '0.5rem 0.85rem' }}
              >
                Default Mail App
              </button>

              <button
                type="button"
                onClick={handleCopy}
                className="btn-secondary"
                style={{ fontSize: '0.8rem', padding: '0.5rem 0.85rem' }}
              >
                {copied ? '✓ Copied!' : '📋 Copy Details'}
              </button>
            </div>
          </div>

          {/* POS Printable Receipt */}
          <div className="receipt-paper">
            <div className="receipt-header">
              <div className="receipt-restaurant-name">Oma's Pizza &amp; Fast Food</div>
              <div className="receipt-tagline">Fast Food &bull; Desi BBQ &bull; Chinese</div>
              <div style={{ fontSize: '0.75rem', marginTop: '0.2rem' }}>Hotline: 0300-888-OMAS (6627)</div>
            </div>

            <div className="receipt-meta-grid">
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <strong>Order #:</strong> <span>{order.orderId}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <strong>Date &amp; Time:</strong> <span>{formattedDate}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <strong>Customer:</strong> <span>{order.customer.name}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <strong>Phone:</strong> <span>{order.customer.phone}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <strong>Address:</strong> <span>{order.customer.address}</span>
              </div>
              {order.customer.notes && (
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <strong>Notes:</strong> <span>{order.customer.notes}</span>
                </div>
              )}
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <strong>Payment Mode:</strong> <span>{order.paymentMethod}</span>
              </div>
            </div>

            {/* Table of items */}
            <table className="receipt-items-table">
              <thead>
                <tr>
                  <th>Item</th>
                  <th style={{ textAlign: 'center' }}>Qty</th>
                  <th style={{ textAlign: 'right' }}>Price</th>
                  <th style={{ textAlign: 'right' }}>Total</th>
                </tr>
              </thead>
              <tbody>
                {order.items.map((item, index) => (
                  <tr key={index}>
                    <td>{item.name}</td>
                    <td style={{ textAlign: 'center' }}>{item.quantity}</td>
                    <td style={{ textAlign: 'right' }}>{item.price}</td>
                    <td style={{ textAlign: 'right' }}>{item.price * item.quantity}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Total block */}
            <div className="receipt-total-block">
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Subtotal:</span>
                <span>Rs. {order.subtotal}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Delivery Charges:</span>
                <span>{order.deliveryFee === 0 ? 'FREE' : `Rs. ${order.deliveryFee}`}</span>
              </div>
              <div className="receipt-grand-total">
                <span>TOTAL PAYABLE:</span>
                <span>Rs. {order.grandTotal}</span>
              </div>
            </div>

            <div style={{ textAlign: 'center', fontSize: '0.72rem', marginTop: '1rem', color: '#6b7280' }}>
              *** THANK YOU FOR YOUR ORDER ***<br />
              Fresh &bull; Hot &bull; Hygienic
            </div>
          </div>

          {/* Action buttons */}
          <div className="modal-actions" style={{ justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button
                type="button"
                className="btn-secondary"
                onClick={handlePrint}
                title="Print thermal receipt"
              >
                🖨️ Print Slip
              </button>
              <button
                type="button"
                className="btn-secondary"
                onClick={handleWhatsApp}
                title="Share order via WhatsApp"
              >
                💬 WhatsApp
              </button>
            </div>

            <button
              type="button"
              className="btn-primary"
              onClick={onClose}
            >
              Done &amp; New Order
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
