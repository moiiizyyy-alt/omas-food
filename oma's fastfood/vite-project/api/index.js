import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

const DATA_DIR = path.join(__dirname, '../data');
const MENU_FILE = path.join(DATA_DIR, 'menu.json');
const INITIAL_MENU_FILE = path.join(DATA_DIR, 'initialMenu.json');
const ORDERS_FILE = path.join(DATA_DIR, 'orders.json');
const EMAIL_LOGS_FILE = path.join(DATA_DIR, 'email_logs.json');

// In-memory fallbacks for serverless environments
let memoryMenu = null;
let memoryOrders = [];
let memoryEmailLogs = [];

// Safe read/write
function readJSON(file) {
  if (file === MENU_FILE && memoryMenu) return memoryMenu;
  if (file === ORDERS_FILE && memoryOrders && memoryOrders.length > 0) return memoryOrders;
  if (file === EMAIL_LOGS_FILE && memoryEmailLogs.length > 0) return memoryEmailLogs;

  try {
    if (fs.existsSync(file)) {
      const parsed = JSON.parse(fs.readFileSync(file, 'utf8'));
      if (file === MENU_FILE) memoryMenu = parsed;
      if (file === ORDERS_FILE) memoryOrders = parsed;
      return parsed;
    }
  } catch (err) {}

  if (file === MENU_FILE) {
    try {
      if (fs.existsSync(INITIAL_MENU_FILE)) {
        memoryMenu = JSON.parse(fs.readFileSync(INITIAL_MENU_FILE, 'utf8'));
        return memoryMenu;
      }
    } catch {}
  }
  return [];
}

function writeJSON(file, data) {
  if (file === MENU_FILE) memoryMenu = data;
  if (file === ORDERS_FILE) memoryOrders = data;
  if (file === EMAIL_LOGS_FILE) memoryEmailLogs = data;

  try {
    fs.writeFileSync(file, JSON.stringify(data, null, 2), 'utf8');
  } catch (err) {}
  return true;
}

// CORS Middleware
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-admin-auth');
  if (req.method === 'OPTIONS') return res.sendStatus(200);
  next();
});

app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ extended: true, limit: '20mb' }));

const ADMIN_EMAIL = 'admin@omas.com';
const ADMIN_PASSWORD = 'Adminofomas1';

// Health Check
app.get('/api/health', (req, res) => {
  res.json({ status: 'online', restaurant: "Oma's Pizza & Fast Food", time: new Date().toISOString() });
});

// Admin Login
app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body;
  if (email && email.trim() === ADMIN_EMAIL && password && password.trim() === ADMIN_PASSWORD) {
    return res.json({
      success: true,
      message: 'Admin authenticated successfully',
      token: 'oma_admin_session_' + Date.now(),
      admin: { email: ADMIN_EMAIL, name: "Oma's Restaurant Manager", role: 'admin' }
    });
  }
  return res.status(401).json({ success: false, message: 'Invalid email or password. Access denied.' });
});

// Get Menu Items
app.get('/api/items', (req, res) => {
  const items = readJSON(MENU_FILE);
  res.json({ success: true, count: items.length, items });
});

