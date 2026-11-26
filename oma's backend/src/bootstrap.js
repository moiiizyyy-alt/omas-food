// First-run bootstrap and legacy JSON -> MongoDB import. Idempotent; NEVER deletes data.
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');
const { User, Category, Product, Order } = require('./models');
const core = require('./core');
const RICH_MENU = require('./richMenu');

const DATA = path.join(__dirname, '..', 'data');
const CATEGORIES = ['Pizzas', 'Burgers', 'Pasta', 'Appetizers', 'Sandwiches', 'Drinks', 'Desserts', 'Deals & Combos'];

async function ensureCategory(name, order) {
  return Category.findOneAndUpdate({ name }, { $setOnInsert: { name, sortOrder: order } }, { upsert: true, returnDocument: 'after' });
}

async function ensureSuperAdmin() {
  const { adminEmail, adminPassword, isProd } = core.config;
  if (await User.exists({ role: 'superadmin' })) return;
  if (!adminPassword) { console.warn('[bootstrap] No superadmin exists and ADMIN_PASSWORD is not set - set it to create the first admin.'); return; }
  const existing = await User.findOne({ email: adminEmail });
  if (existing) { existing.role = 'superadmin'; existing.active = true; await existing.save(); return; }
  await User.create({ name: "Oma's Restaurant Manager", email: adminEmail, passwordHash: await bcrypt.hash(adminPassword, 12), role: 'superadmin' });
  console.log(`[bootstrap] Created super admin ${adminEmail}` + (isProd ? '' : ' (development default password - set ADMIN_PASSWORD!)'));
}

// Map legacy categories ("Fast Food" + subCategory ...) into the new category structure.
function mapCategory(it) {
  const t = `${it.subCategory || ''} ${it.name || ''}`.toLowerCase();
  if (/pizza/.test(t)) return 'Pizzas';
  if (/burger/.test(t)) return 'Burgers';
  if (/sandwich/.test(t)) return 'Sandwiches';
  if (/pasta/.test(t)) return 'Pasta';
  if (/dessert|cake|ice cream/.test(t)) return 'Desserts';
  if (it.category === 'Beverages' || /drink|shake/.test(t)) return 'Drinks';
  if (/fries|wings|appetizer|roll|nugget|side/.test(t)) return 'Appetizers';
  if (/combo|deal/.test(t)) return 'Deals & Combos';
  return it.category || 'Appetizers';
}
const spicyOf = (s) => (['None', 'Mild', 'Medium', 'Hot'].includes(s) ? s : 'None');

async function importLegacyMenu() {
  const file = path.join(DATA, 'menu.json');
  if (!fs.existsSync(file)) return 0;
  const items = JSON.parse(fs.readFileSync(file, 'utf8'));
  let n = 0;
  for (const it of items) {
    if (!it.id || !it.name || await Product.exists({ legacyId: String(it.id) })) continue;
    const cat = await ensureCategory(mapCategory(it), 100 + n);
    const bestSeller = /best ?seller|popular|must try/i.test(it.badge || '');
    await Product.create({
      legacyId: String(it.id), name: it.name, description: it.description || '', price: Number(it.price) || 0, image: it.image || '',
      categoryId: cat._id, subCategory: it.subCategory || '', badge: it.badge || '', bestSeller, featured: /chef|special|top/i.test(it.badge || ''),
      spicy: spicyOf(it.spicy), diet: /chicken|beef|mutton|kabab|tikka|boti|wings|pepperoni|karahi|shawarma|zinger|biryani|shashlik|manchurian|club|egg/i.test(`${it.name} ${it.description}`) ? 'nonveg' : 'veg',
      rating: Number(it.rating) || 0, reviewCount: Number(it.reviews) || 0
    });
    n++;
  }
  return n;
}

async function importLegacyOrders() {
  const file = path.join(DATA, 'orders.json');
  if (!fs.existsSync(file)) return 0;
  const orders = JSON.parse(fs.readFileSync(file, 'utf8'));
  const STATUS = ['Pending', 'Confirmed', 'Preparing', 'Ready for Pickup', 'Out for Delivery', 'Delivered', 'Cancelled'];
  let n = 0;
  for (const o of orders) {
    if (!o.orderId || await Order.exists({ orderNumber: o.orderId })) continue;
    const items = [];
    for (const i of o.items || []) {
      const p = await Product.findOne({ legacyId: String(i.id) }).populate('categoryId', 'name');
      items.push({ productId: p && p._id, name: i.name, image: i.image, category: p && p.categoryId ? p.categoryId.name : '', unitPrice: i.price, quantity: i.quantity, lineTotal: i.price * i.quantity });
    }
    await Order.create({
      orderNumber: o.orderId, source: 'online', customer: { name: o.customer.name, phone: o.customer.phone, address: o.customer.address || '', notes: o.customer.notes || '' },
      orderType: 'delivery', items, subtotal: o.subtotal, deliveryFee: o.deliveryFee, grandTotal: o.grandTotal, paymentMethod: 'cash_on_delivery',
      status: STATUS.includes(o.status) ? o.status : 'Pending', paymentStatus: o.status === 'Delivered' ? 'paid' : 'unpaid',
      statusHistory: [{ status: STATUS.includes(o.status) ? o.status : 'Pending', by: 'legacy-import', at: o.createdAt }], createdAt: o.createdAt ? new Date(o.createdAt) : undefined
    });
    n++;
  }
  return n;
}

async function seedRichMenu() {
  let n = 0;
  for (const it of RICH_MENU) {
    if (await Product.exists({ legacyId: it.legacyId })) continue;
    const cat = await ensureCategory(it.category, CATEGORIES.indexOf(it.category) >= 0 ? CATEGORIES.indexOf(it.category) : 20);
    await Product.create({
      legacyId: it.legacyId, name: it.name, description: it.description, price: it.price, discountPrice: it.discountPrice ?? null,
      image: it.image, categoryId: cat._id, subCategory: it.subCategory || '', badge: it.badge || '',
      bestSeller: !!it.bestSeller, featured: !!it.featured, available: true, diet: it.diet || 'nonveg', spicy: it.spicy || 'None',
      sizes: it.sizes || [], toppings: it.toppings || [], cheeseOptions: it.cheeseOptions || [],
      rating: it.rating || 4.8, reviewCount: it.reviewCount || 50
    });
    n++;
  }
  return n;
}

let done = null;
function bootstrap() {
  if (!done) done = (async () => {
    await ensureSuperAdmin();
    await core.getSettings();
    for (let i = 0; i < CATEGORIES.length; i++) await ensureCategory(CATEGORIES[i], i);
    if ((await Product.countDocuments()) === 0) {
      const n = await importLegacyMenu();
      if (n) console.log(`[bootstrap] Imported ${n} legacy menu items into MongoDB`);
    }
    if (process.env.NODE_ENV !== 'test') {
      const added = await seedRichMenu();
      if (added) console.log(`[bootstrap] Seeded ${added} rich menu items across all categories`);
    }
  })().catch((e) => { done = null; throw e; });
  return done;
}
module.exports = { bootstrap, importLegacyMenu, importLegacyOrders, seedRichMenu };


