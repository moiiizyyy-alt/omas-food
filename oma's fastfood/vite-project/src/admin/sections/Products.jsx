import { useMemo, useState } from 'react';
import { api, assetUrl, money } from '../../lib/api';
import { useApp } from '../../lib/store.jsx';
import { useAct } from '../components/hooks';
import { CheckField, ConfirmDialog, Field, ImageField, Modal, OptionRows, PageHead, TextField, Toggle } from '../components/ui';

const BLANK = { name: '', description: '', price: '', discountPrice: '', categoryId: '', subCategory: '', badge: '', diet: 'nonveg', spicy: 'None', bestSeller: false, featured: false, available: true, image: '', sizes: [], toppings: [], cheeseOptions: [] };

export default function Products() {
  const { items, categories } = useApp();
  const act = useAct();
  const [q, setQ] = useState('');
  const [cat, setCat] = useState('');
  const [edit, setEdit] = useState(null);
  const [del, setDel] = useState(null);
  const [busy, setBusy] = useState(false);

  const counts = useMemo(() => {
    const m = {};
    items.forEach(i => { m[i.categoryId] = (m[i.categoryId] || 0) + 1; });
    return m;
  }, [items]);

  const list = items.filter(i => (!cat || i.categoryId === cat) && (!q.trim() || `${i.name} ${i.category} ${i.description}`.toLowerCase().includes(q.toLowerCase())));

  const openNew = () => setEdit({ ...BLANK, categoryId: cat || categories[0]?.id || '' });
  const openEdit = (p) => setEdit({ ...BLANK, ...p, discountPrice: p.discountPrice ?? '' });

  const save = async (e) => {
    e.preventDefault(); setBusy(true);
    const cleanOpts = (arr) => (arr || []).filter(r => r.name && r.price !== '').map(r => ({ name: r.name, price: Number(r.price) }));
    const body = { ...edit, price: Number(edit.price), discountPrice: edit.discountPrice === '' ? null : Number(edit.discountPrice), sizes: cleanOpts(edit.sizes), toppings: cleanOpts(edit.toppings), cheeseOptions: cleanOpts(edit.cheeseOptions) };
    const r = await act(() => api(edit.id ? `/items/${edit.id}` : '/items', { method: edit.id ? 'PUT' : 'POST', body }), edit.id ? 'Product updated live on website!' : 'New product added to menu live!');
    setBusy(false);
    if (r) setEdit(null);
  };

  const quickToggle = (p, field, val) => act(() => api(`/items/${p.id}`, { method: 'PUT', body: { [field]: val } }), `${p.name} updated`);
  const remove = async () => {
    setBusy(true);
    const r = await act(() => api(`/items/${del.id}`, { method: 'DELETE' }), 'Product deleted from menu');
    setBusy(false);
    if (r) setDel(null);
  };

  return (
    <>
      <PageHead title="Products & Menu" sub={`${items.length} dishes across ${categories.length} categories — all changes appear live on the menu`}>
        <button className="btn" onClick={openNew}>+ Add New Item</button>
      </PageHead>

      <div className="rail chips-rail" style={{ marginBottom: 14 }}>
        <button type="button" className={`chip ${cat === '' ? 'active' : ''}`} onClick={() => setCat('')}>All ({items.length})</button>
        {categories.map(c => (
          <button type="button" key={c.id} className={`chip ${cat === c.id ? 'active' : ''}`} onClick={() => setCat(c.id)}>
            {c.name} ({counts[c.id] || 0})
          </button>
        ))}
      </div>

      <div className="adm-toolbar">
        <input className="input" placeholder="Search by item name or description..." value={q} onChange={e => setQ(e.target.value)} />
      </div>

      <div className="table-wrap">
        <table className="table">
          <thead><tr><th>Product</th><th>Category</th><th>Price</th><th>Available</th><th>Best Seller</th><th>Actions</th></tr></thead>
          <tbody>
            {list.map(p => (
              <tr key={p.id}>
                <td>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    {p.image && <img src={assetUrl(p.image)} alt="" style={{ width: 46, height: 46, borderRadius: 10, objectFit: 'cover', flexShrink: 0 }} />}
                    <div>
                      <b>{p.name}</b>
                      <div className="adm-muted" style={{ maxWidth: 320, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.description}</div>
                    </div>
                  </div>
                </td>
                <td><span className="badge">{p.category}</span></td>
                <td className="adm-num">{money(p.finalPrice)}{p.discountPrice != null && <div className="adm-muted"><s>{money(p.price)}</s></div>}</td>
                <td><Toggle checked={p.available} label={`Toggle ${p.name} availability`} onChange={v => quickToggle(p, 'available', v)} /></td>
                <td><Toggle checked={p.bestSeller} label={`Toggle ${p.name} best seller`} onChange={v => quickToggle(p, 'bestSeller', v)} /></td>
                <td style={{ whiteSpace: 'nowrap' }}>
                  <button className="btn btn-sm btn-ghost" onClick={() => openEdit(p)}>Edit</button>{' '}
                  <button className="btn btn-sm btn-danger" onClick={() => setDel(p)}>Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {edit && (
        <Modal title={edit.id ? `Edit "${edit.name}"` : 'Add New Menu Item'} onClose={() => setEdit(null)} wide>
          <form onSubmit={save}>
            <div className="row row-2">
              <TextField label="Product Name" required value={edit.name} onChange={v => setEdit(e => ({ ...e, name: v }))} />
              <Field label="Category (auto-arranges in menu)">{(id) => <select id={id} className="select" required value={edit.categoryId} onChange={e => setEdit(x => ({ ...x, categoryId: e.target.value }))}>{categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select>}</Field>
            </div>
            <Field label="Description">{(id) => <textarea id={id} className="textarea" placeholder="Ingredients, taste, serving size..." value={edit.description} onChange={e => setEdit(x => ({ ...x, description: e.target.value }))} />}</Field>
            <div className="row row-2">
              <TextField label="Price (Rs.)" type="number" min="0" required value={edit.price} onChange={v => setEdit(e => ({ ...e, price: v }))} />
              <TextField label="Discounted Price (optional)" type="number" min="0" value={edit.discountPrice} onChange={v => setEdit(e => ({ ...e, discountPrice: v }))} />
            </div>
            <div className="row row-2">
              <Field label="Diet">{(id) => <select id={id} className="select" value={edit.diet} onChange={e => setEdit(x => ({ ...x, diet: e.target.value }))}><option value="nonveg">Non-veg</option><option value="veg">Vegetarian</option></select>}</Field>
              <Field label="Spicy Level">{(id) => <select id={id} className="select" value={edit.spicy} onChange={e => setEdit(x => ({ ...x, spicy: e.target.value }))}>{['None', 'Mild', 'Medium', 'Hot'].map(s => <option key={s} value={s}>{s}</option>)}</select>}</Field>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, marginBottom: 14 }}>
              <CheckField label="Available on Menu" checked={edit.available} onChange={v => setEdit(e => ({ ...e, available: v }))} />
              <CheckField label="Best Seller" checked={edit.bestSeller} onChange={v => setEdit(e => ({ ...e, bestSeller: v }))} />
              <CheckField label="Featured" checked={edit.featured} onChange={v => setEdit(e => ({ ...e, featured: v }))} />
            </div>
            <ImageField label="Product Photo (Upload or Paste Image URL)" value={edit.image} onChange={v => setEdit(e => ({ ...e, image: v }))} />
            <OptionRows label="Sizes (optional)" hint="Full price for each size" rows={edit.sizes} onChange={v => setEdit(e => ({ ...e, sizes: v }))} />
            <OptionRows label="Extra Toppings (optional)" hint="Add-on price" rows={edit.toppings} onChange={v => setEdit(e => ({ ...e, toppings: v }))} />
            <OptionRows label="Cheese Options (optional)" hint="Add-on price" rows={edit.cheeseOptions} onChange={v => setEdit(e => ({ ...e, cheeseOptions: v }))} />
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button type="button" className="btn btn-ghost" onClick={() => setEdit(null)}>Cancel</button>
              <button className="btn" disabled={busy}>{busy ? 'Saving...' : 'Save & Publish Live'}</button>
            </div>
          </form>
        </Modal>
      )}

      {del && <ConfirmDialog title="Delete product?" message={`Remove "${del.name}" from the menu permanently?`} danger confirmLabel="Delete" busy={busy} onConfirm={remove} onCancel={() => setDel(null)} />}
    </>
  );
}
