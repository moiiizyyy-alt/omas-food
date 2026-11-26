const express = require('express');
const bcrypt = require('bcryptjs');
const rateLimit = require('express-rate-limit');
const { User } = require('../models');
const core = require('../core');
const { sendMail } = require('../mail');
const { asyncH, httpErr, str, setSession, clearSession, requireAuth, publicUser, config } = core;

const router = express.Router();
const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 30, standardHeaders: true, legacyHeaders: false, message: { success: false, message: 'Too many attempts, try again later' } });

const emailOk = (e) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);
const pwOk = (p) => typeof p === 'string' && p.length >= 8 && p.length <= 100 && /[A-Za-z]/.test(p) && /\d/.test(p);

router.post('/register', authLimiter, asyncH(async (req, res) => {
  const name = str(req.body.name, 80), email = str(req.body.email, 120).toLowerCase(), phone = str(req.body.phone, 30);
  const password = req.body.password;
  if (!name) throw httpErr(400, 'Name is required');
  if (!emailOk(email)) throw httpErr(400, 'A valid email is required');
  if (!pwOk(password)) throw httpErr(400, 'Password must be at least 8 characters and contain a letter and a number');
  if (await User.findOne({ email })) throw httpErr(409, 'An account with this email already exists');
  const user = await User.create({ name, email, phone, passwordHash: await bcrypt.hash(password, 12), role: 'customer' });
  setSession(res, user);
  res.status(201).json({ success: true, user: publicUser(user) });
}));

// Single login for customers and staff. Response keeps the legacy `admin` field for old clients.
router.post('/login', authLimiter, asyncH(async (req, res) => {
  const email = str(req.body.email, 120).toLowerCase(), password = typeof req.body.password === 'string' ? req.body.password : '';
  if (!email || !password) throw httpErr(400, 'Email and password are required');
  const user = await User.findOne({ email }).select('+passwordHash');
  const ok = user && user.active && await bcrypt.compare(password, user.passwordHash);
  if (!ok) throw httpErr(401, 'Invalid email or password');
  user.lastLoginAt = new Date();
  await user.save();
  setSession(res, user);
  const pu = publicUser(user);
  res.json({ success: true, message: 'Logged in', user: pu, admin: core.isStaff(user) ? { email: user.email, name: user.name, role: user.role } : undefined });
}));

router.post('/logout', (req, res) => { clearSession(res); res.json({ success: true }); });

router.get('/me', (req, res) => {
  if (!req.user) return res.json({ success: true, user: null });
  res.json({ success: true, user: publicUser(req.user) });
});

router.patch('/me', requireAuth, asyncH(async (req, res) => {
  const u = req.user;
  if (req.body.name !== undefined) { const n = str(req.body.name, 80); if (!n) throw httpErr(400, 'Name cannot be empty'); u.name = n; }
  if (req.body.phone !== undefined) u.phone = str(req.body.phone, 30);
  if (req.body.email !== undefined) {
    const e = str(req.body.email, 120).toLowerCase();
    if (!emailOk(e)) throw httpErr(400, 'Invalid email');
    if (e !== u.email && await User.findOne({ email: e })) throw httpErr(409, 'Email already in use');
    u.email = e;
  }
  await u.save();
  res.json({ success: true, user: publicUser(u) });
}));

router.post('/me/addresses', requireAuth, asyncH(async (req, res) => {
  const address = str(req.body.address, 300);
  if (!address) throw httpErr(400, 'Address is required');
  if (req.user.addresses.length >= 10) throw httpErr(400, 'Maximum 10 saved addresses');
  req.user.addresses.push({ label: str(req.body.label, 40) || 'Home', address, city: str(req.body.city, 80), area: str(req.body.area, 80), instructions: str(req.body.instructions, 300) });
  await req.user.save();
  res.status(201).json({ success: true, user: publicUser(req.user) });
}));

router.delete('/me/addresses/:id', requireAuth, asyncH(async (req, res) => {
  req.user.addresses.pull({ _id: req.params.id });
  await req.user.save();
  res.json({ success: true, user: publicUser(req.user) });
}));

// Server-side cart so it follows the customer across devices (only product refs + options; prices are always recomputed).
router.get('/me/cart', requireAuth, (req, res) => res.json({ success: true, cart: req.user.cart || [] }));
router.put('/me/cart', requireAuth, asyncH(async (req, res) => {
  const list = Array.isArray(req.body.cart) ? req.body.cart.slice(0, 50) : [];
  req.user.cart = list.map(i => ({
    productId: str(String(i.productId || ''), 40), quantity: Math.min(Math.max(Math.floor(Number(i.quantity)) || 1, 1), 50),
    size: str(i.size, 60), toppings: (Array.isArray(i.toppings) ? i.toppings : []).slice(0, 20).map(t => str(t, 60)), cheese: str(i.cheese, 60), instructions: str(i.instructions, 300)
  })).filter(i => i.productId);
  await req.user.save();
  res.json({ success: true });
}));

router.post('/change-password', requireAuth, authLimiter, asyncH(async (req, res) => {
  const u = await User.findById(req.user._id).select('+passwordHash');
  if (!(await bcrypt.compare(String(req.body.currentPassword || ''), u.passwordHash))) throw httpErr(401, 'Current password is incorrect');
  if (!pwOk(req.body.newPassword)) throw httpErr(400, 'New password must be at least 8 characters with a letter and a number');
  u.passwordHash = await bcrypt.hash(req.body.newPassword, 12);
  u.tokenVersion += 1; // log out every other device
  await u.save();
  setSession(res, u);
  res.json({ success: true, message: 'Password changed' });
}));

// Forgot password: always answers the same way so emails cannot be enumerated.
router.post('/forgot-password', authLimiter, asyncH(async (req, res) => {
  const email = str(req.body.email, 120).toLowerCase();
  const user = emailOk(email) ? await User.findOne({ email }) : null;
  const out = { success: true, message: 'If that email is registered, a reset link has been sent.' };
  if (user && user.active) {
    const token = core.newToken();
    user.resetTokenHash = core.sha(token);
    user.resetTokenExpires = new Date(Date.now() + 3600 * 1000);
    await user.save();
    const link = `${config.clientOrigins[0]}/?reset=${token}`;
    const sent = await sendMail({ to: user.email, subject: "Reset your Oma's Pizza password", text: `Reset your password (valid 1 hour):\n${link}` });
    if (!sent && !config.isProd) out.devResetLink = link; // dev convenience only; never in production
  }
  res.json(out);
}));

router.post('/reset-password', authLimiter, asyncH(async (req, res) => {
  const token = str(req.body.token, 100);
  if (!pwOk(req.body.password)) throw httpErr(400, 'Password must be at least 8 characters with a letter and a number');
  const user = await User.findOne({ resetTokenHash: core.sha(token), resetTokenExpires: { $gt: new Date() } }).select('+passwordHash +resetTokenHash +resetTokenExpires');
  if (!token || !user) throw httpErr(400, 'Reset link is invalid or expired');
  user.passwordHash = await bcrypt.hash(req.body.password, 12);
  user.resetTokenHash = undefined; user.resetTokenExpires = undefined;
  user.tokenVersion += 1;
  await user.save();
  res.json({ success: true, message: 'Password updated. You can now log in.' });
}));

module.exports = router;

