// Orders (online + POS share one collection) and coupons.
const express = require('express');
const rateLimit = require('express-rate-limit');
const { Order, Product, Coupon, ORDER_STATUSES } = require('../models');
const core = require('../core');
const { sendMail } = require('../mail');
const { asyncH, httpErr, str, isId, requirePerm, broadcast, round, can, isStaff } = core;

const router = express.Router();
const orderLimiter = rateLimit({ windowMs: 10 * 60 * 1000, limit: 120, standardHeaders: true, legacyHeaders: false, message: { success: false, message: 'Too many orders from this connection, please wait a moment' } });

// -------------------------------------------------- coupons
function couponDiscount(c, subtotal) {
  let d = c.type === 'percentage' ? subtotal * c.value / 100 : c.value;
  if (c.type === 'percentage' && c.maxDiscount) d = Math.min(d, c.maxDiscount);
  return round(Math.min(d, subtotal));
}
function couponProblem(c, subtotal) {
  if (!c || !c.active) return 'Invalid coupon code';
  if (c.expiresAt && c.expiresAt < new Date()) return 'This coupon has expired';
  if (c.usageLimit && c.usedCount >= c.usageLimit) return 'This coupon has reached its usage limit';
  if (subtotal < c.minOrder) return `Minimum order for this coupon is Rs. ${c.minOrder}`;
  return null;
}
router.post('/coupons/validate', asyncH(async (req, res) => {
  const code = str(req.body.code, 30).toUpperCase();
  const subtotal = Number(req.body.subtotal) || 0;
  const c = await Coupon.findOne({ code });
  const problem = couponProblem(c, subtotal);
  if (problem) return res.status(400).json({ success: false, message: problem });
  res.json({ success: true, code: c.code, type: c.type, value: c.value, discount: couponDiscount(c, subtotal), description: c.description });
}));
router.get('/coupons/public', asyncH(async (req, res) => {
  const now = new Date();
  const list = await Coupon.find({ public: true, active: true, $or: [{ expiresAt: null }, { expiresAt: { $gt: now } }] }).select('code description type value minOrder expiresAt');
  res.json({ success: true, coupons: list });
}));
router.get('/coupons', requirePerm('coupons.manage'), asyncH(async (req, res) => {
  res.json({ success: true, coupons: await Coupon.find().sort({ createdAt: -1 }) });
}));
function couponBody(b, partial) {
  const d = {};
  if (!partial || b.code !== undefined) { d.code = str(b.code, 30).toUpperCase(); if (!/^[A-Z0-9_-]{3,30}$/.test(d.code)) throw httpErr(400, 'Code must be 3-30 letters/numbers'); }
  if (!partial || b.type !== undefined) { if (!['percentage', 'fixed'].includes(b.type)) throw httpErr(400, 'Type must be percentage or fixed'); d.type = b.type; }
  if (!partial || b.value !== undefined) { const v = Number(b.value); if (!isFinite(v) || v <= 0) throw httpErr(400, 'Value must be positive'); d.value = v; }
  if ((d.type === 'percentage' || b.type === 'percentage') && d.value > 100) throw httpErr(400, 'Percentage cannot exceed 100');
  for (const k of ['minOrder', 'usageLimit', 'maxDiscount']) if (b[k] !== undefined) d[k] = b[k] === '' || b[k] === null ? (k === 'maxDiscount' ? null : 0) : Math.max(0, Number(b[k]) || 0);
  if (b.expiresAt !== undefined) d.expiresAt = b.expiresAt ? new Date(b.expiresAt) : null;
  if (b.description !== undefined) d.description = str(b.description, 200);
  if (b.active !== undefined) d.active = !!b.active;
  if (b.public !== undefined) d.public = !!b.public;
  return d;
}
router.post('/coupons', requirePerm('coupons.manage'), asyncH(async (req, res) => {
  let c; try { c = await Coupon.create(couponBody(req.body, false)); } catch (e) { if (e.code === 11000) throw httpErr(409, 'Coupon code already exists'); throw e; }
  broadcast('public', 'coupons:updated', {});
  res.status(201).json({ success: true, coupon: c });
}));
router.put('/coupons/:id', requirePerm('coupons.manage'), asyncH(async (req, res) => {
  if (!isId(req.params.id)) throw httpErr(404, 'Coupon not found');
  let c; try { c = await Coupon.findByIdAndUpdate(req.params.id, couponBody(req.body, true), { returnDocument: 'after', runValidators: true }); } catch (e) { if (e.code === 11000) throw httpErr(409, 'Coupon code already exists'); throw e; }
  if (!c) throw httpErr(404, 'Coupon not found');
  broadcast('public', 'coupons:updated', {});
  res.json({ success: true, coupon: c });
}));
router.delete('/coupons/:id', requirePerm('coupons.manage'), asyncH(async (req, res) => {
  if (!isId(req.params.id)) throw httpErr(404, 'Coupon not found');
  if (!(await Coupon.findByIdAndDelete(req.params.id))) throw httpErr(404, 'Coupon not found');
  broadcast('public', 'coupons:updated', {});
  res.json({ success: true });
}));

