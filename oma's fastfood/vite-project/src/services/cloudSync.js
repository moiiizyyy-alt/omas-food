// Oma's Fast Food - Real-Time Multi-Device Cloud Sync Service
// Enables instant live synchronization across all devices (Mobile, PC, Tablets, Vercel & Local)
import { DEFAULT_MENU } from '../data/defaultMenu';

const CLOUD_DB_URL = 'https://glad-octopus-154737.upstash.io';
const CLOUD_DB_TOKEN = 'gQAAAAAAAlxxAQIgcDI1MzdmYjkwNjA3NzU0MzEyOWE1MTk2NzMxZTUzOWM0OA';
const MENU_KEY = 'omas_menu';
const ORDERS_KEY = 'omas_orders';

// Helper: Upstash REST client with cache-busting & zero HTTP cache
async function upstashCommand(command, key, value = null) {
  try {
    const isGet = command.toUpperCase() === 'GET';
    const cacheBuster = isGet ? `?_cb=${Date.now()}` : '';
    let url = `${CLOUD_DB_URL}/${command.toLowerCase()}/${encodeURIComponent(key)}${cacheBuster}`;
    let options = {
      headers: {
        Authorization: `Bearer ${CLOUD_DB_TOKEN}`
      },
      cache: 'no-store'
    };

    if (value !== null) {
      options.method = 'POST';
      options.body = typeof value === 'string' ? value : JSON.stringify(value);
    }

    const res = await fetch(url, options);
    if (!res.ok) throw new Error(`Upstash HTTP ${res.status}`);
    const data = await res.json();
    return data.result;
  } catch (err) {
    console.warn(`[CloudSync] Upstash ${command} error:`, err.message);
    return null;
  }
}

// Cross-tab broadcast channel for instant same-browser multi-tab updates
const syncBroadcast = typeof window !== 'undefined' && 'BroadcastChannel' in window 
  ? new BroadcastChannel('omas_realtime_sync') 
  : null;

export function broadcastMenuChange() {
  try {
    if (syncBroadcast) {
      syncBroadcast.postMessage({ type: 'MENU_UPDATED', timestamp: Date.now() });
    }
  } catch {}
}

export function subscribeToMenuChange(callback) {
  if (!syncBroadcast) return () => {};
  const handler = (e) => {
    if (e.data && e.data.type === 'MENU_UPDATED') {
      callback();
    }
  };
  syncBroadcast.addEventListener('message', handler);
  return () => syncBroadcast.removeEventListener('message', handler);
}

/**
 * 1. Fetch latest menu items from Cloud Database (Never cached, Always live)
 */
export async function getLiveMenuItems() {
  try {
    // 1. Try Cloud Database first (Global Realtime Source with cache-busting)
    const rawData = await upstashCommand('GET', MENU_KEY);
    if (rawData) {
      const parsed = typeof rawData === 'string' ? JSON.parse(rawData) : rawData;
      if (Array.isArray(parsed) && parsed.length > 0) {
        try {
          localStorage.setItem('omas_pos_menu_items', JSON.stringify(parsed));
        } catch {}
        return parsed;
      }
    }

    // 2. Fallback to local /api/items if cloud is unreachable
    try {
      const res = await fetch(`/api/items?_cb=${Date.now()}`, { cache: 'no-store' });
      const data = await res.json();
      if (data.success && Array.isArray(data.items) && data.items.length > 0) {
        return data.items;
      }
    } catch {}

    // 3. Fallback to LocalStorage
    const saved = localStorage.getItem('omas_pos_menu_items');
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }

    return DEFAULT_MENU;
  } catch (err) {
    console.warn('[CloudSync] Fallback to default menu:', err);
    return DEFAULT_MENU;
  }
}

/**
 * 2. Save entire menu list to Cloud Database (Auto-Syncs to all devices)
 */
export async function syncMenuItemsToCloud(items) {
  // Always update local cache immediately
  try {
    localStorage.setItem('omas_pos_menu_items', JSON.stringify(items));
  } catch {}

  // 1. Push to Cloud Database (Real-time sync to all devices worldwide)
  const cloudRes = await upstashCommand('SET', MENU_KEY, JSON.stringify(items));

  // 2. Broadcast across tabs immediately
  broadcastMenuChange();

  // 3. Also notify local backend if running
  try {
    fetch('/api/sync-menu', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ items })
    }).catch(() => {});
  } catch {}

  return cloudRes !== null;
}

/**
 * 3. Add single new item to Menu and sync across all devices
 */
