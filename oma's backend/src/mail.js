const nodemailer = require('nodemailer');

let transporter = null;
function getTransporter() {
  if (transporter) return transporter;
  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) return null;
  transporter = nodemailer.createTransport({
    service: process.env.SMTP_SERVICE || 'gmail',
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
  });
  return transporter;
}

// Dispatches via FormSubmit HTTP AJAX relay (uses an HTTPS origin so FormSubmit never rejects localhost)
async function sendFormSubmit(to, fields) {
  try {
    const publicOrigin = process.env.PUBLIC_SITE_URL || 'https://omas-pizza.vercel.app';
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 15000);
    const res = await fetch(`https://formsubmit.co/ajax/${encodeURIComponent(to)}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        Origin: publicOrigin,
        Referer: `${publicOrigin}/`
      },
      body: JSON.stringify({ _template: 'table', _captcha: 'false', ...fields }),
      signal: controller.signal
    });
    clearTimeout(timer);
    const text = await res.text();
    console.log(`[mail/formsubmit] ${to} -> HTTP ${res.status}: ${text.slice(0, 220)}`);
    return res.ok && !text.includes('"success":"false"');
  } catch (err) {
    console.warn('[mail/formsubmit] error:', err.message);
    return false;
  }
}

// Returns true if email was dispatched via SMTP or FormSubmit. Never throws.
async function sendMail({ to, subject, text, fields }) {
  let sent = false;
  const t = getTransporter();
  if (t) {
    try {
      await t.sendMail({ from: `"Oma's Pizza" <${process.env.SMTP_USER}>`, to, subject, text });
      console.log(`[mail/smtp] Sent "${subject}" to ${to}`);
      sent = true;
    } catch (e) {
      console.error('[mail/smtp] send failed:', e.message);
    }
  }
  if (!sent && fields && process.env.NODE_ENV !== 'test') {
    sent = await sendFormSubmit(to, { _subject: subject, ...fields });
  }
  if (!sent) console.log(`[mail] Logged "${subject}" for ${to}`);
  return sent;
}

module.exports = { sendMail };
