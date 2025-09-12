const { getOne, insertOne, updateOne, executeQuery } = require('../config/database');
const { 
  generateToken, 
  generateRefreshToken, 
  hashPassword, 
  comparePassword 
} = require('../../middleware/auth');
const { validationResult } = require('express-validator');
const crypto = require('crypto');

// Register new user
const register = async (req, res) => {
  try {
    // Check validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        status: 'error',
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { firstName, lastName, email, password, phoneNumber } = req.body;

    // Check if user already exists
    const existingUser = await getOne(
      'SELECT id FROM users WHERE email = $1',
      [email.toLowerCase()]
    );

    if (existingUser) {
      return res.status(409).json({
        status: 'error',
        message: 'User with this email already exists'
      });
    }

    // Hash password
    const hashedPassword = await hashPassword(password);

    // Generate email verification token
    const emailVerificationToken = crypto.randomBytes(32).toString('hex');

    // Insert new user
    const newUser = await insertOne(`
      INSERT INTO users (
        first_name, last_name, email, password, phone_number, 
        email_verification_token
      ) VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING id, first_name, last_name, email, phone_number, 
                is_email_verified, subscription_type, created_at
    `, [firstName, lastName, email.toLowerCase(), hashedPassword, phoneNumber, emailVerificationToken]);

    // Generate tokens
    const token = generateToken({ 
      id: newUser.id, 
      email: newUser.email,
      type: 'user'
    });
    
    const refreshToken = generateRefreshToken({ 
      id: newUser.id, 
      email: newUser.email,
      type: 'user'
    });

    // Log activity
    await insertOne(`
      INSERT INTO user_activity_logs (user_id, activity_type, description, ip_address)
      VALUES ($1, $2, $3, $4)
    `, [
      newUser.id,
      'register',
      'User registered successfully',
      req.ip
    ]);

    res.status(201).json({
      status: 'success',
      message: 'User registered successfully',
      data: {
        user: newUser,
        token,
        refreshToken,
        emailVerificationRequired: true
      }
    });

  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Registration failed',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Login user
const login = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        status: 'error',
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { email, password } = req.body;

    // Get user with password
    const user = await getOne(
      'SELECT * FROM users WHERE email = $1',
      [email.toLowerCase()]
    );

    if (!user) {
      return res.status(401).json({
        status: 'error',
        message: 'Invalid email or password'
      });
    }

    // Check if user is active and not blocked
    if (!user.is_active) {
      return res.status(401).json({
        status: 'error',
        message: 'Account is deactivated'
      });
    }

    if (user.is_blocked) {
      return res.status(401).json({
        status: 'error',
        message: 'Account is blocked'
      });
    }

    // Check password
    const isPasswordValid = await comparePassword(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({
        status: 'error',
        message: 'Invalid email or password'
      });
    }

    // Update last login
    await updateOne(
      'UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = $1',
      [user.id]
    );

    // Generate tokens
    const token = generateToken({ 
      id: user.id, 
      email: user.email,
      type: 'user'
    });
    
    const refreshToken = generateRefreshToken({ 
      id: user.id, 
      email: user.email,
      type: 'user'
    });

    // Remove password from response
    delete user.password;
    delete user.password_reset_token;
    delete user.email_verification_token;

    // Log activity
    await insertOne(`
      INSERT INTO user_activity_logs (user_id, activity_type, description, ip_address, user_agent)
      VALUES ($1, $2, $3, $4, $5)
    `, [
      user.id,
      'login',
      'User logged in successfully',
      req.ip,
      req.get('User-Agent')
    ]);

    res.status(200).json({
      status: 'success',
      message: 'Login successful',
      data: {
        user,
        token,
        refreshToken
      }
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Login failed',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Get user profile
const getProfile = async (req, res) => {
  try {
    const userId = req.user.id;

    const user = await getOne(`
      SELECT 
        id, first_name, last_name, email, phone_number, avatar,
        date_of_birth, gender, address, is_email_verified,
        subscription_type, subscription_status, subscription_end_date,
        total_tests_attempted, total_tests_completed, average_score, best_score,
        created_at, updated_at
      FROM users 
      WHERE id = $1
    `, [userId]);

    if (!user) {
      return res.status(404).json({
        status: 'error',
        message: 'User not found'
      });
    }

    res.status(200).json({
      status: 'success',
      data: { user }
    });

  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to get profile'
    });
  }
};

// Update user profile
const updateProfile = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        status: 'error',
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const userId = req.user.id;
    const { firstName, lastName, phoneNumber, dateOfBirth, gender, address } = req.body;

    const updatedUser = await updateOne(`
      UPDATE users SET
        first_name = $1,
        last_name = $2,
        phone_number = $3,
        date_of_birth = $4,
        gender = $5,
        address = $6,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $7
      RETURNING id, first_name, last_name, email, phone_number, 
                date_of_birth, gender, address, updated_at
    `, [firstName, lastName, phoneNumber, dateOfBirth, gender, JSON.stringify(address || {}), userId]);

    // Log activity
    await insertOne(`
      INSERT INTO user_activity_logs (user_id, activity_type, description)
      VALUES ($1, $2, $3)
    `, [userId, 'profile_update', 'User updated profile']);

    res.status(200).json({
      status: 'success',
      message: 'Profile updated successfully',
      data: { user: updatedUser }
    });

  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to update profile'
    });
  }
};

