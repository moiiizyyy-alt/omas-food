// Mongoose models for Oma's Pizza. One model per collection - no duplicates.
const mongoose = require('mongoose');
const { Schema } = mongoose;

const ROLES = ['customer', 'superadmin', 'manager', 'cashier', 'kitchen'];
const ORDER_STATUSES = ['Pending', 'Confirmed', 'Preparing', 'Ready for Pickup', 'Out for Delivery', 'Delivered', 'Cancelled'];

const opts = { timestamps: true };

// ---------------- Users (customers + staff share one collection, split by role)
const addressSchema = new Schema({
  label: { type: String, default: 'Home', maxlength: 40 },
  address: { type: String, required: true, maxlength: 300 },
  city: { type: String, maxlength: 80, default: '' },
  area: { type: String, maxlength: 80, default: '' },
  instructions: { type: String, maxlength: 300, default: '' }
});

const userSchema = new Schema({
  name: { type: String, required: true, trim: true, maxlength: 80 },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true, maxlength: 120 },
  phone: { type: String, trim: true, maxlength: 30, default: '' },
  passwordHash: { type: String, required: true, select: false },
  role: { type: String, enum: ROLES, default: 'customer', index: true },
  active: { type: Boolean, default: true },
  addresses: [addressSchema],
  cart: [new Schema({ productId: String, quantity: Number, size: String, toppings: [String], cheese: String, instructions: String }, { _id: false })],
  tokenVersion: { type: Number, default: 0 }, // bump to invalidate all sessions
  resetTokenHash: { type: String, select: false },
  resetTokenExpires: { type: Date, select: false },
  lastLoginAt: Date
}, opts);

// ---------------- Categories
const categorySchema = new Schema({
  name: { type: String, required: true, unique: true, trim: true, maxlength: 60 },
  description: { type: String, default: '', maxlength: 300 },
  image: { type: String, default: '' },
  sortOrder: { type: Number, default: 0, index: true },
  active: { type: Boolean, default: true }
}, opts);

// ---------------- Products (menu items)
const optionSchema = new Schema({
  name: { type: String, required: true, trim: true, maxlength: 60 },
  price: { type: Number, required: true, min: 0 }
}, { _id: false });

const productSchema = new Schema({
  legacyId: { type: String, index: true, sparse: true }, // id from the old JSON menu ("item-1")
  name: { type: String, required: true, trim: true, maxlength: 120 },
  description: { type: String, default: '', maxlength: 1000 },
  price: { type: Number, required: true, min: 0 },
  discountPrice: { type: Number, min: 0, default: null },
  image: { type: String, default: '' },
  categoryId: { type: Schema.Types.ObjectId, ref: 'Category', required: true, index: true },
  subCategory: { type: String, default: '', maxlength: 60 },
  badge: { type: String, default: '', maxlength: 40 },
  bestSeller: { type: Boolean, default: false, index: true },
  featured: { type: Boolean, default: false },
  available: { type: Boolean, default: true },
  diet: { type: String, enum: ['veg', 'nonveg'], default: 'nonveg' },
  spicy: { type: String, enum: ['None', 'Mild', 'Medium', 'Hot'], default: 'None' },
  sizes: [optionSchema],          // absolute price per size
  toppings: [optionSchema],       // extra price per topping
  cheeseOptions: [optionSchema],  // extra price
  rating: { type: Number, default: 0, min: 0, max: 5 },
  reviewCount: { type: Number, default: 0 },
  sortOrder: { type: Number, default: 0 }
}, opts);
productSchema.index({ name: 'text', description: 'text' });

// ---------------- Orders (POS + online share this collection)
const orderItemSchema = new Schema({
  productId: { type: Schema.Types.ObjectId, ref: 'Product' },
  name: String,
  image: String,
  category: String,
  size: { type: String, default: '' },
  toppings: [String],
  cheese: { type: String, default: '' },
  instructions: { type: String, default: '', maxlength: 300 },
  unitPrice: Number,   // computed on the server
  quantity: Number,
  lineTotal: Number
}, { _id: false });

const orderSchema = new Schema({
  orderNumber: { type: String, required: true, unique: true },
  source: { type: String, enum: ['online', 'pos'], default: 'online', index: true },
  userId: { type: Schema.Types.ObjectId, ref: 'User', index: true, sparse: true },
  customer: {
    name: { type: String, required: true, maxlength: 80 },
    phone: { type: String, required: true, maxlength: 30 },
    email: { type: String, default: '', maxlength: 120 },
    address: { type: String, default: '', maxlength: 300 },
    city: { type: String, default: '', maxlength: 80 },
    area: { type: String, default: '', maxlength: 80 },
    notes: { type: String, default: '', maxlength: 500 }
  },
  orderType: { type: String, enum: ['delivery', 'pickup', 'dine-in'], default: 'delivery' },
  tableNumber: { type: String, default: '' },
  items: [orderItemSchema],
  subtotal: Number,
  discount: { type: Number, default: 0 },       // coupon + manual POS discount
  couponCode: { type: String, default: '' },
  taxRate: { type: Number, default: 0 },
  tax: { type: Number, default: 0 },
  deliveryFee: { type: Number, default: 0 },
  grandTotal: Number,
  paymentMethod: { type: String, enum: ['cash_on_delivery', 'cash_at_pickup', 'cash', 'cash_dine_in'], default: 'cash_on_delivery' },
  paymentStatus: { type: String, enum: ['unpaid', 'paid'], default: 'unpaid' },
  amountTendered: Number,
  status: { type: String, enum: ORDER_STATUSES, default: 'Pending', index: true },
  statusHistory: [{ status: String, at: { type: Date, default: Date.now }, by: String, _id: false }],
  trackingToken: { type: String, select: false },  // lets guests track their own order
  idempotencyKey: { type: String, index: { unique: true, sparse: true } },
  createdBy: { type: Schema.Types.ObjectId, ref: 'User' } // staff who rang it up (POS)
}, opts);
orderSchema.index({ createdAt: -1 });
orderSchema.index({ 'customer.phone': 1 });

