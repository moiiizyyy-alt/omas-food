// Catalog: categories, items (products), settings, uploads.
const express = require('express');
const multer = require('multer');
const { Category, Product, Setting, Upload, Message } = require('../models');
const core = require('../core');
const { asyncH, httpErr, str, isId, requirePerm, broadcast, round } = core;

const router = express.Router();

// ---------- serializers (public shape; keeps the legacy fields id/category/subCategory/spicy/badge/reviews)
const catOut = (c) => ({ id: String(c._id), name: c.name, description: c.description, image: c.image, sortOrder: c.sortOrder, active: c.active });
function prodOut(p, catName) {
  return {
    id: String(p._id), legacyId: p.legacyId, name: p.name, description: p.description,
    price: p.price, discountPrice: p.discountPrice, finalPrice: p.discountPrice != null ? p.discountPrice : p.price,
    image: p.image, categoryId: String(p.categoryId), category: catName || '', subCategory: p.subCategory,
    badge: p.bestSeller && !p.badge ? 'Best Seller' : p.badge, bestSeller: p.bestSeller, featured: p.featured,
    available: p.available, diet: p.diet, spicy: p.spicy, sizes: p.sizes, toppings: p.toppings, cheeseOptions: p.cheeseOptions,
    rating: p.rating, reviews: p.reviewCount, sortOrder: p.sortOrder, updatedAt: p.updatedAt
  };
}
async function loadProduct(id) {
  const p = await Product.findById(id).populate('categoryId', 'name');
  if (!p) return null;
  const cat = p.categoryId;
  const o = prodOut({ ...p.toObject(), categoryId: cat._id }, cat.name);
  return o;
}
const toProdOut = (p) => prodOut({ ...p.toObject(), categoryId: p.categoryId._id }, p.categoryId.name);

// ---------- Categories
router.get('/categories', asyncH(async (req, res) => {
  const filter = req.user && core.isStaff(req.user) ? {} : { active: true };
  const cats = await Category.find(filter).sort({ sortOrder: 1, name: 1 });
  res.json({ success: true, categories: cats.map(catOut) });
}));

function catBody(b) {
  const d = {};
  if (b.name !== undefined) { d.name = str(b.name, 60); if (!d.name) throw httpErr(400, 'Category name is required'); }
  if (b.description !== undefined) d.description = str(b.description, 300);
  if (b.image !== undefined) d.image = str(b.image, 500);
  if (b.active !== undefined) d.active = !!b.active;
  return d;
}
router.post('/categories', requirePerm('categories.manage'), asyncH(async (req, res) => {
  const d = catBody(req.body);
  if (!d.name) throw httpErr(400, 'Category name is required');
  d.sortOrder = await Category.countDocuments();
  try { var c = await Category.create(d); } catch (e) { if (e.code === 11000) throw httpErr(409, 'Category already exists'); throw e; }
  broadcast('public', 'categories:updated', { action: 'created', category: catOut(c) });
  res.status(201).json({ success: true, category: catOut(c) });
}));
router.post('/categories/reorder', requirePerm('categories.manage'), asyncH(async (req, res) => {
  const ids = Array.isArray(req.body.ids) ? req.body.ids.filter(isId) : [];
  await Category.bulkWrite(ids.map((id, i) => ({ updateOne: { filter: { _id: id }, update: { sortOrder: i } } })));
  broadcast('public', 'categories:updated', { action: 'reordered' });
  res.json({ success: true });
}));
router.put('/categories/:id', requirePerm('categories.manage'), asyncH(async (req, res) => {
  if (!isId(req.params.id)) throw httpErr(400, 'Invalid id');
  let c;
  try { c = await Category.findByIdAndUpdate(req.params.id, catBody(req.body), { returnDocument: 'after', runValidators: true }); } catch (e) { if (e.code === 11000) throw httpErr(409, 'Category already exists'); throw e; }
  if (!c) throw httpErr(404, 'Category not found');
  broadcast('public', 'categories:updated', { action: 'updated', category: catOut(c) });
  broadcast('public', 'menu:refresh', {}); // product.category names changed
  res.json({ success: true, category: catOut(c) });
}));
router.delete('/categories/:id', requirePerm('categories.manage'), asyncH(async (req, res) => {
  if (!isId(req.params.id)) throw httpErr(400, 'Invalid id');
  if (await Product.exists({ categoryId: req.params.id })) throw httpErr(409, 'Move or delete the products in this category first');
  const c = await Category.findByIdAndDelete(req.params.id);
  if (!c) throw httpErr(404, 'Category not found');
  broadcast('public', 'categories:updated', { action: 'deleted', id: req.params.id });
  res.json({ success: true, id: req.params.id });
}));

