import { useState } from 'react';
import { api, money } from '../../lib/api';
import { useAct, useDebounced, useLoad } from '../components/hooks';
import { Empty, Modal, PageHead, State, StatusBadge } from '../components/ui';
import { fmtDate, fmtDay } from '../components/utils';

export default function Customers() {
  const [q, setQ] = useState('');
  const dq = useDebounced(q);
  const { data, loading, error, reload } = useLoad(`/customers${dq ? `?q=${encodeURIComponent(dq)}` : ''}`);
  const act = useAct();
  const [detail, setDetail] = useState(null);

  const open = async (id) => {
    const r = await act(() => api(`/customers/${id}`));
    if (r) setDetail(r);
  };
  const list = data?.customers || [];

  return (
    <>
      <PageHead title="Customers" sub={`${list.length} registered accounts`} />
      <div className="adm-toolbar"><input className="input" placeholder="Search name, email or phone..." value={q} onChange={e => setQ(e.target.value)} /></div>
      <State loading={loading} error={error} onRetry={reload} hasData={!!data}>
        {list.length === 0 ? <Empty>No customers found.</Empty> : (
          <div className="table-wrap">
            <table className="table">
              <thead><tr><th>Customer</th><th>Phone</th><th>Orders</th><th>Total Spent</th><th>Joined</th><th></th></tr></thead>
              <tbody>
                {list.map(c => (
                  <tr key={c.id}>
                    <td><b>{c.name}</b><div className="adm-muted">{c.email}</div></td>
                    <td>{c.phone || '-'}</td><td>{c.orders}</td><td className="adm-num">{money(c.totalSpent)}</td><td className="adm-muted">{fmtDay(c.joinedAt)}</td>
                    <td><button className="btn btn-sm btn-ghost" onClick={() => open(c.id)}>Profile</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </State>
      {detail && (
        <Modal title={detail.customer.name} onClose={() => setDetail(null)} wide>
          <p><b>Email:</b> {detail.customer.email} · <b>Phone:</b> {detail.customer.phone || '-'} · <b>Total spent:</b> {money(detail.totalSpent)}</p>
          <h4>Order history ({detail.orders.length})</h4>
          <div className="table-wrap"><table className="table"><thead><tr><th>Order</th><th>Total</th><th>Status</th><th>Date</th></tr></thead><tbody>
            {detail.orders.map(o => <tr key={o.id}><td><b>{o.orderNumber}</b></td><td className="adm-num">{money(o.grandTotal)}</td><td><StatusBadge status={o.status} /></td><td className="adm-muted">{fmtDate(o.createdAt)}</td></tr>)}
          </tbody></table></div>
        </Modal>
      )}
    </>
  );
}

