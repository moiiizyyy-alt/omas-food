import { Link } from 'react-router-dom';
import { useLoad, useLive } from '../components/hooks';
import { PageHead, StatCard, State, StatusBadge, money } from '../components/ui';
import { Donut, HBars, SalesPanel } from '../components/charts';
import { PAY_LABEL, fmtDate } from '../components/utils';

export default function Overview() {
  const { data, loading, error, reload, refresh } = useLoad('/reports/summary');
  useLive(['order:new', 'order:status'], refresh);
  const t = data?.totals || {};

  return (
    <>
      <PageHead title="Overview" sub="Live restaurant performance from MongoDB">
        <Link className="btn btn-sm" to="/admin/pos">Open POS</Link>
        <Link className="btn btn-sm btn-ghost" to="/admin/orders">Manage Orders</Link>
      </PageHead>
      <State loading={loading} error={error} onRetry={reload} hasData={!!data}>
        <div className="adm-stats">
          <StatCard label="Total Revenue" value={money(t.revenue)} sub={`Today: ${money(t.todayRevenue)}`} />
          <StatCard label="Total Orders" value={t.orders || 0} sub={`Today: ${t.todayOrders || 0}`} />
          <StatCard label="Pending Orders" value={t.pending || 0} tone={t.pending > 0 ? 'warn' : undefined} />
          <StatCard label="Completed" value={t.completed || 0} tone="green" />
          <StatCard label="Customers" value={t.customers || 0} />
        </div>

        <SalesPanel daily={data?.daily} weekly={data?.weekly} monthly={data?.monthly} />

        <div className="adm-grid-2">
          <div className="card adm-card">
            <div className="adm-card-head"><h3>Best-selling products</h3></div>
            <HBars rows={(data?.bestSellers || []).map(b => ({ label: b.name, value: b.revenue, sub: `${b.qty} sold` }))} />
          </div>
          <div className="card adm-card">
            <div className="adm-card-head"><h3>Payment methods</h3></div>
            <Donut rows={(data?.paymentMethods || []).map(p => ({ label: PAY_LABEL[p.method] || p.method, value: p.revenue }))} />
          </div>
        </div>

        <div className="card adm-card">
          <div className="adm-card-head"><h3>Recent orders</h3><Link className="linklike" to="/admin/orders">View all</Link></div>
          <div className="table-wrap">
            <table className="table">
              <thead><tr><th>Order</th><th>Customer</th><th>Source</th><th>Total</th><th>Status</th><th>Time</th></tr></thead>
              <tbody>
                {(data?.recentOrders || []).map(o => (
                  <tr key={o.id}>
                    <td><b>{o.orderNumber}</b></td>
                    <td>{o.customer?.name}</td>
                    <td><span className="badge">{o.source}</span></td>
                    <td className="adm-num">{money(o.grandTotal)}</td>
                    <td><StatusBadge status={o.status} /></td>
                    <td className="adm-muted">{fmtDate(o.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </State>
    </>
  );
}

