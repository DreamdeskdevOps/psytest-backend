const TestAttemptModel = require('../models/TestAttempt');
const TestModel = require('../models/Test');
const QuestionModel = require('../models/Questions');
const SectionModel = require('../models/Section');
const ScoringPatternModel = require('../models/ScoringPatterns');
const { generateResponse } = require('../utils/helpers');
const { getMany } = require('../config/database');
const { v4: uuidv4 } = require('uuid');

// Helper function to get user answers from user_responses table
const getUserAnswers = async (attemptId) => {
  try {
    const answers = await getMany(
      'SELECT question_id, selected_answer FROM user_responses WHERE attempt_id = $1',
      [attemptId]
    );

    // Convert to object format {questionId: answer}
    const answersObj = {};
    answers.forEach(answer => {
      answersObj[answer.question_id] = answer.selected_answer;
    });

    return answersObj;
  } catch (error) {
    console.error('Error getting user answers:', error);
    return {};
  }
};

// Start a new test attempt
const startTestAttempt = async (userId, testId) => {
  try {
    // Check if test exists and is active
    const test = await TestModel.getTestById(testId);
    if (!test || !test.is_active) {
      return generateResponse(false, 'Test not found or inactive', null, 404);
    }

    // Check if user already has an active attempt for this test
    const activeAttempt = await TestAttemptModel.getActiveTestAttempt(userId, testId);
    if (activeAttempt) {
      // Return existing active attempt (use id as session token)
      const responseData = {
        attempt: activeAttempt,
        sessionToken: activeAttempt.id,
        timeRemaining: activeAttempt.time_remaining || 1800 // Default 30 minutes
      };
      return generateResponse(true, 'Active test attempt found', responseData, 200);
    }


    // Get test time limit (use test setting or default to 30 minutes)
    const timeLimit = test.time_limit || 30;

    // Create new test attempt
    const attemptData = {
      user_id: userId,
      test_id: testId,
      time_limit_minutes: timeLimit
    };

    const newAttempt = await TestAttemptModel.createTestAttempt(attemptData);

    const responseData = {
      attempt: newAttempt,
      sessionToken: newAttempt.id, // Use id as session token
      timeRemaining: newAttempt.time_remaining || (timeLimit * 60), // in seconds
      test: {
        id: test.id,
        title: test.title,
        description: test.description,
        totalQuestions: test.total_questions,
        timeLimit: timeLimit
      }
    };

    return generateResponse(true, 'Test attempt started successfully', responseData, 201);

  } catch (error) {
    console.error('Start test attempt service error:', error);
    return generateResponse(false, 'Failed to start test attempt', null, 500);
  }
};

// Get test attempt by session token
const getTestAttemptBySession = async (sessionToken) => {
  try {
    const attempt = await TestAttemptModel.getTestAttemptBySessionToken(sessionToken);

    if (!attempt) {
      return generateResponse(false, 'Test attempt not found', null, 404);
    }

    // Use time_remaining from database
    const timeRemaining = attempt.status === 'in_progress' ? (attempt.time_remaining || 0) : 0;
    const isExpired = attempt.status === 'in_progress' && timeRemaining <= 0;

    const responseData = {
      attempt,
      timeRemaining,
      isExpired
    };

    return generateResponse(true, 'Test attempt retrieved successfully', responseData, 200);

  } catch (error) {
    console.error('Get test attempt service error:', error);
    return generateResponse(false, 'Failed to retrieve test attempt', null, 500);
  }
};

// Get questions for test attempt
const getTestQuestions = async (sessionToken) => {
  try {
    const attempt = await TestAttemptModel.getTestAttemptBySessionToken(sessionToken);

    if (!attempt) {
      return generateResponse(false, 'Test attempt not found', null, 404);
    }

    if (attempt.status !== 'in_progress') {
      return generateResponse(false, 'Test attempt is not active', null, 400);
    }

    // Get test sections first
    const test = await TestModel.getTestById(attempt.test_id);
    const sections = await SectionModel.getSectionsByTestId(attempt.test_id);

    // Get questions organized by section
    let allQuestions = [];
    for (const section of sections) {
      const sectionQuestions = await QuestionModel.getQuestionsBySection(section.id);
      allQuestions = allQuestions.concat(sectionQuestions.map(q => ({
        ...q,
        section_name: section.section_name,
        section_id: section.id,
        section_order: section.section_order,
        question_order: q.order_index
      })));
    }

    const responseData = {
      questions: allQuestions.map(q => {
        // Extract answer options from section's custom_scoring_config
        let answerOptions = ['Option A', 'Option B', 'Option C', 'Option D']; // fallback

        // Find the section for this question
        const questionSection = sections.find(s => s.id === q.section_id);
        if (questionSection && questionSection.custom_scoring_config) {
          try {
            const config = typeof questionSection.custom_scoring_config === 'string'
              ? JSON.parse(questionSection.custom_scoring_config)
              : questionSection.custom_scoring_config;

            if (config.section_options && Array.isArray(config.section_options)) {
              answerOptions = config.section_options.map(opt => opt.text || opt);
            }
          } catch (error) {
            console.error('Error parsing section options:', error);
          }
        }

        return {
          id: q.id,
          text: q.question_text,
          section_id: q.section_id,
          question_order: q.question_order,
          answer_options: answerOptions,
          section_name: q.section_name,
          section_order: q.section_order,
          question_type: q.question_type,
          difficulty_level: q.difficulty_level
        };
      }),
      sections: sections.map(s => ({
        id: s.id,
        name: s.section_name,
        order: s.section_order,
        question_count: s.question_count,
        instructions: s.instructions,
        answer_pattern: s.answer_pattern,
        answer_options: s.answer_options
      })),
      test: {
        id: test.id,
        title: test.title,
        totalQuestions: test.total_questions
      },
      currentAnswers: await getUserAnswers(attempt.id),
      currentQuestionIndex: attempt.current_question_number || 1
    };

    return generateResponse(true, 'Test questions retrieved successfully', responseData, 200);

  } catch (error) {
    console.error('Get test questions service error:', error);
    return generateResponse(false, 'Failed to retrieve test questions', null, 500);
  }
};

