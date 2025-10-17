const User = require('../models/User');
const OTP = require('../models/Otp');
const UserActivityLog = require('../models/UserActivityLog');
const smsService = require('./smsService');
const { hashPassword, comparePassword, generateToken, generateRefreshToken } = require('../middleware/auth');

class AuthService {
  // Send registration OTP
  async sendRegistrationOTP(phoneNumber, email) {
    // Validate inputs
    if (!smsService.validatePhoneNumber(phoneNumber)) {
      throw new Error('Invalid phone number format');
    }

    // Check if user already exists
    const existingUser = await User.findByEmailOrPhone(email, phoneNumber);
    if (existingUser) {
      throw new Error('User with this email or phone number already exists');
    }

    // Check for recent OTP
    const recentOTP = await OTP.findRecentOTP(phoneNumber, 'registration');
    if (recentOTP) {
      throw new Error('Please wait 2 minutes before requesting another OTP');
    }

    // Generate and send OTP
    const otpCode = smsService.generateOTP();

    
    // Delete any existing OTPs for this phone and purpose
    await OTP.deleteByPhoneAndPurpose(phoneNumber, 'registration');

    // Create new OTP record
    const otpRecord = await OTP.create({
      phoneNumber,
      email,
      otpCode,
      purpose: 'registration'
    });

    // Send SMS
    const smsResult = await smsService.sendOTP(phoneNumber, otpCode, 'registration');
    
    if (!smsResult.success) {
      await OTP.delete(otpRecord.id);
      throw new Error('Failed to send OTP. Please try again.');
    }

    return {
      otpId: otpRecord.id,
      phoneNumber: smsService.formatPhoneNumber(phoneNumber),
      expiresAt: otpRecord.expires_at,
      messageId: smsResult.messageId
    };
  }

  // Register user with OTP verification
  async registerUser(userData) {
    const { firstName, lastName, email, password, phoneNumber, otpCode, age, gender, dateOfBirth, schoolName, class: className } = userData;

    console.log('Registering user with data:', { firstName, lastName, email, phoneNumber, dateOfBirth, otpCode });

    // Verify OTP
    const otpVerification = await OTP.verify(phoneNumber, otpCode, 'registration');
    if (!otpVerification.success) {
      throw new Error('Invalid OTP verification');
    }

    // Double-check user doesn't exist
    const existingUser = await User.findByEmailOrPhone(email, phoneNumber);
    if (existingUser) {
      throw new Error('User with this email or phone number already exists');
    }

    // Hash password
    const hashedPassword = await hashPassword(password);

    // Create user
    const newUser = await User.create({
      firstName,
      lastName,
      email,
      password: hashedPassword,
      phoneNumber,
      age,
      gender,
      dateOfBirth,
      schoolName,
      class: className
    });

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

    // Clean up OTP
    await OTP.cleanupOldOTPs(phoneNumber, 'registration', false);

    return {
      user: newUser,
      token,
      refreshToken
    };
  }

  // Login user
  async loginUser(loginIdentifier, password, ipAddress, userAgent) {
    let user;
    // Check if loginIdentifier is an email or a phone number
    if (loginIdentifier.includes('@')) {
      user = await User.findByEmail(loginIdentifier);
    } else {
      user = await User.findByPhone(loginIdentifier);
    }

    if (!user) {
      throw new Error('Invalid credentials');
    }

    // Check user status
    if (!user.is_active) {
      throw new Error('Account is deactivated');
    }

    if (user.is_blocked) {
      throw new Error('Account is blocked');
    }

    // Verify password
    const isPasswordValid = await comparePassword(password, user.password);
    if (!isPasswordValid) {
      throw new Error('Invalid credentials');
    }

    // Update last login
    await User.updateLastLogin(user.id);

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

    // Log activity
    await UserActivityLog.create({
      userId: user.id,
      activityType: 'login',
      description: 'User logged in successfully',
      ipAddress,
      userAgent
    });

    // Remove sensitive data
    delete user.password;
    delete user.password_reset_token;
    delete user.email_verification_token;

    return {
      user,
      token,
      refreshToken
    };
  }