// Change password
const changePassword = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        status: 'error',
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const userId = req.user.id;
    const { currentPassword, newPassword } = req.body;

    // Get current password hash
    const user = await getOne(
      'SELECT password FROM users WHERE id = $1',
      [userId]
    );

    // Verify current password
    const isCurrentPasswordValid = await comparePassword(currentPassword, user.password);
    if (!isCurrentPasswordValid) {
      return res.status(400).json({
        status: 'error',
        message: 'Current password is incorrect'
      });
    }

    // Hash new password
    const hashedNewPassword = await hashPassword(newPassword);

    // Update password
    await updateOne(
      'UPDATE users SET password = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
      [hashedNewPassword, userId]
    );

    // Log activity
    await insertOne(`
      INSERT INTO user_activity_logs (user_id, activity_type, description)
      VALUES ($1, $2, $3)
    `, [userId, 'password_change', 'User changed password']);

    res.status(200).json({
      status: 'success',
      message: 'Password changed successfully'
    });

  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to change password'
    });
  }
};

// Forgot password
const forgotPassword = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        status: 'error',
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { email } = req.body;

    const user = await getOne(
      'SELECT id, email, first_name FROM users WHERE email = $1 AND is_active = true',
      [email.toLowerCase()]
    );

    if (!user) {
      // Don't reveal if email exists for security
      return res.status(200).json({
        status: 'success',
        message: 'If email exists, password reset link has been sent'
      });
    }

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Save reset token
    await updateOne(`
      UPDATE users SET 
        password_reset_token = $1,
        password_reset_expires = $2,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $3
    `, [resetToken, resetExpires, user.id]);

    // Log activity
    await insertOne(`
      INSERT INTO user_activity_logs (user_id, activity_type, description)
      VALUES ($1, $2, $3)
    `, [user.id, 'password_reset_request', 'User requested password reset']);

    // Here you would send email with reset link
    // For now, we'll just return the token (remove in production)
    
    res.status(200).json({
      status: 'success',
      message: 'Password reset link sent to email',
      ...(process.env.NODE_ENV === 'development' && { resetToken })
    });

  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to process forgot password request'
    });
  }
};

// Reset password
const resetPassword = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        status: 'error',
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { token, newPassword } = req.body;

    const user = await getOne(`
      SELECT id FROM users 
      WHERE password_reset_token = $1 
        AND password_reset_expires > CURRENT_TIMESTAMP
        AND is_active = true
    `, [token]);

    if (!user) {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid or expired reset token'
      });
    }

    // Hash new password
    const hashedPassword = await hashPassword(newPassword);

    // Update password and clear reset token
    await updateOne(`
      UPDATE users SET 
        password = $1,
        password_reset_token = NULL,
        password_reset_expires = NULL,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
    `, [hashedPassword, user.id]);

    // Log activity
    await insertOne(`
      INSERT INTO user_activity_logs (user_id, activity_type, description)
      VALUES ($1, $2, $3)
    `, [user.id, 'password_reset', 'User reset password']);

    res.status(200).json({
      status: 'success',
      message: 'Password reset successfully'
    });

  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to reset password'
    });
  }
};

// Verify email
const verifyEmail = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        status: 'error',
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { token } = req.params;

    const user = await getOne(
      'SELECT id, email FROM users WHERE email_verification_token = $1',
      [token]
    );

    if (!user) {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid verification token'
      });
    }

    // Update email verification status
    await updateOne(`
      UPDATE users SET 
        is_email_verified = true,
        email_verification_token = NULL,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
    `, [user.id]);

    // Log activity
    await insertOne(`
      INSERT INTO user_activity_logs (user_id, activity_type, description)
      VALUES ($1, $2, $3)
    `, [user.id, 'email_verification', 'User verified email']);

    res.status(200).json({
      status: 'success',
      message: 'Email verified successfully'
    });

  } catch (error) {
    console.error('Email verification error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to verify email'
    });
  }
};

// Logout (client-side token removal, optional server-side blacklisting)
const logout = async (req, res) => {
  try {
    const userId = req.user.id;

    // Log activity
    await insertOne(`
      INSERT INTO user_activity_logs (user_id, activity_type, description)
      VALUES ($1, $2, $3)
    `, [userId, 'logout', 'User logged out']);

    res.status(200).json({
      status: 'success',
      message: 'Logged out successfully'
    });

  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Logout failed'
    });
  }
};

module.exports = {
  register,
  login,
  getProfile,
  updateProfile,
  changePassword,
  forgotPassword,
  resetPassword,
  verifyEmail,
  logout
};