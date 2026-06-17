export const STORE_PHONE_NUMBER = '8971552453';
export const STORE_PHONE_NUMBER_FORMATTED = '+91-8971552453';
export const STORE_GPAY_NUMBER = '8971552453';
export const STORE_UPI_ID = 'citycycling1@ybl';
export const STORE_ACCOUNT_NAME = 'Kanika Khandelwal';
export const STORE_ACCOUNT_NUMBER = '50200007734914';
export const STORE_IFSC = 'HDFC0001048';

/**
 * Generates a WhatsApp chat link.
 * If forceBusiness is true and the device is Android, it uses an Android Intent to target WhatsApp Business specifically.
 * 
 * @param {string} phone - The recipient's phone number
 * @param {string} message - Pre-filled message (optional)
 * @param {boolean} forceBusiness - Whether to force WhatsApp Business on Android
 * @returns {string} The WhatsApp/Intent URI
 */
export const getWhatsAppLink = (phone, message = '', forceBusiness = false) => {
  let cleanPhone = phone?.replace(/\D/g, '');
  if (!cleanPhone) return '';

  // If it's a 10-digit number, prepend India's country code '91'
  if (cleanPhone.length === 10) {
    cleanPhone = '91' + cleanPhone;
  }

  if (forceBusiness) {
    const ua = (navigator.userAgent || navigator.vendor || window.opera || '').toLowerCase();
    const isAndroid = /android/i.test(ua);
    if (isAndroid) {
      return `intent://send/?phone=${cleanPhone}&text=${encodeURIComponent(message)}#Intent;scheme=whatsapp;package=com.whatsapp.w4b;end`;
    }
  }

  return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
};