// -------------------------------------------------- order output
function orderOut(o, { staff = false } = {}) {
  const x = o.toObject ? o.toObject() : o;
  const out = {
    id: String(x._id), orderId: x.orderNumber, orderNumber: x.orderNumber, source: x.source, orderType: x.orderType,
    tableNumber: x.tableNumber, status: x.status, statusHistory: x.statusHistory, items: x.items,
    subtotal: x.subtotal, discount: x.discount, couponCode: x.couponCode, taxRate: x.taxRate, tax: x.tax, deliveryFee: x.deliveryFee,
    grandTotal: x.grandTotal, paymentMethod: x.paymentMethod, paymentStatus: x.paymentStatus, customer: x.customer,
    createdAt: x.createdAt, updatedAt: x.updatedAt
  };
  if (staff) { out.userId = x.userId ? String(x.userId) : null; out.amountTendered = x.amountTendered; }
  return out;
}
const lookup = (id) => (isId(id) ? { $or: [{ _id: id }, { orderNumber: id }] } : { orderNumber: id });

// -------------------------------------------------- create order
const PAYMENT_FOR = { delivery: 'cash_on_delivery', pickup: 'cash_at_pickup', 'dine-in': 'cash_dine_in' };

router.post('/orders', orderLimiter, asyncH(async (req, res) => {
  const b = req.body || {};
  const isPos = b.source === 'pos';
  if (isPos && !can(req.user, 'pos.create')) throw httpErr(req.user ? 403 : 401, 'POS orders require staff login');

  const cust = b.customer || {};
  const customer = {
    name: str(cust.name, 80), phone: str(cust.phone, 30), email: str(cust.email, 120),
    address: str(cust.address, 300), city: str(cust.city, 80), area: str(cust.area, 80), notes: str(cust.notes || b.notes, 500)
  };
  const orderType = ['delivery', 'pickup', 'dine-in'].includes(b.orderType) ? b.orderType : (isPos ? 'pickup' : 'delivery');
  if (isPos && !customer.name) customer.name = 'Walk-in Customer';
  if (isPos && !customer.phone) customer.phone = '-';
  if (!customer.name || !customer.phone) throw httpErr(400, 'Please provide your name and phone number.');
  if (orderType === 'delivery' && !customer.address) throw httpErr(400, 'A delivery address is required for delivery orders.');
  if (!isPos && customer.phone.replace(/\D/g, '').length < 7) throw httpErr(400, 'Please enter a valid phone number.');
  if (!Array.isArray(b.items) || b.items.length === 0) throw httpErr(400, 'Cart is empty. Please add items to order.');
  if (b.items.length > 50) throw httpErr(400, 'Too many items in one order');

  // idempotency (prevents double submits)
  const key = str(b.idempotencyKey, 80) || undefined;
  if (key) {
    const dup = await Order.findOne({ idempotencyKey: key });
    if (dup) return res.status(200).json({ success: true, duplicate: true, message: `Order #${dup.orderNumber} was already placed`, order: orderOut(dup) });
  }

  const settings = await core.getSettings();

  // Re-price every line from the database. Client prices are ignored.
  const lines = [];
  for (const it of b.items) {
    const qty = Math.floor(Number(it.quantity));
    if (!(qty >= 1 && qty <= 50)) throw httpErr(400, 'Invalid quantity');
    const ref = String(it.productId || it.id || '');
    const p = isId(ref) ? await Product.findById(ref).populate('categoryId', 'name') : await Product.findOne({ legacyId: ref }).populate('categoryId', 'name');
    if (!p) throw httpErr(400, `"${str(it.name, 60) || 'An item'}" is no longer on the menu. Please refresh your cart.`);
    if (!p.available) throw httpErr(409, `"${p.name}" is currently unavailable.`);
    const price = core.unitPrice(p, { size: it.size, toppings: Array.isArray(it.toppings) ? it.toppings : [], cheese: it.cheese });
    lines.push({
      productId: p._id, name: p.name, image: p.image, category: p.categoryId ? p.categoryId.name : '',
      size: price.size, toppings: price.toppings, cheese: price.cheese, instructions: str(it.instructions, 300),
      unitPrice: price.unit, quantity: qty, lineTotal: round(price.unit * qty)
    });
  }
  const subtotal = round(lines.reduce((s, l) => s + l.lineTotal, 0));
  if (!isPos && subtotal < settings.minimumOrder) throw httpErr(400, `Minimum order is Rs. ${settings.minimumOrder}`);

  // discounts
  let discount = 0, couponCode = '', couponDoc = null;
  const code = str(b.couponCode, 30).toUpperCase();
  if (code) {
    const c = await Coupon.findOne({ code });
    const problem = couponProblem(c, subtotal);
    if (problem) throw httpErr(400, problem);
    discount += couponDiscount(c, subtotal); couponCode = c.code; couponDoc = c;
  }
  if (isPos && b.manualDiscount) {
    const md = b.manualDiscount, v = Math.max(0, Number(md.value) || 0);
    const d = md.type === 'percentage' ? subtotal * Math.min(v, 100) / 100 : v;
    discount += d;
  }
  discount = round(Math.min(discount, subtotal));
  const taxable = subtotal - discount;
  const taxRate = isPos && b.taxRate !== undefined ? Math.min(Math.max(Number(b.taxRate) || 0, 0), 30) : settings.taxRate;
  const tax = round(taxable * taxRate / 100);
  let deliveryFee = 0;
  if (orderType === 'delivery' && !(settings.freeDeliveryOver > 0 && subtotal >= settings.freeDeliveryOver)) deliveryFee = settings.deliveryFee;
  const grandTotal = round(taxable + tax + deliveryFee);

  // atomically consume one coupon use
  if (couponDoc) {
    const q = { _id: couponDoc._id, active: true };
    if (couponDoc.usageLimit) q.usedCount = { $lt: couponDoc.usageLimit };
    if (!(await Coupon.findOneAndUpdate(q, { $inc: { usedCount: 1 } }))) throw httpErr(400, 'This coupon has reached its usage limit');
  }

  const trackingToken = !isPos && !req.user ? core.newToken() : undefined;
  let order;
  try {
    order = await Order.create({
      orderNumber: await core.nextOrderNumber(),
      source: isPos ? 'pos' : 'online',
      userId: !isPos && req.user ? req.user._id : (isPos && isId(b.customerId) ? b.customerId : undefined),
      customer, orderType, tableNumber: str(b.tableNumber, 20), items: lines, subtotal, discount, couponCode, taxRate, tax, deliveryFee, grandTotal,
      paymentMethod: isPos ? 'cash' : PAYMENT_FOR[orderType],
      paymentStatus: isPos ? 'paid' : 'unpaid',
      amountTendered: isPos && b.amountTendered !== undefined ? Number(b.amountTendered) || undefined : undefined,
      status: isPos ? 'Confirmed' : 'Pending',
      statusHistory: [{ status: isPos ? 'Confirmed' : 'Pending', by: isPos ? req.user.email : 'customer' }],
      trackingToken, idempotencyKey: key, createdBy: isPos ? req.user._id : undefined
    });
  } catch (e) {
    if (couponDoc) await Coupon.updateOne({ _id: couponDoc._id }, { $inc: { usedCount: -1 } });
    if (e.code === 11000 && key) {
      const dup = await Order.findOne({ idempotencyKey: key });
      if (dup) return res.status(200).json({ success: true, duplicate: true, order: orderOut(dup) });
    }
    throw e;
  }

  broadcast('staff', 'order:new', { order: orderOut(order, { staff: true }) });
  notifyOwner(order).catch(() => {});

  res.status(201).json({
    success: true, message: `Order #${order.orderNumber} placed successfully!`,
    order: orderOut(order), trackingToken
  });
}));

