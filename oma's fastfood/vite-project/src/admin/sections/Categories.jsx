import { useState } from 'react';
import { api } from '../../lib/api';
import { useApp } from '../../lib/store.jsx';
import { useAct } from '../components/hooks';
import { CheckField, ConfirmDialog, Modal, PageHead, TextField } from '../components/ui';

export default function Categories() {
  const { categories, reload } = useApp();
  const act = useAct();
  const [edit, setEdit] = useState(null);
  const [del, setDel] = useState(null);

  const save = async (e) => {
    e.preventDefault();
    const r = await act(() => api(edit.id ? `/categories/${edit.id}` : '/categories', { method: edit.id ? 'PUT' : 'POST', body: edit }), 'Category saved');
    if (r) { setEdit(null); reload(); }
  };
  const move = async (idx, dir) => {
    const arr = [...categories];
    const target = idx + dir;
    if (target < 0 || target >= arr.length) return;
    [arr[idx], arr[target]] = [arr[target], arr[idx]];
    if (await act(() => api('/categories/reorder', { method: 'POST', body: { ids: arr.map(c => c.id) } }), 'Order updated')) reload();
  };
  const remove = async () => {
    const r = await act(() => api(`/categories/${del.id}`, { method: 'DELETE' }), 'Category deleted');
    if (r) { setDel(null); reload(); }
  };

  return (
    <>
      <PageHead title="Categories" sub="Create, edit and reorder menu categories"><button className="btn" onClick={() => setEdit({ name: '', description: '', active: true })}>+ Add Category</button></PageHead>
      <div className="adm-mobile-list">
        {categories.map((c, i) => (
          <div className="card adm-mcard" key={c.id}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
              <div><b>{c.name}</b>{c.description && <div className="adm-muted">{c.description}</div>}</div>
              <span className={`badge ${c.active ? 'badge-green' : 'badge-danger'}`}>{c.active ? 'Active' : 'Hidden'}</span>
            </div>
            <div className="adm-mcard-actions">
              <button className="btn btn-sm btn-ghost" disabled={i === 0} onClick={() => move(i, -1)}>↑ Up</button>
              <button className="btn btn-sm btn-ghost" disabled={i === categories.length - 1} onClick={() => move(i, 1)}>↓ Down</button>
              <button className="btn btn-sm btn-ghost" onClick={() => setEdit(c)}>Edit</button>
              <button className="btn btn-sm btn-danger" onClick={() => setDel(c)}>Delete</button>
            </div>
          </div>
        ))}
      </div>

      <div className="table-wrap adm-desk-table">
        <table className="table">
          <thead><tr><th>Order</th><th>Name</th><th>Status</th><th></th></tr></thead>
          <tbody>
            {categories.map((c, i) => (
              <tr key={c.id}>
                <td><button className="btn btn-sm btn-ghost" disabled={i === 0} onClick={() => move(i, -1)}>↑</button> <button className="btn btn-sm btn-ghost" disabled={i === categories.length - 1} onClick={() => move(i, 1)}>↓</button></td>
                <td><b>{c.name}</b><div className="adm-muted">{c.description}</div></td>
                <td><span className={`badge ${c.active ? 'badge-green' : 'badge-danger'}`}>{c.active ? 'Active' : 'Hidden'}</span></td>
                <td><button className="btn btn-sm btn-ghost" onClick={() => setEdit(c)}>Edit</button> <button className="btn btn-sm btn-danger" onClick={() => setDel(c)}>Delete</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {edit && (
        <Modal title={edit.id ? 'Edit Category' : 'Add Category'} onClose={() => setEdit(null)}>
          <form onSubmit={save}>
            <TextField label="Name" required value={edit.name} onChange={v => setEdit(x => ({ ...x, name: v }))} />
            <TextField label="Description" value={edit.description} onChange={v => setEdit(x => ({ ...x, description: v }))} />
            <div style={{ marginBottom: 14 }}><CheckField label="Active on menu" checked={edit.active} onChange={v => setEdit(x => ({ ...x, active: v }))} /></div>
            <button className="btn btn-block">Save</button>
          </form>
        </Modal>
      )}
      {del && <ConfirmDialog title="Delete category?" message={`Delete "${del.name}"? (Must have no products)`} danger confirmLabel="Delete" onConfirm={remove} onCancel={() => setDel(null)} />}
    </>
  );
}

