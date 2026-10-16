const express = require('express');
const fs = require('fs');
const path = require('path');
const http = require('http');

const app = express();
const PORT = process.env.PORT || 5000;

// Paths for database files
const DATA_DIR = path.join(__dirname, 'data');
const MENU_FILE = path.join(DATA_DIR, 'menu.json');
const INITIAL_MENU_FILE = path.join(DATA_DIR, 'initialMenu.json');
const ORDERS_FILE = path.join(DATA_DIR, 'orders.json');
const EMAIL_LOGS_FILE = path.join(DATA_DIR, 'email_logs.json');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Initialize Menu File if not present
if (!fs.existsSync(MENU_FILE)) {
  if (fs.existsSync(INITIAL_MENU_FILE)) {
    fs.copyFileSync(INITIAL_MENU_FILE, MENU_FILE);
  } else {
    fs.writeFileSync(MENU_FILE, JSON.stringify([], null, 2));
  }
}

// Initialize Orders and Email Logs
if (!fs.existsSync(ORDERS_FILE)) {
  fs.writeFileSync(ORDERS_FILE, JSON.stringify([], null, 2));
}
if (!fs.existsSync(EMAIL_LOGS_FILE)) {
  fs.writeFileSync(EMAIL_LOGS_FILE, JSON.stringify([], null, 2));
}

// Helpers to read/write JSON
function readJSON(file) {
  try {
    const raw = fs.readFileSync(file, 'utf8');
    return JSON.parse(raw);
  } catch (err) {
    console.error(`Error reading ${file}:`, err);
    return [];
  }
}

function writeJSON(file, data) {
  try {
    fs.writeFileSync(file, JSON.stringify(data, null, 2), 'utf8');
    return true;
  } catch (err) {
    console.error(`Error writing ${file}:`, err);
    return false;
  }
}

// Middleware: CORS for all clients (including Vite dev server & production)
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-admin-auth');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

// JSON body parser with generous limit for images (Base64/Data URLs)
app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ extended: true, limit: '20mb' }));

// Request Logger
app.use((req, res, next) => {
  console.log(`[${new Date().toLocaleTimeString()}] ${req.method} ${req.url}`);
  next();
});

// Admin credentials
const ADMIN_EMAIL = 'admin@omas.com';
const ADMIN_PASSWORD = 'Adminofomas1';

// -------------------------------------------------------------
// 1. HEALTH CHECK
// -------------------------------------------------------------
app.get('/api/health', (req, res) => {
  res.json({
    status: 'online',
    restaurant: "Oma's Pizza & Fast Food",
    time: new Date().toISOString(),
    version: '1.0.0'
  });
});

// -------------------------------------------------------------
// 2. ADMIN AUTHENTICATION
// -------------------------------------------------------------
app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ success: false, message: 'Email and password are required' });
  }

  if (email.trim() === ADMIN_EMAIL && password.trim() === ADMIN_PASSWORD) {
    return res.json({
      success: true,
      message: 'Admin authenticated successfully',
      token: 'oma_admin_session_' + Date.now(),
      admin: {
        email: ADMIN_EMAIL,
        name: "Oma's Restaurant Manager",
        role: 'admin'
      }
    });
  }

  return res.status(401).json({
    success: false,
    message: 'Invalid email or password. Access denied.'
  });
});

// -------------------------------------------------------------
// 3. MENU ITEMS APIS (GET, POST, PUT, DELETE)
// -------------------------------------------------------------

// Get all menu items
app.get('/api/items', (req, res) => {
  const items = readJSON(MENU_FILE);
  res.json({
    success: true,
    count: items.length,
    items
  });
});