// ---------- Items
router.get('/items', asyncH(async (req, res) => {
  const staff = req.user && core.isStaff(req.user);
  const items = await Product.find().populate('categoryId', 'name active').sort({ sortOrder: 1, createdAt: -1 });
  const list = items.filter(p => p.categoryId && (staff || p.categoryId.active)).map(toProdOut);
  res.json({ success: true, count: list.length, items: list });
}));
router.get('/items/:id', asyncH(async (req, res) => {
  if (!isId(req.params.id)) throw httpErr(404, 'Item not found');
  const p = await loadProduct(req.params.id);
  if (!p) throw httpErr(404, 'Item not found');
  res.json({ success: true, item: p });
}));

const opt = (arr, label) => {
  if (arr === undefined) return undefined;
  if (!Array.isArray(arr)) throw httpErr(400, `${label} must be a list`);
  return arr.slice(0, 30).map(o => {
    const name = str(o && o.name, 60), price = Number(o && o.price);
    if (!name || !isFinite(price) || price < 0) throw httpErr(400, `Invalid ${label}`);
    return { name, price: round(price) };
  });
};
async function prodBody(b, partial) {
  const d = {};
  const num = (v, label) => { const n = Number(v); if (!isFinite(n) || n < 0) throw httpErr(400, `${label} must be a non-negative number`); return round(n); };
  if (!partial || b.name !== undefined) { d.name = str(b.name, 120); if (!d.name) throw httpErr(400, 'Item name is required'); }
  if (!partial || b.price !== undefined) d.price = num(b.price, 'Price');
  if (b.discountPrice !== undefined) {
    d.discountPrice = b.discountPrice === null || b.discountPrice === '' ? null : num(b.discountPrice, 'Discounted price');
  }
  if (b.description !== undefined) d.description = str(b.description, 1000);
  if (b.image !== undefined) d.image = str(b.image, 600);
  if (b.subCategory !== undefined) d.subCategory = str(b.subCategory, 60);
  if (b.badge !== undefined) d.badge = str(b.badge, 40);
  for (const k of ['bestSeller', 'featured', 'available']) if (b[k] !== undefined) d[k] = !!b[k];
  if (b.diet !== undefined) { if (!['veg', 'nonveg'].includes(b.diet)) throw httpErr(400, 'diet must be veg or nonveg'); d.diet = b.diet; }
  if (b.spicy !== undefined) { if (!['None', 'Mild', 'Medium', 'Hot'].includes(b.spicy)) throw httpErr(400, 'Invalid spicy level'); d.spicy = b.spicy; }
  for (const [k, l] of [['sizes', 'size'], ['toppings', 'topping'], ['cheeseOptions', 'cheese option']]) { const v = opt(b[k], l); if (v !== undefined) d[k] = v; }
  // Category: accept categoryId, or a category name (legacy clients).
  if (b.categoryId !== undefined || b.category !== undefined || !partial) {
    let cat = null;
    if (b.categoryId && isId(b.categoryId)) cat = await Category.findById(b.categoryId);
    else if (b.category) cat = await Category.findOne({ name: str(b.category, 60) });
    if (!cat) throw httpErr(400, 'A valid category is required');
    d.categoryId = cat._id;
  }
  if (d.discountPrice != null && d.price !== undefined && d.discountPrice >= d.price) throw httpErr(400, 'Discounted price must be lower than the price');
  return d;
}
router.post('/items', requirePerm('products.manage'), asyncH(async (req, res) => {
  const d = await prodBody(req.body, false);
  const p = await Product.create(d);
  const out = await loadProduct(p._id);
  broadcast('public', 'menu:updated', { action: 'created', item: out });
  res.status(201).json({ success: true, message: 'Menu item created', item: out });
}));
router.put('/items/:id', requirePerm('products.manage'), asyncH(async (req, res) => {
  if (!isId(req.params.id)) throw httpErr(404, 'Item not found');
  const d = await prodBody(req.body, true);
  const existing = await Product.findById(req.params.id);
  if (!existing) throw httpErr(404, 'Item not found');
  const price = d.price !== undefined ? d.price : existing.price;
  const dp = d.discountPrice !== undefined ? d.discountPrice : existing.discountPrice;
  if (dp != null && dp >= price) throw httpErr(400, 'Discounted price must be lower than the price');
  existing.set(d);
  await existing.save();
  const out = await loadProduct(existing._id);
  broadcast('public', 'menu:updated', { action: 'updated', item: out });
  res.json({ success: true, message: 'Item updated', item: out });
}));
router.delete('/items/:id', requirePerm('products.manage'), asyncH(async (req, res) => {
  if (!isId(req.params.id)) throw httpErr(404, 'Item not found');
  const p = await Product.findByIdAndDelete(req.params.id);
  if (!p) throw httpErr(404, 'Item not found');
  broadcast('public', 'menu:updated', { action: 'deleted', id: req.params.id });
  res.json({ success: true, message: 'Item removed from menu', id: req.params.id });
}));
// Legacy endpoint: now admin-only and non-destructive (upserts by legacy id, never deletes).
router.post('/sync-menu', requirePerm('products.manage'), asyncH(async (req, res) => {
  const items = Array.isArray(req.body.items) ? req.body.items : null;
  if (!items) throw httpErr(400, 'Invalid items array');
  let n = 0;
  for (const it of items.slice(0, 500)) {
    try {
      const d = await prodBody(it, false);
      if (it.id) await Product.updateOne({ legacyId: String(it.id) }, { $set: d, $setOnInsert: { legacyId: String(it.id) } }, { upsert: true });
      else await Product.create(d);
      n++;
    } catch { /* skip invalid rows */ }
  }
  broadcast('public', 'menu:refresh', {});
  res.json({ success: true, count: n });
}));

