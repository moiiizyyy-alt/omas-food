export const fmtDate = (d) => (d ? new Date(d).toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : '-');
export const fmtDay = (d) => (d ? new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '-');

export const STATUS_CLASS = {
  Pending: 'badge-warn', Confirmed: 'badge-info', Preparing: 'badge-gold', 'Ready for Pickup': 'badge-green',
  'Out for Delivery': 'badge-info', Delivered: 'badge-green', Cancelled: 'badge-danger',
  Completed: 'badge-green', pending: 'badge-warn', approved: 'badge-green', rejected: 'badge-danger'
};
export const PAY_LABEL = { cash_on_delivery: 'Cash on delivery', cash_at_pickup: 'Cash at pickup', cash: 'Cash (POS)', cash_dine_in: 'Cash (dine-in)' };
export const TYPE_LABEL = { delivery: 'Delivery', pickup: 'Takeaway', 'dine-in': 'Dine-in' };
export const ALL_STATUSES = ['Pending', 'Confirmed', 'Preparing', 'Ready for Pickup', 'Out for Delivery', 'Delivered', 'Cancelled'];

const FLOW = {
  delivery: ['Pending', 'Confirmed', 'Preparing', 'Out for Delivery', 'Delivered'],
  pickup: ['Pending', 'Confirmed', 'Preparing', 'Ready for Pickup', 'Delivered'],
  'dine-in': ['Pending', 'Confirmed', 'Preparing', 'Ready for Pickup', 'Delivered']
};
const KITCHEN_OK = ['Preparing', 'Ready for Pickup', 'Out for Delivery'];

// Statuses the signed-in user may move this order to (mirrors the server rules).
export function nextStatuses(order, user, can) {
  const flow = FLOW[order.orderType] || FLOW.delivery;
  const admin = ['superadmin', 'manager'].includes(user.role);
  const final = ['Delivered', 'Cancelled'].includes(order.status);
  if (final && !admin) return [];
  let list = admin ? flow.filter((s) => s !== order.status) : flow.slice(flow.indexOf(order.status) + 1);
  if (order.status !== 'Cancelled' && can('orders.cancel')) list = [...list, 'Cancelled'];
  if (user.role === 'kitchen') list = list.filter((s) => KITCHEN_OK.includes(s));
  return list;
}

export const optionLine = (it) => [it.size, ...(it.toppings || []), it.cheese].filter(Boolean).join(' · ');
export const toNum = (v) => (v === '' || v == null ? 0 : Number(v) || 0);
export const dayKey = (d) => new Date(d).toISOString().slice(0, 10);
