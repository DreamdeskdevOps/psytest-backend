const { getOne, insertOne, updateOne, deleteOne, getMany } = require('../config/database');

class OTP {
  constructor() {
    this.tableName = 'user_otps';
    this.otpExpiry = 10 * 60 * 1000; // 10 minutes
    this.maxAttempts = 3;
    this.resendCooldown = 2 * 60 * 1000; // 2 minutes
  }

  // Create new OTP record
  async create(otpData) {
    const {
      phoneNumber,
      email = null,
      otpCode,
      purpose
    } = otpData;

    const cleanPhone = phoneNumber.replace(/[\s+\-()]/g, '').replace(/^(\+91|91)/, '');
    const expiresAt = new Date(Date.now() + this.otpExpiry);

    const query = `
      INSERT INTO ${this.tableName} (phone_number, email, otp_code, purpose, expires_at)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING id, phone_number, purpose, expires_at, created_at
    `;

    return await insertOne(query, [cleanPhone, email, otpCode, purpose, expiresAt]);
  }

  // Find OTP by phone and purpose
  async findByPhoneAndPurpose(phoneNumber, purpose) {
    const cleanPhone = phoneNumber.replace(/[\s+\-()]/g, '').replace(/^(\+91|91)/, '');
    const query = `
      SELECT * FROM ${this.tableName} 
      WHERE phone_number = $1 AND purpose = $2 AND is_verified = false
      ORDER BY created_at DESC LIMIT 1
    `;
    return await getOne(query, [cleanPhone, purpose]);
  }

  // Find recent OTP (for cooldown check)
  async findRecentOTP(phoneNumber, purpose, cooldownMinutes = 2) {
    const cleanPhone = phoneNumber.replace(/[\s+\-()]/g, '').replace(/^(\+91|91)/, '');
    const query = `
      SELECT created_at FROM ${this.tableName} 
      WHERE phone_number = $1 AND purpose = $2 
      AND created_at > NOW() - INTERVAL '${cooldownMinutes} minutes'
      ORDER BY created_at DESC LIMIT 1
    `;
    return await getOne(query, [cleanPhone, purpose]);
  }

  // Verify OTP
  async verify(phoneNumber, otpCode, purpose) {
    const cleanPhone = phoneNumber.replace(/[\s+\-()]/g, '').replace(/^(\+91|91)/, '');
    
    // Get OTP record
    const otpRecord = await this.findByPhoneAndPurpose(phoneNumber, purpose);
    
    if (!otpRecord) {
      throw new Error('No valid OTP found. Please request a new OTP.');
    }

    // Check if OTP has expired
    if (new Date() > new Date(otpRecord.expires_at)) {
      await this.delete(otpRecord.id);
      throw new Error('OTP has expired. Please request a new one.');
    }

    // Check max attempts
    if (otpRecord.attempts >= this.maxAttempts) {
      await this.delete(otpRecord.id);
      throw new Error('Maximum verification attempts exceeded. Please request a new OTP.');
    }

    // Verify OTP code
    if (otpRecord.otp_code !== otpCode) {
      // Increment attempts
      await this.incrementAttempts(otpRecord.id);
      const remainingAttempts = this.maxAttempts - (otpRecord.attempts + 1);
      throw new Error(`Invalid OTP. ${remainingAttempts} attempts remaining.`);
    }

    // Mark OTP as verified
    await this.markAsVerified(otpRecord.id);

    return {
      success: true,
      otpId: otpRecord.id,
      email: otpRecord.email
    };
  }

  // Mark OTP as verified
  async markAsVerified(id) {
    const query = `
      UPDATE ${this.tableName} 
      SET is_verified = true, updated_at = CURRENT_TIMESTAMP 
      WHERE id = $1
      RETURNING id, is_verified
    `;
    return await updateOne(query, [id]);
  }

  // Increment attempts
  async incrementAttempts(id) {
    const query = `
      UPDATE ${this.tableName} 
      SET attempts = attempts + 1, updated_at = CURRENT_TIMESTAMP 
      WHERE id = $1
      RETURNING attempts
    `;
    return await updateOne(query, [id]);
  }

  // Delete OTP record
  async delete(id) {
    const query = `DELETE FROM ${this.tableName} WHERE id = $1`;
    return await deleteOne(query, [id]);
  }

  // Delete OTPs by phone and purpose
  async deleteByPhoneAndPurpose(phoneNumber, purpose) {
    const cleanPhone = phoneNumber.replace(/[\s+\-()]/g, '').replace(/^(\+91|91)/, '');
    const query = `
      DELETE FROM ${this.tableName} 
      WHERE phone_number = $1 AND purpose = $2
    `;
    return await deleteOne(query, [cleanPhone, purpose]);
  }