// Save answer for a question
const saveAnswer = async (sessionToken, questionId, answer) => {
  try {
    const attempt = await TestAttemptModel.getTestAttemptBySessionToken(sessionToken);

    if (!attempt) {
      return generateResponse(false, 'Test attempt not found', null, 404);
    }

    if (attempt.status !== 'in_progress') {
      return generateResponse(false, 'Test attempt is not active', null, 400);
    }

    // Check if attempt has expired
    if (new Date() > new Date(attempt.expires_at)) {
      await TestAttemptModel.updateTestAttempt(attempt.id, { status: 'expired' });
      return generateResponse(false, 'Test attempt has expired', null, 410);
    }

    // Save the answer
    const updatedAttempt = await TestAttemptModel.saveAnswer(attempt.id, questionId, answer);

    const responseData = {
      saved: true,
      questionId,
      answer,
      attemptId: attempt.id
    };

    return generateResponse(true, 'Answer saved successfully', responseData, 200);

  } catch (error) {
    console.error('Save answer service error:', error);
    return generateResponse(false, 'Failed to save answer', null, 500);
  }
};

// Update current question index
const updateCurrentQuestion = async (sessionToken, questionIndex) => {
  try {
    const attempt = await TestAttemptModel.getTestAttemptBySessionToken(sessionToken);

    if (!attempt) {
      return generateResponse(false, 'Test attempt not found', null, 404);
    }

    if (attempt.status !== 'in_progress') {
      return generateResponse(false, 'Test attempt is not active', null, 400);
    }

    await TestAttemptModel.updateCurrentQuestion(attempt.id, questionIndex);

    return generateResponse(true, 'Current question updated successfully', { questionIndex }, 200);

  } catch (error) {
    console.error('Update current question service error:', error);
    return generateResponse(false, 'Failed to update current question', null, 500);
  }
};

// Calculate score based on section-specific scoring patterns
const calculateScore = async (answers, testId) => {
  try {
    const { getMany } = require('../config/database');

    console.log('🧮 Starting section-specific score calculation for test:', testId);
    console.log('📝 User answers:', Object.keys(answers).length, 'answers');

    // Get all section-specific scoring configurations
    const sectionConfigs = await getMany(`
      SELECT
        sc.id,
        sc.test_id,
        sc.section_id,
        sc.scoring_type,
        sc.scoring_pattern,
        sc.is_active,
        ts.section_name,
        ts.section_order,
        ts.custom_scoring_config
      FROM scoring_configurations sc
      JOIN test_sections ts ON sc.section_id = ts.id
      WHERE sc.test_id = $1 AND sc.is_active = true
      ORDER BY ts.section_order ASC
    `, [testId]);

    console.log('⚙️ Found section scoring configs:', sectionConfigs.length);

    if (sectionConfigs.length === 0) {
      return await calculateSimpleScore(answers, testId);
    }

    // Get all questions with their flags and sections
    const questions = await getMany(`
      SELECT q.id, q.question_flag, q.section_id, ts.section_name
      FROM questions q
      JOIN test_sections ts ON q.section_id = ts.id
      WHERE ts.test_id = $1 AND q.is_active = true
      ORDER BY ts.section_order, q.order_index
    `, [testId]);

    console.log('📋 Questions with flags:', questions.length);

    // Process each section with its specific scoring pattern
    return await calculateSectionSpecificScore(answers, questions, sectionConfigs, testId);

  } catch (error) {
    console.error('❌ Calculate score error:', error);
    throw error;
  }
};

