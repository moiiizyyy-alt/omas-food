import { useLoad } from '../components/hooks';
import { PageHead, StatCard, State, money } from '../components/ui';
import { BarChart, Donut, HBars, SalesPanel, labelFor } from '../components/charts';
import { PAY_LABEL } from '../components/utils';

const BASE = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');

export default function Reports() {
  const { data, loading, error, reload } = useLoad('/reports/summary');
  const t = data?.totals || {};

  const downloadCsv = async () => {
    const res = await fetch(`${BASE}/api/reports/export.csv`, { credentials: 'include' });
    if (!res.ok) return;
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'omas-orders.csv'; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <>
      <PageHead title="Reports & Analytics" sub="Revenue, category breakdown, customer growth and CSV export">
        <button className="btn" onClick={downloadCsv}>Export CSV</button>
      </PageHead>
      <State loading={loading} error={error} onRetry={reload} hasData={!!data}>
        <div className="adm-stats">
          <StatCard label="Revenue" value={money(t.revenue)} />
          <StatCard label="Completed Orders" value={t.completed || 0} tone="green" />
          <StatCard label="Cancelled Orders" value={t.cancelled || 0} tone={t.cancelled > 0 ? 'warn' : undefined} />
          <StatCard label="Total Customers" value={t.customers || 0} />
        </div>
        <SalesPanel daily={data?.daily} weekly={data?.weekly} monthly={data?.monthly} />
        <div className="adm-grid-2">
          <div className="card adm-card"><div className="adm-card-head"><h3>Category sales</h3></div><HBars rows={(data?.categorySales || []).map(c => ({ label: c.category, value: c.revenue, sub: `${c.qty} items` }))} /></div>
          <div className="card adm-card"><div className="adm-card-head"><h3>Order sources (Online vs POS)</h3></div><Donut rows={(data?.sources || []).map(s => ({ label: s.source.toUpperCase(), value: s.revenue }))} /></div>
        </div>
        <div className="adm-grid-2">
          <div className="card adm-card"><div className="adm-card-head"><h3>Payment methods</h3></div><Donut rows={(data?.paymentMethods || []).map(p => ({ label: PAY_LABEL[p.method] || p.method, value: p.revenue }))} /></div>
          <div className="card adm-card"><div className="adm-card-head"><h3>Customer growth</h3></div><BarChart data={(data?.customerGrowth || []).map(g => ({ label: labelFor.monthly(g._id), value: g.customers }))} format={v => `${v} users`} color="var(--basil)" /></div>
        </div>
      </State>
    </>
  );
}