// Add Menu Item
app.post('/api/items', (req, res) => {
  const { name, category, price, description, image, badge, spicy, subCategory } = req.body;
  if (!name || !price || !category) {
    return res.status(400).json({ success: false, message: 'Item name, price, and category are required' });
  }

  const items = readJSON(MENU_FILE);
  const newItem = {
    id: `item-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    name: name.trim(),
    category: category.trim(),
    subCategory: subCategory ? subCategory.trim() : category.trim(),
    price: Number(price),
    rating: 5.0,
    reviews: 1,
    description: description ? description.trim() : 'Delicious freshly prepared specialty from Oma\'s kitchen.',
    image: image && image.trim() ? image.trim() : 'https://images.unsplash.com/photo-1513104890138-7c749659a591?w=600&auto=format&fit=crop&q=80',
    badge: badge ? badge.trim() : 'New',
    spicy: spicy || 'Mild',
    createdAt: new Date().toISOString()
  };

  items.unshift(newItem);
  writeJSON(MENU_FILE, items);

  res.status(201).json({ success: true, message: 'Menu item uploaded successfully!', item: newItem });
});

// Delete Menu Item
app.delete('/api/items/:id', (req, res) => {
  const { id } = req.params;
  const items = readJSON(MENU_FILE);
  const filtered = items.filter(item => item.id !== id);
  writeJSON(MENU_FILE, filtered);
  res.json({ success: true, message: 'Item removed from menu' });
});

// Place Order & Dispatch Email to moiiizyyy@gmail.com
app.post('/api/orders', async (req, res) => {
  const { customer, items, subtotal, deliveryFee, grandTotal } = req.body;

  if (!customer || !customer.name || !customer.phone || !customer.address) {
    return res.status(400).json({ success: false, message: 'Please provide Name, Phone Number, and Complete Address.' });
  }

  if (!items || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ success: false, message: 'Cart is empty.' });
  }

  const orderId = `OMA-${Math.floor(100000 + Math.random() * 900000)}`;
  const calculatedSubtotal = items.reduce((sum, item) => sum + (Number(item.price) * Number(item.quantity || 1)), 0);
  const delivery = deliveryFee !== undefined ? Number(deliveryFee) : 100;
  const total = grandTotal !== undefined ? Number(grandTotal) : calculatedSubtotal + delivery;

  const newOrder = {
    orderId,
    customer: {
      name: customer.name.trim(),
      phone: customer.phone.trim(),
      address: customer.address.trim(),
      notes: customer.notes ? customer.notes.trim() : ''
    },
    items: items.map(item => ({
      id: item.id,
      name: item.name,
      price: Number(item.price),
      quantity: Number(item.quantity) || 1,
      image: item.image || ''
    })),
    subtotal: calculatedSubtotal,
    deliveryFee: delivery,
    grandTotal: total,
    paymentMethod: 'Cash on Delivery (COD)',
    status: 'Pending',
    createdAt: new Date().toISOString()
  };

  const orders = readJSON(ORDERS_FILE);
  orders.unshift(newOrder);
  writeJSON(ORDERS_FILE, orders);

  // Dispatch live email to moiiizyyy@gmail.com via FormSubmit
  try {
    const itemsText = newOrder.items.map((item, idx) => `${idx + 1}. ${item.name} (Qty: ${item.quantity}) - Rs. ${item.price * item.quantity}`).join('\n');
    await fetch('https://formsubmit.co/ajax/moiiizyyy@gmail.com', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Referer': 'https://omas-food.vercel.app',
        'Origin': 'https://omas-food.vercel.app'
      },
      body: JSON.stringify({
        _subject: `🚨 NEW ORDER #${orderId} - Oma's Pizza & Fast Food (Rs. ${total})`,
        'Order ID': orderId,
        'Customer Name': newOrder.customer.name,
        'Phone Number': newOrder.customer.phone,
        'Delivery Address': newOrder.customer.address,
        'Special Notes': newOrder.customer.notes || 'None',
        'Ordered Items': itemsText,
        'Grand Total': `Rs. ${total}`,
        'Payment Mode': 'Cash on Delivery (COD)',
        _template: 'table',
        _captcha: 'false'
      })
    });
  } catch (err) {
    console.warn('Email dispatch warning:', err);
  }

  res.status(201).json({
    success: true,
    message: `Order #${orderId} confirmed successfully! All details sent to moiiizyyy@gmail.com`,
    order: newOrder,
    emailNotificationSentTo: 'moiiizyyy@gmail.com'
  });
});

// Get Orders
app.get('/api/orders', (req, res) => {
  const orders = readJSON(ORDERS_FILE);
  res.json({ success: true, count: orders.length, orders });
});

// Update Order Status
app.patch('/api/orders/:id/status', (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  const orders = readJSON(ORDERS_FILE);
  const order = orders.find(o => o.orderId === id || o.id === id);
  if (!order) return res.status(404).json({ success: false, message: 'Order not found' });
  order.status = status;
  writeJSON(ORDERS_FILE, orders);
  res.json({ success: true, message: `Order status updated to ${status}`, order });
});

export default app;
