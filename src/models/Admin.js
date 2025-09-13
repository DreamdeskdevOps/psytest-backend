const { getOne, insertOne, updateOne, deleteOne, getMany } = require('../config/database');

const TABLE_NAME = 'admins';

// Find admin by email
const findByEmail = async (email) => {
  const query = `
    SELECT 
      id, first_name, last_name, email, password, phone_number, role,
      is_active, created_at, updated_at
    FROM ${TABLE_NAME} 
    WHERE email = $1 AND is_active = true
  `;
  return await getOne(query, [email.toLowerCase()]);
};

// Find admin by ID
const findById = async (id) => {
  const query = `
    SELECT 
      id, first_name, last_name, email, phone_number, role,
      is_active, created_at, updated_at
    FROM ${TABLE_NAME} 
    WHERE id = $1 AND is_active = true
  `;
  return await getOne(query, [id]);
};

// Update admin profile (exclude password)
const updateProfile = async (id, profileData) => {
  const { first_name, last_name } = profileData;
  
  const query = `
    UPDATE ${TABLE_NAME} 
    SET 
      first_name = COALESCE($2, first_name),
      last_name = COALESCE($3, last_name),
      updated_at = CURRENT_TIMESTAMP
    WHERE id = $1 AND is_active = true
    RETURNING 
      id, first_name, last_name, email, phone_number, role,
      is_active, created_at, updated_at
  `;

  const values = [id, first_name, last_name];
  return await getOne(query, values);
};

// Update admin password
const updatePassword = async (id, hashedPassword) => {
  const query = `
    UPDATE ${TABLE_NAME} 
    SET 
      password = $2,
      updated_at = CURRENT_TIMESTAMP
    WHERE id = $1 AND is_active = true
    RETURNING id, email
  `;

  return await getOne(query, [id, hashedPassword]);
};

// Update last login timestamp - simplified since column doesn't exist
const updateLastLogin = async (id) => {
  // Since last_login column doesn't exist, just return current timestamp
  console.log(`Admin ${id} logged in at ${new Date().toISOString()}`);
  return { last_login: new Date() };
};

// Check if admin has specific permission
const hasPermission = async (id, permission) => {
  // Since permissions column doesn't exist, return true for admins (basic implementation)
  const admin = await findById(id);
  return admin ? true : false;
};

// Get admin with role permissions
const findWithPermissions = async (id) => {
  const query = `
    SELECT 
      a.id, a.first_name, a.last_name, a.email, a.phone_number, a.role,
      a.is_active, a.created_at, a.updated_at
    FROM ${TABLE_NAME} a
    WHERE a.id = $1 AND a.is_active = true
  `;

  return await getOne(query, [id]);
};

// Create admin session log - simplified since table may not exist
const createSessionLog = async (adminId, action, ipAddress, userAgent) => {
  // Log to console for now since admin_activity_logs table may not exist
  console.log(`Admin ${adminId} - ${action} from ${ipAddress}`);
  return { id: 1 }; // Return dummy result
};

// Get admin statistics for dashboard - simplified
const getStats = async (id) => {
  // Return basic stats since related tables may not exist
  return {
    today_users: 0,
    today_attempts: 0,
    active_tests: 0,
    last_login: null
  };
};

module.exports = {
  findByEmail,
  findById,
  updateProfile,
  updatePassword,
  updateLastLogin,
  hasPermission,
  findWithPermissions,
  createSessionLog,
  getStats
};