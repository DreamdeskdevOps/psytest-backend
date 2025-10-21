const express = require('express');
const router = express.Router();
const { executeQuery } = require('../config/database');

/**
 * @route   GET /api/reports/students
 * @desc    Get student performance reports
 * @access  Admin only
 */
router.get('/students', async (req, res) => {
  try {
    const { period = 'month' } = req.query;
    console.log(`📊 Fetching student reports for period: ${period}`);

    // Calculate date range based on period
    let dateFilter = '';
    switch (period) {
      case 'week':
        dateFilter = "AND ta.created_at >= NOW() - INTERVAL '7 days'";
        break;
      case 'month':
        dateFilter = "AND ta.created_at >= NOW() - INTERVAL '30 days'";
        break;
      case 'quarter':
        dateFilter = "AND ta.created_at >= NOW() - INTERVAL '90 days'";
        break;
      case 'year':
        dateFilter = "AND ta.created_at >= NOW() - INTERVAL '365 days'";
        break;
      case 'all':
        dateFilter = ""; // No date filter for all time
        break;
      default:
        dateFilter = "AND ta.created_at >= NOW() - INTERVAL '30 days'";
    }

    // Get student reports with test statistics
    const query = `
      SELECT
        u.id,
        u.first_name || ' ' || u.last_name as student_name,
        u.email,
        u.school_name,
        u.class,
        COUNT(DISTINCT ta.id) as tests_completed,
        COALESCE(AVG(
          CASE
            WHEN ta.status = 'completed' AND ta.total_score IS NOT NULL
            THEN ta.total_score
            ELSE NULL
          END
        ), 0) as average_score,
        MAX(ta.completed_at) as last_test_date,
        -- Calculate trend (comparing recent vs older scores)
        CASE
          WHEN COUNT(DISTINCT ta.id) < 2 THEN 'neutral'
          WHEN (
            SELECT AVG(total_score)
            FROM test_attempts
            WHERE user_id = u.id
              AND status = 'completed'
              AND completed_at >= NOW() - INTERVAL '15 days'
          ) > (
            SELECT AVG(total_score)
            FROM test_attempts
            WHERE user_id = u.id
              AND status = 'completed'
              AND completed_at < NOW() - INTERVAL '15 days'
              AND completed_at >= NOW() - INTERVAL '30 days'
          ) THEN 'up'
          ELSE 'down'
        END as performance_trend,
        -- Get test details
        json_agg(
          json_build_object(
            'test_id', ta.test_id,
            'test_name', t.title,
            'score', ta.total_score,
            'completed_at', ta.completed_at,
            'status', ta.status
          ) ORDER BY ta.completed_at DESC
        ) FILTER (WHERE ta.id IS NOT NULL) as test_details
      FROM users u
      LEFT JOIN test_attempts ta ON u.id = ta.user_id ${dateFilter}
      LEFT JOIN tests t ON ta.test_id = t.id
      GROUP BY u.id, u.first_name, u.last_name, u.email, u.school_name, u.class
      HAVING COUNT(DISTINCT ta.id) > 0
      ORDER BY tests_completed DESC, average_score DESC
    `;

    const [results] = await executeQuery(query);

    // Format the response
    const reports = (results || []).map(student => ({
      id: student.id,
      studentName: student.student_name,
      email: student.email,
      school: student.school_name || 'N/A',
      class: student.class || 'N/A',
      testsCompleted: parseInt(student.tests_completed) || 0,
      averageScore: parseFloat(student.average_score).toFixed(1),
      lastTestDate: student.last_test_date
        ? new Date(student.last_test_date).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
          })
        : 'N/A',
      performanceTrend: student.performance_trend || 'neutral',
      testDetails: student.test_details || []
    }));

    console.log(`✅ Found ${reports.length} student reports`);

    res.json({
      success: true,
      count: reports.length,
      reports
    });

  } catch (error) {
    console.error('❌ Error fetching student reports:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch student reports',
      details: error.message
    });
  }
});

/**
 * @route   GET /api/reports/statistics
 * @desc    Get overall statistics for reports
 * @access  Admin only
 */
