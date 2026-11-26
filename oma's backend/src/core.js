// Config, DB connection, auth helpers, permissions, realtime hub, pricing.
require('dotenv').config();
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const models = require('./models');

const isProd = process.env.NODE_ENV === 'production' || !!process.env.VERCEL;

const config = {
  isProd,
  port: process.env.PORT || 5000,
  mongoUri: process.env.MONGODB_URI || '',
  jwtSecret: process.env.JWT_SECRET || (isProd ? '' : 'dev-only-secret-change-me'),
  clientOrigins: (process.env.CLIENT_ORIGINS || 'http://localhost:5173,http://localhost:4173')
    .split(',').map(s => s.trim()).filter(Boolean),
  adminEmail: (process.env.ADMIN_EMAIL || 'admin@omas.com').toLowerCase(),
  // The legacy hard-coded password is only a *development* fallback.
  adminPassword: process.env.ADMIN_PASSWORD || (isProd ? '' : 'Adminofomas1'),
  notificationEmail: process.env.NOTIFICATION_EMAIL || '',
  timezone: process.env.RESTAURANT_TIMEZONE || 'Asia/Karachi'
};

// ------------------------------------------------------------------ DB
let connecting = null;
async function connectDb() {
  if (!config.mongoUri) {
    const e = new Error('MONGODB_URI is not configured');
    e.status = 503; e.code = 'DB_NOT_CONFIGURED';
    throw e;
  }
  if (mongoose.connection.readyState === 1) return mongoose.connection;
  if (!connecting) {
    mongoose.set('strictQuery', true);
    connecting = mongoose.connect(config.mongoUri, {
      serverSelectionTimeoutMS: 8000,
      maxPoolSize: 10
    }).then(async (c) => {
      await Promise.all(Object.values(models).filter(x => x.syncIndexes).map(x => x.init().catch(err => console.error('Index error', x.modelName, err.message))));
      console.log('MongoDB connected:', mongoose.connection.name);
      return c;
    }).catch((err) => {
      connecting = null; // allow retry on next request
      console.error('MongoDB connection failed:', err.message);
      const e = new Error('Database unavailable'); e.status = 503; e.code = 'DB_UNAVAILABLE';
      throw e;
    });
  }
  return connecting;
}
const dbReady = async (req, res, next) => { try { await connectDb(); next(); } catch (e) { next(e); } };

// ------------------------------------------------------------------ Auth
const COOKIE = 'omas_session';
const cookieOpts = () => ({
  httpOnly: true,
  secure: config.isProd,
  sameSite: config.isProd ? (process.env.COOKIE_SAMESITE || 'none') : 'lax',
  maxAge: 7 * 24 * 3600 * 1000,
  path: '/'
});
function signSession(user) {
  return jwt.sign({ sub: String(user._id), tv: user.tokenVersion || 0 }, config.jwtSecret, { expiresIn: '7d' });
}
function setSession(res, user) { res.cookie(COOKIE, signSession(user), cookieOpts()); }
function clearSession(res) { const { maxAge, ...o } = cookieOpts(); res.clearCookie(COOKIE, o); }

async function userFromReq(req) {
  const token = req.cookies && req.cookies[COOKIE];
  if (!token) return null;
  try {
    const p = jwt.verify(token, config.jwtSecret);
    const u = await models.User.findById(p.sub);
    if (!u || !u.active || (u.tokenVersion || 0) !== p.tv) return null;
    return u;
  } catch { return null; }
}
const attachUser = async (req, res, next) => { try { req.user = await userFromReq(req); next(); } catch (e) { next(e); } };
const requireAuth = (req, res, next) => req.user ? next() : res.status(401).json({ success: false, message: 'Please log in' });

// Permission -> roles. Enforced on the server for every protected route.
const PERMS = {
  'orders.view': ['superadmin', 'manager', 'cashier', 'kitchen'],
  'orders.status': ['superadmin', 'manager', 'cashier', 'kitchen'],
  'orders.cancel': ['superadmin', 'manager', 'cashier'],
  'pos.create': ['superadmin', 'manager', 'cashier'],
  'products.manage': ['superadmin', 'manager'],
  'categories.manage': ['superadmin', 'manager'],
  'inventory.view': ['superadmin', 'manager', 'kitchen'],
  'inventory.manage': ['superadmin', 'manager', 'kitchen'],
  'customers.view': ['superadmin', 'manager', 'cashier'],
  'reservations.manage': ['superadmin', 'manager', 'cashier'],
  'reviews.moderate': ['superadmin', 'manager'],
  'coupons.manage': ['superadmin', 'manager'],
  'reports.view': ['superadmin', 'manager'],
  'staff.manage': ['superadmin'],
  'settings.manage': ['superadmin', 'manager'],
  'uploads.create': ['superadmin', 'manager', 'cashier']
};
const STAFF_ROLES = ['superadmin', 'manager', 'cashier', 'kitchen'];
const isStaff = (u) => !!u && STAFF_ROLES.includes(u.role);
const can = (u, perm) => !!u && (PERMS[perm] || []).includes(u.role);
const requirePerm = (perm) => (req, res, next) => {
  if (!req.user) return res.status(401).json({ success: false, message: 'Please log in' });
  if (!can(req.user, perm)) return res.status(403).json({ success: false, message: 'You do not have permission to do that' });
  next();
};
const permsFor = (role) => Object.keys(PERMS).filter(p => PERMS[p].includes(role));

