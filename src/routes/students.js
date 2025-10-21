const express = require('express');
const router = express.Router();
const { executeQuery } = require('../config/database');
const { hashPassword } = require('../middleware/auth');

/**
 * @route   GET /api/students
 * @desc    Get all students with their test progress
 * @access  Admin only
 */
router.get('/', async (req, res) => {
  try {
    console.log('📋 Fetching all students...');

    // Get all users with their test statistics
    const query = `
      SELECT
        u.id,
        u.first_name,
        u.last_name,
        u.first_name || ' ' || u.last_name as full_name,
        u.email,
        u.phone_number,
        u.date_of_birth,
        u.gender,
        u.age,
        u.school_name,
        u.class,
        u.whatsapp_number,
        u.avatar,
        u.is_active,
        u.is_blocked,
        u.is_email_verified,
        u.last_login,
        u.created_at,
        u.updated_at,
        u.total_tests_attempted,
        u.total_tests_completed,
        u.average_score,
        u.best_score,
        -- Count completed tests
        (SELECT COUNT(*)
         FROM test_attempts ta
         WHERE ta.user_id = u.id
         AND ta.status = 'completed'
        ) as tests_completed,
        -- Count in-progress tests
        (SELECT COUNT(*)
         FROM test_attempts ta
         WHERE ta.user_id = u.id
         AND ta.status = 'in_progress'
        ) as tests_in_progress,
        -- Get last active time (most recent test attempt or login)
        GREATEST(
          u.last_login,
          (SELECT MAX(ta.updated_at)
           FROM test_attempts ta
           WHERE ta.user_id = u.id)
        ) as last_active
      FROM users u
      ORDER BY u.created_at DESC
    `;

    const [results] = await executeQuery(query);

    // Format the response
    const students = (results || []).map(student => ({
      id: student.id,
      name: student.full_name,
      firstName: student.first_name,
      lastName: student.last_name,
      email: student.email,
      phone: student.phone_number,
      dateOfBirth: student.date_of_birth,
      age: student.age,
      gender: student.gender,
      school: student.school_name,
      class: student.class,
      whatsappNumber: student.whatsapp_number,
      profileImage: student.avatar,
      isActive: student.is_active,
      isBlocked: student.is_blocked,
      isEmailVerified: student.is_email_verified,
      registrationDate: student.created_at,
      lastLogin: student.last_login,
      lastActive: student.last_active,
      testsCompleted: parseInt(student.tests_completed) || 0,
      testsInProgress: parseInt(student.tests_in_progress) || 0,
      totalTestsAttempted: student.total_tests_attempted || 0,
      totalTestsCompleted: student.total_tests_completed || 0,
      averageScore: parseFloat(student.average_score) || 0,
      bestScore: parseFloat(student.best_score) || 0,
      status: student.is_blocked ? 'suspended' : (student.is_active ? 'active' : 'inactive')
    }));

    console.log(`✅ Found ${students.length} students`);

    res.json({
      success: true,
      count: students.length,
      students
    });

  } catch (error) {
    console.error('❌ Error fetching students:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch students',
      details: error.message
    });
  }
});

/**
 * @route   GET /api/students/:id
 * @desc    Get single student details
 * @access  Admin only
 */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    console.log(`📋 Fetching student details for ID: ${id}`);

    const query = `
      SELECT
        u.*,
        u.first_name || ' ' || u.last_name as full_name,
        (SELECT COUNT(*)
         FROM test_attempts ta
         WHERE ta.user_id = u.id
         AND ta.status = 'completed'
        ) as tests_completed,
        (SELECT COUNT(*)
         FROM test_attempts ta
         WHERE ta.user_id = u.id
         AND ta.status = 'in_progress'
        ) as tests_in_progress
      FROM users u
      WHERE u.id = $1
    `;

    const [results] = await executeQuery(query, [id]);

    if (!results || results.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Student not found'
      });
    }

    const student = results[0];

    res.json({
      success: true,
      student: {
        id: student.id,
        name: student.full_name,
        firstName: student.first_name,
        lastName: student.last_name,
        email: student.email,
        phone: student.phone_number,
        dateOfBirth: student.date_of_birth,
        age: student.age,
        gender: student.gender,
        school: student.school_name,
        class: student.class,
        whatsappNumber: student.whatsapp_number,
        profileImage: student.avatar,
        isActive: student.is_active,
        isBlocked: student.is_blocked,
        isEmailVerified: student.is_email_verified,
        registrationDate: student.created_at,
        lastLogin: student.last_login,
        testsCompleted: parseInt(student.tests_completed) || 0,
        testsInProgress: parseInt(student.tests_in_progress) || 0,
        totalTestsAttempted: student.total_tests_attempted || 0,
        totalTestsCompleted: student.total_tests_completed || 0,
        averageScore: parseFloat(student.average_score) || 0,
        bestScore: parseFloat(student.best_score) || 0,
        status: student.is_blocked ? 'suspended' : (student.is_active ? 'active' : 'inactive')
      }
    });

  } catch (error) {
    console.error('❌ Error fetching student:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch student details',
      details: error.message
    });
  }
});

