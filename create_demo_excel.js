const XLSX = require('xlsx');
const path = require('path');

// Demo data for questions with flags
const questionsWithFlags = [
  {
    question_text: "What is the capital of France?",
    order_index: 1,
    question_type: "MULTIPLE_CHOICE",
    difficulty_level: "EASY",
    marks: 2,
    question_flag: "Geography",
    explanation: "Paris is the capital and most populous city of France.",
    question_number: "Q1"
  },
  {
    question_text: "Which planet is closest to the Sun?",
    order_index: 2,
    question_type: "MULTIPLE_CHOICE",
    difficulty_level: "EASY",
    marks: 2,
    question_flag: "Astronomy",
    explanation: "Mercury is the smallest planet in our solar system and the closest to the Sun.",
    question_number: "Q2"
  },
  {
    question_text: "What is 25 + 17?",
    order_index: 3,
    question_type: "MULTIPLE_CHOICE",
    difficulty_level: "EASY",
    marks: 1,
    question_flag: "Math",
    explanation: "Basic addition: 25 + 17 = 42",
    question_number: "Q3"
  },
  {
    question_text: "Who wrote 'Romeo and Juliet'?",
    order_index: 4,
    question_type: "MULTIPLE_CHOICE",
    difficulty_level: "MEDIUM",
    marks: 3,
    question_flag: "Literature",
    explanation: "William Shakespeare wrote this famous tragedy in the early part of his career.",
    question_number: "Q4"
  },
  {
    question_text: "What is the chemical symbol for gold?",
    order_index: 5,
    question_type: "MULTIPLE_CHOICE",
    difficulty_level: "MEDIUM",
    marks: 2,
    question_flag: "Chemistry",
    explanation: "Au comes from the Latin word 'aurum' meaning gold.",
    question_number: "Q5"
  }
];

// Personality test data
const personalityQuestions = [
  {
    question_text: "Analyze this personality trait: You prefer working in teams",
    order_index: 1,
    question_type: "MULTIPLE_CHOICE",
    difficulty_level: "MEDIUM",
    marks: 2,
    question_flag: "Extrovert",
    explanation: "This question measures extroversion tendencies",
    question_number: "P1"
  },
  {
    question_text: "You enjoy taking risks and trying new things",
    order_index: 2,
    question_type: "MULTIPLE_CHOICE",
    difficulty_level: "MEDIUM",
    marks: 2,
    question_flag: "Openness",
    explanation: "Measures openness to new experiences",
    question_number: "P2"
  },
  {
    question_text: "You are highly organized and detail-oriented",
    order_index: 3,
    question_type: "MULTIPLE_CHOICE",
    difficulty_level: "MEDIUM",
    marks: 2,
    question_flag: "Conscientiousness",
    explanation: "Assesses conscientiousness personality trait",
    question_number: "P3"
  },
  {
    question_text: "You often worry about things that might go wrong",
    order_index: 4,
    question_type: "MULTIPLE_CHOICE",
    difficulty_level: "MEDIUM",
    marks: 2,
    question_flag: "Neuroticism",
    explanation: "Measures anxiety and emotional stability",
    question_number: "P4"
  },
  {
    question_text: "You are considerate and helpful to others",
    order_index: 5,
    question_type: "MULTIPLE_CHOICE",
    difficulty_level: "MEDIUM",
    marks: 2,
    question_flag: "Agreeableness",
    explanation: "Evaluates agreeableness and empathy",
    question_number: "P5"
  }
];

// Create Excel workbooks
function createExcelFile(data, filename) {
  const workbook = XLSX.utils.book_new();
  const worksheet = XLSX.utils.json_to_sheet(data);

  // Auto-size columns
  const colWidths = Object.keys(data[0] || {}).map(key => ({
    wch: Math.max(
      key.length,
      Math.max(...data.map(row => String(row[key] || '').length))
    ) + 2
  }));
  worksheet['!cols'] = colWidths;

  XLSX.utils.book_append_sheet(workbook, worksheet, 'Questions');
  XLSX.writeFile(workbook, filename);
  console.log(`✅ Created: ${filename}`);
}

// Create the demo Excel files
try {
  createExcelFile(questionsWithFlags, 'demo_questions_with_flags.xlsx');
  createExcelFile(personalityQuestions, 'demo_personality_questions_with_flags.xlsx');
  console.log('\n🎉 Demo Excel files created successfully!');
  console.log('\n📋 Supported columns:');
  console.log('- question_text (required)');
  console.log('- order_index (required)');
  console.log('- question_type (optional, defaults to MULTIPLE_CHOICE)');
  console.log('- difficulty_level (optional: EASY, MEDIUM, HARD, EXPERT)');
  console.log('- marks (optional, defaults to 1)');
  console.log('- question_flag (optional - THIS IS THE FLAG COLUMN)');
  console.log('- explanation (optional)');
  console.log('- question_number (optional)');
} catch (error) {
  console.error('❌ Error creating Excel files:', error);
}