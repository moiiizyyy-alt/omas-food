import { useMemo, useState } from 'react';
import { api } from '../../lib/api';
import { useApp } from '../../lib/store.jsx';
import { useAct, useAdmin, useDebounced, useLive, useLoad } from '../components/hooks';
import { Empty, Modal, PageHead, State, StatusBadge, money } from '../components/ui';
import { ALL_STATUSES, PAY_LABEL, TYPE_LABEL, fmtDate, nextStatuses, optionLine } from '../components/utils';
import { printReceipt } from '../components/receipt';

export default function Orders() {
  const { settings } = useApp();
  const { user, can, toast } = useAdmin();
  const act = useAct();
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('');
  const [source, setSource] = useState('');
  const [type, setType] = useState('');
  const [detail, setDetail] = useState(null);
  const [flashId, setFlashId] = useState('');
  const dq = useDebounced(q);

  const query = useMemo(() => {
    const p = new URLSearchParams();
    if (dq) p.set('q', dq);
    if (status) p.set('status', status);
    if (source) p.set('source', source);
    if (type) p.set('type', type);
    return `/orders${p.toString() ? `?${p}` : ''}`;
  }, [dq, status, source, type]);

  const { data, loading, error, reload, refresh } = useLoad(query);
  useLive(['order:new', 'order:status'], (d) => {
    if (d.order) { setFlashId(d.order.orderNumber); toast(`Order #${d.order.orderNumber} (${d.order.status})`); }
    refresh();
  });

  const orders = data?.orders || [];
  const updateStatus = async (order, next) => {
    const r = await act(() => api(`/orders/${order.orderNumber}/status`, { method: 'PATCH', body: { status: next } }), `Order #${order.orderNumber} → ${next}`);
    if (r) { refresh(); if (detail && detail.id === order.id) setDetail(r.order); }
  };

  return (
    <>
      <PageHead title="Orders" sub={`${data?.total ?? orders.length} orders (online + POS unified)`} />
      <div className="adm-toolbar">
        <input className="input" placeholder="Search order #, name, phone..." value={q} onChange={e => setQ(e.target.value)} />
        <select className="select" value={status} onChange={e => setStatus(e.target.value)}><option value="">All statuses</option>{ALL_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}</select>
        <select className="select" value={source} onChange={e => setSource(e.target.value)}><option value="">All sources</option><option value="online">Online</option><option value="pos">POS</option></select>
        <select className="select" value={type} onChange={e => setType(e.target.value)}><option value="">All types</option><option value="delivery">Delivery</option><option value="pickup">Pickup</option><option value="dine-in">Dine-in</option></select>
      </div>

      <State loading={loading} error={error} onRetry={reload} hasData={!!data}>
        {orders.length === 0 ? <Empty>No matching orders.</Empty> : (
          <div className="table-wrap">
            <table className="table">
              <thead><tr><th>Order</th><th>Customer</th><th>Type / Source</th><th>Total</th><th>Status</th><th>Actions</th></tr></thead>
              <tbody>
                {orders.map(o => {
                  const nexts = nextStatuses(o, user, can);
                  return (
                    <tr key={o.id} className={flashId === o.orderNumber ? 'adm-flash' : ''}>
                      <td><b>{o.orderNumber}</b><div className="adm-muted">{fmtDate(o.createdAt)}</div></td>
                      <td><b>{o.customer?.name}</b><div className="adm-muted">{o.customer?.phone}</div></td>
                      <td><span className="badge">{TYPE_LABEL[o.orderType] || o.orderType}</span> <span className="badge badge-dark">{o.source}</span></td>
                      <td className="adm-num">{money(o.grandTotal)}</td>
                      <td><StatusBadge status={o.status} /></td>
                      <td>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                          {o.status === 'Pending' && nexts.includes('Confirmed') && <button className="btn btn-sm" onClick={() => updateStatus(o, 'Confirmed')}>Accept</button>}
                          {o.status === 'Pending' && nexts.includes('Cancelled') && <button className="btn btn-sm btn-danger" onClick={() => updateStatus(o, 'Cancelled')}>Reject</button>}
                          {nexts.length > 0 && (
                            <select className="select" style={{ minHeight: 32, padding: '2px 8px', width: 'auto' }} value="" aria-label="Change status" onChange={e => e.target.value && updateStatus(o, e.target.value)}>
                              <option value="">Move to...</option>
                              {nexts.map(s => <option key={s} value={s}>{s}</option>)}
                            </select>
                          )}
                          <button className="btn btn-sm btn-ghost" onClick={() => setDetail(o)}>Details</button>
                          <button className="btn btn-sm btn-ghost" onClick={() => printReceipt(o, settings)}>Print</button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </State>

      {detail && (
        <Modal title={`Order #${detail.orderNumber}`} onClose={() => setDetail(null)} wide footer={<>
          <button className="btn btn-ghost" onClick={() => printReceipt(detail, settings)}>Print 80mm Receipt</button>
          <button className="btn" onClick={() => setDetail(null)}>Close</button>
        </>}>
          <div className="adm-grid-2" style={{ marginBottom: 14 }}>
            <div>
              <p><b>Customer:</b> {detail.customer?.name} ({detail.customer?.phone})</p>
              {detail.customer?.address && <p><b>Address:</b> {detail.customer.address} {detail.customer.area} {detail.customer.city}</p>}
              {detail.customer?.notes && <p><b>Notes:</b> {detail.customer.notes}</p>}
            </div>
            <div>
              <p><b>Status:</b> <StatusBadge status={detail.status} /></p>
              <p><b>Payment:</b> {PAY_LABEL[detail.paymentMethod] || detail.paymentMethod} ({detail.paymentStatus})</p>
              <p><b>Type:</b> {TYPE_LABEL[detail.orderType]} · Source: {detail.source}</p>
            </div>
          </div>
          <div className="table-wrap">
            <table className="table">
              <thead><tr><th>Item</th><th>Qty</th><th>Unit</th><th>Total</th></tr></thead>
              <tbody>
                {detail.items.map((it, i) => (
                  <tr key={i}>
                    <td><b>{it.name}</b>{optionLine(it) && <div className="adm-muted">{optionLine(it)}</div>}{it.instructions && <div className="adm-muted">Note: {it.instructions}</div>}</td>
                    <td>{it.quantity}</td><td>{money(it.unitPrice)}</td><td className="adm-num">{money(it.lineTotal)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div style={{ marginTop: 12, textAlign: 'right' }}>
            <div>Subtotal: {money(detail.subtotal)}</div>
            {detail.discount > 0 && <div>Discount: -{money(detail.discount)}</div>}
            {detail.tax > 0 && <div>Tax ({detail.taxRate}%): {money(detail.tax)}</div>}
            {detail.deliveryFee > 0 && <div>Delivery: {money(detail.deliveryFee)}</div>}
            <div style={{ fontSize: '1.15rem', fontWeight: 800, marginTop: 4 }}>Grand Total: {money(detail.grandTotal)}</div>
          </div>
        </Modal>
      )}
    </>
  );
}

