import { useState } from 'react';
import { api, money } from '../../lib/api';
import { useAct, useLoad } from '../components/hooks';
import { ConfirmDialog, Empty, Modal, PageHead, State, TextField } from '../components/ui';
import { fmtDate } from '../components/utils';

export default function Inventory() {
  const { data, loading, error, reload, refresh } = useLoad('/ingredients');
  const act = useAct();
  const [edit, setEdit] = useState(null);
  const [adj, setAdj] = useState(null);
  const [hist, setHist] = useState(null);
  const [del, setDel] = useState(null);

  const list = data?.ingredients || [];
  const low = data?.lowStock || [];

  const save = async (e) => {
    e.preventDefault();
    const body = { name: edit.name, unit: edit.unit, stock: Number(edit.stock) || 0, lowStockThreshold: Number(edit.lowStockThreshold) || 5, costPerUnit: Number(edit.costPerUnit) || 0 };
    const r = await act(() => api(edit.id ? `/ingredients/${edit.id}` : '/ingredients', { method: edit.id ? 'PUT' : 'POST', body }), 'Ingredient saved');
    if (r) { setEdit(null); refresh(); }
  };
  const doAdj = async (e) => {
    e.preventDefault();
    const r = await act(() => api(`/ingredients/${adj.id}/adjust`, { method: 'POST', body: { change: Number(adj.change), reason: adj.reason } }), 'Stock updated');
    if (r) { setAdj(null); refresh(); }
  };
  const openHist = async (id) => {
    const r = await act(() => api(`/ingredients/${id}`));
    if (r) setHist(r.ingredient);
  };
  const remove = async () => {
    const r = await act(() => api(`/ingredients/${del.id}`, { method: 'DELETE' }), 'Ingredient deleted');
    if (r) { setDel(null); refresh(); }
  };

  return (
    <>
      <PageHead title="Inventory" sub="Ingredients, stock levels and adjustment history">
        <button className="btn" onClick={() => setEdit({ name: '', unit: 'kg', stock: 0, lowStockThreshold: 5, costPerUnit: 0 })}>+ Add Ingredient</button>
      </PageHead>
      {low.length > 0 && <div className="form-error">Low stock alert: <b>{low.join(', ')}</b></div>}

      <State loading={loading} error={error} onRetry={reload} hasData={!!data}>
        {list.length === 0 ? <Empty>No ingredients tracked yet.</Empty> : (
          <div className="table-wrap">
            <table className="table">
              <thead><tr><th>Ingredient</th><th>Stock</th><th>Threshold</th><th>Unit Cost</th><th></th></tr></thead>
              <tbody>
                {list.map(i => (
                  <tr key={i.id}>
                    <td><b>{i.name}</b> {i.low && <span className="badge badge-danger">Low</span>}</td>
                    <td className="adm-num">{i.stock} {i.unit}</td>
                    <td>{i.lowStockThreshold} {i.unit}</td>
                    <td>{money(i.costPerUnit)}</td>
                    <td style={{ whiteSpace: 'nowrap' }}>
                      <button className="btn btn-sm" onClick={() => setAdj({ id: i.id, name: i.name, unit: i.unit, change: '', reason: '' })}>Adjust</button>{' '}
                      <button className="btn btn-sm btn-ghost" onClick={() => openHist(i.id)}>History</button>{' '}
                      <button className="btn btn-sm btn-ghost" onClick={() => setEdit(i)}>Edit</button>{' '}
                      <button className="btn btn-sm btn-danger" onClick={() => setDel(i)}>Delete</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </State>

      {edit && (
        <Modal title={edit.id ? 'Edit Ingredient' : 'Add Ingredient'} onClose={() => setEdit(null)}>
          <form onSubmit={save}>
            <TextField label="Name" required value={edit.name} onChange={v => setEdit(x => ({ ...x, name: v }))} />
            <div className="row row-2">
              <TextField label="Unit (kg, pcs, L...)" required value={edit.unit} onChange={v => setEdit(x => ({ ...x, unit: v }))} />
              {!edit.id && <TextField label="Initial stock" type="number" step="any" min="0" value={edit.stock} onChange={v => setEdit(x => ({ ...x, stock: v }))} />}
            </div>
            <div className="row row-2">
              <TextField label="Low stock threshold" type="number" step="any" min="0" value={edit.lowStockThreshold} onChange={v => setEdit(x => ({ ...x, lowStockThreshold: v }))} />
              <TextField label="Cost per unit (Rs.)" type="number" step="any" min="0" value={edit.costPerUnit} onChange={v => setEdit(x => ({ ...x, costPerUnit: v }))} />
            </div>
            <button className="btn btn-block">Save</button>
          </form>
        </Modal>
      )}
      {adj && (
        <Modal title={`Adjust ${adj.name}`} onClose={() => setAdj(null)}>
          <form onSubmit={doAdj}>
            <TextField label={`Change (${adj.unit}) — use negative to deduct`} type="number" step="any" required value={adj.change} onChange={v => setAdj(x => ({ ...x, change: v }))} />
            <TextField label="Reason" placeholder="Restock, kitchen usage, waste..." value={adj.reason} onChange={v => setAdj(x => ({ ...x, reason: v }))} />
            <button className="btn btn-block">Apply adjustment</button>
          </form>
        </Modal>
      )}
      {hist && (
        <Modal title={`${hist.name} — Stock History`} onClose={() => setHist(null)}>
          <div className="table-wrap"><table className="table"><thead><tr><th>Change</th><th>Balance</th><th>Reason</th><th>By</th><th>Date</th></tr></thead><tbody>
            {(hist.history || []).map((h, i) => <tr key={i}><td className="adm-num">{h.change > 0 ? `+${h.change}` : h.change}</td><td>{h.balance}</td><td>{h.reason}</td><td>{h.by}</td><td className="adm-muted">{fmtDate(h.at)}</td></tr>)}
          </tbody></table></div>
        </Modal>
      )}
      {del && <ConfirmDialog title="Delete ingredient?" message={`Delete "${del.name}"?`} danger confirmLabel="Delete" onConfirm={remove} onCancel={() => setDel(null)} />}
    </>
  );
}

