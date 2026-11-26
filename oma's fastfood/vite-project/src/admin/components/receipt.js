import { money } from '../../lib/api';
import { PAY_LABEL, TYPE_LABEL, optionLine } from './utils';

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

const CSS = `@page{size:80mm auto;margin:0}
*{box-sizing:border-box}
body{margin:0;width:80mm;padding:4mm;font:12px/1.35 'Courier New',monospace;color:#000}
h1{font-size:16px;text-align:center;margin:0 0 2px}
.c{text-align:center}.sm{font-size:10px}
hr{border:0;border-top:1px dashed #000;margin:6px 0}
table{width:100%;border-collapse:collapse}
td{vertical-align:top;padding:1px 0}.r{text-align:right;white-space:nowrap}
.opt{font-size:10px;padding-left:8px}
.tot td{font-size:12px}.grand td{font-size:15px;font-weight:bold;padding-top:3px}`;

export function receiptHtml(order, settings = {}) {
  const o = order;
  const when = new Date(o.createdAt || Date.now()).toLocaleString('en-GB');
  const rows = (o.items || []).map((it) => `
    <tr><td>${esc(it.quantity)} x ${esc(it.name)}</td><td class="r">${esc(money(it.lineTotal))}</td></tr>
    ${optionLine(it) ? `<tr><td colspan="2" class="opt">${esc(optionLine(it))}</td></tr>` : ''}
    ${it.instructions ? `<tr><td colspan="2" class="opt">Note: ${esc(it.instructions)}</td></tr>` : ''}`).join('');
  const line = (label, v) => `<tr class="tot"><td>${label}</td><td class="r">${esc(v)}</td></tr>`;
  const change = o.amountTendered != null && o.amountTendered > 0 ? Math.max(0, o.amountTendered - o.grandTotal) : null;
  return `<!doctype html><html><head><meta charset="utf-8"><title>Receipt ${esc(o.orderNumber)}</title><style>${CSS}</style></head><body>
  <h1>${esc(settings.restaurantName || "Oma's Pizza")}</h1>
  <div class="c sm">${esc(settings.address || '')}${settings.phone ? `<br>Tel: ${esc(settings.phone)}` : ''}</div>
  <hr>
  <div>Order: <b>${esc(o.orderNumber)}</b></div>
  <div>${esc(when)}</div>
  <div>${esc(TYPE_LABEL[o.orderType] || o.orderType)}${o.tableNumber ? ` · Table ${esc(o.tableNumber)}` : ''}</div>
  <div>Customer: ${esc(o.customer?.name)}${o.customer?.phone && o.customer.phone !== '-' ? ` (${esc(o.customer.phone)})` : ''}</div>
  ${o.orderType === 'delivery' && o.customer?.address ? `<div>Addr: ${esc(o.customer.address)}</div>` : ''}
  <hr><table>${rows}</table><hr>
  <table>
    ${line('Subtotal', money(o.subtotal))}
    ${o.discount ? line(`Discount${o.couponCode ? ` (${esc(o.couponCode)})` : ''}`, `- ${money(o.discount)}`) : ''}
    ${o.tax ? line(`Tax (${o.taxRate}%)`, money(o.tax)) : ''}
    ${o.deliveryFee ? line('Delivery', money(o.deliveryFee)) : ''}
    <tr class="grand"><td>TOTAL</td><td class="r">${esc(money(o.grandTotal))}</td></tr>
    ${o.amountTendered ? line('Cash tendered', money(o.amountTendered)) : ''}
    ${change != null ? line('Change', money(change)) : ''}
  </table>
  <hr><div class="c sm">${esc(PAY_LABEL[o.paymentMethod] || o.paymentMethod)} · ${o.paymentStatus === 'paid' ? 'PAID' : 'UNPAID'}</div>
  <div class="c sm" style="margin-top:6px">Thank you for choosing ${esc(settings.restaurantName || "Oma's Pizza")}!</div>
  </body></html>`;
}

// Prints through a hidden iframe so only the receipt (80mm) is printed, never the dashboard.
export function printReceipt(order, settings) {
  const frame = document.createElement('iframe');
  frame.setAttribute('aria-hidden', 'true');
  frame.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0;visibility:hidden';
  document.body.appendChild(frame);
  const doc = frame.contentDocument;
  doc.open(); doc.write(receiptHtml(order, settings)); doc.close();
  const cleanup = () => setTimeout(() => frame.remove(), 500);
  setTimeout(() => {
    try {
      frame.contentWindow.focus();
      frame.contentWindow.addEventListener('afterprint', cleanup);
      frame.contentWindow.print();
    } catch { cleanup(); }
    setTimeout(() => frame.remove(), 120000);
  }, 150);
}
