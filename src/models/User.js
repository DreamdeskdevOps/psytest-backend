const { getOne, insertOne, updateOne, deleteOne, getMany } = require('../config/database');

class User {
  constructor() {
    this.tableName = 'users';
  }

  // Create new user
  async create(userData) {
    const {
      firstName,
      lastName,
      email,
      password,
      phoneNumber,
      age,
      gender,
      dateOfBirth,
      schoolName,
      class: className,
      avatar = null,
      address = {}
    } = userData;

    const query = `
      INSERT INTO ${this.tableName} (
        first_name, last_name, email, password, phone_number, age, gender, date_of_birth, school_name, class,
        avatar, address, is_email_verified
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      RETURNING id, first_name, last_name, email, phone_number, date_of_birth,
                is_email_verified, subscription_type, created_at
    `;

    const values = [
      firstName,
      lastName,
      email.toLowerCase(),
      password,
      phoneNumber,
      age,
      gender,
      dateOfBirth,
      schoolName,
      className,
      avatar,
      JSON.stringify(address),
      true // Phone verified during registration
    ];

    return await insertOne(query, values);
  }

  // Find user by email
  async findByEmail(email) {
    const query = `SELECT * FROM ${this.tableName} WHERE email = $1`;
    return await getOne(query, [email.toLowerCase()]);
  }

  // Find user by phone number
  async findByPhone(phoneNumber) {
    const cleanPhone = phoneNumber.replace(/[\s+\-()]/g, '').replace(/^(\+91|91)/, '');
    const query = `SELECT * FROM ${this.tableName} WHERE phone_number = $1`;
    return await getOne(query, [cleanPhone]);
  }

  // Find user by ID
  async findById(id) {
    const query = `
      SELECT
        id, first_name, last_name, email, phone_number, avatar,
        date_of_birth, gender, address, is_email_verified,
        subscription_type, subscription_status, subscription_end_date,
        total_tests_attempted, total_tests_completed, average_score,
        best_score, age, school_name, class, created_at, updated_at
      FROM ${this.tableName}
      WHERE id = $1
    `;
    return await getOne(query, [id]);
  }

  // Find user by email or phone (for duplicate check)
  async findByEmailOrPhone(email, phoneNumber) {
    const cleanPhone = phoneNumber.replace(/[\s+\-()]/g, '').replace(/^(\+91|91)/, '');
    const query = `
      SELECT id, email, phone_number 
      FROM ${this.tableName} 
      WHERE email = $1 OR phone_number = $2
    `;
    return await getOne(query, [email.toLowerCase(), cleanPhone]);
  }

  // Update user profile
  async updateProfile(id, profileData) {
    // Build dynamic update query based on provided fields
    const updates = [];
    const values = [];
    let paramCount = 1;

    // Map camelCase to snake_case
    const fieldMapping = {
      firstName: 'first_name',
      lastName: 'last_name',
      phoneNumber: 'phone_number',
      dateOfBirth: 'date_of_birth',
      gender: 'gender',
      address: 'address',
      avatar: 'avatar',
      age: 'age',
      schoolName: 'school_name',
      class: 'class'
    };

    Object.keys(profileData).forEach(key => {
      const dbField = fieldMapping[key];
      if (dbField && profileData[key] !== undefined && profileData[key] !== null) {
        updates.push(`${dbField} = $${paramCount}`);

        // Handle special cases
        if (key === 'phoneNumber') {
          values.push(profileData[key].replace(/[\s+\-()]/g, '').replace(/^(\+91|91)/, ''));
        } else if (key === 'address') {
          values.push(JSON.stringify(profileData[key] || {}));
        } else {
          values.push(profileData[key]);
        }
        paramCount++;
      }
    });

    if (updates.length === 0) {
      // If no fields to update, just return current user
      return await this.findById(id);
    }

    // Add updated_at
    updates.push(`updated_at = CURRENT_TIMESTAMP`);

    const query = `
      UPDATE ${this.tableName} SET
        ${updates.join(', ')}
      WHERE id = $${paramCount}
      RETURNING id, first_name, last_name, email, phone_number,
                date_of_birth, gender, address, avatar, age, school_name, class, updated_at
    `;

    values.push(id);

    return await updateOne(query, values);
  }

  // Update password
  async updatePassword(id, hashedPassword) {
    const query = `
      UPDATE ${this.tableName} 
      SET password = $1, updated_at = CURRENT_TIMESTAMP 
      WHERE id = $2
    `;
    return await updateOne(query, [hashedPassword, id]);
  }

  // Update last login
  async updateLastLogin(id) {
    const query = `
      UPDATE ${this.tableName} 
      SET last_login = CURRENT_TIMESTAMP 
      WHERE id = $1
    `;
    return await updateOne(query, [id]);
  }

  // Update avatar
  async updateAvatar(id, avatarUrl) {
    const query = `
      UPDATE ${this.tableName} 
      SET avatar = $1, updated_at = CURRENT_TIMESTAMP 
      WHERE id = $2
      RETURNING avatar
    `;
    return await updateOne(query, [avatarUrl, id]);
  }

  // Check if email exists (excluding current user)
  async emailExists(email, excludeId = null) {
    let query = `SELECT id FROM ${this.tableName} WHERE email = $1`;
    let values = [email.toLowerCase()];

    if (excludeId) {
      query += ` AND id != $2`;
      values.push(excludeId);
    }

    const result = await getOne(query, values);
    return !!result;
  }