// ---------- Settings (public read, admin write)
router.get('/settings', asyncH(async (req, res) => {
  const s = await core.getSettings();
  const o = s.toObject(); delete o._id; delete o.__v;
  res.json({ success: true, settings: o });
}));
const SETTING_KEYS = ['restaurantName', 'tagline', 'logo', 'phone', 'whatsapp', 'email', 'address', 'mapEmbedUrl', 'social', 'openingHours', 'deliveryFee', 'freeDeliveryOver', 'minimumOrder', 'taxRate', 'reservationCapacity', 'reservationSlotMinutes', 'promotions', 'banners', 'gallery', 'team', 'about'];
router.put('/settings', requirePerm('settings.manage'), asyncH(async (req, res) => {
  const s = await core.getSettings();
  for (const k of SETTING_KEYS) {
    if (req.body[k] === undefined) continue;
    const v = req.body[k];
    if (['deliveryFee', 'freeDeliveryOver', 'minimumOrder', 'taxRate', 'reservationCapacity', 'reservationSlotMinutes'].includes(k)) {
      const n = Number(v); if (!isFinite(n) || n < 0) throw httpErr(400, `${k} must be a non-negative number`); s[k] = n;
    } else s[k] = v;
  }
  await s.save();
  const o = s.toObject(); delete o._id; delete o.__v;
  broadcast('public', 'settings:updated', { settings: o });
  res.json({ success: true, settings: o });
}));

// ---------- Image uploads (stored in Atlas, validated by magic bytes)
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 4 * 1024 * 1024, files: 1 } });
function sniff(buf) {
  if (buf.length < 12) return null;
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return 'image/jpeg';
  if (buf.slice(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return 'image/png';
  if (buf.slice(0, 4).toString() === 'RIFF' && buf.slice(8, 12).toString() === 'WEBP') return 'image/webp';
  if (buf.slice(0, 3).toString() === 'GIF') return 'image/gif';
  return null;
}
router.post('/uploads', requirePerm('uploads.create'), upload.single('image'), asyncH(async (req, res) => {
  if (!req.file) throw httpErr(400, 'No image uploaded (field name: image)');
  const type = sniff(req.file.buffer);
  if (!type) throw httpErr(400, 'Only JPEG, PNG, WebP or GIF images are allowed');
  const u = await Upload.create({ contentType: type, size: req.file.size, data: req.file.buffer, uploadedBy: req.user._id });
  res.status(201).json({ success: true, url: `/api/uploads/${u._id}`, id: String(u._id) });
}));
router.get('/uploads/:id', asyncH(async (req, res) => {
  if (!isId(req.params.id)) throw httpErr(404, 'Not found');
  const u = await Upload.findById(req.params.id).select('+data');
  if (!u) throw httpErr(404, 'Not found');
  res.set({ 'Content-Type': u.contentType, 'Cache-Control': 'public, max-age=31536000, immutable', 'X-Content-Type-Options': 'nosniff', 'Content-Security-Policy': "default-src 'none'", 'Cross-Origin-Resource-Policy': 'cross-origin' });
  res.send(u.data);
}));

// ---------- Contact form
router.post('/contact', asyncH(async (req, res) => {
  const name = str(req.body.name, 80), message = str(req.body.message, 2000);
  if (!name || !message) throw httpErr(400, 'Name and message are required');
  const m = await Message.create({ name, message, email: str(req.body.email, 120), phone: str(req.body.phone, 30) });
  broadcast('staff', 'message:new', { id: String(m._id), name });
  res.status(201).json({ success: true, message: 'Thanks! We will get back to you soon.' });
}));
router.get('/contact', requirePerm('settings.manage'), asyncH(async (req, res) => {
  res.json({ success: true, messages: await Message.find().sort({ createdAt: -1 }).limit(200) });
}));
router.patch('/contact/:id', requirePerm('settings.manage'), asyncH(async (req, res) => {
  if (!isId(req.params.id)) throw httpErr(404, 'Not found');
  const m = await Message.findByIdAndUpdate(req.params.id, { handled: !!req.body.handled }, { returnDocument: 'after' });
  if (!m) throw httpErr(404, 'Not found');
  res.json({ success: true, message: m });
}));

module.exports = router;
module.exports.prodOut = prodOut;

