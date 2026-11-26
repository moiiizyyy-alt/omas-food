// Usage: npm run migrate   (needs MONGODB_URI)
// Safely copies legacy data/menu.json + data/orders.json into MongoDB. Idempotent, never deletes anything.
const core = require('../src/core');
const { bootstrap, importLegacyMenu, importLegacyOrders } = require('../src/bootstrap');
(async () => {
  await core.connectDb();
  await bootstrap();
  const m = await importLegacyMenu();
  const o = await importLegacyOrders();
  console.log(`Migration complete: ${m} menu items and ${o} orders imported (existing records were skipped).`);
  process.exit(0);
})().catch((e) => { console.error('Migration failed:', e.message); process.exit(1); });

