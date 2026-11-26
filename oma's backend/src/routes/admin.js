// Reservations, reviews, inventory, customers, reports, staff.
const express = require('express');
const bcrypt = require('bcryptjs');
const rateLimit = require('express-rate-limit');
const { Reservation, Review, Ingredient, User, Order } = require('../models');
const core = require('../core');
const { asyncH, httpErr, str, isId, requirePerm, broadcast, round, config, STAFF_ROLES } = core;

const router = express.Router();
const limiter = rateLimit({ windowMs: 10 * 60 * 1000, limit: 20, standardHeaders: true, legacyHeaders: false, message: { success: false, message: 'Too many requests, try again later' } });
const rx = (s) => new RegExp(String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');

// ============================================================ RESERVATIONS
const toMin = (t) => { const [h, m] = t.split(':').map(Number); return h * 60 + m; };
function nowInTz() {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: config.timezone, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(new Date());
  const g = (t) => parts.find(p => p.type === t).value;
  return { date: `${g('year')}-${g('month')}-${g('day')}`, minutes: Number(g('hour')) * 60 + Number(g('minute')) };
}
async function seatsTaken(date, time, slot, excludeId) {
  const t = toMin(time);
  const q = { date, status: { $in: ['Pending', 'Confirmed'] } };
  if (excludeId) q._id = { $ne: excludeId };
  const rs = await Reservation.find(q).select('time guests');
  return rs.filter(r => Math.abs(toMin(r.time) - t) < slot).reduce((s, r) => s + r.guests, 0);
}
router.get('/reservations/availability', asyncH(async (req, res) => {
  const date = str(String(req.query.date || ''), 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw httpErr(400, 'date (yyyy-mm-dd) is required');
  const s = await core.getSettings();
  const day = new Date(date + 'T12:00:00Z').toLocaleDateString('en-US', { weekday: 'long', timeZone: 'UTC' });
  const hours = (s.openingHours || []).find(h => h.day === day);
  if (!hours || hours.closed) return res.json({ success: true, date, closed: true, slots: [] });
  const slot = s.reservationSlotMinutes, slots = [];
  const now = nowInTz();
  for (let m = toMin(hours.open); m + slot <= toMin(hours.close); m += 30) {
    const time = `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
    if (date < now.date || (date === now.date && m <= now.minutes)) continue;
    slots.push({ time, seatsLeft: Math.max(0, s.reservationCapacity - await seatsTaken(date, time, slot)) });
  }
  res.json({ success: true, date, capacity: s.reservationCapacity, slots });
}));
router.post('/reservations', limiter, asyncH(async (req, res) => {
  const b = req.body || {};
  const name = str(b.name, 80), phone = str(b.phone, 30), date = str(b.date, 10), time = str(b.time, 5), guests = Math.floor(Number(b.guests));
  if (!name || !phone) throw httpErr(400, 'Name and phone are required');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^\d{2}:\d{2}$/.test(time)) throw httpErr(400, 'Valid date and time are required');
  if (!(guests >= 1 && guests <= 50)) throw httpErr(400, 'Guests must be between 1 and 50');
  const s = await core.getSettings();
  const now = nowInTz();
  if (date < now.date || (date === now.date && toMin(time) <= now.minutes)) throw httpErr(400, 'Please choose a future date and time');
  const day = new Date(date + 'T12:00:00Z').toLocaleDateString('en-US', { weekday: 'long', timeZone: 'UTC' });
  const hours = (s.openingHours || []).find(h => h.day === day);
  if (!hours || hours.closed) throw httpErr(400, `We are closed on ${day}s`);
  if (toMin(time) < toMin(hours.open) || toMin(time) + s.reservationSlotMinutes > toMin(hours.close)) throw httpErr(400, `Reservations on ${day} are between ${hours.open} and ${hours.close}`);
  if (guests > s.reservationCapacity) throw httpErr(400, 'Party is larger than our capacity. Please call us.');
  const taken = await seatsTaken(date, time, s.reservationSlotMinutes);
  if (taken + guests > s.reservationCapacity) throw httpErr(409, `Sorry, only ${Math.max(0, s.reservationCapacity - taken)} seats are left at that time. Please pick another slot.`);
  const r = await Reservation.create({ userId: req.user ? req.user._id : undefined, name, phone, email: str(b.email, 120), date, time, guests, specialRequests: str(b.specialRequests, 500), reference: 'RSV-' + core.newToken().slice(0, 8).toUpperCase() });
  broadcast('staff', 'reservation:updated', { id: String(r._id), action: 'created' });
  res.status(201).json({ success: true, message: 'Reservation received! We will confirm shortly.', reservation: r });
}));
router.get('/reservations/mine', core.requireAuth, asyncH(async (req, res) => {
  res.json({ success: true, reservations: await Reservation.find({ userId: req.user._id }).sort({ date: -1, time: -1 }).limit(100) });
}));
router.get('/reservations', requirePerm('reservations.manage'), asyncH(async (req, res) => {
  const q = {};
  if (req.query.date) q.date = str(String(req.query.date), 10);
  if (req.query.status) q.status = str(String(req.query.status), 20);
  res.json({ success: true, reservations: await Reservation.find(q).sort({ date: -1, time: -1 }).limit(500) });
}));
router.patch('/reservations/:id', requirePerm('reservations.manage'), asyncH(async (req, res) => {
  if (!isId(req.params.id)) throw httpErr(404, 'Not found');
  const status = str(req.body.status, 20);
  if (!['Pending', 'Confirmed', 'Cancelled', 'Completed'].includes(status)) throw httpErr(400, 'Invalid status');
  const r = await Reservation.findById(req.params.id);
  if (!r) throw httpErr(404, 'Not found');
  if (status === 'Confirmed' && r.status !== 'Confirmed') {
    const s = await core.getSettings();
    if (await seatsTaken(r.date, r.time, s.reservationSlotMinutes, r._id) + r.guests > s.reservationCapacity) throw httpErr(409, 'Confirming would exceed capacity for that time');
  }
  r.status = status; await r.save();
  broadcast('staff', 'reservation:updated', { id: String(r._id), action: 'status' });
  if (r.userId) broadcast(`user:${r.userId}`, 'reservation:status', { id: String(r._id), reference: r.reference, status });
  res.json({ success: true, reservation: r });
}));
router.delete('/reservations/:id', requirePerm('reservations.manage'), asyncH(async (req, res) => {
  if (!isId(req.params.id) || !(await Reservation.findByIdAndDelete(req.params.id))) throw httpErr(404, 'Not found');
  broadcast('staff', 'reservation:updated', { action: 'deleted' });
  res.json({ success: true });
}));

// ============================================================ REVIEWS
const reviewOut = (r) => ({ id: String(r._id), name: r.name, rating: r.rating, comment: r.comment, verified: r.verified, status: r.status, createdAt: r.createdAt });
router.get('/reviews', asyncH(async (req, res) => {
  const list = await Review.find({ status: 'approved' }).sort({ createdAt: -1 }).limit(60);
  const agg = await Review.aggregate([{ $match: { status: 'approved' } }, { $group: { _id: null, avg: { $avg: '$rating' }, n: { $sum: 1 } } }]);
  res.json({ success: true, average: agg[0] ? round(agg[0].avg) : 0, count: agg[0] ? agg[0].n : 0, reviews: list.map(reviewOut) });
}));
router.post('/reviews', core.requireAuth, limiter, asyncH(async (req, res) => {
  const rating = Math.floor(Number(req.body.rating));
  if (!(rating >= 1 && rating <= 5)) throw httpErr(400, 'Rating must be 1 to 5');
  const order = await Order.findOne({ _id: isId(req.body.orderId) ? req.body.orderId : null, userId: req.user._id });
  if (!order) throw httpErr(404, 'Order not found');
  if (order.status !== 'Delivered') throw httpErr(400, 'You can review an order once it has been delivered');
  try {
    const r = await Review.create({ userId: req.user._id, orderId: order._id, name: req.user.name.split(' ')[0] + ' ' + (req.user.name.split(' ')[1] || '').charAt(0), rating, comment: str(req.body.comment, 1000), verified: true });
    broadcast('staff', 'review:new', { id: String(r._id) });
    res.status(201).json({ success: true, message: 'Thanks! Your review will appear after moderation.', review: reviewOut(r) });
  } catch (e) { if (e.code === 11000) throw httpErr(409, 'You already reviewed this order'); throw e; }
}));
router.get('/reviews/all', requirePerm('reviews.moderate'), asyncH(async (req, res) => {
  const list = await Review.find().sort({ createdAt: -1 }).limit(300);
  res.json({ success: true, reviews: list.map(reviewOut) });
}));
router.patch('/reviews/:id', requirePerm('reviews.moderate'), asyncH(async (req, res) => {
  if (!['pending', 'approved', 'rejected'].includes(req.body.status)) throw httpErr(400, 'Invalid status');
  const r = isId(req.params.id) && await Review.findByIdAndUpdate(req.params.id, { status: req.body.status }, { returnDocument: 'after' });
  if (!r) throw httpErr(404, 'Not found');
  broadcast('public', 'reviews:updated', {});
  res.json({ success: true, review: reviewOut(r) });
}));
router.delete('/reviews/:id', requirePerm('reviews.moderate'), asyncH(async (req, res) => {
  if (!isId(req.params.id) || !(await Review.findByIdAndDelete(req.params.id))) throw httpErr(404, 'Not found');
  broadcast('public', 'reviews:updated', {});
  res.json({ success: true });
}));

// ============================================================ INVENTORY
const ingOut = (i, history = false) => ({ id: String(i._id), name: i.name, unit: i.unit, stock: i.stock, lowStockThreshold: i.lowStockThreshold, costPerUnit: i.costPerUnit, low: i.stock <= i.lowStockThreshold, updatedAt: i.updatedAt, ...(history ? { history: [...i.history].reverse().slice(0, 100) } : {}) });
const numOr = (v, d) => (v === undefined || v === '' ? d : Number(v));
router.get('/ingredients', requirePerm('inventory.view'), asyncH(async (req, res) => {
  const list = await Ingredient.find().sort({ name: 1 });
  res.json({ success: true, ingredients: list.map(i => ingOut(i)), lowStock: list.filter(i => i.stock <= i.lowStockThreshold).map(i => i.name) });
}));
router.get('/ingredients/:id', requirePerm('inventory.view'), asyncH(async (req, res) => {
  const i = isId(req.params.id) && await Ingredient.findById(req.params.id);
  if (!i) throw httpErr(404, 'Ingredient not found');
  res.json({ success: true, ingredient: ingOut(i, true) });
}));
router.post('/ingredients', requirePerm('inventory.manage'), asyncH(async (req, res) => {
  const name = str(req.body.name, 80); if (!name) throw httpErr(400, 'Name is required');
  const stock = numOr(req.body.stock, 0), th = numOr(req.body.lowStockThreshold, 5), cost = numOr(req.body.costPerUnit, 0);
  if ([stock, th, cost].some(n => !isFinite(n) || n < 0)) throw httpErr(400, 'Numbers must be non-negative');
  try {
    const i = await Ingredient.create({ name, unit: str(req.body.unit, 20) || 'kg', stock, lowStockThreshold: th, costPerUnit: cost, history: [{ change: stock, balance: stock, reason: 'Initial stock', by: req.user.email }] });
    res.status(201).json({ success: true, ingredient: ingOut(i) });
  } catch (e) { if (e.code === 11000) throw httpErr(409, 'Ingredient already exists'); throw e; }
}));
router.put('/ingredients/:id', requirePerm('inventory.manage'), asyncH(async (req, res) => {
  const i = isId(req.params.id) && await Ingredient.findById(req.params.id);
  if (!i) throw httpErr(404, 'Ingredient not found');
  if (req.body.name !== undefined) i.name = str(req.body.name, 80) || i.name;
  if (req.body.unit !== undefined) i.unit = str(req.body.unit, 20) || i.unit;
  if (req.body.lowStockThreshold !== undefined) i.lowStockThreshold = Math.max(0, Number(req.body.lowStockThreshold) || 0);
  if (req.body.costPerUnit !== undefined) i.costPerUnit = Math.max(0, Number(req.body.costPerUnit) || 0);
  await i.save();
  res.json({ success: true, ingredient: ingOut(i) });
}));
router.post('/ingredients/:id/adjust', requirePerm('inventory.manage'), asyncH(async (req, res) => {
  const change = Number(req.body.change);
  if (!isFinite(change) || change === 0) throw httpErr(400, 'A non-zero change amount is required (negative to use stock)');
  const reason = str(req.body.reason, 120) || 'Manual adjustment';
  // atomic: refuse to go below zero
  const i = isId(req.params.id) && await Ingredient.findOneAndUpdate(
    { _id: req.params.id, ...(change < 0 ? { stock: { $gte: -change } } : {}) },
    [{ $set: { stock: { $add: ['$stock', change] } } }, { $set: { history: { $concatArrays: ['$history', [{ change, balance: '$stock', reason, by: req.user.email, at: '$$NOW' }]] } } }],
    { returnDocument: 'after', updatePipeline: true });
  if (!i) throw httpErr(isId(req.params.id) && await Ingredient.exists({ _id: req.params.id }) ? 409 : 404, 'Ingredient not found or insufficient stock');
  if (i.stock <= i.lowStockThreshold) broadcast('staff', 'inventory:low', { name: i.name, stock: i.stock, unit: i.unit });
  res.json({ success: true, ingredient: ingOut(i, true) });
}));
router.delete('/ingredients/:id', requirePerm('inventory.manage'), asyncH(async (req, res) => {
  if (!isId(req.params.id) || !(await Ingredient.findByIdAndDelete(req.params.id))) throw httpErr(404, 'Ingredient not found');
  res.json({ success: true });
}));

// ============================================================ CUSTOMERS
router.get('/customers', requirePerm('customers.view'), asyncH(async (req, res) => {
  const q = { role: 'customer' };
  const s = str(String(req.query.q || ''), 60);
  if (s) q.$or = [{ name: rx(s) }, { email: rx(s) }, { phone: rx(s) }];
  const users = await User.find(q).sort({ createdAt: -1 }).limit(500);
  const stats = await Order.aggregate([{ $match: { userId: { $in: users.map(u => u._id) }, status: { $ne: 'Cancelled' } } }, { $group: { _id: '$userId', orders: { $sum: 1 }, spent: { $sum: '$grandTotal' } } }]);
  const m = new Map(stats.map(x => [String(x._id), x]));
  res.json({ success: true, customers: users.map(u => ({ id: String(u._id), name: u.name, email: u.email, phone: u.phone, joinedAt: u.createdAt, orders: (m.get(String(u._id)) || {}).orders || 0, totalSpent: (m.get(String(u._id)) || {}).spent || 0 })) });
}));
router.get('/customers/:id', requirePerm('customers.view'), asyncH(async (req, res) => {
  const u = isId(req.params.id) && await User.findOne({ _id: req.params.id, role: 'customer' });
  if (!u) throw httpErr(404, 'Customer not found');
  const orders = await Order.find({ userId: u._id }).sort({ createdAt: -1 }).limit(100);
  const { orderOut } = require('./orders');
  res.json({ success: true, customer: { ...core.publicUser(u), joinedAt: u.createdAt }, orders: orders.map(o => orderOut(o, { staff: true })), totalSpent: round(orders.filter(o => o.status !== 'Cancelled').reduce((s, o) => s + o.grandTotal, 0)) });
}));

// ============================================================ REPORTS
const tz = config.timezone;
const sales = (fmt, from) => Order.aggregate([
  { $match: { status: { $ne: 'Cancelled' }, createdAt: { $gte: from } } },
  { $group: { _id: { $dateToString: { format: fmt, date: '$createdAt', timezone: tz } }, revenue: { $sum: '$grandTotal' }, orders: { $sum: 1 } } },
  { $sort: { _id: 1 } }]);
router.get('/reports/summary', requirePerm('reports.view'), asyncH(async (req, res) => {
  const day = 864e5, now = Date.now();
  const active = { status: { $ne: 'Cancelled' } };
  const [tot, pending, completed, cancelled, customers, top, recent, daily, weekly, monthly, byCategory, byPayment, bySource, growth] = await Promise.all([
    Order.aggregate([{ $match: active }, { $group: { _id: null, revenue: { $sum: '$grandTotal' }, orders: { $sum: 1 } } }]),
    Order.countDocuments({ status: 'Pending' }),
    Order.countDocuments({ status: 'Delivered' }),
    Order.countDocuments({ status: 'Cancelled' }),
    User.countDocuments({ role: 'customer' }),
    Order.aggregate([{ $match: active }, { $unwind: '$items' }, { $group: { _id: '$items.name', qty: { $sum: '$items.quantity' }, revenue: { $sum: '$items.lineTotal' } } }, { $sort: { qty: -1 } }, { $limit: 8 }]),
    Order.find().sort({ createdAt: -1 }).limit(8),
    sales('%Y-%m-%d', new Date(now - 14 * day)),
    sales('%G-W%V', new Date(now - 8 * 7 * day)),
    sales('%Y-%m', new Date(now - 365 * day)),
    Order.aggregate([{ $match: active }, { $unwind: '$items' }, { $group: { _id: '$items.category', revenue: { $sum: '$items.lineTotal' }, qty: { $sum: '$items.quantity' } } }, { $sort: { revenue: -1 } }]),
    Order.aggregate([{ $match: active }, { $group: { _id: '$paymentMethod', revenue: { $sum: '$grandTotal' }, orders: { $sum: 1 } } }]),
    Order.aggregate([{ $match: active }, { $group: { _id: '$source', revenue: { $sum: '$grandTotal' }, orders: { $sum: 1 } } }]),
    User.aggregate([{ $match: { role: 'customer' } }, { $group: { _id: { $dateToString: { format: '%Y-%m', date: '$createdAt', timezone: tz } }, customers: { $sum: 1 } } }, { $sort: { _id: 1 } }])
  ]);
  const { orderOut } = require('./orders');
  const todayKey = new Intl.DateTimeFormat('en-CA', { timeZone: tz }).format(new Date());
  const today = daily.find(d => d._id === todayKey);
  res.json({
    success: true,
    totals: { revenue: tot[0] ? tot[0].revenue : 0, orders: tot[0] ? tot[0].orders : 0, pending, completed, cancelled, customers, todayRevenue: today ? today.revenue : 0, todayOrders: today ? today.orders : 0 },
    bestSellers: top.map(t => ({ name: t._id, qty: t.qty, revenue: t.revenue })),
    recentOrders: recent.map(o => orderOut(o, { staff: true })),
    daily, weekly, monthly,
    categorySales: byCategory.map(c => ({ category: c._id || 'Other', revenue: c.revenue, qty: c.qty })),
    paymentMethods: byPayment.map(p => ({ method: p._id, revenue: p.revenue, orders: p.orders })),
    sources: bySource.map(p => ({ source: p._id, revenue: p.revenue, orders: p.orders })),
    customerGrowth: growth
  });
}));
const csvCell = (v) => { let s = String(v ?? ''); if (/^[=+\-@\t\r]/.test(s)) s = "'" + s; return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; }; // also blocks CSV formula injection
router.get('/reports/export.csv', requirePerm('reports.view'), asyncH(async (req, res) => {
  const q = {};
  const from = req.query.from && new Date(req.query.from), to = req.query.to && new Date(req.query.to);
  if (from && !isNaN(from)) q.createdAt = { ...q.createdAt, $gte: from };
  if (to && !isNaN(to)) q.createdAt = { ...q.createdAt, $lte: to };
  const orders = await Order.find(q).sort({ createdAt: -1 }).limit(20000);
  const head = ['Order', 'Date', 'Source', 'Type', 'Status', 'Customer', 'Phone', 'Items', 'Subtotal', 'Discount', 'Tax', 'Delivery', 'Total', 'Payment', 'Paid'];
  const rows = orders.map(o => [o.orderNumber, o.createdAt.toISOString(), o.source, o.orderType, o.status, o.customer.name, o.customer.phone, o.items.map(i => `${i.quantity}x ${i.name}`).join('; '), o.subtotal, o.discount, o.tax, o.deliveryFee, o.grandTotal, o.paymentMethod, o.paymentStatus]);
  res.set({ 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': 'attachment; filename="omas-orders.csv"' });
  res.send([head, ...rows].map(r => r.map(csvCell).join(',')).join('\n'));
}));

// ============================================================ STAFF
const staffOut = (u) => ({ id: String(u._id), name: u.name, email: u.email, phone: u.phone, role: u.role, active: u.active, lastLoginAt: u.lastLoginAt });
const pwOk = (p) => typeof p === 'string' && p.length >= 8 && /[A-Za-z]/.test(p) && /\d/.test(p);
router.get('/staff', requirePerm('staff.manage'), asyncH(async (req, res) => {
  res.json({ success: true, staff: (await User.find({ role: { $in: STAFF_ROLES } }).sort({ createdAt: 1 })).map(staffOut) });
}));
router.post('/staff', requirePerm('staff.manage'), asyncH(async (req, res) => {
  const name = str(req.body.name, 80), email = str(req.body.email, 120).toLowerCase(), role = req.body.role;
  if (!name || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw httpErr(400, 'Name and valid email are required');
  if (!STAFF_ROLES.includes(role)) throw httpErr(400, `Role must be one of ${STAFF_ROLES.join(', ')}`);
  if (!pwOk(req.body.password)) throw httpErr(400, 'Password must be 8+ characters with a letter and a number');
  if (await User.findOne({ email })) throw httpErr(409, 'Email already in use');
  const u = await User.create({ name, email, phone: str(req.body.phone, 30), role, passwordHash: await bcrypt.hash(req.body.password, 12) });
  res.status(201).json({ success: true, staff: staffOut(u) });
}));
router.put('/staff/:id', requirePerm('staff.manage'), asyncH(async (req, res) => {
  const u = isId(req.params.id) && await User.findOne({ _id: req.params.id, role: { $in: STAFF_ROLES } });
  if (!u) throw httpErr(404, 'Staff member not found');
  const lastSuper = async () => u.role === 'superadmin' && (await User.countDocuments({ role: 'superadmin', active: true })) <= 1;
  if (req.body.role !== undefined && req.body.role !== u.role) {
    if (!STAFF_ROLES.includes(req.body.role)) throw httpErr(400, 'Invalid role');
    if (await lastSuper()) throw httpErr(409, 'Cannot change the role of the last Super Admin');
    u.role = req.body.role; u.tokenVersion += 1;
  }
  if (req.body.active !== undefined && !!req.body.active !== u.active) {
    if (!req.body.active && (String(u._id) === String(req.user._id) || await lastSuper())) throw httpErr(409, 'Cannot deactivate yourself or the last Super Admin');
    u.active = !!req.body.active; u.tokenVersion += 1;
  }
  if (req.body.name !== undefined) u.name = str(req.body.name, 80) || u.name;
  if (req.body.phone !== undefined) u.phone = str(req.body.phone, 30);
  if (req.body.password) { if (!pwOk(req.body.password)) throw httpErr(400, 'Weak password'); u.passwordHash = await bcrypt.hash(req.body.password, 12); u.tokenVersion += 1; }
  await u.save();
  res.json({ success: true, staff: staffOut(u) });
}));
router.delete('/staff/:id', requirePerm('staff.manage'), asyncH(async (req, res) => {
  const u = isId(req.params.id) && await User.findOne({ _id: req.params.id, role: { $in: STAFF_ROLES } });
  if (!u) throw httpErr(404, 'Staff member not found');
  if (String(u._id) === String(req.user._id)) throw httpErr(409, 'You cannot delete yourself');
  if (u.role === 'superadmin' && (await User.countDocuments({ role: 'superadmin' })) <= 1) throw httpErr(409, 'Cannot delete the last Super Admin');
  await u.deleteOne();
  res.json({ success: true });
}));

module.exports = router;


