/**
 * User Helper Utilities
 * Functions to work with user data, especially for order creation
 */

/**
 * Transform user profile to order customer format
 * @param {Object} user - User document from database
 * @returns {Object} Customer object for order
 */
const userToCustomer = (user) => {
  if (!user || !user.profile) {
    return {
      name: '',
      phone: '',
      alternatePhone: '',
      address: '',
      pincode: ''
    };
  }

  const { profile } = user;
  const address = profile.address || {};

  // Format full address string
  const fullAddress = [
    address.street,
    address.area,
    address.landmark,
    address.city,
    address.state
  ].filter(Boolean).join(', ');

  return {
    name: profile.name || '',
    phone: profile.phone || '',
    alternatePhone: profile.alternatePhone || profile.whatsappNumber || '',
    address: fullAddress || '',
    pincode: address.pincode || ''
  };
};

/**
 * Check if user has complete profile for order creation
 * @param {Object} user - User document
 * @returns {Object} { isComplete: boolean, missingFields: string[] }
 */
const validateUserProfileForOrder = (user) => {
  const missingFields = [];

  if (!user.profile) {
    return {
      isComplete: false,
      missingFields: ['Complete profile required']
    };
  }

  const { profile } = user;

  if (!profile.name) missingFields.push('Name');
  if (!profile.phone) missingFields.push('Phone number');
  
  // Address validation
  if (!profile.address || !profile.address.street) {
    missingFields.push('Street address');
  }
  if (!profile.address || !profile.address.city) {
    missingFields.push('City');
  }
  if (!profile.address || !profile.address.pincode) {
    missingFields.push('Pincode');
  }

  return {
    isComplete: missingFields.length === 0,
    missingFields
  };
};

/**
 * Format address object to string
 * @param {Object} address - Address object from user profile
 * @returns {string} Formatted address
 */
const formatAddress = (address) => {
  if (!address) return '';

  const parts = [
    address.street,
    address.area,
    address.landmark,
    address.city,
    address.state,
    address.pincode
  ].filter(Boolean);

  return parts.join(', ');
};

/**
 * Get primary contact number (prefers phone, falls back to whatsapp)
 * @param {Object} profile - User profile object
 * @returns {string} Phone number
 */
const getPrimaryContact = (profile) => {
  if (!profile) return '';
  return profile.phone || profile.whatsappNumber || '';
};

/**
 * Get WhatsApp number (prefers whatsappNumber, falls back to phone)
 * @param {Object} profile - User profile object
 * @returns {string} WhatsApp number
 */
const getWhatsAppNumber = (profile) => {
  if (!profile) return '';
  return profile.whatsappNumber || profile.phone || '';
};

/**
 * Sanitize phone number (remove spaces, dashes, etc.)
 * @param {string} phone - Phone number
 * @returns {string} Sanitized phone number
 */
const sanitizePhoneNumber = (phone) => {
  if (!phone) return '';
  return phone.replace(/[\s\-\(\)]/g, '');
};

module.exports = {
  userToCustomer,
  validateUserProfileForOrder,
  formatAddress,
  getPrimaryContact,
  getWhatsAppNumber,
  sanitizePhoneNumber
};
