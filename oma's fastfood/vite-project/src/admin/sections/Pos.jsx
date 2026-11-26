import { useMemo, useRef, useState } from 'react';
import { api, assetUrl, money, unitPrice } from '../../lib/api';
import { useApp } from '../../lib/store.jsx';
import { useAct, useLoad } from '../components/hooks';
import { Modal, PageHead, StatusBadge, Tabs } from '../components/ui';
import { fmtDate } from '../components/utils';
import { printReceipt } from '../components/receipt';

export default function Pos() {
  const { items, categories, settings } = useApp();
  const act = useAct();
  const [tab, setTab] = useState('terminal');
  const [cat, setCat] = useState('all');
  const [q, setQ] = useState('');
  const [ticket, setTicket] = useState([]);
  const [pick, setPick] = useState(null);
  const [opt, setOpt] = useState({ size: '', toppings: [], cheese: '', instructions: '' });
  const [orderType, setOrderType] = useState('pickup');
  const [tableNumber, setTableNumber] = useState('');
  const [cust, setCust] = useState({ name: '', phone: '', address: '' });
  const [discType, setDiscType] = useState('fixed');
  const [discVal, setDiscVal] = useState('');
  const [taxRate, setTaxRate] = useState(settings?.taxRate ?? 0);
  const [tendered, setTendered] = useState('');
  const [done, setDone] = useState(null);
  const [busy, setBusy] = useState(false);
  const [sheet, setSheet] = useState(false);
  const idem = useRef(crypto.randomUUID());

  const { data: hist, refresh: refreshHist } = useLoad(tab === 'history' ? '/orders?source=pos&limit=50' : null);

  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase();
    return items.filter(i => (cat === 'all' || i.category === cat) && (!t || i.name.toLowerCase().includes(t)));
  }, [items, cat, q]);

  const addLine = (p, o = {}) => {
    const { unit, size } = unitPrice(p, o);
    const key = [p.id, size, ...(o.toppings || []), o.cheese || '', o.instructions || ''].join('|');
    setTicket(prev => {
      const f = prev.find(x => x.key === key);
      return f ? prev.map(x => (x.key === key ? { ...x, quantity: x.quantity + 1 } : x)) : [...prev, { key, id: p.id, name: p.name, size, toppings: o.toppings || [], cheese: o.cheese || '', instructions: o.instructions || '', unit, quantity: 1 }];
    });
  };
  const onClickItem = (p) => {
    if (p.sizes?.length > 1 || p.toppings?.length || p.cheeseOptions?.length) {
      setPick(p); setOpt({ size: p.sizes?.[0]?.name || '', toppings: [], cheese: '', instructions: '' });
    } else addLine(p);
  };
  const setQty = (key, q2) => setTicket(prev => (q2 <= 0 ? prev.filter(x => x.key !== key) : prev.map(x => (x.key === key ? { ...x, quantity: q2 } : x))));

  const subtotal = ticket.reduce((s, l) => s + l.unit * l.quantity, 0);
  const dNum = Math.max(0, Number(discVal) || 0);
  const discount = Math.min(subtotal, discType === 'percentage' ? (subtotal * Math.min(dNum, 100)) / 100 : dNum);
  const tax = Math.round((subtotal - discount) * (Number(taxRate) || 0)) / 100;
  const delivery = orderType === 'delivery' ? (settings?.deliveryFee || 0) : 0;
  const total = subtotal - discount + tax + delivery;
  const change = Number(tendered) > 0 ? Math.max(0, Number(tendered) - total) : 0;

  const submit = async () => {
    if (!ticket.length) return;
    setBusy(true);
    const r = await act(() => api('/orders', {
      method: 'POST',
      body: {
        source: 'pos', orderType, tableNumber, customer: cust,
        items: ticket.map(l => ({ id: l.id, quantity: l.quantity, size: l.size, toppings: l.toppings, cheese: l.cheese, instructions: l.instructions })),
        manualDiscount: dNum > 0 ? { type: discType, value: dNum } : undefined,
        taxRate: Number(taxRate) || 0, amountTendered: Number(tendered) || undefined, idempotencyKey: idem.current
      }
    }), 'POS Order recorded');
    setBusy(false);
    if (r && r.order) {
      setDone(r.order); setTicket([]); setDiscVal(''); setTendered(''); setCust({ name: '', phone: '', address: '' }); setTableNumber('');
      idem.current = crypto.randomUUID(); setSheet(false);
    }
  };

  const ticketEl = (
    <div className="card pos-ticket">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}><h3 style={{ margin: 0 }}>Current Ticket ({ticket.reduce((s, l) => s + l.quantity, 0)})</h3>{ticket.length > 0 && <button className="linklike" onClick={() => setTicket([])}>Clear</button>}</div>
      <div className="seg" style={{ marginBottom: 0 }}>
        {[['pickup', 'Takeaway'], ['dine-in', 'Dine-in'], ['delivery', 'Delivery']].map(([k, l]) => <button type="button" key={k} className={orderType === k ? 'on' : ''} onClick={() => setOrderType(k)}>{l}</button>)}
      </div>
      <div className="row row-2">
        <input className="input" placeholder="Customer (Walk-in)" value={cust.name} onChange={e => setCust(c => ({ ...c, name: e.target.value }))} />
        <input className="input" placeholder="Phone" value={cust.phone} onChange={e => setCust(c => ({ ...c, phone: e.target.value }))} />
      </div>
      {orderType === 'dine-in' && <input className="input" placeholder="Table number (e.g. T4)" value={tableNumber} onChange={e => setTableNumber(e.target.value)} />}
      {orderType === 'delivery' && <input className="input" placeholder="Delivery address" value={cust.address} onChange={e => setCust(c => ({ ...c, address: e.target.value }))} />}

      <div className="pos-lines">
        {ticket.length === 0 ? <p className="adm-muted" style={{ textAlign: 'center', padding: 14 }}>Tap items to add to ticket</p> : ticket.map(l => (
          <div className="pos-line" key={l.key}>
            <div><b>{l.name}</b>{l.size && <small className="adm-muted"> ({l.size})</small>}<div className="adm-muted">{money(l.unit * l.quantity)}</div></div>
            <div className="qty sm"><button onClick={() => setQty(l.key, l.quantity - 1)}>-</button><output>{l.quantity}</output><button onClick={() => setQty(l.key, l.quantity + 1)}>+</button></div>
          </div>
        ))}
      </div>

      <div className="row row-2">
        <div style={{ display: 'flex', gap: 4 }}>
          <select className="select" style={{ width: 64, padding: '6px' }} value={discType} onChange={e => setDiscType(e.target.value)}><option value="fixed">Rs</option><option value="percentage">%</option></select>
          <input className="input" type="number" min="0" placeholder="Discount" value={discVal} onChange={e => setDiscVal(e.target.value)} />
        </div>
        <input className="input" type="number" min="0" max="30" placeholder="Tax %" value={taxRate} onChange={e => setTaxRate(e.target.value)} />
      </div>
      <div className="row row-2">
        <input className="input" type="number" min="0" placeholder="Cash received" value={tendered} onChange={e => setTendered(e.target.value)} />
        <div style={{ alignSelf: 'center', fontSize: '.86rem' }}>Change: <b>{money(change)}</b></div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1.1rem', fontWeight: 800 }}><span>Total</span><span>{money(total)}</span></div>
      <button className="btn btn-lg btn-block" disabled={!ticket.length || busy} onClick={submit}>{busy ? 'Charging...' : `Charge ${money(total)}`}</button>
    </div>
  );

  return (
    <>
      <PageHead title="POS Terminal" sub="Fast counter ordering synced with central orders" />
      <Tabs value={tab} onChange={t => { setTab(t); if (t === 'history') refreshHist(); }} tabs={[['terminal', 'POS Register'], ['history', 'POS Order History']]} />

      {tab === 'terminal' ? (
        <div className="pos-wrap">
          <div>
            <div className="adm-toolbar">
              <input className="input" placeholder="Search products..." value={q} onChange={e => setQ(e.target.value)} />
              <div className="rail chips-rail">
                <button className={`chip ${cat === 'all' ? 'active' : ''}`} onClick={() => setCat('all')}>All</button>
                {categories.map(c => <button key={c.id} className={`chip ${cat === c.name ? 'active' : ''}`} onClick={() => setCat(c.name)}>{c.name}</button>)}
              </div>
            </div>
            <div className="pos-grid">
              {filtered.map(p => (
                <button type="button" key={p.id} className="pos-item" disabled={!p.available} onClick={() => onClickItem(p)}>
                  {p.image && <img src={assetUrl(p.image)} alt={p.name} loading="lazy" />}
                  <div className="pos-item-b"><strong>{p.name}</strong><span>{p.available ? money(p.finalPrice) : 'Sold out'}</span></div>
                </button>
              ))}
            </div>
          </div>
          <div className="pos-desk">{ticketEl}</div>
          {ticket.length > 0 && <button className="btn btn-lg pos-fab" onClick={() => setSheet(true)}>View Ticket ({ticket.reduce((s, l) => s + l.quantity, 0)}) · {money(total)}</button>}
        </div>
      ) : (
        <div className="table-wrap">
          <table className="table">
            <thead><tr><th>Order</th><th>Type</th><th>Customer</th><th>Total</th><th>Status</th><th>Time</th><th></th></tr></thead>
            <tbody>
              {(hist?.orders || []).map(o => (
                <tr key={o.id}>
                  <td><b>{o.orderNumber}</b></td><td>{o.orderType}</td><td>{o.customer?.name}</td>
                  <td className="adm-num">{money(o.grandTotal)}</td><td><StatusBadge status={o.status} /></td>
                  <td className="adm-muted">{fmtDate(o.createdAt)}</td>
                  <td><button className="btn btn-sm btn-ghost" onClick={() => printReceipt(o, settings)}>Print</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {sheet && <Modal title="POS Ticket" onClose={() => setSheet(false)}>{ticketEl}</Modal>}

      {pick && (
        <Modal title={`Customise ${pick.name}`} onClose={() => setPick(null)} footer={<button className="btn" onClick={() => { addLine(pick, opt); setPick(null); }}>Add to ticket</button>}>
          {pick.sizes?.length > 0 && <div className="field"><label>Size</label><div className="slots">{pick.sizes.map(s => <button type="button" key={s.name} className={`slot ${opt.size === s.name ? 'on' : ''}`} onClick={() => setOpt(o => ({ ...o, size: s.name }))}>{s.name} ({money(s.price)})</button>)}</div></div>}
          {pick.cheeseOptions?.length > 0 && <div className="field"><label>Cheese</label><div className="slots"><button type="button" className={`slot ${opt.cheese === '' ? 'on' : ''}`} onClick={() => setOpt(o => ({ ...o, cheese: '' }))}>Regular</button>{pick.cheeseOptions.map(c => <button type="button" key={c.name} className={`slot ${opt.cheese === c.name ? 'on' : ''}`} onClick={() => setOpt(o => ({ ...o, cheese: c.name }))}>{c.name} (+{money(c.price)})</button>)}</div></div>}
          {pick.toppings?.length > 0 && <div className="field"><label>Toppings</label><div className="slots">{pick.toppings.map(t => <button type="button" key={t.name} className={`slot ${opt.toppings.includes(t.name) ? 'on' : ''}`} onClick={() => setOpt(o => ({ ...o, toppings: o.toppings.includes(t.name) ? o.toppings.filter(x => x !== t.name) : [...o.toppings, t.name] }))}>{t.name} (+{money(t.price)})</button>)}</div></div>}
        </Modal>
      )}

      {done && (
        <Modal title={`Order #${done.orderNumber} Paid`} onClose={() => setDone(null)} footer={<>
          <button className="btn btn-ghost" onClick={() => printReceipt(done, settings)}>Print Receipt</button>
          <button className="btn" onClick={() => setDone(null)}>New Order</button>
        </>}>
          <p>Server verified total: <b>{money(done.grandTotal)}</b></p>
          {done.amountTendered > 0 && <p>Cash tendered: {money(done.amountTendered)} · Change: <b>{money(Math.max(0, done.amountTendered - done.grandTotal))}</b></p>}
        </Modal>
      )}
    </>
  );
}

