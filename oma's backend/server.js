// Oma's Pizza backend. Express + MongoDB (Atlas). Real-time via Server-Sent Events.
// (The previous JSON-file server is preserved in ./legacy/server.legacy.js)
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const rateLimit = require('express-rate-limit');
const mongoose = require('mongoose');
const core = require('./src/core');
const { bootstrap } = require('./src/bootstrap');
const { Order } = require('./src/models');

const { config } = core;
const app = express();
app.set('trust proxy', 1);
app.disable('x-powered-by');

if (config.isProd && !config.jwtSecret) console.error('FATAL: JWT_SECRET must be set in production');

app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
const allowed = (origin) => {
  if (!origin || config.clientOrigins.includes(origin)) return true;
  try {
    const host = new URL(origin).hostname;
    if (!config.isProd && /^(localhost|127\.0\.0\.1|192\.168\.\d+\.\d+|10\.\d+\.\d+\.\d+|172\.(1[6-9]|2\d|3[01])\.\d+\.\d+)$/.test(host)) return true;
    return process.env.ALLOW_VERCEL_PREVIEWS === 'true' && /\.vercel\.app$/.test(host);
  } catch { return false; }
};
app.use(cors({ origin: (o, cb) => cb(null, allowed(o)), credentials: true, methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'], allowedHeaders: ['Content-Type', 'X-Requested-With'] }));
// CSRF defence for cookie auth: browsers always send Origin on cross-site writes.
app.use((req, res, next) => {
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return next();
  if (!allowed(req.headers.origin)) return res.status(403).json({ success: false, message: 'Origin not allowed' });
  next();
});
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));
app.use(cookieParser());

// Reject Mongo operator injection ({"$gt": ""}) in any body/query.
const hasOp = (v) => !!v && typeof v === 'object' && Object.keys(v).some((k) => k.startsWith('$') || hasOp(v[k]));
app.use((req, res, next) => (hasOp(req.body) || hasOp(req.query) ? res.status(400).json({ success: false, message: 'Invalid request' }) : next()));

app.use((req, res, next) => { if (!config.isProd) console.log(`[${new Date().toLocaleTimeString()}] ${req.method} ${req.url}`); next(); });
app.use('/api', rateLimit({ windowMs: 60 * 1000, limit: 300, standardHeaders: true, legacyHeaders: false, skip: (r) => r.path === '/events', message: { success: false, message: 'Too many requests' } }));

// ---- health (works without DB so deployments can be diagnosed)
app.get('/api/health', (req, res) => {
  const states = ['disconnected', 'connected', 'connecting', 'disconnecting'];
  res.json({ status: 'online', restaurant: "Oma's Pizza", time: new Date().toISOString(), version: '2.0.0',
    database: !config.mongoUri ? 'not configured (set MONGODB_URI)' : states[mongoose.connection.readyState] });
});

// ---- everything below needs the database
app.use('/api', core.dbReady, async (req, res, next) => { try { await bootstrap(); next(); } catch (e) { next(e); } }, core.attachUser);

app.use('/api/auth', require('./src/routes/auth'));
app.use('/api', require('./src/routes/catalog'));
app.use('/api', require('./src/routes/orders'));
app.use('/api', require('./src/routes/admin'));

// ---- realtime stream. Channels are decided by the server from the session, never by the client.
app.get('/api/events', core.sseHandler(async (req) => {
  const ch = ['public'];
  if (req.user) { ch.push(`user:${req.user._id}`); if (core.isStaff(req.user)) ch.push('staff'); }
  // guests may follow specific orders with the secret tracking token returned at checkout
  const pairs = String(req.query.orders || '').split(',').filter(Boolean).slice(0, 10);
  for (const p of pairs) {
    const [num, token] = p.split(':');
    const o = num && token && await Order.findOne({ orderNumber: String(num) }).select('+trackingToken');
    if (o && o.trackingToken === token) ch.push(`order:${o.orderNumber}`);
  }
  return ch;
}));

app.use('/api', (req, res) => res.status(404).json({ success: false, message: 'Endpoint not found' }));

// ---- error handler: no stack traces or secrets leak to clients
app.use((err, req, res, next) => {
  if (res.headersSent) return next(err);
  let status = err.status || 500, message = err.expose || status < 500 ? err.message : 'Something went wrong';
  if (err.name === 'ValidationError') { status = 400; message = Object.values(err.errors).map(e => e.message).join(', '); }
  else if (err.name === 'CastError') { status = 400; message = 'Invalid value'; }
  else if (err.code === 11000) { status = 409; message = 'Duplicate value'; }
  else if (err.code === 'LIMIT_FILE_SIZE') { status = 413; message = 'File too large (max 4 MB)'; }
  else if (err.type === 'entity.parse.failed') { status = 400; message = 'Malformed JSON'; }
  else if (err.type === 'entity.too.large') { status = 413; message = 'Request too large'; }
  if (status >= 500 && !['DB_NOT_CONFIGURED', 'DB_UNAVAILABLE'].includes(err.code)) console.error(`[error] ${req.method} ${req.originalUrl}:`, err.stack || err);
  res.status(status).json({ success: false, message, ...(['DB_NOT_CONFIGURED', 'DB_UNAVAILABLE'].includes(err.code) ? { code: err.code } : {}) });
});

if (!process.env.VERCEL && require.main === module) {
  const server = app.listen(config.port, '0.0.0.0', () => {
    console.log(`Oma's Pizza API listening on :${config.port}  (${config.isProd ? 'production' : 'development'})`);
    if (!config.mongoUri) console.warn('MONGODB_URI is not set - API will answer 503 until it is configured. See .env.example');
    else core.connectDb().then(bootstrap).catch(() => {});
  });
  process.on('SIGTERM', () => server.close(() => mongoose.connection.close().then(() => process.exit(0))));
}

module.exports = app;