// Calculate scores using section-specific scoring configurations
const calculateSectionSpecificScore = async (answers, questions, sectionConfigs, testId) => {
  try {
    const { getMany } = require('../config/database');
    console.log('🏗️ Processing section-specific scoring configurations');

    const sectionResults = [];
    let finalResultCode = '';

    // Process each section with its own scoring pattern
    for (const sectionConfig of sectionConfigs) {
      console.log(`\n--- Processing Section: ${sectionConfig.section_name} ---`);
      console.log('📋 Section scoring pattern:', sectionConfig.scoring_pattern);

      // Get questions for this section
      const sectionQuestions = questions.filter(q => q.section_id === sectionConfig.section_id);
      console.log('📝 Section questions:', sectionQuestions.length);

      // Calculate flag scores for this section
      const sectionFlagScores = {};

      for (const question of sectionQuestions) {
        if (answers[question.id] && question.question_flag) {
          const flag = question.question_flag;
          const selectedAnswer = answers[question.id];

          // Get option value from section's custom_scoring_config
          let optionValue = 0;
          try {
            if (sectionConfig.custom_scoring_config) {
              const config = typeof sectionConfig.custom_scoring_config === 'string'
                ? JSON.parse(sectionConfig.custom_scoring_config)
                : sectionConfig.custom_scoring_config;

              if (config && config.section_options && Array.isArray(config.section_options)) {
                const option = config.section_options.find(opt => opt.value == selectedAnswer);
                optionValue = option ? (option.value || 0) : 0;
              }
            } else {
              optionValue = parseInt(selectedAnswer) || 0;
            }
          } catch (error) {
            console.error('Error parsing section config:', error);
            optionValue = parseInt(selectedAnswer) || 0;
          }

          // Add to section flag score
          if (!sectionFlagScores[flag]) sectionFlagScores[flag] = 0;
          sectionFlagScores[flag] += optionValue;
        }
      }

      console.log('🎯 Section flag scores:', sectionFlagScores);

      // Apply section's specific scoring pattern
      let sectionResultFlags = [];

      if (sectionConfig.scoring_pattern && Object.keys(sectionFlagScores).length > 0) {
        const pattern = typeof sectionConfig.scoring_pattern === 'string'
          ? JSON.parse(sectionConfig.scoring_pattern)
          : sectionConfig.scoring_pattern;

        console.log('⚙️ Applying pattern:', pattern);
        console.log('🔢 Flag count from pattern:', pattern.flagCount);

        const flagCount = parseInt(pattern.flagCount) || 1;

        // Get all flags sorted by score (highest to lowest)
        const allFlags = Object.keys(sectionFlagScores);
        console.log('📊 All flags in section:', allFlags);
        console.log('📊 Flag scores:', sectionFlagScores);

        // Sort flags by score (highest first)
        const sortedByScore = allFlags.sort((a, b) => sectionFlagScores[b] - sectionFlagScores[a]);
        console.log('📈 Flags sorted by score:', sortedByScore.map(f => `${f}:${sectionFlagScores[f]}`));

        // Get top N flags based on flagCount
        let topFlags = sortedByScore.slice(0, flagCount);
        console.log('🎯 Top', flagCount, 'flags:', topFlags);

        // Apply custom order/priority if specified
        if (pattern.order && Array.isArray(pattern.order)) {
          console.log('🔄 Applying custom order:', pattern.order);

          // Sort the top flags according to the custom order
          topFlags.sort((a, b) => {
            const indexA = pattern.order.indexOf(a);
            const indexB = pattern.order.indexOf(b);

            // If both flags are in the order array, sort by their position
            if (indexA !== -1 && indexB !== -1) {
              return indexA - indexB;
            }
            // If only one is in the order array, prioritize it
            if (indexA !== -1) return -1;
            if (indexB !== -1) return 1;
            // If neither is in the order array, maintain score-based order
            return sectionFlagScores[b] - sectionFlagScores[a];
          });
        }

        sectionResultFlags = topFlags;
        console.log('🏆 Final section result flags (ordered):', sectionResultFlags);
      }

      console.log('✅ Section processing complete');

      const sectionResultCode = sectionResultFlags.join('');

      sectionResults.push({
        sectionId: sectionConfig.section_id,
        sectionName: sectionConfig.section_name,
        sectionOrder: sectionConfig.section_order,
        flagScores: sectionFlagScores,
        resultFlags: sectionResultFlags,
        resultCode: sectionResultCode,
        totalScore: Object.values(sectionFlagScores).reduce((sum, score) => sum + score, 0),
        pattern: sectionConfig.scoring_pattern
      });

      // Add this section's result code to final result
      finalResultCode += sectionResultCode;
    }

    console.log('🎯 Final combined result code:', finalResultCode);

    // Find matching result in test_results table based on the generated result code
    let testResult = await getMany(`
      SELECT * FROM test_results
      WHERE test_id = $1 AND result_code = $2 AND is_active = true
      LIMIT 1
    `, [testId, finalResultCode]);

    console.log('🔍 Searching for result with code:', finalResultCode);

    // If no exact match found, log available result codes for this test
    if (testResult.length === 0) {
      console.log('❌ No exact match found for result code:', finalResultCode);

      const availableResults = await getMany(`
        SELECT result_code, title FROM test_results
        WHERE test_id = $1 AND is_active = true
        ORDER BY result_code
      `, [testId]);

      console.log('📋 Available result codes for this test:',
        availableResults.map(r => r.result_code).join(', '));

      // Return without result if no match found - this ensures accurate scoring
      console.log('⚠️ No matching admin result found - user needs to answer more questions or admin needs to add result for code:', finalResultCode);
    }

    console.log('📄 Found test result:', testResult.length > 0 ? 'YES' : 'NO');
    if (testResult.length > 0) {
      console.log('📋 Result details:', {
        code: testResult[0].result_code,
        title: testResult[0].title,
        description: testResult[0].description,
        pdf: testResult[0].pdf_file
      });
    }

    const totalScore = sectionResults.reduce((sum, section) => sum + section.totalScore, 0);

    return {
      scoringType: 'section_specific_flag_based',
      sectionResults,
      resultCode: finalResultCode,
      testResult: testResult[0] || null,
      totalScore,
      questionCount: Object.keys(answers).length,
      pdfFile: testResult[0]?.pdf_file || null,
      resultTitle: testResult[0]?.title || null,
      resultDescription: testResult[0]?.description || null
    };

  } catch (error) {
    console.error('❌ Section-specific calculation error:', error);
    throw error;
  }
};

