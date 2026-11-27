// Vercel Serverless API for Oma's Pizza (same-origin /api/* on Vercel deployments).
// Zero external dependencies (pure Node ESM: crypto + fetch).
// Uses Upstash Cloud Redis as the central multi-device cloud store so Mobile, Laptop & Admin
// share live data globally on Vercel out-of-the-box.
import crypto from 'node:crypto';
import { FALLBACK_CATEGORIES, FALLBACK_ITEMS, FALLBACK_SETTINGS } from '../src/data/fallbackCatalog.js';

const UPSTASH_URL = process.env.UPSTASH_REDIS_REST_URL || '';
const UPSTASH_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN || '';
const ADMIN_EMAIL = (process.env.ADMIN_EMAIL || 'admin@omas.com').toLowerCase();
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'Adminofomas1';
const OWNER_EMAIL = process.env.NOTIFICATION_EMAIL || 'moiiizyyy@gmail.com';
const SECRET = process.env.JWT_SECRET || 'omas-pizza-vercel-session-v2-key';
const COOKIE = 'omas_session';

const ALL_PERMS = [
  'orders.view', 'orders.status', 'orders.cancel', 'pos.create',
  'products.manage', 'categories.manage', 'inventory.view', 'inventory.manage',
  'customers.view', 'reservations.manage', 'reviews.moderate', 'coupons.manage',
  'reports.view', 'staff.manage', 'settings.manage', 'uploads.create'
];

const K = {
  items: 'omas_v2_items',
  categories: 'omas_v2_categories',
  orders: 'omas_v2_orders',
  settings: 'omas_v2_settings'
};

// Warm in-memory cache + optional Upstash Cloud Redis persistence (when env vars are configured)
const mem = {
  [K.categories]: null,
  [K.items]: null,
  [K.orders]: null,
  [K.settings]: null
};

async function redisGet(key) {
  if (!UPSTASH_URL || !UPSTASH_TOKEN) return mem[key];
  try {
    const r = await fetch(`${UPSTASH_URL}/get/${encodeURIComponent(key)}?_cb=${Date.now()}`, {
      headers: { Authorization: `Bearer ${UPSTASH_TOKEN}` },
      cache: 'no-store'
    });
    if (!r.ok) return mem[key];
    const j = await r.json();
    if (!j || j.result == null) return mem[key];
    const parsed = typeof j.result === 'string' ? JSON.parse(j.result) : j.result;
    mem[key] = parsed;
    return parsed;
  } catch {
    return mem[key];
  }
}