async function notifyOwner(order) {
  const to = core.config.notificationEmail || 'moiiizyyy@gmail.com';
  const items = order.items.map((i, n) => `${n + 1}. ${i.name}${i.size ? ' (' + i.size + ')' : ''} x${i.quantity} - Rs. ${i.lineTotal}`).join('\n');
  const fullAddr = [order.customer.address, order.customer.area, order.customer.city].filter(Boolean).join(', ') || 'Pickup / Dine-in';
  await sendMail({
    to,
    subject: `NEW ORDER #${order.orderNumber} - Oma's Pizza (Rs. ${order.grandTotal})`,
    text: `Order ${order.orderNumber} [${order.orderType}]\nCustomer: ${order.customer.name}\nPhone: ${order.customer.phone}\nEmail: ${order.customer.email || '-'}\nAddress: ${fullAddr}\nNotes: ${order.customer.notes || 'None'}\n\n${items}\n\nSubtotal: Rs. ${order.subtotal}\nDelivery: Rs. ${order.deliveryFee}\nDiscount: Rs. ${order.discount}\nGRAND TOTAL: Rs. ${order.grandTotal}\nPayment: ${order.paymentMethod}`,
    fields: {
      'Order Number': order.orderNumber,
      'Order Type': order.orderType,
      'Customer Name': order.customer.name,
      'Phone / Contact': order.customer.phone,
      'Customer Email': order.customer.email || '-',
      'Full Address': fullAddr,
      'Special Notes': order.customer.notes || 'None',
      'Ordered Items': items,
      Subtotal: `Rs. ${order.subtotal}`,
      'Delivery Fee': `Rs. ${order.deliveryFee}`,
      Discount: `Rs. ${order.discount}`,
      'Grand Total': `Rs. ${order.grandTotal}`,
      'Payment Method': order.paymentMethod
    }
  });
}