// ---------------- Counter (atomic order numbers)
const counterSchema = new Schema({ _id: String, seq: { type: Number, default: 100000 } });

// ---------------- Reservations
const reservationSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: 'User', index: true, sparse: true },
  name: { type: String, required: true, maxlength: 80 },
  phone: { type: String, required: true, maxlength: 30 },
  email: { type: String, default: '', maxlength: 120 },
  date: { type: String, required: true, match: /^\d{4}-\d{2}-\d{2}$/ }, // yyyy-mm-dd (restaurant local date)
  time: { type: String, required: true, match: /^\d{2}:\d{2}$/ },
  guests: { type: Number, required: true, min: 1, max: 50 },
  specialRequests: { type: String, default: '', maxlength: 500 },
  status: { type: String, enum: ['Pending', 'Confirmed', 'Cancelled', 'Completed'], default: 'Pending' },
  reference: { type: String, unique: true }
}, opts);
reservationSchema.index({ date: 1, time: 1 });

// ---------------- Reviews
const reviewSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  orderId: { type: Schema.Types.ObjectId, ref: 'Order', required: true },
  name: String,
  rating: { type: Number, required: true, min: 1, max: 5 },
  comment: { type: String, default: '', maxlength: 1000 },
  verified: { type: Boolean, default: true },
  status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending', index: true }
}, opts);
reviewSchema.index({ orderId: 1, userId: 1 }, { unique: true });

// ---------------- Coupons
const couponSchema = new Schema({
  code: { type: String, required: true, unique: true, uppercase: true, trim: true, maxlength: 30 },
  description: { type: String, default: '', maxlength: 200 },
  type: { type: String, enum: ['percentage', 'fixed'], required: true },
  value: { type: Number, required: true, min: 0 },
  maxDiscount: { type: Number, default: null },
  minOrder: { type: Number, default: 0 },
  expiresAt: Date,
  usageLimit: { type: Number, default: 0 }, // 0 = unlimited
  usedCount: { type: Number, default: 0 },
  active: { type: Boolean, default: true },
  public: { type: Boolean, default: false } // show in "Special deals" on the website
}, opts);

// ---------------- Ingredients (inventory) with stock history
const ingredientSchema = new Schema({
  name: { type: String, required: true, unique: true, trim: true, maxlength: 80 },
  unit: { type: String, default: 'kg', maxlength: 20 },
  stock: { type: Number, default: 0 },
  lowStockThreshold: { type: Number, default: 5 },
  costPerUnit: { type: Number, default: 0 },
  history: [{
    change: Number, balance: Number, reason: String, by: String,
    at: { type: Date, default: Date.now }, _id: false
  }]
}, opts);

// ---------------- Restaurant settings (singleton, key = 'main')
const settingSchema = new Schema({
  key: { type: String, default: 'main', unique: true },
  restaurantName: { type: String, default: "Oma's Pizza" },
  tagline: { type: String, default: 'Stone-baked pizza, made with love' },
  logo: { type: String, default: '' },
  phone: { type: String, default: '' },
  whatsapp: { type: String, default: '' },
  email: { type: String, default: '' },
  address: { type: String, default: '' },
  mapEmbedUrl: { type: String, default: '' },
  social: { instagram: String, facebook: String, tiktok: String },
  openingHours: [{ day: String, open: String, close: String, closed: { type: Boolean, default: false }, _id: false }],
  deliveryFee: { type: Number, default: 100 },
  freeDeliveryOver: { type: Number, default: 2500 },
  minimumOrder: { type: Number, default: 0 },
  taxRate: { type: Number, default: 0 },
  reservationCapacity: { type: Number, default: 40 },   // total seats per slot
  reservationSlotMinutes: { type: Number, default: 90 },
  promotions: [{ title: String, text: String, active: { type: Boolean, default: true }, _id: false }],
  banners: [{ title: String, subtitle: String, image: String, link: String, active: { type: Boolean, default: true }, _id: false }],
  gallery: [{ image: String, caption: String, _id: false }],
  team: [{ name: String, role: String, image: String, _id: false }],
  about: { type: String, default: '' }
}, opts);

// ---------------- Contact form messages
const messageSchema = new Schema({
  name: { type: String, required: true, maxlength: 80 },
  email: { type: String, default: '', maxlength: 120 },
  phone: { type: String, default: '', maxlength: 30 },
  message: { type: String, required: true, maxlength: 2000 },
  handled: { type: Boolean, default: false }
}, opts);

// ---------------- Uploaded images (stored in Atlas so they work on serverless hosts)
const uploadSchema = new Schema({
  contentType: String,
  size: Number,
  data: { type: Buffer, select: false },
  uploadedBy: { type: Schema.Types.ObjectId, ref: 'User' }
}, opts);

const m = (name, schema) => mongoose.models[name] || mongoose.model(name, schema);

module.exports = {
  ROLES, ORDER_STATUSES,
  User: m('User', userSchema),
  Category: m('Category', categorySchema),
  Product: m('Product', productSchema),
  Order: m('Order', orderSchema),
  Counter: m('Counter', counterSchema),
  Reservation: m('Reservation', reservationSchema),
  Review: m('Review', reviewSchema),
  Coupon: m('Coupon', couponSchema),
  Ingredient: m('Ingredient', ingredientSchema),
  Setting: m('Setting', settingSchema),
  Message: m('Message', messageSchema),
  Upload: m('Upload', uploadSchema)
};