// Add new menu item (Admin Upload)
app.post('/api/items', (req, res) => {
  const { name, category, price, description, image, badge, spicy, subCategory } = req.body;

  if (!name || !price || !category) {
    return res.status(400).json({
      success: false,
      message: 'Item name, price, and category are required'
    });
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

  // Add at the beginning of the list so it appears prominently
  items.unshift(newItem);
  writeJSON(MENU_FILE, items);

  console.log(`✨ New Menu Item Added: "${newItem.name}" under [${newItem.category}] - Rs. ${newItem.price}`);

  res.status(201).json({
    success: true,
    message: 'Menu item uploaded and aligned successfully!',
    item: newItem
  });
});

// Update item (Admin)
app.put('/api/items/:id', (req, res) => {
  const { id } = req.params;
  const updates = req.body;
  const items = readJSON(MENU_FILE);

  const index = items.findIndex(item => item.id === id);
  if (index === -1) {
    return res.status(404).json({ success: false, message: 'Item not found' });
  }

  items[index] = {
    ...items[index],
    ...updates,
    id: items[index].id // preserve id
  };

  writeJSON(MENU_FILE, items);
  res.json({ success: true, message: 'Item updated successfully', item: items[index] });
});

// Delete item (Admin)
app.delete('/api/items/:id', (req, res) => {
  const { id } = req.params;
  const items = readJSON(MENU_FILE);

  const filtered = items.filter(item => item.id !== id);
  if (filtered.length === items.length) {
    return res.status(404).json({ success: false, message: 'Item not found' });
  }

  writeJSON(MENU_FILE, filtered);
  res.json({ success: true, message: 'Item removed from menu' });
});

// -------------------------------------------------------------
// 4. ORDERS & EMAIL NOTIFICATION TO moiiizyyy@gmail.com
// -------------------------------------------------------------

// Helper function to send email notification
async function dispatchOrderEmail(order) {
  const recipientEmail = 'moiiizyyy@gmail.com';
  const timestamp = new Date(order.createdAt).toLocaleString('en-US', { timeZone: 'Asia/Karachi' });

  // Format Item List
  const itemsText = order.items.map((item, idx) => {
    return `${idx + 1}. ${item.name} (Qty: ${item.quantity}) - Rs. ${item.price * item.quantity}`;
  }).join('\n');

  const emailSubject = `🚨 NEW ORDER #${order.orderId} - Oma's Pizza & Fast Food (Rs. ${order.grandTotal})`;

  const emailBodyText = `
======================================================
  OMA'S PIZZA & FAST FOOD - NEW ORDER RECEIVED
======================================================

Order ID      : ${order.orderId}
Order Date    : ${timestamp}
Payment Method: ${order.paymentMethod}
Order Status  : ${order.status}

------------------ CUSTOMER DETAILS ------------------
Customer Name : ${order.customer.name}
Phone Number  : ${order.customer.phone}
Address       : ${order.customer.address}
Special Notes : ${order.customer.notes || 'None'}

-------------------- ORDER ITEMS ---------------------
${itemsText}

------------------------------------------------------
Subtotal      : Rs. ${order.subtotal}
Delivery Fee  : Rs. ${order.deliveryFee}
GRAND TOTAL   : Rs. ${order.grandTotal}
======================================================
  `;

  // Log in terminal
  console.log(`\n======================================================`);
  console.log(`📩 DISPATCHING REAL EMAIL NOTIFICATION TO: ${recipientEmail}`);
  console.log(emailBodyText);
  console.log(`======================================================\n`);

  // Record into email_logs.json
  const emailLogEntry = {
    orderId: order.orderId,
    recipient: recipientEmail,
    subject: emailSubject,
    sentAt: new Date().toISOString(),
    customer: order.customer,
    grandTotal: order.grandTotal,
    status: 'Dispatched'
  };

  const emailLogs = readJSON(EMAIL_LOGS_FILE);
  emailLogs.unshift(emailLogEntry);
  writeJSON(EMAIL_LOGS_FILE, emailLogs);

  // 1. LIVE DIRECT DISPATCH via FormSubmit HTTP Service to moiiizyyy@gmail.com
  try {
    const https = require('https');
    const postPayload = JSON.stringify({
      _subject: emailSubject,
      'Order ID': order.orderId,
      'Customer Name': order.customer.name,
      'Phone Number': order.customer.phone,
      'Delivery Address': order.customer.address,
      'Special Notes': order.customer.notes || 'None',
      'Ordered Items': itemsText,
      'Subtotal': `Rs. ${order.subtotal}`,
      'Delivery Fee': `Rs. ${order.deliveryFee}`,
      'Grand Total': `Rs. ${order.grandTotal}`,
      'Payment Mode': order.paymentMethod,
      _template: 'table',
      _captcha: 'false'
    });

    const options = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Referer': 'http://localhost:5173/',
        'Origin': 'http://localhost:5173'
      }
    };

    const req = https.request(`https://formsubmit.co/ajax/${recipientEmail}`, options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        console.log(`📬 [FormSubmit Response for ${recipientEmail}]: Status ${res.statusCode} -> ${data}`);
      });
    });

    req.on('error', (err) => {
      console.warn('FormSubmit dispatch warning:', err.message);
    });

    req.write(postPayload);
    req.end();
  } catch (err) {
    console.warn('Live dispatch error:', err);
  }

  // 2. Secondary dispatch: Nodemailer if SMTP configured
  try {
    const nodemailer = require('nodemailer');
    if (process.env.SMTP_USER && process.env.SMTP_PASS) {
      const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS
        }
      });

      await transporter.sendMail({
        from: `"Oma's Orders" <${process.env.SMTP_USER}>`,
        to: recipientEmail,
        subject: emailSubject,
        text: emailBodyText
      });
      console.log(`✅ Real SMTP Email sent successfully to ${recipientEmail}`);
    }
  } catch (mailErr) {
    // Optional SMTP
  }

  return { success: true, recipient: recipientEmail };
}