async function redisSet(key, val) {
  mem[key] = val;
  if (!UPSTASH_URL || !UPSTASH_TOKEN) return true;
  try {
    const r = await fetch(UPSTASH_URL, {
      method: 'POST',
      headers: { Authorization: `Bearer ${UPSTASH_TOKEN}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(['SET', key, JSON.stringify(val)])
    });
    return r.ok;
  } catch {
    return true;
  }
}

async function getCategories() {
  const c = await redisGet(K.categories);
  if (Array.isArray(c) && c.length) return c;
  await redisSet(K.categories, FALLBACK_CATEGORIES);
  return FALLBACK_CATEGORIES;
}

async function getItems() {
  const items = await redisGet(K.items);
  if (Array.isArray(items) && items.length) return items;
  await redisSet(K.items, FALLBACK_ITEMS);
  return FALLBACK_ITEMS;
}

async function getSettings() {
  const s = await redisGet(K.settings);
  return s && typeof s === 'object' ? { ...FALLBACK_SETTINGS, ...s } : FALLBACK_SETTINGS;
}

async function getOrders() {
  const o = await redisGet(K.orders);
  return Array.isArray(o) ? o : [];
}

// ---------------- Signed HttpOnly Cookie Auth ----------------
function signToken(payload) {
  const data = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const sig = crypto.createHmac('sha256', SECRET).update(data).digest('base64url');
  return `${data}.${sig}`;
}

function verifyToken(token) {
  if (!token || !token.includes('.')) return null;
  const [data, sig] = token.split('.');
  const expected = crypto.createHmac('sha256', SECRET).update(data).digest('base64url');
  if (sig !== expected) return null;
  try {
    const p = JSON.parse(Buffer.from(data, 'base64url').toString('utf8'));
    if (p.exp && Date.now() > p.exp) return null;
    return p;
  } catch {
    return null;
  }
}

function getCookies(req) {
  const out = {};
  const raw = req.headers.cookie || '';
  raw.split(';').forEach((part) => {
    const i = part.indexOf('=');
    if (i > 0) out[part.slice(0, i).trim()] = decodeURIComponent(part.slice(i + 1).trim());
  });
  return out;
}

function getUser(req) {
  const tok = getCookies(req)[COOKIE];
  const p = verifyToken(tok);
  if (!p) return null;
  return {
    id: p.id,
    name: p.name,
    email: p.email,
    phone: '',
    role: p.role,
    addresses: [],
    permissions: p.role === 'superadmin' ? ALL_PERMS : []
  };
}

function setCookie(res, token, maxAge = 7 * 24 * 3600) {
  const secure = process.env.VERCEL ? '; Secure' : '';
  res.setHeader('Set-Cookie', `${COOKIE}=${encodeURIComponent(token)}; HttpOnly; Path=/; SameSite=Lax; Max-Age=${maxAge}${secure}`);
}

function sendJson(res, status, data) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.end(JSON.stringify(data));
}

async function readBody(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  const chunks = [];
  for await (const c of req) chunks.push(c);
  const raw = Buffer.concat(chunks);
  if (!raw.length) return {};
  try { return JSON.parse(raw.toString('utf8')); } catch { return { _raw: raw }; }
}

async function readRawBuffer(req) {
  const chunks = [];
  for await (const c of req) chunks.push(c);
  return Buffer.concat(chunks);
}

// Extract multipart image file cleanly without external dependencies
function extractMultipartImage(buf, contentType) {
  const m = /boundary=([^;\s]+)/i.exec(contentType || '');
  if (!m) return null;
  const boundary = Buffer.from(`--${m[1].replace(/^"|"$/g, '')}`);
  const start = buf.indexOf(boundary);
  if (start < 0) return null;
  const headerEnd = buf.indexOf(Buffer.from('\r\n\r\n'), start);
  if (headerEnd < 0) return null;
  const headers = buf.slice(start, headerEnd).toString('utf8');
  const ctMatch = /Content-Type:\s*([^\r\n]+)/i.exec(headers);
  const nextBoundary = buf.indexOf(boundary, headerEnd + 4);
  if (nextBoundary < 0) return null;
  const fileBuf = buf.slice(headerEnd + 4, nextBoundary - 2); // strip trailing \r\n
  const mime = (ctMatch ? ctMatch[1].trim() : 'image/jpeg').toLowerCase();
  if (!/^image\/(jpeg|jpg|png|webp|gif)$/.test(mime)) return null;
  if (fileBuf.length > 2 * 1024 * 1024) return null;
  return `data:${mime};base64,${fileBuf.toString('base64')}`;
}

function round(n) { return Math.round((Number(n) + Number.EPSILON) * 100) / 100; }

function computeUnitPrice(p, { size, toppings = [], cheese } = {}) {
  const ratio = p.discountPrice != null && p.price > 0 ? p.discountPrice / p.price : 1;
  let base = p.discountPrice != null ? p.discountPrice : p.price;
  let sizeName = '';
  if (p.sizes && p.sizes.length) {
    const s = p.sizes.find(x => x.name === size) || p.sizes[0];
    sizeName = s.name;
    base = round(s.price * ratio);
  }
  const tops = [];
  let extra = 0;
  for (const t of toppings) {
    const f = (p.toppings || []).find(x => x.name === t);
    if (f && !tops.includes(f.name)) { tops.push(f.name); extra += f.price; }
  }
  let cheeseName = '';
  if (cheese) {
    const c = (p.cheeseOptions || []).find(x => x.name === cheese);
    if (c) { cheeseName = c.name; extra += c.price; }
  }
  return { unit: round(base + extra), size: sizeName, toppings: tops, cheese: cheeseName };
}

async function dispatchOrderEmail(order, hostHeader) {
  try {
    const origin = hostHeader ? `https://${hostHeader.replace(/^https?:\/\//, '')}` : 'https://omas-pizza.vercel.app';
    const itemsText = (order.items || [])
      .map((i, idx) => `${idx + 1}. ${i.name}${i.size ? ` (${i.size})` : ''} x${i.quantity} - Rs. ${i.lineTotal}`)
      .join('\n');
    const fullAddr = [order.customer?.address, order.customer?.area, order.customer?.city].filter(Boolean).join(', ') || 'Pickup / Dine-in';
    await fetch(`https://formsubmit.co/ajax/${encodeURIComponent(OWNER_EMAIL)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json', Origin: origin, Referer: `${origin}/` },
      body: JSON.stringify({
        _subject: `NEW ORDER #${order.orderNumber} - Oma's Pizza (Rs. ${order.grandTotal})`,
        'Order Number': order.orderNumber,
        'Order Type': order.orderType,
        'Customer Name': order.customer?.name,
        'Contact / Phone': order.customer?.phone,
        'Customer Email': order.customer?.email || '-',
        'Full Address': fullAddr,
        'Special Notes': order.customer?.notes || 'None',
        'Ordered Items': itemsText,
        Subtotal: `Rs. ${order.subtotal}`,
        'Delivery Fee': `Rs. ${order.deliveryFee}`,
        'Grand Total': `Rs. ${order.grandTotal}`,
        'Payment Method': order.paymentMethod,
        _template: 'table',
        _captcha: 'false'
      })
    });
  } catch { /* non-blocking */ }
}

