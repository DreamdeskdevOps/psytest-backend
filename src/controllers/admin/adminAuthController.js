const AdminAuthService = require('../../services/adminAuthService');
const { validateEmail, validatePassword } = require('../../utils/validation');

// POST /api/v1/admin/auth/login
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    console.log('Admin login attempt:', email,password);
    const ipAddress = req.ip || req.connection.remoteAddress;
    const userAgent = req.get('User-Agent');

    // Validation
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email and password are required',
        data: null
      });
    }

    if (!validateEmail(email)) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid email address',
        data: null
      });
    }

    // Call service
    const result = await AdminAuthService.loginAdmin(
      { email, password },
      ipAddress,
      userAgent
    );

    // Set secure HTTP-only cookie for token (optional)
    if (result.success && result.data?.token) {
      res.cookie('adminToken', result.data.token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 24 * 60 * 60 * 1000 // 24 hours
      });
    }

    return res.status(result.statusCode).json({
      success: result.success,
      message: result.message,
      data: result.data
    });

  } catch (error) {
    console.error('Admin login controller error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      data: null
    });
  }
};

// POST /api/v1/admin/auth/logout
const logout = async (req, res) => {
  try {
    const adminId = req.admin.id; // From auth middleware
    const ipAddress = req.ip || req.connection.remoteAddress;
    const userAgent = req.get('User-Agent');

    // Call service
    const result = await AdminAuthService.logoutAdmin(adminId, ipAddress, userAgent);

    // Clear cookie
    res.clearCookie('adminToken');

    return res.status(result.statusCode).json({
      success: result.success,
      message: result.message,
      data: result.data
    });

  } catch (error) {
    console.error('Admin logout controller error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      data: null
    });
  }
};

// GET /api/v1/admin/auth/profile
const getProfile = async (req, res) => {
  try {
    const adminId = req.admin.id; // From auth middleware

    // Call service
    const result = await AdminAuthService.getAdminProfile(adminId);

    return res.status(result.statusCode).json({
      success: result.success,
      message: result.message,
      data: result.data
    });

  } catch (error) {
    console.error('Get admin profile controller error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      data: null
    });
  }
};

// PUT /api/v1/admin/auth/profile
const updateProfile = async (req, res) => {
  try {
    const adminId = req.admin.id; // From auth middleware
    const { name, avatar } = req.body;
    const ipAddress = req.ip || req.connection.remoteAddress;
    const userAgent = req.get('User-Agent');

    // Validation
    if (!name || name.trim().length < 2) {
      return res.status(400).json({
        success: false,
        message: 'Name must be at least 2 characters long',
        data: null
      });
    }

    if (avatar && !avatar.startsWith('http')) {
      return res.status(400).json({
        success: false,
        message: 'Avatar must be a valid URL',
        data: null
      });
    }

    // Call service
    const result = await AdminAuthService.updateAdminProfile(
      adminId,
      { name: name.trim(), avatar },
      ipAddress,
      userAgent
    );

    return res.status(result.statusCode).json({
      success: result.success,
      message: result.message,
      data: result.data
    });

  } catch (error) {
    console.error('Update admin profile controller error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      data: null
    });
  }
};

// POST /api/v1/admin/auth/change-password
const changePassword = async (req, res) => {
  try {
    const adminId = req.admin.id; // From auth middleware
    const { currentPassword, newPassword, confirmPassword } = req.body;
    const ipAddress = req.ip || req.connection.remoteAddress;
    const userAgent = req.get('User-Agent');

    // Validation
    if (!currentPassword || !newPassword || !confirmPassword) {
      return res.status(400).json({
        success: false,
        message: 'Current password, new password, and confirm password are required',
        data: null
      });
    }

    if (newPassword !== confirmPassword) {
      return res.status(400).json({
        success: false,
        message: 'New password and confirm password do not match',
        data: null
      });
    }

    const passwordValidation = validatePassword(newPassword);
    if (!passwordValidation.isValid) {
      return res.status(400).json({
        success: false,
        message: passwordValidation.message,
        data: null
      });
    }

    // Call service
    const result = await AdminAuthService.changeAdminPassword(
      adminId,
      { currentPassword, newPassword },
      ipAddress,
      userAgent
    );

    return res.status(result.statusCode).json({
      success: result.success,
      message: result.message,
      data: result.data
    });

  } catch (error) {
    console.error('Change admin password controller error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      data: null
    });
  }
};