// Calculate section-wise flag-based scores (each section contributes one flag)
const calculateFlagBasedScore = async (answers, questions, scoringConfig, testId) => {
  try {
    const { getMany } = require('../config/database');
    console.log('🏁 Calculating section-wise flag-based scores');

    // Get all sections for this test
    const sections = await getMany(`
      SELECT DISTINCT ts.id as section_id, ts.section_name, ts.section_order, ts.custom_scoring_config
      FROM test_sections ts
      WHERE ts.test_id = $1 AND ts.is_active = true
      ORDER BY ts.section_order ASC
    `, [testId]);

    console.log('📋 Processing sections:', sections.length);

    const sectionResults = [];
    let finalResultCode = '';

    // Process each section separately
    for (const section of sections) {
      console.log(`\n--- Processing Section: ${section.section_name} ---`);

      // Get questions for this section
      const sectionQuestions = questions.filter(q => q.section_id === section.section_id);
      console.log('📝 Section questions:', sectionQuestions.length);

      // Calculate flag scores for this section only
      const sectionFlagScores = {};

      for (const question of sectionQuestions) {
        if (answers[question.id] && question.question_flag) {
          const flag = question.question_flag;
          const selectedAnswer = answers[question.id];

          // Get option value from section's custom_scoring_config
          let optionValue = 0;
          try {
            const config = typeof section.custom_scoring_config === 'string'
              ? JSON.parse(section.custom_scoring_config)
              : section.custom_scoring_config;

            if (config && config.section_options && Array.isArray(config.section_options)) {
              const option = config.section_options.find(opt => opt.value == selectedAnswer);
              optionValue = option ? (option.value || 0) : 0;
            }
          } catch (error) {
            console.error('Error parsing section config:', error);
            optionValue = parseInt(selectedAnswer) || 0;
          }

          // Add to section flag score
          if (!sectionFlagScores[flag]) sectionFlagScores[flag] = 0;
          sectionFlagScores[flag] += optionValue;
        }
      }

      console.log('🎯 Section flag scores:', sectionFlagScores);

      // Get highest flag from this section (each section contributes 1 flag)
      let sectionHighestFlag = '';
      if (Object.keys(sectionFlagScores).length > 0) {
        sectionHighestFlag = Object.keys(sectionFlagScores).reduce((a, b) =>
          sectionFlagScores[a] > sectionFlagScores[b] ? a : b);
      }

      console.log('🏆 Section highest flag:', sectionHighestFlag);

      sectionResults.push({
        sectionId: section.section_id,
        sectionName: section.section_name,
        sectionOrder: section.section_order,
        flagScores: sectionFlagScores,
        highestFlag: sectionHighestFlag,
        totalScore: Object.values(sectionFlagScores).reduce((sum, score) => sum + score, 0)
      });

      // Add this section's flag to the final result code
      finalResultCode += sectionHighestFlag;
    }

    console.log('🎯 Final result code (section-wise):', finalResultCode);

    // Find matching result in test_results table
    let testResult = await getMany(`
      SELECT * FROM test_results
      WHERE test_id = $1 AND result_code = $2 AND is_active = true
      LIMIT 1
    `, [testId, finalResultCode]);

    // If no exact match found, try to find any result for this test
    if (testResult.length === 0) {
      console.log('🔍 No exact match found, checking all results for test');
      testResult = await getMany(`
        SELECT * FROM test_results
        WHERE test_id = $1 AND is_active = true
        ORDER BY created_at DESC
        LIMIT 1
      `, [testId]);
    }

    console.log('📄 Found test result:', testResult.length > 0 ? 'YES' : 'NO');
    if (testResult.length > 0) {
      console.log('📋 Result details:', {
        code: testResult[0].result_code,
        title: testResult[0].title,
        description: testResult[0].description,
        pdf: testResult[0].pdf_file
      });
    }

    const totalScore = sectionResults.reduce((sum, section) => sum + section.totalScore, 0);

    return {
      scoringType: 'section_wise_flag_based',
      sectionResults,
      resultCode: finalResultCode,
      testResult: testResult[0] || null,
      totalScore,
      questionCount: Object.keys(answers).length,
      pdfFile: testResult[0]?.pdf_file || null,
      resultTitle: testResult[0]?.title || null,
      resultDescription: testResult[0]?.description || null
    };

  } catch (error) {
    console.error('❌ Section-wise flag calculation error:', error);
    throw error;
  }
};

