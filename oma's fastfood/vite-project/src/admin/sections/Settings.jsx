import { useEffect, useState } from 'react';
import { api } from '../../lib/api';
import { useApp } from '../../lib/store.jsx';
import { useAct, useLoad } from '../components/hooks';
import { CheckField, Field, ImageField, PageHead, Tabs, TextField } from '../components/ui';
import { fmtDate } from '../components/utils';

export default function Settings() {
  const { settings } = useApp();
  const act = useAct();
  const [tab, setTab] = useState('general');
  const [f, setF] = useState(null);
  const [busy, setBusy] = useState(false);
  const { data: msgs, refresh: refreshMsgs } = useLoad(tab === 'messages' ? '/contact' : null);

  useEffect(() => { if (settings && !f) setF(structuredClone(settings)); }, [settings, f]);
  if (!f) return <div className="spinner" />;

  const save = async (e) => {
    e.preventDefault(); setBusy(true);
    await act(() => api('/settings', { method: 'PUT', body: f }), 'Settings saved & synced live!');
    setBusy(false);
  };
  const setHour = (i, k, v) => setF(x => ({ ...x, openingHours: x.openingHours.map((h, j) => (j === i ? { ...h, [k]: v } : h)) }));
  const setSocial = (k, v) => setF(x => ({ ...x, social: { ...(x.social || {}), [k]: v } }));

  return (
    <>
      <PageHead title="Website Settings" sub="Changes are saved in MongoDB and reflected live on the customer website" />
      <Tabs value={tab} onChange={setTab} tabs={[['general', 'General & Delivery'], ['hours', 'Opening Hours'], ['content', 'Promos & Banners'], ['messages', 'Contact Messages']]} />

      {tab !== 'messages' ? (
        <form className="card adm-card" onSubmit={save}>
          {tab === 'general' && (
            <>
              <div className="row row-2">
                <TextField label="Restaurant name" value={f.restaurantName} onChange={v => setF(x => ({ ...x, restaurantName: v }))} />
                <TextField label="Tagline" value={f.tagline} onChange={v => setF(x => ({ ...x, tagline: v }))} />
              </div>
              <ImageField label="Logo" value={f.logo} onChange={v => setF(x => ({ ...x, logo: v }))} />
              <div className="row row-2">
                <TextField label="Phone" value={f.phone} onChange={v => setF(x => ({ ...x, phone: v }))} />
                <TextField label="WhatsApp number" value={f.whatsapp} onChange={v => setF(x => ({ ...x, whatsapp: v }))} />
              </div>
              <div className="row row-2">
                <TextField label="Email" value={f.email} onChange={v => setF(x => ({ ...x, email: v }))} />
                <TextField label="Address" value={f.address} onChange={v => setF(x => ({ ...x, address: v }))} />
              </div>
              <TextField label="Google Maps embed URL" value={f.mapEmbedUrl} onChange={v => setF(x => ({ ...x, mapEmbedUrl: v }))} />
              <div className="row row-2">
                <TextField label="Delivery fee (Rs.)" type="number" min="0" value={f.deliveryFee} onChange={v => setF(x => ({ ...x, deliveryFee: v }))} />
                <TextField label="Free delivery over (Rs.)" type="number" min="0" value={f.freeDeliveryOver} onChange={v => setF(x => ({ ...x, freeDeliveryOver: v }))} />
              </div>
              <div className="row row-2">
                <TextField label="Minimum order (Rs.)" type="number" min="0" value={f.minimumOrder} onChange={v => setF(x => ({ ...x, minimumOrder: v }))} />
                <TextField label="Default tax rate (%)" type="number" min="0" max="30" value={f.taxRate} onChange={v => setF(x => ({ ...x, taxRate: v }))} />
              </div>
              <div className="row row-2">
                <TextField label="Reservation capacity (seats)" type="number" min="1" value={f.reservationCapacity} onChange={v => setF(x => ({ ...x, reservationCapacity: v }))} />
                <TextField label="Instagram URL" value={f.social?.instagram || ''} onChange={v => setSocial('instagram', v)} />
              </div>
              <div className="row row-2">
                <TextField label="Facebook URL" value={f.social?.facebook || ''} onChange={v => setSocial('facebook', v)} />
                <TextField label="TikTok URL" value={f.social?.tiktok || ''} onChange={v => setSocial('tiktok', v)} />
              </div>
              <Field label="About Us story">{(id) => <textarea id={id} className="textarea" value={f.about || ''} onChange={e => setF(x => ({ ...x, about: e.target.value }))} />}</Field>
            </>
          )}

          {tab === 'hours' && (
            <div style={{ display: 'grid', gap: 10, marginBottom: 16 }}>
              {(f.openingHours || []).map((h, i) => (
                <div key={h.day} style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 10 }}>
                  <b style={{ width: 100 }}>{h.day}</b>
                  <input type="time" className="input" style={{ width: 130 }} disabled={h.closed} value={h.open} onChange={e => setHour(i, 'open', e.target.value)} />
                  <span>to</span>
                  <input type="time" className="input" style={{ width: 130 }} disabled={h.closed} value={h.close} onChange={e => setHour(i, 'close', e.target.value)} />
                  <CheckField label="Closed" checked={h.closed} onChange={v => setHour(i, 'closed', v)} />
                </div>
              ))}
            </div>
          )}

          {tab === 'content' && (
            <>
              <h3>Promotions bar</h3>
              {(f.promotions || []).map((p, i) => (
                <div key={i} className="row row-2" style={{ marginBottom: 8 }}>
                  <input className="input" placeholder="Title" value={p.title} onChange={e => setF(x => ({ ...x, promotions: x.promotions.map((r, j) => (j === i ? { ...r, title: e.target.value } : r)) }))} />
                  <div style={{ display: 'flex', gap: 6 }}>
                    <input className="input" placeholder="Text" value={p.text} onChange={e => setF(x => ({ ...x, promotions: x.promotions.map((r, j) => (j === i ? { ...r, text: e.target.value } : r)) }))} />
                    <button type="button" className="btn btn-sm btn-danger" onClick={() => setF(x => ({ ...x, promotions: x.promotions.filter((_, j) => j !== i) }))}>✕</button>
                  </div>
                </div>
              ))}
              <button type="button" className="btn btn-sm btn-ghost" style={{ marginBottom: 18 }} onClick={() => setF(x => ({ ...x, promotions: [...(x.promotions || []), { title: '', text: '', active: true }] }))}>+ Add Promotion</button>

              <h3>Homepage Banners</h3>
              {(f.banners || []).map((b, i) => (
                <div key={i} className="card" style={{ padding: 14, marginBottom: 12 }}>
                  <div className="row row-2">
                    <TextField label="Banner title" value={b.title} onChange={v => setF(x => ({ ...x, banners: x.banners.map((r, j) => (j === i ? { ...r, title: v } : r)) }))} />
                    <TextField label="Subtitle" value={b.subtitle} onChange={v => setF(x => ({ ...x, banners: x.banners.map((r, j) => (j === i ? { ...r, subtitle: v } : r)) }))} />
                  </div>
                  <ImageField label="Banner image" value={b.image} onChange={v => setF(x => ({ ...x, banners: x.banners.map((r, j) => (j === i ? { ...r, image: v } : r)) }))} />
                  <button type="button" className="btn btn-sm btn-danger" onClick={() => setF(x => ({ ...x, banners: x.banners.filter((_, j) => j !== i) }))}>Remove Banner</button>
                </div>
              ))}
              <button type="button" className="btn btn-sm btn-ghost" style={{ marginBottom: 18 }} onClick={() => setF(x => ({ ...x, banners: [...(x.banners || []), { title: '', subtitle: '', image: '', link: '/menu', active: true }] }))}>+ Add Banner</button>
            </>
          )}

          <button className="btn btn-lg" disabled={busy}>{busy ? 'Saving...' : 'Save Settings'}</button>
        </form>
      ) : (
        <div className="table-wrap">
          <table className="table">
            <thead><tr><th>From</th><th>Message</th><th>Date</th><th></th></tr></thead>
            <tbody>
              {(msgs?.messages || []).map(m => (
                <tr key={m._id}>
                  <td><b>{m.name}</b><div className="adm-muted">{m.email} {m.phone}</div></td>
                  <td>{m.message}</td>
                  <td className="adm-muted">{fmtDate(m.createdAt)}</td>
                  <td><button className="btn btn-sm btn-ghost" onClick={async () => { await act(() => api(`/contact/${m._id}`, { method: 'PATCH', body: { handled: !m.handled } })); refreshMsgs(); }}>{m.handled ? 'Handled ✓' : 'Mark handled'}</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}