// POST /api/v1/admin/auth/forgot-password-otp
const sendForgotPasswordOTP = async (req, res) => {
  try {
    const { email } = req.body;

    // Validation
    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email is required',
        data: null
      });
    }

    if (!validateEmail(email)) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid email address',
        data: null
      });
    }

    // Call service
    const result = await AdminAuthService.sendAdminForgotPasswordOTP(email);

    return res.status(result.statusCode).json({
      success: result.success,
      message: result.message,
      data: result.data
    });

  } catch (error) {
    console.error('Send admin forgot password OTP controller error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      data: null
    });
  }
};

// POST /api/v1/admin/auth/reset-password-otp
const resetPasswordWithOTP = async (req, res) => {
  try {
    const { email, phoneNumber, otpCode, newPassword, confirmPassword } = req.body;

    // Validation
    if (!email || !phoneNumber || !otpCode || !newPassword || !confirmPassword) {
      return res.status(400).json({
        success: false,
        message: 'All fields are required',
        data: null
      });
    }

    if (!validateEmail(email)) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid email address',
        data: null
      });
    }

    if (newPassword !== confirmPassword) {
      return res.status(400).json({
        success: false,
        message: 'New password and confirm password do not match',
        data: null
      });
    }

    const passwordValidation = validatePassword(newPassword);
    if (!passwordValidation.isValid) {
      return res.status(400).json({
        success: false,
        message: passwordValidation.message,
        data: null
      });
    }

    // Call service
    const result = await AdminAuthService.resetAdminPasswordWithOTP(
      email,
      phoneNumber,
      otpCode,
      newPassword
    );

    return res.status(result.statusCode).json({
      success: result.success,
      message: result.message,
      data: result.data
    });

  } catch (error) {
    console.error('Reset admin password with OTP controller error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      data: null
    });
  }
};

// POST /api/v1/admin/auth/verify-otp
const verifyOTP = async (req, res) => {
  try {
    const { phoneNumber, otpCode, purpose } = req.body;

    // Validation
    if (!phoneNumber || !otpCode || !purpose) {
      return res.status(400).json({
        success: false,
        message: 'Phone number, OTP code, and purpose are required',
        data: null
      });
    }

    // Call service
    const result = await AdminAuthService.verifyAdminOTP(phoneNumber, otpCode, purpose);

    return res.status(result.statusCode).json({
      success: result.success,
      message: result.message,
      data: result.data
    });

  } catch (error) {
    console.error('Verify admin OTP controller error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      data: null
    });
  }
};

// POST /api/v1/admin/auth/resend-otp
const resendOTP = async (req, res) => {
  try {
    const { phoneNumber, purpose, email } = req.body;

    // Validation
    if (!phoneNumber || !purpose) {
      return res.status(400).json({
        success: false,
        message: 'Phone number and purpose are required',
        data: null
      });
    }

    // Call service
    const result = await AdminAuthService.resendAdminOTP(phoneNumber, purpose, email);

    return res.status(result.statusCode).json({
      success: result.success,
      message: result.message,
      data: result.data
    });

  } catch (error) {
    console.error('Resend admin OTP controller error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      data: null
    });
  }
};

module.exports = {
  login,
  logout,
  getProfile,
  updateProfile,
  changePassword,
  sendForgotPasswordOTP,
  resetPasswordWithOTP,
  verifyOTP,
  resendOTP
};