// Calculate range-based scores
const calculateRangeBasedScore = async (answers, questions, scoringConfig, testId) => {
  try {
    const { getMany } = require('../config/database');
    console.log('📊 Calculating range-based scores');

    let totalScore = 0;
    let questionCount = 0;

    // Sum all answer values
    for (const [questionId, selectedAnswer] of Object.entries(answers)) {
      const question = questions.find(q => q.id === questionId);
      if (!question) continue;

      // Get option value from section's custom_scoring_config
      let optionValue = 0;
      try {
        const config = typeof question.custom_scoring_config === 'string'
          ? JSON.parse(question.custom_scoring_config)
          : question.custom_scoring_config;

        if (config.section_options && Array.isArray(config.section_options)) {
          const option = config.section_options.find(opt => opt.value == selectedAnswer);
          optionValue = option ? (option.value || 0) : 0;
        }
      } catch (error) {
        console.error('Error parsing section config:', error);
        optionValue = parseInt(selectedAnswer) || 0;
      }

      totalScore += optionValue;
      questionCount++;
    }

    console.log('📊 Total score:', totalScore, 'from', questionCount, 'questions');

    // Find matching range in test_results table
    const ranges = await getMany(`
      SELECT * FROM test_results
      WHERE test_id = $1 AND result_type = 'range_based' AND is_active = true
      ORDER BY score_range
    `, [testId]);

    let matchingResult = null;
    for (const range of ranges) {
      if (range.score_range) {
        // Parse range format like "0-10", "11-20", etc.
        const [min, max] = range.score_range.split('-').map(n => parseInt(n));
        if (totalScore >= min && totalScore <= max) {
          matchingResult = range;
          break;
        }
      }
    }

    console.log('📄 Found matching range result:', matchingResult ? 'YES' : 'NO');

    return {
      scoringType: 'range_based',
      totalScore,
      questionCount,
      testResult: matchingResult,
      averageScore: questionCount > 0 ? (totalScore / questionCount).toFixed(2) : 0
    };

  } catch (error) {
    console.error('❌ Range-based calculation error:', error);
    throw error;
  }
};

// Simple score calculation fallback
const calculateSimpleScore = async (answers, testId) => {
  const totalScore = Object.values(answers).reduce((sum, answer) => {
    return sum + (parseInt(answer) || 0);
  }, 0);

  return {
    scoringType: 'simple',
    totalScore,
    questionCount: Object.keys(answers).length,
    maxPossibleScore: Object.keys(answers).length * 5, // Assuming 5-point scale
    testResult: null
  };
};

// Calculate maximum possible score
const calculateMaxScore = (scoringPatterns, answersBySection) => {
  let maxScore = 0;

  for (const pattern of scoringPatterns) {
    const sectionAnswers = answersBySection[pattern.section_id] || [];
    let sectionMaxScore = 0;

    if (pattern.scoring_method === 'sum' || pattern.scoring_method === 'average') {
      sectionMaxScore = sectionAnswers.length * 5; // Assuming 5-point scale
    } else if (pattern.scoring_method === 'weighted') {
      const weights = pattern.configuration?.weights || {};
      sectionMaxScore = sectionAnswers.reduce((sum, item) => {
        const weight = weights[item.questionId] || 1;
        return sum + (5 * weight); // Max answer value * weight
      }, 0);
    }

    maxScore += sectionMaxScore * (pattern.weight || 1);
  }

  return maxScore;
};

