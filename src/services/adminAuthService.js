const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const Admin = require('../models/Admin');
const { generateResponse } = require('../utils/helpers');
const OTP = require('../models/OTP');
const smsService = require('./smsService');

// Generate JWT Token
const generateToken = (admin) => {
  return jwt.sign(
    {
      id: admin.id,
      email: admin.email,
      role: admin.role,
      type: 'admin'
    },
    process.env.JWT_SECRET,
    {
      expiresIn: process.env.JWT_ADMIN_EXPIRES || '24h'
    }
  );
};

// Verify JWT Token
const verifyToken = (token) => {
  try {
    return jwt.verify(token, process.env.JWT_SECRET);
  } catch (error) {
    return null;
  }
};

// Admin Login Service
const loginAdmin = async (loginData, ipAddress, userAgent) => {
  const { email, password } = loginData;

  try {
    // Find admin by email
    const admin = await Admin.findByEmail(email);
    if (!admin) {
      return generateResponse(false, 'Invalid credentials', null, 401);
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, admin.password);
    if (!isPasswordValid) {
      return generateResponse(false, 'Invalid credentials', null, 401);
    }

    // Check if admin is active
    if (!admin.is_active) {
      return generateResponse(false, 'Account is inactive. Contact super admin.', null, 403);
    }

    // Generate JWT token
    const token = generateToken(admin);

    // Update last login
    await Admin.updateLastLogin(admin.id);

    // Log login activity
    await Admin.createSessionLog(admin.id, 'LOGIN', ipAddress, userAgent);

    // Prepare response data (exclude password)
    const adminData = {
      id: admin.id,
      name: `${admin.first_name} ${admin.last_name}`.trim(),
      firstName: admin.first_name,
      lastName: admin.last_name,
      email: admin.email,
      phoneNumber: admin.phone_number,
      role: admin.role,
      avatar: null, // Column doesn't exist
      permissions: [], // Column doesn't exist
      lastLogin: null // Column doesn't exist
    };

    return generateResponse(
      true, 
      'Login successful', 
      { 
        admin: adminData, 
        token,
        tokenType: 'Bearer'
      }, 
      200
    );

  } catch (error) {
    console.error('Admin login error:', error);
    return generateResponse(false, 'Login failed', null, 500);
  }
};

// Admin Logout Service
const logoutAdmin = async (adminId, ipAddress, userAgent) => {
  try {
    // Log the logout activity
    await Admin.createSessionLog(adminId, 'LOGOUT', ipAddress, userAgent);

    return generateResponse(true, 'Logged out successfully', null, 200);

  } catch (error) {
    console.error('Admin logout error:', error);
    return generateResponse(false, 'Logout failed', null, 500);
  }
};

// Get Admin Profile Service
const getAdminProfile = async (adminId) => {
  try {
    const admin = await Admin.findById(adminId);
    if (!admin) {
      return generateResponse(false, 'Admin not found', null, 404);
    }

    // Get additional stats for dashboard
    const stats = await Admin.getStats(adminId);

    const profileData = {
      id: admin.id,
      name: `${admin.first_name} ${admin.last_name}`.trim(),
      firstName: admin.first_name,
      lastName: admin.last_name,
      email: admin.email,
      phoneNumber: admin.phone_number,
      role: admin.role,
      avatar: null, // Column doesn't exist
      permissions: [], // Column doesn't exist
      lastLogin: null, // Column doesn't exist
      isActive: admin.is_active,
      createdAt: admin.created_at,
      updatedAt: admin.updated_at,
      stats: stats
    };

    return generateResponse(true, 'Profile retrieved successfully', profileData, 200);

  } catch (error) {
    console.error('Get admin profile error:', error);
    return generateResponse(false, 'Failed to retrieve profile', null, 500);
  }
};

// Update Admin Profile Service
const updateAdminProfile = async (adminId, updateData, ipAddress, userAgent) => {
  try {
    const { firstName, lastName } = updateData;

    // Validate admin exists
    const existingAdmin = await Admin.findById(adminId);
    if (!existingAdmin) {
      return generateResponse(false, 'Admin not found', null, 404);
    }

    // Update profile
    const updatedAdmin = await Admin.updateProfile(adminId, { first_name: firstName, last_name: lastName });
    if (!updatedAdmin) {
      return generateResponse(false, 'Failed to update profile', null, 400);
    }

    // Log profile update activity
    await Admin.createSessionLog(
      adminId, 
      'PROFILE_UPDATE', 
      ipAddress, 
      userAgent
    );

    const profileData = {
      id: updatedAdmin.id,
      name: `${updatedAdmin.first_name} ${updatedAdmin.last_name}`.trim(),
      firstName: updatedAdmin.first_name,
      lastName: updatedAdmin.last_name,
      email: updatedAdmin.email,
      phoneNumber: updatedAdmin.phone_number,
      role: updatedAdmin.role,
      avatar: null, // Column doesn't exist
      permissions: [], // Column doesn't exist
      lastLogin: null, // Column doesn't exist
      updatedAt: updatedAdmin.updated_at
    };

    return generateResponse(
      true, 
      'Profile updated successfully', 
      profileData, 
      200
    );

  } catch (error) {
    console.error('Update admin profile error:', error);
    return generateResponse(false, 'Failed to update profile', null, 500);
  }
};