router.get('/statistics', async (req, res) => {
  try {
    const { period = 'month' } = req.query;
    console.log(`📊 Fetching statistics for period: ${period}`);

    // Calculate date range
    let dateFilter = '';
    switch (period) {
      case 'week':
        dateFilter = "WHERE created_at >= NOW() - INTERVAL '7 days'";
        break;
      case 'month':
        dateFilter = "WHERE created_at >= NOW() - INTERVAL '30 days'";
        break;
      case 'quarter':
        dateFilter = "WHERE created_at >= NOW() - INTERVAL '90 days'";
        break;
      case 'year':
        dateFilter = "WHERE created_at >= NOW() - INTERVAL '365 days'";
        break;
      case 'all':
        dateFilter = ""; // No date filter for all time
        break;
      default:
        dateFilter = "WHERE created_at >= NOW() - INTERVAL '30 days'";
    }

    // Get overall statistics
    const statsQuery = `
      SELECT
        COUNT(DISTINCT u.id) as total_students,
        COUNT(DISTINCT ta.id) FILTER (WHERE ta.status = 'completed') as total_tests_completed,
        COALESCE(AVG(ta.total_score) FILTER (WHERE ta.status = 'completed'), 0) as average_score,
        ROUND(
          (COUNT(DISTINCT ta.id) FILTER (WHERE ta.status = 'completed')::DECIMAL /
           NULLIF(COUNT(DISTINCT ta.id), 0) * 100),
          1
        ) as completion_rate
      FROM users u
      LEFT JOIN test_attempts ta ON u.id = ta.user_id
      ${dateFilter.replace('WHERE', 'WHERE ta.')}
    `;

    const [statsResults] = await executeQuery(statsQuery);
    const stats = statsResults[0] || {};

    res.json({
      success: true,
      statistics: {
        totalStudents: parseInt(stats.total_students) || 0,
        testsCompleted: parseInt(stats.total_tests_completed) || 0,
        averageScore: parseFloat(stats.average_score).toFixed(1),
        completionRate: parseFloat(stats.completion_rate || 0).toFixed(1)
      }
    });

  } catch (error) {
    console.error('❌ Error fetching statistics:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch statistics',
      details: error.message
    });
  }
});

/**
 * @route   GET /api/reports/student/:id
 * @desc    Get detailed report for a single student
 * @access  Admin only
 */
router.get('/student/:id', async (req, res) => {
  try {
    const { id } = req.params;
    console.log(`📊 Fetching detailed report for student: ${id}`);

    const query = `
      SELECT
        u.id,
        u.first_name || ' ' || u.last_name as student_name,
        u.email,
        u.phone_number,
        u.school_name,
        u.class,
        u.age,
        u.gender,
        COUNT(DISTINCT ta.id) FILTER (WHERE ta.status = 'completed') as tests_completed,
        COUNT(DISTINCT ta.id) FILTER (WHERE ta.status = 'in_progress') as tests_in_progress,
        COALESCE(AVG(ta.total_score) FILTER (WHERE ta.status = 'completed'), 0) as average_score,
        MAX(ta.total_score) FILTER (WHERE ta.status = 'completed') as best_score,
        MIN(ta.total_score) FILTER (WHERE ta.status = 'completed') as lowest_score,
        json_agg(
          json_build_object(
            'attempt_id', ta.id,
            'test_id', t.id,
            'test_title', t.title,
            'test_type', t.test_type,
            'score', ta.total_score,
            'status', ta.status,
            'started_at', ta.created_at,
            'completed_at', ta.completed_at,
            'time_taken', EXTRACT(EPOCH FROM (ta.completed_at - ta.created_at))
          ) ORDER BY ta.created_at DESC
        ) FILTER (WHERE ta.id IS NOT NULL) as test_history
      FROM users u
      LEFT JOIN test_attempts ta ON u.id = ta.user_id
      LEFT JOIN tests t ON ta.test_id = t.id
      WHERE u.id = $1
      GROUP BY u.id, u.first_name, u.last_name, u.email, u.phone_number,
               u.school_name, u.class, u.age, u.gender
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
      report: {
        id: student.id,
        studentName: student.student_name,
        email: student.email,
        phone: student.phone_number,
        school: student.school_name || 'N/A',
        class: student.class || 'N/A',
        age: student.age,
        gender: student.gender,
        testsCompleted: parseInt(student.tests_completed) || 0,
        testsInProgress: parseInt(student.tests_in_progress) || 0,
        averageScore: parseFloat(student.average_score).toFixed(1),
        bestScore: parseFloat(student.best_score || 0).toFixed(1),
        lowestScore: parseFloat(student.lowest_score || 0).toFixed(1),
        testHistory: student.test_history || []
      }
    });

  } catch (error) {
    console.error('❌ Error fetching student report:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch student report',
      details: error.message
    });
  }
});

module.exports = router;