// Submit test attempt
const submitTestAttempt = async (sessionToken) => {
  try {
    console.log('🔍 DEBUG: Starting submitTestAttempt with sessionToken:', sessionToken);

    const attempt = await TestAttemptModel.getTestAttemptBySessionToken(sessionToken);

    if (!attempt) {
      console.log('❌ DEBUG: Test attempt not found');
      return generateResponse(false, 'Test attempt not found', null, 404);
    }

    console.log('✅ DEBUG: Found test attempt:', attempt.id, 'status:', attempt.status);

    if (attempt.status !== 'in_progress') {
      console.log('❌ DEBUG: Test attempt is not active, status:', attempt.status);
      return generateResponse(false, 'Test attempt is not active', null, 400);
    }

    console.log('🚀 Submitting test attempt:', attempt.id);

    // Get user answers from user_responses table
    const userAnswers = await getUserAnswers(attempt.id);
    console.log('📝 Retrieved user answers:', Object.keys(userAnswers).length, 'answers');

    if (Object.keys(userAnswers).length === 0) {
      console.log('❌ DEBUG: No answers found for test attempt');
      return generateResponse(false, 'No answers found for this test attempt', null, 400);
    }

    console.log('✅ DEBUG: Found', Object.keys(userAnswers).length, 'answers, proceeding with scoring');

    // Calculate final scores using new comprehensive scoring system
    console.log('🧮 DEBUG: Starting score calculation...');
    const scoreResult = await calculateScore(userAnswers, attempt.test_id);
    console.log('🧮 Score calculation complete:', scoreResult);

    // Prepare final score data
    let finalScore = scoreResult.totalScore || 0;
    let percentageScore = 0;
    let resultData = {};

    // Handle all scoring types (including section_specific_flag_based)
    if (scoreResult.scoringType === 'section_specific_flag_based') {
      resultData = {
        scoringType: scoreResult.scoringType,
        sectionResults: scoreResult.sectionResults,
        resultCode: scoreResult.resultCode,
        testResult: scoreResult.testResult,
        totalScore: scoreResult.totalScore,
        questionCount: scoreResult.questionCount
      };

      // Use result info if available
      if (scoreResult.testResult) {
        resultData.resultTitle = scoreResult.testResult.title;
        resultData.resultDescription = scoreResult.testResult.description;
        resultData.pdfFile = scoreResult.testResult.pdf_file;
      }

    } else if (scoreResult.scoringType === 'flag_based' || scoreResult.scoringType === 'section_wise_flag_based') {
      resultData = {
        scoringType: scoreResult.scoringType,
        flagScores: scoreResult.flagScores,
        sectionResults: scoreResult.sectionResults,
        resultCode: scoreResult.resultCode,
        testResult: scoreResult.testResult,
        flagQuestionCounts: scoreResult.flagQuestionCounts
      };

      // For flag-based, use result info if available
      if (scoreResult.testResult) {
        resultData.resultTitle = scoreResult.testResult.title;
        resultData.resultDescription = scoreResult.testResult.description;
        resultData.pdfFile = scoreResult.testResult.pdf_file;
      }

    } else if (scoreResult.scoringType === 'range_based') {
      resultData = {
        scoringType: 'range_based',
        totalScore: scoreResult.totalScore,
        questionCount: scoreResult.questionCount,
        averageScore: scoreResult.averageScore,
        testResult: scoreResult.testResult
      };

      // For range-based, use result info if available
      if (scoreResult.testResult) {
        resultData.resultTitle = scoreResult.testResult.title;
        resultData.resultDescription = scoreResult.testResult.description;
        resultData.pdfFile = scoreResult.testResult.pdf_file;
        resultData.scoreRange = scoreResult.testResult.score_range;
      }

      // Calculate percentage for range-based
      if (scoreResult.questionCount > 0) {
        const maxPossibleScore = scoreResult.questionCount * 5; // Assuming max 5 per question
        percentageScore = Math.round((finalScore / maxPossibleScore) * 100);
      }
    } else {
      // Default/fallback case
      resultData = {
        scoringType: scoreResult.scoringType || 'simple',
        totalScore: scoreResult.totalScore,
        questionCount: scoreResult.questionCount,
        resultCode: scoreResult.resultCode,
        testResult: scoreResult.testResult
      };

      if (scoreResult.testResult) {
        resultData.resultTitle = scoreResult.testResult.title;
        resultData.resultDescription = scoreResult.testResult.description;
        resultData.pdfFile = scoreResult.testResult.pdf_file;
      }
    }

    // Mark attempt as completed with comprehensive data
    const completedAttempt = await TestAttemptModel.completeTestAttempt(
      attempt.id,
      finalScore,
      percentageScore,
      resultData
    );

    console.log('✅ Test attempt completed successfully');

    const responseData = {
      attempt: completedAttempt,
      finalScore,
      percentageScore,
      scoringType: scoreResult.scoringType,
      resultCode: scoreResult.resultCode || scoreResult.finalResultCode,
      testResult: scoreResult.testResult,
      pdfFile: scoreResult.pdfFile || scoreResult.testResult?.pdf_file,
      resultTitle: scoreResult.resultTitle || scoreResult.testResult?.title,
      resultDescription: scoreResult.resultDescription || scoreResult.testResult?.description,
      flagScores: scoreResult.flagScores,
      ...resultData
    };

    console.log('📤 Sending response data:', {
      scoringType: responseData.scoringType,
      resultCode: responseData.resultCode,
      pdfFile: responseData.pdfFile,
      resultTitle: responseData.resultTitle
    });

    return generateResponse(true, 'Test submitted successfully', responseData, 200);

  } catch (error) {
    console.error('❌ Submit test attempt service error:', error);
    console.error('❌ Error stack:', error.stack);
    return generateResponse(false, 'Failed to submit test', null, 500);
  }
};