  // Check if phone exists (excluding current user)
  async phoneExists(phoneNumber, excludeId = null) {
    const cleanPhone = phoneNumber.replace(/[\s+\-()]/g, '').replace(/^(\+91|91)/, '');
    let query = `SELECT id FROM ${this.tableName} WHERE phone_number = $1`;
    let values = [cleanPhone];

    if (excludeId) {
      query += ` AND id != $2`;
      values.push(excludeId);
    }

    const result = await getOne(query, values);
    return !!result;
  }

  // Get user's password hash
  async getPasswordHash(id) {
    const query = `SELECT password FROM ${this.tableName} WHERE id = $1`;
    const result = await getOne(query, [id]);
    return result ? result.password : null;
  }

  // Update user status (active/blocked)
  async updateStatus(id, isActive, isBlocked = false) {
    const query = `
      UPDATE ${this.tableName} 
      SET is_active = $1, is_blocked = $2, updated_at = CURRENT_TIMESTAMP 
      WHERE id = $3
      RETURNING id, is_active, is_blocked
    `;
    return await updateOne(query, [isActive, isBlocked, id]);
  }

  // Update subscription info
  async updateSubscription(id, subscriptionData) {
    const {
      subscriptionType,
      subscriptionStatus,
      subscriptionStartDate,
      subscriptionEndDate
    } = subscriptionData;

    const query = `
      UPDATE ${this.tableName} 
      SET 
        subscription_type = $1,
        subscription_status = $2,
        subscription_start_date = $3,
        subscription_end_date = $4,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $5
      RETURNING subscription_type, subscription_status, subscription_start_date, subscription_end_date
    `;

    return await updateOne(query, [
      subscriptionType,
      subscriptionStatus,
      subscriptionStartDate,
      subscriptionEndDate,
      id
    ]);
  }

  // Update test statistics
  async updateTestStats(id, statsData) {
    const {
      totalTestsAttempted,
      totalTestsCompleted,
      averageScore,
      bestScore
    } = statsData;

    const query = `
      UPDATE ${this.tableName} 
      SET 
        total_tests_attempted = $1,
        total_tests_completed = $2,
        average_score = $3,
        best_score = $4,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $5
      RETURNING total_tests_attempted, total_tests_completed, average_score, best_score
    `;

    return await updateOne(query, [
      totalTestsAttempted,
      totalTestsCompleted,
      averageScore,
      bestScore,
      id
    ]);
  }

  // Get user statistics
  async getStats(id) {
    const query = `
      SELECT 
        total_tests_attempted,
        total_tests_completed,
        average_score,
        best_score,
        subscription_type,
        subscription_status,
        created_at
      FROM ${this.tableName} 
      WHERE id = $1
    `;
    return await getOne(query, [id]);
  }

  // Soft delete user
  async softDelete(id) {
    const query = `
      UPDATE ${this.tableName} 
      SET is_active = false, updated_at = CURRENT_TIMESTAMP 
      WHERE id = $1
    `;
    return await updateOne(query, [id]);
  }

  // Hard delete user (be careful with this)
  async hardDelete(id) {
    const query = `DELETE FROM ${this.tableName} WHERE id = $1`;
    return await deleteOne(query, [id]);
  }

  // Get all users with pagination
  async findAll(limit = 20, offset = 0, filters = {}) {
    let query = `
      SELECT 
        id, first_name, last_name, email, phone_number, 
        is_email_verified, is_active, is_blocked,
        subscription_type, subscription_status,
        total_tests_attempted, total_tests_completed,
        created_at, updated_at
      FROM ${this.tableName}
      WHERE 1=1
    `;
    
    const values = [];
    let paramCount = 0;

    // Add filters
    if (filters.isActive !== undefined) {
      paramCount++;
      query += ` AND is_active = $${paramCount}`;
      values.push(filters.isActive);
    }

    if (filters.isBlocked !== undefined) {
      paramCount++;
      query += ` AND is_blocked = $${paramCount}`;
      values.push(filters.isBlocked);
    }

    if (filters.subscriptionType) {
      paramCount++;
      query += ` AND subscription_type = $${paramCount}`;
      values.push(filters.subscriptionType);
    }

    if (filters.search) {
      paramCount++;
      query += ` AND (first_name ILIKE $${paramCount} OR last_name ILIKE $${paramCount} OR email ILIKE $${paramCount})`;
      values.push(`%${filters.search}%`);
    }

    // Add pagination
    query += ` ORDER BY created_at DESC LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`;
    values.push(limit, offset);

    return await getMany(query, values);
  }

  // Count users
  async count(filters = {}) {
    let query = `SELECT COUNT(*) as count FROM ${this.tableName} WHERE 1=1`;
    const values = [];
    let paramCount = 0;

    // Add same filters as findAll
    if (filters.isActive !== undefined) {
      paramCount++;
      query += ` AND is_active = $${paramCount}`;
      values.push(filters.isActive);
    }

    if (filters.isBlocked !== undefined) {
      paramCount++;
      query += ` AND is_blocked = $${paramCount}`;
      values.push(filters.isBlocked);
    }

    if (filters.subscriptionType) {
      paramCount++;
      query += ` AND subscription_type = $${paramCount}`;
      values.push(filters.subscriptionType);
    }

    if (filters.search) {
      paramCount++;
      query += ` AND (first_name ILIKE $${paramCount} OR last_name ILIKE $${paramCount} OR email ILIKE $${paramCount})`;
      values.push(`%${filters.search}%`);
    }

    const result = await getOne(query, values);
    return result ? parseInt(result.count) : 0;
  }
}

module.exports = new User();