  // Send forgot password OTP
  async sendForgotPasswordOTP(email) {
    const user = await User.findByEmail(email);
    if (!user) {
      // Don't reveal if email exists for security
      return {
        message: 'If the email exists, OTP has been sent to the registered phone number'
      };
    }

    if (!user.phone_number) {
      throw new Error('No phone number registered with this account');
    }

    // Check for recent OTP
    const recentOTP = await OTP.findRecentOTP(user.phone_number, 'password_reset');
    if (recentOTP) {
      throw new Error('Please wait 2 minutes before requesting another OTP');
    }

    // Generate and send OTP
    const otpCode = smsService.generateOTP();
    
    // Delete existing OTPs
    await OTP.deleteByPhoneAndPurpose(user.phone_number, 'password_reset');

    // Create new OTP
    const otpRecord = await OTP.create({
      phoneNumber: user.phone_number,
      email: user.email,
      otpCode,
      purpose: 'password_reset'
    });

    // Send SMS
    const smsResult = await smsService.sendOTP(user.phone_number, otpCode, 'password_reset');
    
    if (!smsResult.success) {
      await OTP.delete(otpRecord.id);
      throw new Error('Failed to send OTP. Please try again.');
    }

    // Log activity
    await UserActivityLog.create({
      userId: user.id,
      activityType: 'password_reset_request',
      description: 'User requested password reset via OTP'
    });

    return {
      otpId: otpRecord.id,
      phoneNumber: `****${user.phone_number.slice(-4)}`, // Masked
      expiresAt: otpRecord.expires_at
    };
  }

  // Reset password with OTP
  async resetPasswordWithOTP(email, phoneNumber, otpCode, newPassword) {
    // Verify OTP
    const otpVerification = await OTP.verify(phoneNumber, otpCode, 'password_reset');
    if (!otpVerification.success) {
      throw new Error('Invalid or expired OTP');
    }

    // Find user by email and phone
    const cleanPhone = phoneNumber.replace(/[\s+\-()]/g, '').replace(/^(\+91|91)/, '');
    const user = await User.findByEmail(email);
    
    if (!user || user.phone_number !== cleanPhone) {
      throw new Error('Invalid email or phone number');
    }

    // Hash new password
    const hashedPassword = await hashPassword(newPassword);

    // Update password
    await User.updatePassword(user.id, hashedPassword);

    // Log activity
    await UserActivityLog.create({
      userId: user.id,
      activityType: 'password_reset',
      description: 'User reset password via OTP'
    });

    // Clean up OTP
    await OTP.cleanupOldOTPs(phoneNumber, 'password_reset', false);

    return { success: true };
  }

  // Change password
  async changePassword(userId, currentPassword, newPassword) {
    // Get current password hash
    const currentHash = await User.getPasswordHash(userId);
    if (!currentHash) {
      throw new Error('User not found');
    }

    // Verify current password
    const isCurrentPasswordValid = await comparePassword(currentPassword, currentHash);
    if (!isCurrentPasswordValid) {
      throw new Error('Current password is incorrect');
    }

    // Hash new password
    const hashedNewPassword = await hashPassword(newPassword);

    // Update password
    await User.updatePassword(userId, hashedNewPassword);

    // Log activity
    await UserActivityLog.create({
      userId,
      activityType: 'password_change',
      description: 'User changed password'
    });

    return { success: true };
  }