// Get user's test attempts
const getUserTestAttempts = async (userId) => {
  try {
    const attempts = await TestAttemptModel.getTestAttemptsByUserId(userId);

    const responseData = {
      attempts,
      totalAttempts: attempts.length,
      completedAttempts: attempts.filter(a => a.status === 'completed').length
    };

    return generateResponse(true, 'User test attempts retrieved successfully', responseData, 200);

  } catch (error) {
    console.error('Get user test attempts service error:', error);
    return generateResponse(false, 'Failed to retrieve test attempts', null, 500);
  }
};

// Abandon test attempt
const abandonTestAttempt = async (sessionToken) => {
  try {
    const attempt = await TestAttemptModel.getTestAttemptBySessionToken(sessionToken);

    if (!attempt) {
      return generateResponse(false, 'Test attempt not found', null, 404);
    }

    if (attempt.status !== 'in_progress') {
      return generateResponse(false, 'Test attempt is not active', null, 400);
    }

    await TestAttemptModel.abandonTestAttempt(attempt.id);

    return generateResponse(true, 'Test attempt abandoned', null, 200);

  } catch (error) {
    console.error('Abandon test attempt service error:', error);
    return generateResponse(false, 'Failed to abandon test attempt', null, 500);
  }
};

// Get all completed test attempts with full details
const getAllCompletedTestAttempts = async () => {
  try {
    const { getMany } = require('../config/database');

    // First check what test attempts exist at all
    let allAttempts = [];
    let completedAttempts = [];

    try {
      allAttempts = await getMany(`
        SELECT session_token, status, id, created_at
        FROM test_attempts
        ORDER BY created_at DESC
        LIMIT 5
      `);
      console.log('📊 All test attempts:', allAttempts.length);
    } catch (e) {
      console.log('⚠️ Error fetching all attempts:', e.message);
    }

    // Then get completed attempts with test details
    try {
      completedAttempts = await getMany(`
        SELECT
          ta.*,
          t.title as test_title,
          t.description as test_description
        FROM test_attempts ta
        LEFT JOIN tests t ON ta.test_id = t.id
        WHERE ta.status = 'completed'
        ORDER BY ta.completed_at DESC, ta.created_at DESC
      `);
    } catch (e) {
      console.log('⚠️ Error fetching completed attempts:', e.message);
      // If the query fails, return empty result instead of error
      return generateResponse(true, 'Completed test attempts retrieved successfully', {
        attempts: [],
        totalAttempts: 0
      }, 200);
    }

    console.log('📊 Found completed test attempts:', completedAttempts.length);

    if (completedAttempts.length > 0) {
      console.log('📊 Sample attempt columns:', Object.keys(completedAttempts[0]));
    }

    // Process each attempt and match with admin results
    let detailedAttempts = await Promise.all(
      completedAttempts.map(async (attempt) => {
        console.log('Processing attempt:', attempt.id, 'Status:', attempt.status);

        // Calculate time taken in seconds (total_time_spent is likely in seconds)
        const timeTakenSeconds = attempt.total_time_spent || 0;

        // Generate basic result info from section scores
        const sectionScores = attempt.section_scores || {};
        let resultCode = 'COMPLETED';
        let resultTitle = 'Assessment Complete';
        let resultDescription = 'Your psychometric assessment has been completed successfully.';
        let pdfFile = null;

        // Try to generate a meaningful result code from section scores
        if (Object.keys(sectionScores).length > 0) {
          const topScores = Object.entries(sectionScores)
            .sort(([,a], [,b]) => (b.score || 0) - (a.score || 0))
            .slice(0, 4); // Get top 4 sections for MBTI-style codes

          if (topScores.length >= 4) {
            // Generate MBTI-style result code from top sections
            resultCode = topScores.map(([,section]) => {
              const name = section.name || 'X';
              if (name.toLowerCase().includes('extrav')) return 'E';
              if (name.toLowerCase().includes('introver')) return 'I';
              if (name.toLowerCase().includes('intui')) return 'N';
              if (name.toLowerCase().includes('sens')) return 'S';
              if (name.toLowerCase().includes('feel')) return 'F';
              if (name.toLowerCase().includes('think')) return 'T';
              if (name.toLowerCase().includes('percep')) return 'P';
              if (name.toLowerCase().includes('judg')) return 'J';
              return name.charAt(0).toUpperCase();
            }).join('');
          }
        }

        // Try to match with admin-configured results
        try {
          const adminResult = await getMany(`
            SELECT * FROM test_results
            WHERE test_id = $1 AND result_code = $2 AND is_active = true
            LIMIT 1
          `, [attempt.test_id, resultCode]);

          if (adminResult.length > 0) {
            const result = adminResult[0];
            console.log('✅ Found matching admin result for code:', resultCode);

            resultTitle = result.title || resultTitle;
            resultDescription = result.description || resultDescription;
            pdfFile = result.pdf_file;
          } else {
            // If no exact match, try to find any admin result for this test
            const anyResult = await getMany(`
              SELECT * FROM test_results
              WHERE test_id = $1 AND is_active = true
              ORDER BY created_at DESC
              LIMIT 1
            `, [attempt.test_id]);

            if (anyResult.length > 0) {
              const result = anyResult[0];
              console.log('⚠️ Using fallback admin result:', result.result_code);

              resultCode = result.result_code;
              resultTitle = result.title || resultTitle;
              resultDescription = result.description || resultDescription;
              pdfFile = result.pdf_file;
            }
          }
        } catch (adminError) {
          console.log('⚠️ Could not fetch admin results:', adminError.message);
        }

        return {
          id: attempt.id,
          test_title: attempt.test_title || 'Psychometric Assessment',
          test_type: 'Psychometric',
          completed_at: attempt.completed_at,
          created_at: attempt.created_at,
          time_taken: timeTakenSeconds,
          status: attempt.status,
          result_code: resultCode,
          final_score: parseFloat(attempt.total_score) || 0,
          result_title: resultTitle,
          result_description: resultDescription,
          pdf_file: pdfFile,
          section_results: sectionScores,
          session_token: attempt.id, // Use ID as session token since session_token column doesn't exist
          percentage: parseFloat(attempt.percentage) || 0,
          user_id: attempt.user_id,
          test_id: attempt.test_id
        };
      })
    );


    return generateResponse(true, 'Completed test attempts retrieved successfully', {
      attempts: detailedAttempts,
      totalAttempts: detailedAttempts.length
    }, 200);

  } catch (error) {
    console.error('Get all completed test attempts error:', error);
    return generateResponse(false, 'Failed to retrieve test attempts', null, 500);
  }
};

