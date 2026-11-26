import { useState } from 'react';
import { money } from '../../lib/api';

const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const short = (n) => (n >= 1e6 ? `${(n / 1e6).toFixed(1)}M` : n >= 1e3 ? `${(n / 1e3).toFixed(n >= 1e4 ? 0 : 1)}k` : String(Math.round(n)));

export const labelFor = {
  daily: (k) => { const [, m, d] = k.split('-'); return `${Number(d)} ${MON[Number(m) - 1]}`; },
  weekly: (k) => k.split('-')[1] || k,
  monthly: (k) => { const [y, m] = k.split('-'); return `${MON[Number(m) - 1]} ${y.slice(2)}`; }
};

// CSS/flex bar chart (responsive, no overflow)
export function BarChart({ data, format = money, height = 180, color }) {
  const max = Math.max(1, ...data.map((d) => d.value));
  const step = Math.ceil(data.length / 8);
  if (!data.length) return <div className="adm-chart-empty">No data yet</div>;
  return (
    <div className="adm-bars" style={{ height }} role="img" aria-label="Bar chart">
      {data.map((d, i) => (
        <div key={d.label + i} className="adm-bar-col" title={`${d.label}: ${format(d.value)}`}>
          <span className="adm-bar-val">{d.value ? short(d.value) : ''}</span>
          <div className="adm-bar" style={{ height: `${Math.max(2, (d.value / max) * 100)}%`, background: color }} />
          <span className="adm-bar-lbl">{i % step === 0 ? d.label : ''}</span>
        </div>
      ))}
    </div>
  );
}

// SVG line + area chart
export function LineChart({ data, format = money, height = 180 }) {
  const [hover, setHover] = useState(null);
  if (data.length < 2) return <div className="adm-chart-empty">Not enough data for a trend yet</div>;
  const max = Math.max(1, ...data.map((d) => d.value));
  const pts = data.map((d, i) => [(i / (data.length - 1)) * 100, 36 - (d.value / max) * 32]);
  const line = pts.map((p) => p.join(',')).join(' ');
  const step = Math.ceil(data.length / 8);
  const h = hover != null ? data[hover] : null;
  return (
    <div className="adm-line" style={{ height }}>
      <div className="adm-line-tip" aria-live="polite">{h ? `${h.label}: ${format(h.value)}` : `Peak ${format(max)}`}</div>
      <svg viewBox="0 0 100 40" preserveAspectRatio="none" role="img" aria-label="Line chart">
        <polygon className="adm-area" points={`0,40 ${line} 100,40`} />
        <polyline className="adm-stroke" points={line} fill="none" vectorEffect="non-scaling-stroke" />
        {pts.map((p, i) => (
          <rect key={i} x={p[0] - 50 / data.length} y="0" width={100 / data.length} height="40" fill="transparent"
            onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)} onTouchStart={() => setHover(i)} />
        ))}
        {hover != null && <circle cx={pts[hover][0]} cy={pts[hover][1]} r="1.3" className="adm-dot-pt" />}
      </svg>
      <div className="adm-line-lbls">{data.map((d, i) => <span key={d.label + i}>{i % step === 0 ? d.label : ''}</span>)}</div>
    </div>
  );
}

// Horizontal ranking bars
export function HBars({ rows, format = money, empty = 'No data yet' }) {
  const max = Math.max(1, ...rows.map((r) => r.value));
  if (!rows.length) return <div className="adm-chart-empty">{empty}</div>;
  return (
    <ul className="adm-hbars">
      {rows.map((r) => (
        <li key={r.label}>
          <div className="adm-hbar-top"><span className="adm-hbar-name">{r.label}</span><b>{format(r.value)}</b></div>
          <div className="adm-hbar-track"><div style={{ width: `${(r.value / max) * 100}%` }} /></div>
          {r.sub && <small className="adm-muted">{r.sub}</small>}
        </li>
      ))}
    </ul>
  );
}

const PALETTE = ['#d4381f', '#c9962b', '#2f6b4f', '#2f5f9e', '#8a7d74', '#1d1612'];
export function Donut({ rows, format = money }) {
  const total = rows.reduce((s, r) => s + r.value, 0);
  if (!total) return <div className="adm-chart-empty">No data yet</div>;
  let acc = 0;
  return (
    <div className="adm-donut">
      <svg viewBox="0 0 42 42" role="img" aria-label="Share chart">
        <circle cx="21" cy="21" r="15.9" fill="none" stroke="#f1e8da" strokeWidth="7" />
        {rows.map((r, i) => {
          const pct = (r.value / total) * 100;
          const el = <circle key={r.label} cx="21" cy="21" r="15.9" fill="none" stroke={PALETTE[i % PALETTE.length]} strokeWidth="7" strokeDasharray={`${pct} ${100 - pct}`} strokeDashoffset={25 - acc} />;
          acc += pct;
          return el;
        })}
      </svg>
      <ul>
        {rows.map((r, i) => (
          <li key={r.label}><i style={{ background: PALETTE[i % PALETTE.length] }} />{r.label}<b>{format(r.value)}</b><small>{Math.round((r.value / total) * 100)}%</small></li>
        ))}
      </ul>
    </div>
  );
}

// Daily / weekly / monthly revenue with bar/line switch
export function SalesPanel({ daily = [], weekly = [], monthly = [] }) {
  const [range, setRange] = useState('daily');
  const [kind, setKind] = useState('bar');
  const src = { daily, weekly, monthly }[range];
  const data = src.map((d) => ({ label: labelFor[range](d._id), value: d.revenue, orders: d.orders }));
  const total = data.reduce((s, d) => s + d.value, 0);
  const orders = src.reduce((s, d) => s + d.orders, 0);
  return (
    <div className="card adm-card">
      <div className="adm-card-head">
        <div><h3>Sales</h3><span className="adm-muted">{money(total)} from {orders} orders ({range === 'daily' ? 'last 14 days' : range === 'weekly' ? 'last 8 weeks' : 'last 12 months'})</span></div>
        <div className="adm-seg">
          {['daily', 'weekly', 'monthly'].map((r) => <button key={r} type="button" aria-pressed={range === r} onClick={() => setRange(r)}>{r}</button>)}
          <span className="adm-seg-gap" />
          {['bar', 'line'].map((r) => <button key={r} type="button" aria-pressed={kind === r} onClick={() => setKind(r)}>{r}</button>)}
        </div>
      </div>
      {kind === 'bar' ? <BarChart data={data} /> : <LineChart data={data} />}
    </div>
  );
}