  // Get user profile
  async getUserProfile(userId) {
    const user = await User.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }
    return user;
  }

  // Update user profile
  async updateUserProfile(userId, profileData, otpCode = null) {
    const currentUser = await User.findById(userId);
    if (!currentUser) {
      throw new Error('User not found');
    }

    // Check if phone number is being changed
    if (profileData.phoneNumber && profileData.phoneNumber !== currentUser.phone_number) {
      if (!otpCode) {
        throw new Error('OTP verification required for phone number change');
      }

      // Verify OTP for phone change
      const otpVerification = await OTP.verify(profileData.phoneNumber, otpCode, 'phone_verification');
      if (!otpVerification.success) {
        throw new Error('Invalid OTP for phone number verification');
      }

      // Check if new phone number is already in use
      const phoneExists = await User.phoneExists(profileData.phoneNumber, userId);
      if (phoneExists) {
        throw new Error('Phone number is already registered with another account');
      }
    }

    // Update profile
    const updatedUser = await User.updateProfile(userId, profileData);

    // Log activity
    await UserActivityLog.create({
      userId,
      activityType: 'profile_update',
      description: 'User updated profile'
    });

    // Clean up phone verification OTP if used
    if (otpCode && profileData.phoneNumber) {
      await OTP.cleanupOldOTPs(profileData.phoneNumber, 'phone_verification', false);
    }

    return updatedUser;
  }

  // Send phone verification OTP
  async sendPhoneVerificationOTP(phoneNumber, userEmail, excludeUserId) {
    if (!smsService.validatePhoneNumber(phoneNumber)) {
      throw new Error('Invalid phone number format');
    }

    // Check if phone is already in use
    const phoneExists = await User.phoneExists(phoneNumber, excludeUserId);
    if (phoneExists) {
      throw new Error('Phone number is already registered with another account');
    }

    // Check for recent OTP
    const recentOTP = await OTP.findRecentOTP(phoneNumber, 'phone_verification');
    if (recentOTP) {
      throw new Error('Please wait 2 minutes before requesting another OTP');
    }

    // Generate and send OTP
    const otpCode = smsService.generateOTP();
    
    // Delete existing OTPs
    await OTP.deleteByPhoneAndPurpose(phoneNumber, 'phone_verification');

    // Create new OTP
    const otpRecord = await OTP.create({
      phoneNumber,
      email: userEmail,
      otpCode,
      purpose: 'phone_verification'
    });

    // Send SMS
    const smsResult = await smsService.sendOTP(phoneNumber, otpCode, 'phone_verification');
    
    if (!smsResult.success) {
      await OTP.delete(otpRecord.id);
      throw new Error('Failed to send OTP. Please try again.');
    }

    return {
      otpId: otpRecord.id,
      phoneNumber: smsService.formatPhoneNumber(phoneNumber),
      expiresAt: otpRecord.expires_at
    };
  }

  // Resend OTP
  async resendOTP(phoneNumber, purpose, email = null) {
    // Check cooldown
    const recentOTP = await OTP.findRecentOTP(phoneNumber, purpose);
    if (recentOTP) {
      const timeSinceLastOTP = Date.now() - new Date(recentOTP.created_at).getTime();
      if (timeSinceLastOTP < 2 * 60 * 1000) { // 2 minutes
        const waitTime = Math.ceil((2 * 60 * 1000 - timeSinceLastOTP) / 1000);
        throw new Error(`Please wait ${waitTime} seconds before requesting another OTP`);
      }
    }

    // Generate new OTP based on purpose
    switch (purpose) {
      case 'registration':
        return await this.sendRegistrationOTP(phoneNumber, email);
      case 'password_reset':
        if (!email) throw new Error('Email required for password reset OTP');
        return await this.sendForgotPasswordOTP(email);
      case 'phone_verification':
        if (!email) throw new Error('Email required for phone verification OTP');
        return await this.sendPhoneVerificationOTP(phoneNumber, email);
      default:
        throw new Error('Invalid OTP purpose');
    }
  }

  // Verify OTP
  async verifyOTP(phoneNumber, otpCode, purpose) {
    return await OTP.verify(phoneNumber, otpCode, purpose);
  }

  // Get OTP status
  async getOTPStatus(phoneNumber, purpose) {
    return await OTP.getStatus(phoneNumber, purpose);
  }

  // Validate credentials and send login OTP
  async validateCredentialsAndSendLoginOTP(email, password) {
    // Find user by email
    const user = await User.findByEmail(email);

    if (!user) {
      throw new Error('Invalid credentials');
    }

    // Check user status
    if (!user.is_active) {
      throw new Error('Account is deactivated');
    }

    if (user.is_blocked) {
      throw new Error('Account is blocked');
    }

    // Verify password
    const isPasswordValid = await comparePassword(password, user.password);
    if (!isPasswordValid) {
      throw new Error('Invalid credentials');
    }

    // Credentials are valid, now send login OTP to user's phone
    const phoneNumber = user.phone_number;

    if (!phoneNumber) {
      throw new Error('No phone number associated with this account');
    }

    // Check for recent OTP
    const recentOTP = await OTP.findRecentOTP(phoneNumber, 'login');
    if (recentOTP) {
      throw new Error('Please wait 2 minutes before requesting another OTP');
    }

    // Generate and send OTP
    const otpCode = smsService.generateOTP();

    // Delete any existing OTPs for this phone and purpose
    await OTP.deleteByPhoneAndPurpose(phoneNumber, 'login');

    // Create new OTP record
    const otpRecord = await OTP.create({
      phoneNumber,
      email: user.email,
      otpCode,
      purpose: 'login'
    });

    // Send SMS
    const smsResult = await smsService.sendOTP(phoneNumber, otpCode, 'login');

    if (!smsResult.success) {
      await OTP.delete(otpRecord.id);
      throw new Error('Failed to send OTP. Please try again.');
    }

    return {
      otpId: otpRecord.id,
      phoneNumber: phoneNumber,
      expiresAt: otpRecord.expires_at,
      userId: user.id
    };
  }

  // Complete login with OTP verification
  async completeLoginWithOTP(phoneNumber, otpCode, userId) {
    // Verify OTP
    const otpVerification = await OTP.verify(phoneNumber, otpCode, 'login');

    if (!otpVerification.success) {
      throw new Error('Invalid or expired OTP');
    }

    // Get user data
    const user = await User.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    // Update last login
    await User.updateLastLogin(user.id);

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

    // Log activity
    await UserActivityLog.create({
      userId: user.id,
      activityType: 'login',
      description: 'User logged in with OTP verification'
    });

    // Clean up OTP
    await OTP.cleanupOldOTPs(phoneNumber, 'login', false);

    // Return user data and tokens
    const { password: _, ...userWithoutPassword } = user;
    return {
      user: userWithoutPassword,
      token,
      refreshToken
    };
  }

  // Logout user
  async logoutUser(userId) {
    await UserActivityLog.create({
      userId,
      activityType: 'logout',
      description: 'User logged out'
    });

    return { success: true };
  }
}

module.exports = new AuthService();