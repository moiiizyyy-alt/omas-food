import express from 'express';
import { DEFAULT_MENU } from '../src/data/defaultMenu.js';

const app = express();

// In-memory persistent cache for serverless environment
let memoryMenu = [...DEFAULT_MENU];
let memoryOrders = [];

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
  res.json({ success: true, count: memoryMenu.length, items: memoryMenu });
});

// Add Menu Item
app.post('/api/items', (req, res) => {
  const { name, category, price, description, image, badge, spicy, subCategory } = req.body;
  if (!name || !price || !category) {
    return res.status(400).json({ success: false, message: 'Item name, price, and category are required' });
  }

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

  memoryMenu.unshift(newItem);

  res.status(201).json({ success: true, message: 'Menu item uploaded successfully!', item: newItem });
});

// Delete Menu Item
app.delete('/api/items/:id', (req, res) => {
  const { id } = req.params;
  memoryMenu = memoryMenu.filter(item => item.id !== id);
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

  memoryOrders.unshift(newOrder);

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
  res.json({ success: true, count: memoryOrders.length, orders: memoryOrders });
});

// Update Order Status
app.patch('/api/orders/:id/status', (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  const order = memoryOrders.find(o => o.orderId === id || o.id === id);
  if (!order) return res.status(404).json({ success: false, message: 'Order not found' });
  order.status = status;
  res.json({ success: true, message: `Order status updated to ${status}`, order });
});

export default app;
