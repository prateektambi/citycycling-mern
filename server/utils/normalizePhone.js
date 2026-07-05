// server/utils/normalizePhone.js
// Canonical phone form shared with the FastAPI pipeline (workflows/whatsapp/phone.py).
// Produces "+91XXXXXXXXXX" for Indian numbers so WhatsApp conversations reconcile
// cleanly against Order.customer.phone.

const DEFAULT_COUNTRY_CODE = '91'; // India

/**
 * Normalise a raw phone string to canonical "+<cc><number>" form.
 *   "+91-98765-43210", "91 98765 43210", "098765 43210", "9876543210"
 *   -> "+919876543210"
 * Returns "" for empty input, or the trimmed input when it has no digits.
 */
function normalizePhone(raw) {
  if (!raw) return '';

  let digits = String(raw).replace(/\D/g, '');
  if (!digits) return String(raw).trim();

  // Drop a leading trunk "0".
  digits = digits.replace(/^0+/, '');

  // Bare 10-digit Indian mobile -> prepend country code.
  if (digits.length === 10) {
    digits = DEFAULT_COUNTRY_CODE + digits;
  }

  return '+' + digits;
}

module.exports = { normalizePhone };