export async function addMenuItemCloud(newItem) {
  const currentItems = await getLiveMenuItems();
  const updatedItems = [newItem, ...currentItems.filter((i) => i.id !== newItem.id)];
  await syncMenuItemsToCloud(updatedItems);

  // Also POST to local backend if online
  try {
    fetch('/api/items', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newItem)
    }).catch(() => {});
  } catch {}

  return updatedItems;
}

/**
 * 4. Update an existing item across all devices
 */
export async function updateMenuItemCloud(updatedItem) {
  const currentItems = await getLiveMenuItems();
  const updatedItems = currentItems.map((item) =>
    item.id === updatedItem.id ? { ...item, ...updatedItem } : item
  );
  await syncMenuItemsToCloud(updatedItems);

  // Also PUT to local backend if online
  try {
    fetch(`/api/items/${updatedItem.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updatedItem)
    }).catch(() => {});
  } catch {}

  return updatedItems;
}

/**
 * 5. Delete an item across all devices
 */
export async function deleteMenuItemCloud(itemId) {
  const currentItems = await getLiveMenuItems();
  const updatedItems = currentItems.filter((item) => item.id !== itemId);
  await syncMenuItemsToCloud(updatedItems);

  // Also DELETE on local backend if online
  try {
    fetch(`/api/items/${itemId}`, { method: 'DELETE' }).catch(() => {});
  } catch {}

  return updatedItems;
}

/**
 * 6. Fetch live orders across all devices
 */
export async function getLiveOrders() {
  try {
    const rawData = await upstashCommand('GET', ORDERS_KEY);
    if (rawData) {
      const parsed = typeof rawData === 'string' ? JSON.parse(rawData) : rawData;
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (err) {
    console.warn('[CloudSync] Error fetching cloud orders:', err);
  }

  // Fallback to local /api/orders
  try {
    const res = await fetch('/api/orders');
    const data = await res.json();
    if (data.success && Array.isArray(data.orders)) return data.orders;
  } catch {}

  return [];
}

/**
 * 7. Save a new order and dispatch email to moiiizyyy@gmail.com
 */
export async function saveLiveOrder(newOrder) {
  try {
    const orders = await getLiveOrders();
    const updated = [newOrder, ...orders.filter((o) => o.orderId !== newOrder.orderId)];
    await upstashCommand('SET', ORDERS_KEY, JSON.stringify(updated));
  } catch (err) {
    console.warn('[CloudSync] Error saving order to cloud:', err);
  }

  // 1. Direct FormSubmit Live Email Dispatch to moiiizyyy@gmail.com
  try {
    const itemsText = newOrder.items
      .map(
        (item, idx) =>
          `${idx + 1}. ${item.name} (Qty: ${item.quantity}) - Rs. ${item.price * item.quantity}`
      )
      .join('\n');

    fetch('https://formsubmit.co/ajax/moiiizyyy@gmail.com', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json'
      },
      body: JSON.stringify({
        _subject: `🚨 NEW ORDER #${newOrder.orderId} - Oma's Pizza & Fast Food (Rs. ${newOrder.grandTotal})`,
        'Order ID': newOrder.orderId,
        'Customer Name': newOrder.customer.name,
        'Phone Number': newOrder.customer.phone,
        'Delivery Address': newOrder.customer.address,
        'Special Notes': newOrder.customer.notes || 'None',
        'Ordered Items': itemsText,
        Subtotal: `Rs. ${newOrder.subtotal}`,
        'Delivery Fee': `Rs. ${newOrder.deliveryFee}`,
        'Grand Total': `Rs. ${newOrder.grandTotal}`,
        'Payment Mode': newOrder.paymentMethod,
        _template: 'table',
        _captcha: 'false'
      })
    }).catch((err) => console.warn('[CloudSync] Email dispatch notice:', err));
  } catch {}

  // 2. Also notify local backend if running
  try {
    fetch('/api/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newOrder)
    }).catch(() => {});
  } catch {}
}

/**
 * 8. Update order status across all devices
 */
export async function updateLiveOrderStatus(orderId, newStatus) {
  try {
    const orders = await getLiveOrders();
    const updated = orders.map((o) =>
      o.orderId === orderId || o.id === orderId ? { ...o, status: newStatus } : o
    );
    await upstashCommand('SET', ORDERS_KEY, JSON.stringify(updated));

    // Also notify local backend
    try {
      fetch(`/api/orders/${orderId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      }).catch(() => {});
    } catch {}

    return updated;
  } catch (err) {
    console.warn('[CloudSync] Error updating order status:', err);
    return null;
  }
}
