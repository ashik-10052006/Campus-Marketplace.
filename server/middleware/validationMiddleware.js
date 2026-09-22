const {
  isValidEmail,
  isValidPhone,
  isValidPassword,
  isValidPrice,
  VALID_CONDITIONS,
  VALID_REPORT_REASONS,
} = require('../utils/validators');

const validateRegister = (req, res, next) => {
  const { name, email, password, confirmPassword, phone } = req.body;

  if (!name || typeof name !== 'string' || !name.trim()) {
    return res.status(400).json({ success: false, message: 'Name is required and must be text' });
  }

  if (!email || typeof email !== 'string' || !isValidEmail(email)) {
    return res.status(400).json({ success: false, message: 'Please provide a valid email address' });
  }

  if (!phone || typeof phone !== 'string' || !isValidPhone(phone)) {
    return res.status(400).json({ success: false, message: 'Please provide a valid phone number (7-15 digits)' });
  }

  if (!password || typeof password !== 'string' || !isValidPassword(password)) {
    return res.status(400).json({ success: false, message: 'Password must be at least 6 characters' });
  }

  if (typeof confirmPassword !== 'string' || password !== confirmPassword) {
    return res.status(400).json({ success: false, message: 'Passwords do not match' });
  }

  next();
};

const validateLogin = (req, res, next) => {
  const { email, password } = req.body;

  if (!email || typeof email !== 'string' || !isValidEmail(email)) {
    return res.status(400).json({ success: false, message: 'Please provide a valid email address' });
  }

  if (!password || typeof password !== 'string') {
    return res.status(400).json({ success: false, message: 'Password is required' });
  }

  next();
};

const validateProduct = (req, res, next) => {
  const { name, description, price, category, condition } = req.body;

  if (!name || typeof name !== 'string' || !name.trim()) {
    return res.status(400).json({ success: false, message: 'Product name is required' });
  }

  if (!description || typeof description !== 'string' || !description.trim()) {
    return res.status(400).json({ success: false, message: 'Product description is required' });
  }

  if (!isValidPrice(price)) {
    return res.status(400).json({ success: false, message: 'Price must be a number greater than 0' });
  }

  if (!category || typeof category !== 'string' || !category.trim()) {
    return res.status(400).json({ success: false, message: 'Category is required' });
  }

  if (!condition || typeof condition !== 'string' || !VALID_CONDITIONS.includes(condition)) {
    return res.status(400).json({
      success: false,
      message: `Condition must be one of: ${VALID_CONDITIONS.join(', ')}`,
    });
  }

  next();
};

const validateReport = (req, res, next) => {
  const { reason, description } = req.body;

  if (!reason || typeof reason !== 'string' || !VALID_REPORT_REASONS.includes(reason)) {
    return res.status(400).json({
      success: false,
      message: `Reason must be one of: ${VALID_REPORT_REASONS.join(', ')}`,
    });
  }

  if (description !== undefined && typeof description !== 'string') {
    return res.status(400).json({
      success: false,
      message: 'Description must be text',
    });
  }

  next();
};

module.exports = {
  validateRegister,
  validateLogin,
  validateProduct,
  validateReport,
};