// Change Admin Password Service
const changeAdminPassword = async (adminId, passwordData, ipAddress, userAgent) => {
  try {
    const { currentPassword, newPassword } = passwordData;

    // Find admin with password
    const admin = await Admin.findByEmail(
      (await Admin.findById(adminId)).email
    );
    
    if (!admin) {
      return generateResponse(false, 'Admin not found', null, 404);
    }

    // Verify current password
    const isCurrentPasswordValid = await bcrypt.compare(
      currentPassword, 
      admin.password
    );
    
    if (!isCurrentPasswordValid) {
      return generateResponse(false, 'Current password is incorrect', null, 400);
    }

    // Check if new password is different
    const isSamePassword = await bcrypt.compare(newPassword, admin.password);
    if (isSamePassword) {
      return generateResponse(
        false, 
        'New password must be different from current password', 
        null, 
        400
      );
    }

    // Hash new password
    const saltRounds = 12;
    const hashedNewPassword = await bcrypt.hash(newPassword, saltRounds);

    // Update password
    const result = await Admin.updatePassword(adminId, hashedNewPassword);
    if (!result) {
      return generateResponse(false, 'Failed to update password', null, 400);
    }

    // Log password change activity
    await Admin.createSessionLog(
      adminId, 
      'PASSWORD_CHANGE', 
      ipAddress, 
      userAgent
    );

    return generateResponse(
      true, 
      'Password changed successfully', 
      null, 
      200
    );

  } catch (error) {
    console.error('Change admin password error:', error);
    return generateResponse(false, 'Failed to change password', null, 500);
  }
};

// Send Forgot Password OTP for Admin
const sendAdminForgotPasswordOTP = async (email) => {
  try {
    // Find admin by email
    const admin = await Admin.findByEmail(email);
    if (!admin) {
      return generateResponse(false, 'Admin not found with this email', null, 404);
    }

    // Check if admin is active
    if (!admin.is_active) {
      return generateResponse(false, 'Account is inactive. Contact super admin.', null, 403);
    }

    // Check if admin has a phone number
    if (!admin.phone_number) {
      return generateResponse(false, 'No phone number registered. Contact super admin to update your profile.', null, 400);
    }

    // Validate phone number
    if (!smsService.validatePhoneNumber(admin.phone_number)) {
      return generateResponse(false, 'Invalid phone number format', null, 400);
    }

    // Check if there's a recent OTP (cooldown)
    const recentOTP = await OTP.findRecentOTP(admin.phone_number, 'admin_password_reset', 2);
    if (recentOTP) {
      return generateResponse(false, 'Please wait before requesting another OTP', null, 429);
    }

    // Generate OTP
    const otpCode = smsService.generateOTP();

    // Save OTP to database
    const otpRecord = await OTP.create({
      phoneNumber: admin.phone_number,
      email: admin.email,
      otpCode: otpCode,
      purpose: 'admin_password_reset'
    });

    // Send OTP via SMS (using 'login' purpose to match existing message pattern)
    const smsResult = await smsService.sendOTP(
      admin.phone_number,
      otpCode,
      'login',
      admin.first_name || 'Admin'
    );

    if (!smsResult.success) {
      await OTP.delete(otpRecord.id);
      return generateResponse(false, 'Failed to send OTP', null, 500);
    }

    // Format phone number for response
    const maskedPhone = admin.phone_number.replace(/(\d{2})\d{6}(\d{2})/, '$1******$2');

    return generateResponse(true, 'OTP sent to your registered phone number', {
      otpId: otpRecord.id,
      phoneNumber: maskedPhone,
      expiresAt: otpRecord.expires_at
    }, 200);

  } catch (error) {
    console.error('Send admin forgot password OTP error:', error);
    return generateResponse(false, 'Failed to send OTP', null, 500);
  }
};

