/**
 * Campus Marketplace Validation Utilities
 */

const isValidEmail = (email) => {
  if (!email || typeof email !== 'string') return false;
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email.trim().toLowerCase());
};

const isValidPhone = (phone) => {
  if (!phone || typeof phone !== 'string') return false;
  // Allow phone numbers with optional +, spaces, dashes, parentheses, 7 to 15 digits
  const cleaned = phone.replace(/[\s\-()]/g, '');
  const phoneRegex = /^\+?[0-9]{7,15}$/;
  return phoneRegex.test(cleaned);
};

const isValidPassword = (password) => {
  return typeof password === 'string' && password.length >= 6;
};

const isValidPrice = (price) => {
  const num = Number(price);
  return !isNaN(num) && num > 0;
};

const VALID_CONDITIONS = ['NEW', 'LIKE_NEW', 'GOOD', 'FAIR'];
const VALID_PRODUCT_STATUSES = ['AVAILABLE', 'SOLD', 'REMOVED'];
const VALID_REPORT_REASONS = [
  'Spam',
  'Scam',
  'Inappropriate Content',
  'Wrong Information',
  'Duplicate Listing',
  'Other',
];
const VALID_REPORT_STATUSES = ['PENDING', 'REVIEWED', 'RESOLVED', 'REJECTED'];

const sanitizeString = (str) => {
  if (typeof str !== 'string') return '';
  return str.trim();
};

module.exports = {
  isValidEmail,
  isValidPhone,
  isValidPassword,
  isValidPrice,
  VALID_CONDITIONS,
  VALID_PRODUCT_STATUSES,
  VALID_REPORT_REASONS,
  VALID_REPORT_STATUSES,
  sanitizeString,
};
