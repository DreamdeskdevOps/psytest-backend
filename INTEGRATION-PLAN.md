# PDF Template Integration Plan

## What We Need to Do

Since we reverted the code, we need to re-add ONLY the essential PDF generation without the complex features that caused issues.

## Simple Integration Steps:

### 1. Add PDF Generation to Test Submission
When a student completes a test, we need to:
- Check if the test has a PDF template assigned
- If yes, generate a PDF with their data
- Return the PDF path so they can download it

### 2. Data Mapping
The PDF template has these fields:
- `studentName` → Student's first_name + last_name
- `resultDescription` → The MBTI personality description from the test result

### 3. What Data is Available
When a test is submitted, we have:
- `testInfo.first_name` - Student's first name
- `testInfo.last_name` - Student's last name
- `scoreResult.resultDescription` or `scoreResult.testResult.description` - The MBTI description

### 4. Simple Code Addition
We just need to add to `testAttemptService.js` after the test is scored:

```javascript
// Generate PDF if template is assigned
if (testInfo && testInfo.pdf_template_id) {
  const pdfService = require('./pdfGenerationService');
  const studentData = {
    studentName: `${testInfo.first_name} ${testInfo.last_name}`,
    resultDescription: scoreResult.resultDescription || scoreResult.testResult?.description || ''
  };

  try {
    generatedPdfPath = await pdfService.generateStudentPDF(
      test_id, user_id, attempt_id, studentData
    );
  } catch (error) {
    console.error('PDF generation failed:', error);
  }
}
```

## That's It!
No complex routes, no database history tracking issues, just simple PDF generation.