// Reset Admin Password with OTP
const resetAdminPasswordWithOTP = async (email, phoneNumber, otpCode, newPassword) => {
  try {
    // Find admin by email
    const admin = await Admin.findByEmail(email);
    if (!admin) {
      return generateResponse(false, 'Admin not found', null, 404);
    }

    // Check if admin is active
    if (!admin.is_active) {
      return generateResponse(false, 'Account is inactive', null, 403);
    }

    // Verify phone number matches
    if (admin.phone_number !== phoneNumber.replace(/[\s+\-()]/g, '').replace(/^(\+91|91)/, '')) {
      return generateResponse(false, 'Phone number does not match', null, 400);
    }

    // Verify OTP
    const otpVerification = await OTP.verify(phoneNumber, otpCode, 'admin_password_reset');

    if (!otpVerification.success) {
      return generateResponse(false, 'Invalid or expired OTP', null, 400);
    }

    // Check if new password is different from current
    const isSamePassword = await bcrypt.compare(newPassword, admin.password);
    if (isSamePassword) {
      return generateResponse(false, 'New password must be different from current password', null, 400);
    }

    // Hash new password
    const saltRounds = 12;
    const hashedNewPassword = await bcrypt.hash(newPassword, saltRounds);

    // Update password
    const result = await Admin.updatePassword(admin.id, hashedNewPassword);

    if (!result) {
      return generateResponse(false, 'Failed to update password', null, 500);
    }

    // Clean up OTPs
    await OTP.deleteByPhoneAndPurpose(phoneNumber, 'admin_password_reset');

    // Log password reset activity
    await Admin.createSessionLog(
      admin.id,
      'PASSWORD_RESET_OTP',
      '0.0.0.0',
      'OTP Reset'
    );

    return generateResponse(true, 'Password reset successfully', null, 200);

  } catch (error) {
    console.error('Reset admin password with OTP error:', error);
    return generateResponse(false, error.message || 'Failed to reset password', null, 500);
  }
};

// Verify Admin OTP
const verifyAdminOTP = async (phoneNumber, otpCode, purpose) => {
  try {
    const result = await OTP.verify(phoneNumber, otpCode, purpose);
    return generateResponse(true, 'OTP verified successfully', {
      verified: true,
      otpId: result.otpId
    }, 200);
  } catch (error) {
    console.error('Verify admin OTP error:', error);
    return generateResponse(false, error.message || 'OTP verification failed', null, 400);
  }
};

// Resend Admin OTP
const resendAdminOTP = async (phoneNumber, purpose, email) => {
  try {
    // Find admin by email or phone
    let admin;
    if (email) {
      admin = await Admin.findByEmail(email);
    } else {
      const cleanPhone = phoneNumber.replace(/[\s+\-()]/g, '').replace(/^(\+91|91)/, '');
      admin = await Admin.findOne({ where: { phone_number: cleanPhone } });
    }

    if (!admin) {
      return generateResponse(false, 'Admin not found', null, 404);
    }

    if (!admin.is_active) {
      return generateResponse(false, 'Account is inactive', null, 403);
    }

    // Check cooldown
    const recentOTP = await OTP.findRecentOTP(admin.phone_number, purpose, 2);
    if (recentOTP) {
      return generateResponse(false, 'Please wait before requesting another OTP', null, 429);
    }

    // Generate new OTP
    const otpCode = smsService.generateOTP();

    // Delete old OTPs
    await OTP.deleteByPhoneAndPurpose(admin.phone_number, purpose);

    // Create new OTP
    const otpRecord = await OTP.create({
      phoneNumber: admin.phone_number,
      email: admin.email,
      otpCode: otpCode,
      purpose: purpose
    });

    // Send OTP (using 'login' purpose to match existing message pattern)
    const smsResult = await smsService.sendOTP(
      admin.phone_number,
      otpCode,
      'login',
      admin.first_name || 'Admin'
    );

    if (!smsResult.success) {
      await OTP.delete(otpRecord.id);
      return generateResponse(false, 'Failed to send OTP', null, 500);
    }

    // Format phone number for response
    const maskedPhone = admin.phone_number.replace(/(\d{2})\d{6}(\d{2})/, '$1******$2');

    return generateResponse(true, 'OTP resent successfully', {
      otpId: otpRecord.id,
      phoneNumber: maskedPhone,
      expiresAt: otpRecord.expires_at
    }, 200);

  } catch (error) {
    console.error('Resend admin OTP error:', error);
    return generateResponse(false, 'Failed to resend OTP', null, 500);
  }
};

// Check Admin Permission
const checkAdminPermission = async (adminId, permission) => {
  try {
    return await Admin.hasPermission(adminId, permission);
  } catch (error) {
    console.error('Check permission error:', error);
    return false;
  }
};

module.exports = {
  loginAdmin,
  logoutAdmin,
  getAdminProfile,
  updateAdminProfile,
  changeAdminPassword,
  sendAdminForgotPasswordOTP,
  resetAdminPasswordWithOTP,
  verifyAdminOTP,
  resendAdminOTP,
  generateToken,
  verifyToken,
  checkAdminPermission
};