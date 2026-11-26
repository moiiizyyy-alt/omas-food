import { useState } from 'react';
import { api, money } from '../../lib/api';
import { useAct, useLoad } from '../components/hooks';
import { CheckField, Empty, Field, Modal, PageHead, State, TextField } from '../components/ui';
import { fmtDay } from '../components/utils';

const BLANK = { code: '', description: '', type: 'percentage', value: '', minOrder: 0, usageLimit: 0, maxDiscount: '', expiresAt: '', active: true, public: false };

export default function Coupons() {
  const { data, loading, error, reload, refresh } = useLoad('/coupons');
  const act = useAct();
  const [edit, setEdit] = useState(null);
  const list = data?.coupons || [];

  const save = async (e) => {
    e.preventDefault();
    const id = edit._id;
    const body = { ...edit, value: Number(edit.value), minOrder: Number(edit.minOrder) || 0, usageLimit: Number(edit.usageLimit) || 0, maxDiscount: edit.maxDiscount === '' ? null : Number(edit.maxDiscount), expiresAt: edit.expiresAt || null };
    const r = await act(() => api(id ? `/coupons/${id}` : '/coupons', { method: id ? 'PUT' : 'POST', body }), 'Coupon saved');
    if (r) { setEdit(null); refresh(); }
  };
  const remove = async (id) => { if (await act(() => api(`/coupons/${id}`, { method: 'DELETE' }), 'Coupon deleted')) refresh(); };

  return (
    <>
      <PageHead title="Coupons" sub="Discount codes validated on the backend"><button className="btn" onClick={() => setEdit(BLANK)}>+ New Coupon</button></PageHead>
      <State loading={loading} error={error} onRetry={reload} hasData={!!data}>
        {list.length === 0 ? <Empty>No coupons created yet.</Empty> : (
          <div className="table-wrap">
            <table className="table">
              <thead><tr><th>Code</th><th>Discount</th><th>Min Order</th><th>Usage</th><th>Expires</th><th>Status</th><th></th></tr></thead>
              <tbody>
                {list.map(c => (
                  <tr key={c._id}>
                    <td><b>{c.code}</b> {c.public && <span className="badge badge-info">Public</span>}<div className="adm-muted">{c.description}</div></td>
                    <td className="adm-num">{c.type === 'percentage' ? `${c.value}%` : money(c.value)}</td>
                    <td>{money(c.minOrder)}</td>
                    <td>{c.usedCount}{c.usageLimit ? ` / ${c.usageLimit}` : ' / ∞'}</td>
                    <td className="adm-muted">{c.expiresAt ? fmtDay(c.expiresAt) : 'Never'}</td>
                    <td><span className={`badge ${c.active ? 'badge-green' : 'badge-danger'}`}>{c.active ? 'Active' : 'Inactive'}</span></td>
                    <td style={{ whiteSpace: 'nowrap' }}>
                      <button className="btn btn-sm btn-ghost" onClick={() => setEdit({ ...BLANK, ...c, expiresAt: c.expiresAt ? c.expiresAt.slice(0, 10) : '', maxDiscount: c.maxDiscount ?? '' })}>Edit</button>{' '}
                      <button className="btn btn-sm btn-danger" onClick={() => remove(c._id)}>Delete</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </State>
      {edit && (
        <Modal title={edit._id ? `Edit ${edit.code}` : 'New Coupon'} onClose={() => setEdit(null)}>
          <form onSubmit={save}>
            <TextField label="Code" required value={edit.code} onChange={v => setEdit(x => ({ ...x, code: v.toUpperCase() }))} />
            <TextField label="Description" value={edit.description} onChange={v => setEdit(x => ({ ...x, description: v }))} />
            <div className="row row-2">
              <Field label="Type">{(id) => <select id={id} className="select" value={edit.type} onChange={e => setEdit(x => ({ ...x, type: e.target.value }))}><option value="percentage">Percentage (%)</option><option value="fixed">Fixed (Rs.)</option></select>}</Field>
              <TextField label="Value" type="number" min="1" required value={edit.value} onChange={v => setEdit(x => ({ ...x, value: v }))} />
            </div>
            <div className="row row-2">
              <TextField label="Minimum order (Rs.)" type="number" min="0" value={edit.minOrder} onChange={v => setEdit(x => ({ ...x, minOrder: v }))} />
              <TextField label="Usage limit (0 = unlimited)" type="number" min="0" value={edit.usageLimit} onChange={v => setEdit(x => ({ ...x, usageLimit: v }))} />
            </div>
            <TextField label="Expiry date (optional)" type="date" value={edit.expiresAt} onChange={v => setEdit(x => ({ ...x, expiresAt: v }))} />
            <div style={{ display: 'flex', gap: 16, marginBottom: 14 }}>
              <CheckField label="Active" checked={edit.active} onChange={v => setEdit(x => ({ ...x, active: v }))} />
              <CheckField label="Show on website Special Deals" checked={edit.public} onChange={v => setEdit(x => ({ ...x, public: v }))} />
            </div>
            <button className="btn btn-block">Save Coupon</button>
          </form>
        </Modal>
      )}
    </>
  );
}