  // Check if OTP is verified
  async isVerified(phoneNumber, purpose, otpId = null) {
    const cleanPhone = phoneNumber.replace(/[\s+\-()]/g, '').replace(/^(\+91|91)/, '');

    let query = `
      SELECT id FROM ${this.tableName} 
      WHERE phone_number = $1 AND purpose = $2 AND is_verified = true
      AND expires_at > CURRENT_TIMESTAMP
    `;
    let params = [cleanPhone, purpose];

    if (otpId) {
      query += ` AND id = $3`;
      params.push(otpId);
    }

    query += ` ORDER BY updated_at DESC LIMIT 1`;

    const result = await getOne(query, params);
    return !!result;
  }

  // Get OTP status
  async getStatus(phoneNumber, purpose) {
    const cleanPhone = phoneNumber.replace(/[\s+\-()]/g, '').replace(/^(\+91|91)/, '');

    const query = `
      SELECT id, attempts, is_verified, expires_at, created_at 
      FROM ${this.tableName} 
      WHERE phone_number = $1 AND purpose = $2
      ORDER BY created_at DESC LIMIT 1
    `;

    const otpRecord = await getOne(query, [cleanPhone, purpose]);

    if (!otpRecord) {
      return {
        exists: false,
        message: 'No OTP found'
      };
    }

    const now = new Date();
    const expiresAt = new Date(otpRecord.expires_at);
    const isExpired = now > expiresAt;

    return {
      exists: true,
      isVerified: otpRecord.is_verified,
      isExpired: isExpired,
      attempts: otpRecord.attempts,
      maxAttempts: this.maxAttempts,
      expiresAt: expiresAt,
      timeRemaining: isExpired ? 0 : Math.floor((expiresAt - now) / 1000)
    };
  }

  // Clean up expired OTPs
  async cleanupExpired() {
    const query = `
      DELETE FROM ${this.tableName} 
      WHERE expires_at < CURRENT_TIMESTAMP
    `;
    return await deleteOne(query);
  }

  // Clean up old OTPs for specific phone and purpose (keep only latest verified)
  async cleanupOldOTPs(phoneNumber, purpose, keepLatestVerified = true) {
    const cleanPhone = phoneNumber.replace(/[\s+\-()]/g, '').replace(/^(\+91|91)/, '');

    if (keepLatestVerified) {
      // Keep the latest verified OTP, delete others
      const query = `
        DELETE FROM ${this.tableName} 
        WHERE phone_number = $1 AND purpose = $2 
        AND id NOT IN (
          SELECT id FROM ${this.tableName} 
          WHERE phone_number = $1 AND purpose = $2 AND is_verified = true
          ORDER BY updated_at DESC LIMIT 1
        )
      `;
      return await deleteOne(query, [cleanPhone, purpose]);
    } else {
      // Delete all OTPs for this phone and purpose
      return await this.deleteByPhoneAndPurpose(phoneNumber, purpose);
    }
  }

  // Get all OTPs for a phone number
  async findByPhone(phoneNumber, limit = 10) {
    const cleanPhone = phoneNumber.replace(/[\s+\-()]/g, '').replace(/^(\+91|91)/, '');
    const query = `
      SELECT id, purpose, attempts, is_verified, expires_at, created_at
      FROM ${this.tableName} 
      WHERE phone_number = $1
      ORDER BY created_at DESC LIMIT $2
    `;
    return await getMany(query, [cleanPhone, limit]);
  }

  // Count OTPs sent today for a phone number (rate limiting)
  async countTodayOTPs(phoneNumber) {
    const cleanPhone = phoneNumber.replace(/[\s+\-()]/g, '').replace(/^(\+91|91)/, '');
    const query = `
      SELECT COUNT(*) as count FROM ${this.tableName} 
      WHERE phone_number = $1 
      AND created_at >= CURRENT_DATE
    `;
    const result = await getOne(query, [cleanPhone]);
    return result ? parseInt(result.count) : 0;
  }

  // Get OTP statistics
  async getStats(phoneNumber = null) {
    let query = `
      SELECT 
        COUNT(*) as total_otps,
        COUNT(CASE WHEN is_verified = true THEN 1 END) as verified_otps,
        COUNT(CASE WHEN expires_at < CURRENT_TIMESTAMP THEN 1 END) as expired_otps,
        AVG(attempts) as avg_attempts
      FROM ${this.tableName}
    `;
    
    const values = [];
    
    if (phoneNumber) {
      const cleanPhone = phoneNumber.replace(/[\s+\-()]/g, '').replace(/^(\+91|91)/, '');
      query += ` WHERE phone_number = $1`;
      values.push(cleanPhone);
    }

    return await getOne(query, values);
  }
}

module.exports = new OTP();