// Get detailed test result with full breakdown
const getDetailedTestResult = async (attemptId) => {
  try {
    const { getOne } = require('../config/database');

    // Get test attempt details
    const attempt = await getOne(`
      SELECT
        ta.*,
        t.title as test_title,
        t.description as test_description,
        t.test_type,
        u.first_name,
        u.last_name,
        u.email
      FROM test_attempts ta
      JOIN tests t ON ta.test_id = t.id
      LEFT JOIN users u ON ta.user_id = u.id
      WHERE ta.id = $1
    `, [attemptId]);

    if (!attempt) {
      return generateResponse(false, 'Test attempt not found', null, 404);
    }

    // Get user answers
    const userAnswers = await getUserAnswers(attempt.id);

    // Calculate scores to get detailed breakdown
    let scoreResult = null;
    if (Object.keys(userAnswers).length > 0) {
      scoreResult = await calculateScore(userAnswers, attempt.test_id);
    }

    // Calculate time taken
    const timeTaken = attempt.completed_at && attempt.started_at
      ? Math.round((new Date(attempt.completed_at) - new Date(attempt.started_at)) / (1000 * 60)) // minutes
      : null;

    const detailedResult = {
      id: attempt.id,
      testTitle: attempt.test_title,
      testDescription: attempt.test_description,
      testType: attempt.test_type,
      status: attempt.status,
      startedAt: attempt.started_at,
      completedAt: attempt.completed_at,
      timeTaken: timeTaken,
      totalScore: attempt.total_score || scoreResult?.totalScore,
      percentage: attempt.percentage,
      resultCode: scoreResult?.resultCode,
      resultTitle: scoreResult?.resultTitle || scoreResult?.testResult?.title,
      resultDescription: scoreResult?.resultDescription || scoreResult?.testResult?.description,
      pdfFile: scoreResult?.pdfFile || scoreResult?.testResult?.pdf_file,
      sectionResults: scoreResult?.sectionResults || [],
      userAnswers: userAnswers,
      questionCount: Object.keys(userAnswers).length,
      scoringType: scoreResult?.scoringType,
      user: {
        firstName: attempt.first_name,
        lastName: attempt.last_name,
        email: attempt.email
      }
    };

    return generateResponse(true, 'Detailed test result retrieved successfully', detailedResult, 200);

  } catch (error) {
    console.error('Get detailed test result error:', error);
    return generateResponse(false, 'Failed to retrieve detailed result', null, 500);
  }
};

module.exports = {
  startTestAttempt,
  getTestAttemptBySession,
  getTestQuestions,
  saveAnswer,
  updateCurrentQuestion,
  submitTestAttempt,
  getUserTestAttempts,
  getAllCompletedTestAttempts,
  getDetailedTestResult,
  abandonTestAttempt,
  calculateScore,
  getUserAnswers,
  calculateFlagBasedScore,
  calculateRangeBasedScore
};