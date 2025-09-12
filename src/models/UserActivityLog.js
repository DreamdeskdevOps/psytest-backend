const { getOne, insertOne, getMany } = require('../config/database');

class UserActivityLog {
  constructor() {
    this.tableName = 'user_activity_logs';
  }

  // Log user activity
  async create(activityData) {
    const {
      userId,
      activityType,
      description,
      testId = null,
      sectionId = null,
      ipAddress = null,
      userAgent = null,
      metadata = {}
    } = activityData;

    const query = `
      INSERT INTO ${this.tableName} (
        user_id, activity_type, description, test_id, section_id,
        ip_address, user_agent, metadata
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING id, created_at
    `;

    const values = [
      userId,
      activityType,
      description,
      testId,
      sectionId,
      ipAddress,
      userAgent,
      JSON.stringify(metadata)
    ];

    return await insertOne(query, values);
  }

  // Get user activities with pagination
  async findByUserId(userId, limit = 50, offset = 0) {
    const query = `
      SELECT 
        id, activity_type, description, test_id, section_id,
        ip_address, user_agent, metadata, created_at
      FROM ${this.tableName}
      WHERE user_id = $1
      ORDER BY created_at DESC
      LIMIT $2 OFFSET $3
    `;
    return await getMany(query, [userId, limit, offset]);
  }

  // Get recent activities for a user
  async getRecentActivities(userId, limit = 10) {
    const query = `
      SELECT 
        activity_type, description, created_at
      FROM ${this.tableName}
      WHERE user_id = $1
      ORDER BY created_at DESC
      LIMIT $2
    `;
    return await getMany(query, [userId, limit]);
  }

  // Count user activities
  async countByUserId(userId) {
    const query = `
      SELECT COUNT(*) as count 
      FROM ${this.tableName} 
      WHERE user_id = $1
    `;
    const result = await getOne(query, [userId]);
    return result ? parseInt(result.count) : 0;
  }

  // Get activity statistics for a user
  async getUserStats(userId) {
    const query = `
      SELECT 
        activity_type,
        COUNT(*) as count,
        MAX(created_at) as last_activity
      FROM ${this.tableName}
      WHERE user_id = $1
      GROUP BY activity_type
      ORDER BY count DESC
    `;
    return await getMany(query, [userId]);
  }

  // Get login history
  async getLoginHistory(userId, limit = 20) {
    const query = `
      SELECT 
        ip_address, user_agent, created_at
      FROM ${this.tableName}
      WHERE user_id = $1 AND activity_type = 'login'
      ORDER BY created_at DESC
      LIMIT $2
    `;
    return await getMany(query, [userId, limit]);
  }

  // Check if user has specific activity
  async hasActivity(userId, activityType, timeWindow = '24 hours') {
    const query = `
      SELECT id FROM ${this.tableName}
      WHERE user_id = $1 AND activity_type = $2
      AND created_at > NOW() - INTERVAL '${timeWindow}'
      LIMIT 1
    `;
    const result = await getOne(query, [userId, activityType]);
    return !!result;
  }

  // Get activities by type
  async findByActivityType(activityType, limit = 100, offset = 0) {
    const query = `
      SELECT 
        user_id, description, ip_address, created_at
      FROM ${this.tableName}
      WHERE activity_type = $1
      ORDER BY created_at DESC
      LIMIT $2 OFFSET $3
    `;
    return await getMany(query, [activityType, limit, offset]);
  }
}

module.exports = new UserActivityLog();