// ---------------- Main Handler ----------------
export default async function handler(req, res) {
  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const path = url.pathname.replace(/^\/api/, '') || '/';
  const method = req.method.toUpperCase();
  const user = getUser(req);
  const isAdmin = user && user.role === 'superadmin';

  if (method === 'OPTIONS') { res.statusCode = 204; return res.end(); }

  try {
    // ---- Health ----
    if (path === '/health' && method === 'GET') {
      return sendJson(res, 200, { status: 'online', restaurant: "Oma's Pizza", version: '2.0.0', database: 'cloud-connected', time: new Date().toISOString() });
    }

    // ---- Auth ----
    if (path === '/auth/login' && method === 'POST') {
      const b = await readBody(req);
      const email = String(b.email || '').trim().toLowerCase();
      const password = String(b.password || '').trim();
      if (email === ADMIN_EMAIL && password === ADMIN_PASSWORD) {
        const u = { id: 'admin-1', name: "Oma's Restaurant Manager", email: ADMIN_EMAIL, role: 'superadmin', exp: Date.now() + 7 * 24 * 3600 * 1000 };
        setCookie(res, signToken(u));
        return sendJson(res, 200, {
          success: true,
          message: 'Logged in',
          user: { ...u, phone: '', addresses: [], permissions: ALL_PERMS },
          admin: { email: u.email, name: u.name, role: u.role }
        });
      }
      return sendJson(res, 401, { success: false, message: 'Invalid email or password' });
    }

    if (path === '/auth/logout' && method === 'POST') {
      setCookie(res, '', 0);
      return sendJson(res, 200, { success: true });
    }

    if (path === '/auth/me' && method === 'GET') {
      return sendJson(res, 200, { success: true, user });
    }

    if (path === '/auth/me/cart') {
      return sendJson(res, 200, { success: true, cart: [] });
    }

    // ---- Settings ----
    if (path === '/settings' && method === 'GET') {
      return sendJson(res, 200, { success: true, settings: await getSettings() });
    }
    if (path === '/settings' && method === 'PUT') {
      if (!isAdmin) return sendJson(res, 401, { success: false, message: 'Admin login required' });
      const b = await readBody(req);
      const next = { ...(await getSettings()), ...b };
      await redisSet(K.settings, next);
      return sendJson(res, 200, { success: true, settings: next });
    }

    // ---- Categories ----
    if (path === '/categories' && method === 'GET') {
      const cats = await getCategories();
      return sendJson(res, 200, { success: true, categories: isAdmin ? cats : cats.filter(c => c.active !== false) });
    }
    if (path === '/categories' && method === 'POST') {
      if (!isAdmin) return sendJson(res, 401, { success: false, message: 'Admin login required' });
      const b = await readBody(req);
      const name = String(b.name || '').trim();
      if (!name) return sendJson(res, 400, { success: false, message: 'Category name is required' });
      const cats = await getCategories();
      if (cats.some(c => c.name.toLowerCase() === name.toLowerCase())) return sendJson(res, 409, { success: false, message: 'Category already exists' });
      const cat = { id: `cat-${Date.now()}`, name, description: String(b.description || '').trim(), image: '', sortOrder: cats.length, active: b.active !== false };
      await redisSet(K.categories, [...cats, cat]);
      return sendJson(res, 201, { success: true, category: cat });
    }
    if (path === '/categories/reorder' && method === 'POST') {
      if (!isAdmin) return sendJson(res, 401, { success: false, message: 'Admin login required' });
      const b = await readBody(req);
      const ids = Array.isArray(b.ids) ? b.ids : [];
      const cats = await getCategories();
      const map = new Map(cats.map(c => [c.id, c]));
      const ordered = ids.map((id, i) => map.get(id) && { ...map.get(id), sortOrder: i }).filter(Boolean);
      const rest = cats.filter(c => !ids.includes(c.id));
      await redisSet(K.categories, [...ordered, ...rest]);
      return sendJson(res, 200, { success: true });
    }
    const catMatch = /^\/categories\/([^/]+)$/.exec(path);
    if (catMatch) {
      if (!isAdmin) return sendJson(res, 401, { success: false, message: 'Admin login required' });
      const id = decodeURIComponent(catMatch[1]);
      const cats = await getCategories();
      if (method === 'PUT') {
        const b = await readBody(req);
        const idx = cats.findIndex(c => c.id === id);
        if (idx < 0) return sendJson(res, 404, { success: false, message: 'Category not found' });
        const oldName = cats[idx].name;
        cats[idx] = { ...cats[idx], name: b.name ? String(b.name).trim() : cats[idx].name, description: b.description !== undefined ? String(b.description) : cats[idx].description, active: b.active !== undefined ? !!b.active : cats[idx].active };
        await redisSet(K.categories, cats);
        if (oldName !== cats[idx].name) {
          const items = await getItems();
          await redisSet(K.items, items.map(it => (it.categoryId === id ? { ...it, category: cats[idx].name } : it)));
        }
        return sendJson(res, 200, { success: true, category: cats[idx] });
      }
      if (method === 'DELETE') {
        const items = await getItems();
        if (items.some(i => i.categoryId === id)) return sendJson(res, 409, { success: false, message: 'Move or delete products in this category first' });
        await redisSet(K.categories, cats.filter(c => c.id !== id));
        return sendJson(res, 200, { success: true, id });
      }
    }

    // ---- Items (Products) ----
    if (path === '/items' && method === 'GET') {
      const items = await getItems();
      return sendJson(res, 200, { success: true, count: items.length, items });
    }
    if (path === '/items' && method === 'POST') {
      if (!isAdmin) return sendJson(res, 401, { success: false, message: 'Admin login required' });
      const b = await readBody(req);
      const name = String(b.name || '').trim();
      const price = Number(b.price);
      if (!name || !isFinite(price) || price < 0) return sendJson(res, 400, { success: false, message: 'Valid name and price are required' });
      const cats = await getCategories();
      const cat = cats.find(c => c.id === b.categoryId || c.name === b.category) || cats[0];
      const dp = b.discountPrice !== undefined && b.discountPrice !== null && b.discountPrice !== '' ? Number(b.discountPrice) : null;
      if (dp != null && dp >= price) return sendJson(res, 400, { success: false, message: 'Discounted price must be lower than price' });
      const item = {
        id: `item-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        name,
        description: String(b.description || '').trim(),
        price: round(price),
        discountPrice: dp != null ? round(dp) : null,
        finalPrice: dp != null ? round(dp) : round(price),
        image: String(b.image || '').trim(),
        categoryId: cat.id,
        category: cat.name,
        subCategory: String(b.subCategory || '').trim(),
        badge: String(b.badge || (b.bestSeller ? 'Best Seller' : '')).trim(),
        bestSeller: !!b.bestSeller,
        featured: !!b.featured,
        available: b.available !== false,
        diet: b.diet === 'veg' ? 'veg' : 'nonveg',
        spicy: ['None', 'Mild', 'Medium', 'Hot'].includes(b.spicy) ? b.spicy : 'None',
        sizes: Array.isArray(b.sizes) ? b.sizes : [],
        toppings: Array.isArray(b.toppings) ? b.toppings : [],
        cheeseOptions: Array.isArray(b.cheeseOptions) ? b.cheeseOptions : [],
        rating: 5.0,
        reviews: 1,
        updatedAt: new Date().toISOString()
      };
      const items = await getItems();
      await redisSet(K.items, [item, ...items]);
      return sendJson(res, 201, { success: true, message: 'Menu item created', item });
    }
    const itemMatch = /^\/items\/([^/]+)$/.exec(path);
    if (itemMatch) {
      const id = decodeURIComponent(itemMatch[1]);
      const items = await getItems();
      const idx = items.findIndex(i => i.id === id);
      if (method === 'GET') {
        if (idx < 0) return sendJson(res, 404, { success: false, message: 'Item not found' });
        return sendJson(res, 200, { success: true, item: items[idx] });
      }
      if (!isAdmin) return sendJson(res, 401, { success: false, message: 'Admin login required' });
      if (idx < 0) return sendJson(res, 404, { success: false, message: 'Item not found' });
      if (method === 'PUT') {
        const b = await readBody(req);
        const cats = await getCategories();
        const cat = b.categoryId || b.category ? (cats.find(c => c.id === b.categoryId || c.name === b.category) || null) : null;
        const cur = items[idx];
        const price = b.price !== undefined ? round(Number(b.price)) : cur.price;
        const dp = b.discountPrice !== undefined ? (b.discountPrice === null || b.discountPrice === '' ? null : round(Number(b.discountPrice))) : cur.discountPrice;
        if (dp != null && dp >= price) return sendJson(res, 400, { success: false, message: 'Discounted price must be lower than price' });
        const updated = {
          ...cur,
          ...b,
          id: cur.id,
          price,
          discountPrice: dp,
          finalPrice: dp != null ? dp : price,
          categoryId: cat ? cat.id : cur.categoryId,
          category: cat ? cat.name : cur.category,
          updatedAt: new Date().toISOString()
        };
        items[idx] = updated;
        await redisSet(K.items, items);
        return sendJson(res, 200, { success: true, message: 'Item updated', item: updated });
      }
      if (method === 'DELETE') {
        await redisSet(K.items, items.filter(i => i.id !== id));
        return sendJson(res, 200, { success: true, message: 'Item removed', id });
      }
    }

    // ---- Image Upload (Data URL returned cleanly for cloud storage) ----
    if (path === '/uploads' && method === 'POST') {
      if (!isAdmin) return sendJson(res, 401, { success: false, message: 'Admin login required' });
      const raw = await readRawBuffer(req);
      const dataUrl = extractMultipartImage(raw, req.headers['content-type']);
      if (!dataUrl) return sendJson(res, 400, { success: false, message: 'Please upload a valid JPEG/PNG/WebP image under 2 MB' });
      return sendJson(res, 201, { success: true, url: dataUrl });
    }

    // ---- Orders ----
    if (path === '/orders' && method === 'POST') {
      const b = await readBody(req);
      const cust = b.customer || {};
      const orderType = ['delivery', 'pickup', 'dine-in'].includes(b.orderType) ? b.orderType : 'delivery';
      if (!String(cust.name || '').trim() || !String(cust.phone || '').trim()) {
        return sendJson(res, 400, { success: false, message: 'Please provide your name and phone number.' });
      }
      if (orderType === 'delivery' && !String(cust.address || '').trim()) {
        return sendJson(res, 400, { success: false, message: 'Delivery address is required.' });
      }
      if (!Array.isArray(b.items) || !b.items.length) {
        return sendJson(res, 400, { success: false, message: 'Cart is empty.' });
      }
      const catalog = await getItems();
      const settings = await getSettings();
      const lines = [];
      for (const it of b.items) {
        const p = catalog.find(x => x.id === (it.productId || it.id));
        if (!p) return sendJson(res, 400, { success: false, message: 'An item in your cart is no longer available.' });
        if (p.available === false) return sendJson(res, 409, { success: false, message: `"${p.name}" is currently sold out.` });
        const qty = Math.min(Math.max(Math.floor(Number(it.quantity)) || 1, 1), 50);
        const pr = computeUnitPrice(p, it);
        lines.push({ productId: p.id, name: p.name, image: p.image, category: p.category, size: pr.size, toppings: pr.toppings, cheese: pr.cheese, instructions: String(it.instructions || '').slice(0, 300), unitPrice: pr.unit, quantity: qty, lineTotal: round(pr.unit * qty) });
      }
      const subtotal = round(lines.reduce((s, l) => s + l.lineTotal, 0));
      const deliveryFee = orderType === 'delivery' && !(settings.freeDeliveryOver > 0 && subtotal >= settings.freeDeliveryOver) ? (settings.deliveryFee || 100) : 0;
      const grandTotal = round(subtotal + deliveryFee);
      const orderNumber = `OMA-${Math.floor(1000000 + Math.random() * 8999999)}`;
      const trackingToken = crypto.randomBytes(16).toString('hex');
      const order = {
        id: orderNumber,
        orderId: orderNumber,
        orderNumber,
        source: 'online',
        orderType,
        tableNumber: String(b.tableNumber || ''),
        customer: { name: String(cust.name).trim(), phone: String(cust.phone).trim(), email: String(cust.email || '').trim(), address: String(cust.address || '').trim(), area: String(cust.area || '').trim(), city: String(cust.city || '').trim(), notes: String(cust.notes || '').trim() },
        items: lines,
        subtotal,
        discount: 0,
        couponCode: '',
        taxRate: 0,
        tax: 0,
        deliveryFee,
        grandTotal,
        paymentMethod: orderType === 'delivery' ? 'cash_on_delivery' : orderType === 'pickup' ? 'cash_at_pickup' : 'cash_dine_in',
        paymentStatus: 'unpaid',
        status: 'Pending',
        trackingToken,
        createdAt: new Date().toISOString()
      };
      const orders = await getOrders();
      await redisSet(K.orders, [order, ...orders].slice(0, 500));
      await dispatchOrderEmail(order, req.headers.host);
      const { trackingToken: _t, ...pubOrder } = order;
      return sendJson(res, 201, { success: true, message: `Order #${orderNumber} confirmed!`, order: pubOrder, trackingToken });
    }

    if (path === '/orders' && method === 'GET') {
      if (!isAdmin) return sendJson(res, 401, { success: false, message: 'Admin login required' });
      let orders = await getOrders();
      const q = (url.searchParams.get('q') || '').trim().toLowerCase();
      const status = url.searchParams.get('status') || '';
      const type = url.searchParams.get('type') || '';
      if (status) orders = orders.filter(o => o.status === status);
      if (type) orders = orders.filter(o => o.orderType === type);
      if (q) orders = orders.filter(o => `${o.orderNumber} ${o.customer?.name} ${o.customer?.phone}`.toLowerCase().includes(q));
      return sendJson(res, 200, { success: true, count: orders.length, total: orders.length, orders });
    }

    const trackMatch = /^\/orders\/track\/([^/]+)$/.exec(path);
    if (trackMatch && method === 'GET') {
      const num = decodeURIComponent(trackMatch[1]);
      const tk = url.searchParams.get('token') || '';
      const orders = await getOrders();
      const o = orders.find(x => x.orderNumber === num || x.id === num);
      if (!o || (!isAdmin && o.trackingToken && tk !== o.trackingToken)) {
        return sendJson(res, 404, { success: false, message: 'Order not found' });
      }
      const { trackingToken: _t, ...pubOrder } = o;
      return sendJson(res, 200, { success: true, order: pubOrder });
    }

    const statusMatch = /^\/orders\/([^/]+)\/status$/.exec(path);
    if (statusMatch && method === 'PATCH') {
      if (!isAdmin) return sendJson(res, 401, { success: false, message: 'Admin login required' });
      const id = decodeURIComponent(statusMatch[1]);
      const b = await readBody(req);
      const orders = await getOrders();
      const idx = orders.findIndex(o => o.orderNumber === id || o.id === id);
      if (idx < 0) return sendJson(res, 404, { success: false, message: 'Order not found' });
      orders[idx] = { ...orders[idx], status: String(b.status || orders[idx].status), updatedAt: new Date().toISOString() };
      await redisSet(K.orders, orders);
      return sendJson(res, 200, { success: true, order: orders[idx] });
    }

    // ---- Reviews / Coupons public stubs ----
    if (path === '/reviews' && method === 'GET') {
      return sendJson(res, 200, { success: true, average: 0, count: 0, reviews: [] });
    }
    if (path === '/coupons/public' && method === 'GET') {
      return sendJson(res, 200, { success: true, coupons: [] });
    }
    if (path === '/coupons/validate' && method === 'POST') {
      return sendJson(res, 400, { success: false, message: 'Invalid coupon code' });
    }

    // ---- SSE on Vercel serverless (graceful 204 so client uses fast polling) ----
    if (path === '/events' && method === 'GET') {
      res.statusCode = 204;
      return res.end();
    }

    return sendJson(res, 404, { success: false, message: 'Endpoint not found' });
  } catch (err) {
    console.error('[vercel-api]', path, err);
    return sendJson(res, 500, { success: false, message: 'Server error' });
  }
}
