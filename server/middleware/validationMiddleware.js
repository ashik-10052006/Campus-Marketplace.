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

  if (!name || !name.trim()) {
    return res.status(400).json({ success: false, message: 'Name is required' });
  }

  if (!isValidEmail(email)) {
    return res.status(400).json({ success: false, message: 'Please provide a valid email address' });
  }

  if (!isValidPhone(phone)) {
    return res.status(400).json({ success: false, message: 'Please provide a valid phone number (7-15 digits)' });
  }

  if (!isValidPassword(password)) {
    return res.status(400).json({ success: false, message: 'Password must be at least 6 characters' });
  }

  if (password !== confirmPassword) {
    return res.status(400).json({ success: false, message: 'Passwords do not match' });
  }

  next();
};

const validateLogin = (req, res, next) => {
  const { email, password } = req.body;

  if (!email || !isValidEmail(email)) {
    return res.status(400).json({ success: false, message: 'Please provide a valid email address' });
  }

  if (!password) {
    return res.status(400).json({ success: false, message: 'Password is required' });
  }

  next();
};

const validateProduct = (req, res, next) => {
  const { name, description, price, category, condition } = req.body;

  if (!name || !name.trim()) {
    return res.status(400).json({ success: false, message: 'Product name is required' });
  }

  if (!description || !description.trim()) {
    return res.status(400).json({ success: false, message: 'Product description is required' });
  }

  if (!isValidPrice(price)) {
    return res.status(400).json({ success: false, message: 'Price must be a number greater than 0' });
  }

  if (!category) {
    return res.status(400).json({ success: false, message: 'Category is required' });
  }

  if (!condition || !VALID_CONDITIONS.includes(condition)) {
    return res.status(400).json({
      success: false,
      message: `Condition must be one of: ${VALID_CONDITIONS.join(', ')}`,
    });
  }

  next();
};

const validateReport = (req, res, next) => {
  const { reason } = req.body;

  if (!reason || !VALID_REPORT_REASONS.includes(reason)) {
    return res.status(400).json({
      success: false,
      message: `Reason must be one of: ${VALID_REPORT_REASONS.join(', ')}`,
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