const publicUser = (u) => ({
  id: String(u._id), name: u.name, email: u.email, phone: u.phone, role: u.role,
  addresses: (u.addresses || []).map(a => ({ id: String(a._id), label: a.label, address: a.address, city: a.city, area: a.area, instructions: a.instructions })),
  permissions: permsFor(u.role)
});

// ------------------------------------------------------------------ Realtime (Server-Sent Events)
// Channels: "public" (everyone), "staff" (authenticated staff), "user:<id>", "order:<number>" (guest token).
const clients = new Set();
function sseHandler(channelsFor) {
  return async (req, res) => {
    const channels = await channelsFor(req);
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no'
    });
    res.write('retry: 3000\n\n');
    const client = { res, channels };
    clients.add(client);
    send(client, 'hello', { channels: channels.filter(c => c === 'public' || c === 'staff'), at: Date.now() });
    const ping = setInterval(() => res.write(': ping\n\n'), 25000);
    req.on('close', () => { clearInterval(ping); clients.delete(client); });
  };
}
function send(client, event, data) {
  try { client.res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`); } catch { clients.delete(client); }
}
// Call ONLY after the database write succeeded.
function broadcast(channel, event, data) {
  for (const c of clients) if (c.channels.includes(channel)) send(c, event, data);
}

// ------------------------------------------------------------------ Helpers
const round = (n) => Math.round((Number(n) + Number.EPSILON) * 100) / 100;
const asyncH = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
const httpErr = (status, message) => { const e = new Error(message); e.status = status; e.expose = true; return e; };
const str = (v, max = 200) => (typeof v === 'string' ? v.trim().slice(0, max) : '');
const isId = (v) => mongoose.isValidObjectId(v);

function unitPrice(product, { size, toppings = [], cheese } = {}) {
  const ratio = product.discountPrice != null && product.price > 0 ? product.discountPrice / product.price : 1;
  let base = product.discountPrice != null ? product.discountPrice : product.price;
  let sizeName = '';
  if (product.sizes && product.sizes.length) {
    const s = product.sizes.find(x => x.name === size) || product.sizes[0];
    sizeName = s.name;
    base = round(s.price * ratio);
  }
  const tops = [];
  let extra = 0;
  for (const t of toppings) {
    const f = (product.toppings || []).find(x => x.name === t);
    if (f && !tops.includes(f.name)) { tops.push(f.name); extra += f.price; }
  }
  let cheeseName = '';
  if (cheese) {
    const c = (product.cheeseOptions || []).find(x => x.name === cheese);
    if (c) { cheeseName = c.name; extra += c.price; }
  }
  return { unit: round(base + extra), size: sizeName, toppings: tops, cheese: cheeseName };
}

async function nextOrderNumber() {
  // 7-digit numbers can never collide with legacy 6-digit "OMA-######" ids from the old JSON store.
  await models.Counter.updateOne({ _id: 'order' }, { $setOnInsert: { seq: 1000000 } }, { upsert: true }).catch(() => {});
  const c = await models.Counter.findOneAndUpdate({ _id: 'order' }, { $inc: { seq: 1 } }, { returnDocument: 'after' });
  return `OMA-${c.seq}`;
}
const newToken = () => crypto.randomBytes(24).toString('hex');
const sha = (s) => crypto.createHash('sha256').update(s).digest('hex');

async function getSettings() {
  let s = await models.Setting.findOne({ key: 'main' });
  if (!s) s = await models.Setting.create({ key: 'main', openingHours: defaultHours() });
  return s;
}
function defaultHours() {
  return ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map(day => ({ day, open: '12:00', close: '23:30', closed: false }));
}

module.exports = {
  config, connectDb, dbReady, COOKIE, setSession, clearSession, attachUser, requireAuth, requirePerm,
  can, isStaff, publicUser, PERMS, STAFF_ROLES, sseHandler, broadcast, round, asyncH, httpErr, str, isId,
  unitPrice, nextOrderNumber, newToken, sha, getSettings, defaultHours
};

