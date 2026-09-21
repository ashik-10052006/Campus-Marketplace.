const User = require('../models/User');
const { generateTokenAndSetCookie } = require('../utils/generateToken');
const crypto = require('crypto');

// @desc    Register a new student user
// @route   POST /api/auth/register
// @access  Public
const registerUser = async (req, res, next) => {
  try {
    const { name, email, password, phone } = req.body;

    const userExists = await User.findOne({ email: email.toLowerCase().trim() });
    if (userExists) {
      return res.status(409).json({
        success: false,
        message: 'An account with this email already exists',
      });
    }

    // Role is strictly forced to 'student'. Normal users can NEVER register as admin.
    const user = await User.create({
      name: name.trim(),
      email: email.toLowerCase().trim(),
      password,
      phone: phone.trim(),
      role: 'student',
    });

    generateTokenAndSetCookie(res, user._id, user.role);

    res.status(201).json({
      success: true,
      message: 'Registration successful',
      data: {
        user: {
          _id: user._id,
          name: user.name,
          email: user.email,
          phone: user.phone,
          role: user.role,
          profileImage: user.profileImage,
          createdAt: user.createdAt,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Authenticate user & get token
// @route   POST /api/auth/login
// @access  Public
const loginUser = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email: email.toLowerCase().trim() }).select('+password');

    if (!user || !(await user.matchPassword(password))) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password',
      });
    }

    generateTokenAndSetCookie(res, user._id, user.role);

    res.status(200).json({
      success: true,
      message: 'Login successful',
      data: {
        user: {
          _id: user._id,
          name: user.name,
          email: user.email,
          phone: user.phone,
          role: user.role,
          profileImage: user.profileImage,
          createdAt: user.createdAt,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Logout current user & clear cookie
// @route   POST /api/auth/logout
// @access  Public
const logoutUser = (req, res) => {
  res.cookie('token', '', {
    httpOnly: true,
    expires: new Date(0),
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
  });

  res.status(200).json({
    success: true,
    message: 'Logged out successfully',
  });
};

// @desc    Get current logged in user
// @route   GET /api/auth/me
// @access  Private
const getMe = async (req, res) => {
  res.status(200).json({
    success: true,
    data: {
      user: req.user,
    },
  });
};

// @desc    Initiate forgot password request
// @route   POST /api/auth/forgot-password
// @access  Public
const forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;

    if (!email || !email.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid campus email address',
      });
    }

    const cleanEmail = email.toLowerCase().trim();
    const user = await User.findOne({ email: cleanEmail });

    if (!user) {
      // For security, do not disclose whether user exists or not
      return res.status(200).json({
        success: true,
        message: 'If that email address is registered with us, password reset instructions have been generated.',
      });
    }

    // Generate token and set expiry
    const resetToken = user.createPasswordResetToken();
    await user.save({ validateBeforeSave: false });

    // Determine host origin for clean reset URL
    const origin = req.get('origin') || `${req.protocol}://${req.get('host')}`;
    const resetUrl = `${origin}/reset-password?token=${resetToken}`;

    const hasSmtp = Boolean(process.env.SMTP_HOST && process.env.SMTP_USER);

    return res.status(200).json({
      success: true,
      message: 'Password reset link has been generated successfully.',
      data: {
        email: user.email,
        resetUrl,
        resetToken,
        expiresInMinutes: 15,
        demoNotice: !hasSmtp ? 'Demo Mode: Use the provided reset link or code to proceed directly.' : undefined,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Reset password using valid reset token
// @route   POST /api/auth/reset-password
// @access  Public
const resetPassword = async (req, res, next) => {
  try {
    const { token, password, confirmPassword } = req.body;

    if (!token || !token.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Password reset token is required',
      });
    }

    if (!password || password.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'New password must be at least 6 characters long',
      });
    }

    if (confirmPassword && password !== confirmPassword) {
      return res.status(400).json({
        success: false,
        message: 'Passwords do not match',
      });
    }

    // Hash incoming token to compare with stored hashed token
    const hashedToken = crypto
      .createHash('sha256')
      .update(token.trim())
      .digest('hex');

    const user = await User.findOne({
      resetPasswordToken: hashedToken,
      resetPasswordExpires: { $gt: Date.now() },
    }).select('+resetPasswordToken +resetPasswordExpires');

    if (!user) {
      return res.status(400).json({
        success: false,
        message: 'Reset token is invalid or has expired. Please request a new link.',
      });
    }

    // Update password and clear reset fields
    user.password = password;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;

    await user.save();

    res.status(200).json({
      success: true,
      message: 'Your password has been successfully reset. You can now log in.',
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Quick password reset using registered phone number verification
// @route   POST /api/auth/reset-password-phone
// @access  Public
const resetPasswordByPhone = async (req, res, next) => {
  try {
    const { email, phone, password, confirmPassword } = req.body;

    if (!email || !phone || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide email, registered phone number, and new password',
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'New password must be at least 6 characters long',
      });
    }

    if (confirmPassword && password !== confirmPassword) {
      return res.status(400).json({
        success: false,
        message: 'Passwords do not match',
      });
    }

    const cleanEmail = email.toLowerCase().trim();
    const cleanPhone = phone.trim();

    const user = await User.findOne({ email: cleanEmail });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'No account found matching this email address',
      });
    }

    const normalizePhone = (p) => String(p || '').replace(/[^0-9]/g, '');
    const enteredNorm = normalizePhone(cleanPhone);
    const userNorm = normalizePhone(user.phone);

    if (enteredNorm.length < 6 || (!userNorm.endsWith(enteredNorm) && !enteredNorm.endsWith(userNorm))) {
      return res.status(401).json({
        success: false,
        message: 'Phone number does not match our records for this account',
      });
    }

    user.password = password;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();

    res.status(200).json({
      success: true,
      message: 'Password successfully reset with phone verification. You can now log in.',
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  registerUser,
  loginUser,
  logoutUser,
  getMe,
  forgotPassword,
  resetPassword,
  resetPasswordByPhone,
};
