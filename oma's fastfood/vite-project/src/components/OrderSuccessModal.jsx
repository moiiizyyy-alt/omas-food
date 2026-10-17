import React, { useEffect, useRef } from 'react';

export default function OrderSuccessModal({ order, onClose }) {
  const emailSentRef = useRef(false);

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

  // Automatically dispatch order notification email to moiiizyyy@gmail.com silently in background
  useEffect(() => {
    if (order && !emailSentRef.current) {
      emailSentRef.current = true;
      try {
        const itemsSummary = (order.items || [])
          .map((item, idx) => `${idx + 1}. ${item.name} (Qty: ${item.quantity}) - Rs. ${item.price * item.quantity}`)
          .join('\n');

        const emailSubject = `🚨 NEW ORDER #${order.orderId} - Oma's Fast Food (Rs. ${order.grandTotal})`;

        fetch(`https://formsubmit.co/ajax/${recipientEmail}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          body: JSON.stringify({
            _subject: emailSubject,
            'Order ID': order.orderId,
            'Order Date': formattedDate,
            'Customer Name': order.customer?.name || 'N/A',
            'Phone Number': order.customer?.phone || 'N/A',
            'Delivery Address': order.customer?.address || 'N/A',
            'Delivery Notes': order.customer?.notes || 'None',
            'Items Ordered': itemsSummary,
            'Subtotal': `Rs. ${order.subtotal}`,
            'Delivery Fee': order.deliveryFee === 0 ? 'FREE' : `Rs. ${order.deliveryFee}`,
            'Grand Total': `Rs. ${order.grandTotal}`,
            'Payment Mode': order.paymentMethod || 'Cash on Delivery (COD)',
            _template: 'table',
            _captcha: 'false'
          })
        }).catch((err) => {
          console.warn('Background auto-email dispatch notice:', err);
        });
      } catch (e) {
        console.warn('Background auto-email error:', e);
      }
    }
  }, [order, formattedDate]);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '480px' }}>
        {/* Mobile Sheet Drag Indicator */}
        <div className="modal-drag-indicator" aria-hidden="true"></div>

        {/* Header */}
        <div className="modal-header">
          <div className="modal-title-col">
            <span style={{ fontSize: '1.6rem', flexShrink: 0 }}>🧾</span>
            <div style={{ minWidth: 0, flex: 1 }}>
              <h2 className="modal-title" style={{ color: '#10b981' }}>Order Bill</h2>
              <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', display: 'block' }}>
                Order #{order.orderId} • Registered Successfully
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

        {/* Modal Body: ONLY the Printable Bill */}
        <div className="modal-body">
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
                <strong>Customer:</strong> <span>{order.customer?.name}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <strong>Phone:</strong> <span>{order.customer?.phone}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <strong>Address:</strong> <span>{order.customer?.address}</span>
              </div>
              {order.customer?.notes && (
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <strong>Notes:</strong> <span>{order.customer.notes}</span>
                </div>
              )}
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <strong>Payment Mode:</strong> <span>{order.paymentMethod || 'Cash on Delivery (COD)'}</span>
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
                {order.items?.map((item, index) => (
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

          {/* Action buttons: Print & Close only */}
          <div className="modal-actions" style={{ justifyContent: 'space-between' }}>
            <button
              type="button"
              className="btn-secondary"
              onClick={handlePrint}
              title="Print thermal receipt slip"
            >
              🖨️ Print Bill
            </button>

            <button
              type="button"
              className="btn-primary"
              onClick={onClose}
            >
              Done &amp; Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