/**
 * @route   PATCH /api/students/:id/toggle-status
 * @desc    Toggle student active/inactive status
 * @access  Admin only
 */
router.patch('/:id/toggle-status', async (req, res) => {
  try {
    const { id } = req.params;
    console.log(`🔄 Toggling status for student ID: ${id}`);

    // Get current status
    const checkQuery = 'SELECT id, first_name, last_name, is_active FROM users WHERE id = $1';
    const [checkResults] = await executeQuery(checkQuery, [id]);

    if (!checkResults || checkResults.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Student not found'
      });
    }

    const student = checkResults[0];
    const newStatus = !student.is_active;

    // Update status
    const updateQuery = `
      UPDATE users
      SET is_active = $1, updated_at = NOW()
      WHERE id = $2
      RETURNING id, first_name, last_name, is_active
    `;
    const [updateResults] = await executeQuery(updateQuery, [newStatus, id]);

    console.log(`✅ Student status updated: ${student.first_name} ${student.last_name} - ${newStatus ? 'Active' : 'Inactive'}`);

    res.json({
      success: true,
      message: `Student ${newStatus ? 'activated' : 'deactivated'} successfully`,
      student: {
        id: updateResults[0].id,
        isActive: updateResults[0].is_active
      }
    });

  } catch (error) {
    console.error('❌ Error toggling student status:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to toggle student status',
      details: error.message
    });
  }
});

/**
 * @route   POST /api/students
 * @desc    Create a new student
 * @access  Admin only
 */
router.post('/', async (req, res) => {
  try {
    const {
      firstName,
      lastName,
      email,
      phoneNumber,
      password,
      age,
      gender,
      dateOfBirth,
      schoolName,
      class: studentClass,
      whatsappNumber
    } = req.body;

    console.log('➕ Creating new student:', email);

    // Validate required fields
    if (!firstName || !lastName || !email || !phoneNumber || !password) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: firstName, lastName, email, phoneNumber, password'
      });
    }

    // Check if email already exists
    const checkQuery = 'SELECT id, email FROM users WHERE email = $1';
    const [checkResults] = await executeQuery(checkQuery, [email]);

    if (checkResults && checkResults.length > 0) {
      return res.status(409).json({
        success: false,
        error: 'A student with this email already exists'
      });
    }

    // Hash password
    const hashedPassword = await hashPassword(password);

    // Insert new student
    const insertQuery = `
      INSERT INTO users (
        first_name, last_name, email, phone_number, password,
        age, gender, date_of_birth, school_name, class, whatsapp_number,
        is_active, is_blocked, is_email_verified, created_at, updated_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, true, false, true, NOW(), NOW()
      )
      RETURNING id, first_name, last_name, email, phone_number, age, gender,
                date_of_birth, school_name, class, whatsapp_number, is_active, created_at
    `;

    const [results] = await executeQuery(insertQuery, [
      firstName,
      lastName,
      email,
      phoneNumber,
      hashedPassword,
      age || null,
      gender || null,
      dateOfBirth || null,
      schoolName || null,
      studentClass || null,
      whatsappNumber || phoneNumber
    ]);

    const newStudent = results[0];

    console.log(`✅ Student created: ${newStudent.first_name} ${newStudent.last_name} (${newStudent.email})`);

    res.status(201).json({
      success: true,
      message: 'Student created successfully',
      student: {
        id: newStudent.id,
        name: `${newStudent.first_name} ${newStudent.last_name}`,
        firstName: newStudent.first_name,
        lastName: newStudent.last_name,
        email: newStudent.email,
        phone: newStudent.phone_number,
        age: newStudent.age,
        gender: newStudent.gender,
        dateOfBirth: newStudent.date_of_birth,
        school: newStudent.school_name,
        class: newStudent.class,
        whatsappNumber: newStudent.whatsapp_number,
        isActive: newStudent.is_active,
        status: 'active',
        registrationDate: newStudent.created_at,
        testsCompleted: 0,
        testsInProgress: 0,
        totalTestsAttempted: 0,
        totalTestsCompleted: 0,
        averageScore: 0,
        bestScore: 0
      }
    });

  } catch (error) {
    console.error('❌ Error creating student:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create student',
      details: error.message
    });
  }
});

/**
 * @route   PATCH /api/students/:id
 * @desc    Update student details
 * @access  Admin only
 */