// Place Order
app.post('/api/orders', async (req, res) => {
  const { customer, items, subtotal, deliveryFee, grandTotal } = req.body;

  if (!customer || !customer.name || !customer.phone || !customer.address) {
    return res.status(400).json({
      success: false,
      message: 'Please provide full customer details: Name, Phone Number, and Complete Address are required.'
    });
  }

  if (!items || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({
      success: false,
      message: 'Cart is empty. Please add items to order.'
    });
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

  // Save to orders file
  const orders = readJSON(ORDERS_FILE);
  orders.unshift(newOrder);
  writeJSON(ORDERS_FILE, orders);

  // Dispatch email to moiiizyyy@gmail.com
  await dispatchOrderEmail(newOrder);

  res.status(201).json({
    success: true,
    message: `Order #${orderId} confirmed successfully! All details sent to moiiizyyy@gmail.com`,
    order: newOrder,
    emailNotificationSentTo: 'moiiizyyy@gmail.com'
  });
});

// Get all orders
app.get('/api/orders', (req, res) => {
  const orders = readJSON(ORDERS_FILE);
  res.json({
    success: true,
    count: orders.length,
    orders
  });
});

// Update order status
app.patch('/api/orders/:id/status', (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  if (!status) {
    return res.status(400).json({ success: false, message: 'Status is required' });
  }

  const orders = readJSON(ORDERS_FILE);
  const order = orders.find(o => o.orderId === id || o.id === id);

  if (!order) {
    return res.status(404).json({ success: false, message: 'Order not found' });
  }

  order.status = status;
  writeJSON(ORDERS_FILE, orders);

  res.json({
    success: true,
    message: `Order status updated to ${status}`,
    order
  });
});

// -------------------------------------------------------------
// START SERVER
// -------------------------------------------------------------
app.listen(PORT, () => {
  console.log(`\n======================================================`);
  console.log(`🍕 Oma's Pizza & Fast Food Backend is RUNNING on port ${PORT}`);
  console.log(`🌐 Base URL: http://localhost:${PORT}`);
  console.log(`🔒 Admin Credentials: admin@omas.com / Adminofomas1`);
  console.log(`📧 Order Notification Target: moiiizyyy@gmail.com`);
  console.log(`======================================================\n`);
});