// -------------------------------------------------- reads
router.get('/orders', requirePerm('orders.view'), asyncH(async (req, res) => {
  const q = {};
  if (req.query.status && ORDER_STATUSES.includes(req.query.status)) q.status = req.query.status;
  if (['online', 'pos'].includes(req.query.source)) q.source = req.query.source;
  if (['delivery', 'pickup', 'dine-in'].includes(req.query.type)) q.orderType = req.query.type;
  const from = req.query.from && new Date(req.query.from), to = req.query.to && new Date(req.query.to);
  if (from && !isNaN(from)) q.createdAt = { ...q.createdAt, $gte: from };
  if (to && !isNaN(to)) q.createdAt = { ...q.createdAt, $lte: to };
  const s = str(String(req.query.q || ''), 60);
  if (s) { const rx = new RegExp(s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i'); q.$or = [{ orderNumber: rx }, { 'customer.name': rx }, { 'customer.phone': rx }]; }
  const limit = Math.min(Number(req.query.limit) || 100, 500), page = Math.max(Number(req.query.page) || 1, 1);
  const [orders, total] = await Promise.all([Order.find(q).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit), Order.countDocuments(q)]);
  res.json({ success: true, count: orders.length, total, orders: orders.map(o => orderOut(o, { staff: true })) });
}));

router.get('/orders/mine', core.requireAuth, asyncH(async (req, res) => {
  const orders = await Order.find({ userId: req.user._id }).sort({ createdAt: -1 }).limit(100);
  res.json({ success: true, orders: orders.map(o => orderOut(o)) });
}));

router.get('/orders/track/:num', asyncH(async (req, res) => {
  const o = await Order.findOne({ orderNumber: str(req.params.num, 30) }).select('+trackingToken');
  const token = str(String(req.query.token || ''), 80);
  const owner = req.user && o && o.userId && String(o.userId) === String(req.user._id);
  const guest = o && o.trackingToken && token && token === o.trackingToken;
  if (!o || !(owner || guest || (req.user && isStaff(req.user)))) throw httpErr(404, 'Order not found');
  res.json({ success: true, order: orderOut(o) });
}));

router.get('/orders/:id', core.requireAuth, asyncH(async (req, res) => {
  const o = await Order.findOne(lookup(req.params.id));
  const owner = o && o.userId && String(o.userId) === String(req.user._id);
  if (!o || !(owner || can(req.user, 'orders.view'))) throw httpErr(404, 'Order not found'); // 404, never reveal others' orders
  res.json({ success: true, order: orderOut(o, { staff: isStaff(req.user) }) });
}));

// -------------------------------------------------- status updates
const KITCHEN_OK = ['Preparing', 'Ready for Pickup', 'Out for Delivery'];
async function applyStatus(o, status, by) {
  o.status = status;
  o.statusHistory.push({ status, by });
  if (status === 'Delivered') o.paymentStatus = 'paid';
  await o.save();
  const payload = { orderNumber: o.orderNumber, id: String(o._id), status, updatedAt: o.updatedAt, paymentStatus: o.paymentStatus };
  broadcast('staff', 'order:status', { order: orderOut(o, { staff: true }) });
  broadcast(`order:${o.orderNumber}`, 'order:status', payload);
  if (o.userId) broadcast(`user:${o.userId}`, 'order:status', payload);
}
router.patch('/orders/:id/status', requirePerm('orders.status'), asyncH(async (req, res) => {
  const status = str(req.body.status, 30);
  if (!status) throw httpErr(400, 'Status is required');
  if (!ORDER_STATUSES.includes(status)) throw httpErr(400, `Status must be one of: ${ORDER_STATUSES.join(', ')}`);
  const o = await Order.findOne(lookup(req.params.id));
  if (!o) throw httpErr(404, 'Order not found');
  const role = req.user.role;
  if (role === 'kitchen' && !KITCHEN_OK.includes(status)) throw httpErr(403, 'Kitchen staff can only mark orders Preparing / Ready / Out for Delivery');
  if (status === 'Cancelled' && !can(req.user, 'orders.cancel')) throw httpErr(403, 'You cannot cancel orders');
  if (['Delivered', 'Cancelled'].includes(o.status) && !['superadmin', 'manager'].includes(role)) throw httpErr(409, `Order is already ${o.status}`);
  if (status === 'Out for Delivery' && o.orderType !== 'delivery') throw httpErr(400, 'Only delivery orders can be Out for Delivery');
  if (status === 'Ready for Pickup' && o.orderType === 'delivery') throw httpErr(400, 'Delivery orders are not marked Ready for Pickup');
  await applyStatus(o, status, req.user.email);
  res.json({ success: true, message: `Order status updated to ${status}`, order: orderOut(o, { staff: true }) });
}));

// Customer can cancel their own order while it is still Pending.
router.post('/orders/:id/cancel', core.requireAuth, asyncH(async (req, res) => {
  const o = await Order.findOne(lookup(req.params.id));
  if (!o || !o.userId || String(o.userId) !== String(req.user._id)) throw httpErr(404, 'Order not found');
  if (o.status !== 'Pending') throw httpErr(409, 'Only pending orders can be cancelled. Please call the restaurant.');
  await applyStatus(o, 'Cancelled', 'customer');
  res.json({ success: true, order: orderOut(o) });
}));

module.exports = router;
module.exports.orderOut = orderOut;