router.patch('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const {
      firstName,
      lastName,
      email,
      phoneNumber,
      age,
      gender,
      dateOfBirth,
      schoolName,
      class: studentClass,
      whatsappNumber
    } = req.body;

    console.log(`📝 Updating student ID: ${id}`);

    // Check if student exists
    const checkQuery = 'SELECT id, email FROM users WHERE id = $1';
    const [checkResults] = await executeQuery(checkQuery, [id]);

    if (!checkResults || checkResults.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Student not found'
      });
    }

    // If email is being changed, check for duplicates
    if (email && email !== checkResults[0].email) {
      const emailCheckQuery = 'SELECT id FROM users WHERE email = $1 AND id != $2';
      const [emailResults] = await executeQuery(emailCheckQuery, [email, id]);

      if (emailResults && emailResults.length > 0) {
        return res.status(409).json({
          success: false,
          error: 'A student with this email already exists'
        });
      }
    }

    // Build dynamic update query
    const updates = [];
    const values = [];
    let paramCount = 1;

    if (firstName !== undefined) {
      updates.push(`first_name = $${paramCount++}`);
      values.push(firstName);
    }
    if (lastName !== undefined) {
      updates.push(`last_name = $${paramCount++}`);
      values.push(lastName);
    }
    if (email !== undefined) {
      updates.push(`email = $${paramCount++}`);
      values.push(email);
    }
    if (phoneNumber !== undefined) {
      updates.push(`phone_number = $${paramCount++}`);
      values.push(phoneNumber);
    }
    if (age !== undefined) {
      updates.push(`age = $${paramCount++}`);
      values.push(age || null);
    }
    if (gender !== undefined) {
      updates.push(`gender = $${paramCount++}`);
      values.push(gender || null);
    }
    if (dateOfBirth !== undefined) {
      updates.push(`date_of_birth = $${paramCount++}`);
      values.push(dateOfBirth || null);
    }
    if (schoolName !== undefined) {
      updates.push(`school_name = $${paramCount++}`);
      values.push(schoolName || null);
    }
    if (studentClass !== undefined) {
      updates.push(`class = $${paramCount++}`);
      values.push(studentClass || null);
    }
    if (whatsappNumber !== undefined) {
      updates.push(`whatsapp_number = $${paramCount++}`);
      values.push(whatsappNumber || null);
    }

    // Always update updated_at
    updates.push(`updated_at = NOW()`);

    if (updates.length === 1) { // Only updated_at
      return res.status(400).json({
        success: false,
        error: 'No fields to update'
      });
    }

    // Add id as last parameter
    values.push(id);

    const updateQuery = `
      UPDATE users
      SET ${updates.join(', ')}
      WHERE id = $${paramCount}
      RETURNING id, first_name, last_name, email, phone_number, age, gender,
                date_of_birth, school_name, class, whatsapp_number, is_active,
                created_at, updated_at
    `;

    const [results] = await executeQuery(updateQuery, values);
    const updatedStudent = results[0];

    console.log(`✅ Student updated: ${updatedStudent.first_name} ${updatedStudent.last_name}`);

    res.json({
      success: true,
      message: 'Student updated successfully',
      student: {
        id: updatedStudent.id,
        name: `${updatedStudent.first_name} ${updatedStudent.last_name}`,
        firstName: updatedStudent.first_name,
        lastName: updatedStudent.last_name,
        email: updatedStudent.email,
        phone: updatedStudent.phone_number,
        age: updatedStudent.age,
        gender: updatedStudent.gender,
        dateOfBirth: updatedStudent.date_of_birth,
        school: updatedStudent.school_name,
        class: updatedStudent.class,
        whatsappNumber: updatedStudent.whatsapp_number,
        isActive: updatedStudent.is_active,
        status: updatedStudent.is_active ? 'active' : 'inactive',
        registrationDate: updatedStudent.created_at,
        updatedAt: updatedStudent.updated_at
      }
    });

  } catch (error) {
    console.error('❌ Error updating student:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update student',
      details: error.message
    });
  }
});

/**
 * @route   DELETE /api/students/:id
 * @desc    Delete a student
 * @access  Admin only
 */
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    console.log(`🗑️ Deleting student ID: ${id}`);

    // Check if student exists
    const checkQuery = 'SELECT id, first_name, last_name FROM users WHERE id = $1';
    const [checkResults] = await executeQuery(checkQuery, [id]);

    if (!checkResults || checkResults.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Student not found'
      });
    }

    // Delete student (this will cascade delete related records if CASCADE is set)
    const deleteQuery = 'DELETE FROM users WHERE id = $1';
    await executeQuery(deleteQuery, [id]);

    console.log(`✅ Student deleted: ${checkResults[0].first_name} ${checkResults[0].last_name}`);

    res.json({
      success: true,
      message: 'Student deleted successfully'
    });

  } catch (error) {
    console.error('❌ Error deleting student:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete student',
      details: error.message
    });
  }
});

module.exports = router;
