const { PDFDocument, rgb, StandardFonts } = require('pdf-lib');
const fs = require('fs').promises;
const path = require('path');
const { getOne, executeQuery } = require('../config/database');

/**
 * PDF Generation Service
 * Generates personalized PDF certificates/results for students
 */

class PDFGenerationService {
  /**
   * Generate PDF for a student's test result
   * @param {string} testId - Test UUID
   * @param {string} studentId - Student UUID
   * @param {string} attemptId - Test attempt UUID
   * @param {object} studentData - Student information and test results
   * @returns {Promise<string>} Path to generated PDF file
   */
  async generateStudentPDF(testId, studentId, attemptId, studentData) {
    try {
      // Fetch complete student and test data from database
      const completeData = await getOne(`
        SELECT
          -- User/Student data
          u.id as user_id,
          u.first_name,
          u.last_name,
          u.email,
          u.phone_number,
          u.avatar,
          u.date_of_birth,
          u.gender,
          u.address,

          -- Test data
          t.id as test_id,
          t.title as test_title,
          t.description as test_description,
          t.test_type,
          t.total_duration,
          t.total_questions,
          t.passing_score,
          t.thumbnail as test_thumbnail,

          -- Test attempt data
          ta.id as attempt_id,
          ta.attempt_number,
          ta.started_at,
          ta.completed_at,
          ta.total_time_spent,
          ta.status,
          ta.total_score,
          ta.percentage,
          ta.max_possible_score,
          ta.total_questions_answered,
          ta.section_scores

        FROM users u
        JOIN test_attempts ta ON u.id = ta.user_id
        JOIN tests t ON ta.test_id = t.id
        WHERE ta.id = $1 AND u.id = $2 AND t.id = $3
      `, [attemptId, studentId, testId]);

      if (!completeData) {
        throw new Error('Student test attempt data not found');
      }

      // Merge with any additional studentData passed
      const mergedData = { ...completeData, ...studentData };

      // Get the assigned PDF template for this test
      const templateInfo = await getOne(`
        SELECT
          pt.template_id,
          pt.template_name,
          pt.pdf_file_path,
          pt.template_config,
          t.title as test_title
        FROM tests t
        JOIN pdf_templates pt ON t.pdf_template_id = pt.template_id
        WHERE t.id = $1 AND pt.is_active = true
      `, [testId]);

      if (!templateInfo) {
        throw new Error('No active PDF template assigned to this test');
      }

      console.log('📋 Student Data Retrieved:', {
        name: `${completeData.first_name} ${completeData.last_name}`,
        email: completeData.email,
        test: completeData.test_title,
        score: completeData.total_score,
        percentage: completeData.percentage
      });

      // Load the template PDF
      const templatePath = path.join(__dirname, '../../', templateInfo.pdf_file_path);
      const templateBytes = await fs.readFile(templatePath);
      const pdfDoc = await PDFDocument.load(templateBytes);

      // Get all pages
      const pages = pdfDoc.getPages();

      // Load standard fonts
      const fonts = {
        'Helvetica': await pdfDoc.embedFont(StandardFonts.Helvetica),
        'Helvetica-Bold': await pdfDoc.embedFont(StandardFonts.HelveticaBold),
        'Times-Roman': await pdfDoc.embedFont(StandardFonts.TimesRoman),
        'Times-Bold': await pdfDoc.embedFont(StandardFonts.TimesRomanBold),
        'Courier': await pdfDoc.embedFont(StandardFonts.Courier),
        'Courier-Bold': await pdfDoc.embedFont(StandardFonts.CourierBold)
      };

      // Load custom fonts (NexaRustSans)
      try {
        const nexaRustPath = path.join(__dirname, '../../fonts/NexaRustSans-Trial-Black2.ttf');
        console.log('📁 Attempting to load font from:', nexaRustPath);

        const nexaRustBytes = await fs.readFile(nexaRustPath);
        console.log('📦 Font file loaded, size:', nexaRustBytes.length, 'bytes');

        // Register fontkit for custom font support
        const fontkit = require('@pdf-lib/fontkit');
        pdfDoc.registerFontkit(fontkit);

        fonts['NexusRustSans'] = await pdfDoc.embedFont(nexaRustBytes, { subset: true });
        console.log('✓ Custom font NexaRustSans loaded successfully with fontkit');
      } catch (error) {
        console.error('⚠️ Could not load NexaRustSans font:');
        console.error('   Error message:', error.message);
        console.error('   Error stack:', error.stack);
        console.warn('   Please place NexaRustSans-Trial-Black2.ttf in /fonts/ directory');
        console.warn('   Font will fallback to Helvetica');
      }

      // Default fonts for backwards compatibility
      const font = fonts['Helvetica'];
      const fontBold = fonts['Helvetica-Bold'];

      // Parse template configuration (it might be a string or already parsed object)
      let config = templateInfo.template_config || {};
      if (typeof config === 'string') {
        try {
          config = JSON.parse(config);
        } catch (e) {
          console.error('Failed to parse template_config:', e);
          config = {};
        }
      }

      // Support both old format (textFields/imageFields) and new format (fields array)
      let textFields = [];
      let imageFields = [];

      if (config.fields && Array.isArray(config.fields)) {
        // New format: separate by type
        textFields = config.fields.filter(f => f.type === 'text');
        imageFields = config.fields.filter(f => f.type === 'image');
      } else {
        // Old format: use separate arrays
        textFields = config.textFields || [];
        imageFields = config.imageFields || [];
      }

      console.log('📄 Processing PDF generation:');
      console.log('   Template:', templateInfo.template_name);
      console.log('   Total pages:', pages.length);
      console.log('   Text fields:', textFields.length);
      console.log('   Image fields:', imageFields.length);

      // Process text fields
      for (const field of textFields) {
        // Support both 'name' (new format) and 'fieldName' (old format)
        const fieldName = field.name || field.fieldName;
        const value = this.getFieldValue(fieldName, mergedData);

        if (value) {
          const fontSize = field.fontSize || 14;
          const color = this.parseColor(field.fontColor || field.color || '#000000');
          const rotation = field.rotation || 0;
          const fontWeight = field.fontWeight || 'normal';
          const fontFamily = field.fontFamily || 'Arial, sans-serif';
          const textAlign = field.textAlign || 'left';

          // Select appropriate font based on family and weight
          const selectedFont = this.selectPDFFont(fonts, fontFamily, fontWeight, font, fontBold);

          // Get the page index (0-based) - default to page 1 if not specified
          const pageIndex = (field.page || 1) - 1;
          const targetPage = pages[pageIndex];

          if (!targetPage) {
            console.log(`   ⚠️ Page ${field.page} not found for field: ${fieldName}`);
            continue;
          }

          const { height } = targetPage.getSize();

          // Strip HTML tags from value if it contains HTML
          let cleanValue = String(value);
          if (cleanValue.includes('<') && cleanValue.includes('>')) {
            // Remove HTML tags
            cleanValue = cleanValue.replace(/<[^>]*>/g, '');
            // Decode HTML entities
            cleanValue = cleanValue.replace(/&nbsp;/g, ' ')
                                   .replace(/&amp;/g, '&')
                                   .replace(/&lt;/g, '<')
                                   .replace(/&gt;/g, '>')
                                   .replace(/&quot;/g, '"')
                                   .replace(/&#39;/g, "'");
            // Clean up extra whitespace
            cleanValue = cleanValue.replace(/\s+/g, ' ').trim();
          }

          // Replace special Unicode characters that WinAnsi encoding cannot handle
          cleanValue = cleanValue
            .replace(/[\u2022\u2023\u2043\u2981\u25E6\u2219\u2218]/g, '-')  // Bullet points → dash
            .replace(/[\u2013\u2014]/g, '-')  // En/Em dashes → hyphen
            .replace(/[\u2018\u2019]/g, "'")  // Smart single quotes → apostrophe
            .replace(/[\u201C\u201D]/g, '"')  // Smart double quotes → straight quotes
            .replace(/[\u2026]/g, '...')      // Ellipsis → three dots
            .replace(/[^\x00-\x7F]/g, '')     // Remove any remaining non-ASCII characters

          console.log(`   Writing text field: ${fieldName} at page ${field.page || 1}, (${field.x}, ${field.y}) - ${cleanValue.substring(0, 100)}...`);

          // Handle multi-line text with word wrapping
          const maxWidth = field.maxWidth || 500; // Default max width
          const lineHeight = fontSize * 1.2; // Line spacing

          // Split text into lines that fit within maxWidth
          const words = cleanValue.split(' ');
          const lines = [];
          let currentLine = '';

          for (const word of words) {
            const testLine = currentLine ? `${currentLine} ${word}` : word;
            const textWidth = selectedFont.widthOfTextAtSize(testLine, fontSize);

            if (textWidth <= maxWidth) {
              currentLine = testLine;
            } else {
              if (currentLine) lines.push(currentLine);
              currentLine = word;
            }
          }
          if (currentLine) lines.push(currentLine);

          // Draw each line
          lines.forEach((line, index) => {
            const yPosition = height - field.y - (index * lineHeight);
            const textWidth = selectedFont.widthOfTextAtSize(line, fontSize);

            // Calculate X position based on alignment
            let xPosition = field.x;
            if (textAlign === 'center') {
              xPosition = field.x + (field.width / 2) - (textWidth / 2);
            } else if (textAlign === 'right') {
              xPosition = field.x + field.width - textWidth;
            }

            const drawOptions = {
              x: xPosition,
              y: yPosition,
              size: fontSize,
              font: selectedFont,
              color: rgb(color.r, color.g, color.b)
            };

            // Only add rotation if it's non-zero
            if (rotation && rotation !== 0 && index === 0) {
              const { degrees } = require('pdf-lib');
              drawOptions.rotate = degrees(rotation);
            }

            targetPage.drawText(line, drawOptions);
          });
        } else {
          console.log(`   ⚠️ No value for field: ${fieldName}`);
        }
      }

      // Process image fields (e.g., student photo, signature, QR code)
      for (const field of imageFields) {
        // Support both 'name' (new format) and 'fieldName' (old format)
        const fieldName = field.name || field.fieldName;
        const imageData = this.getFieldValue(fieldName, mergedData);

        if (imageData) {
          try {
            // Get the page index (0-based) - default to page 1 if not specified
            const pageIndex = (field.page || 1) - 1;
            const targetPage = pages[pageIndex];

            if (!targetPage) {
              console.log(`   ⚠️ Page ${field.page} not found for image field: ${fieldName}`);
              continue;
            }

            const { height } = targetPage.getSize();

            // Load image (support both file paths and base64)
            let imageBytes;
            if (imageData.startsWith('data:image')) {
              // Base64 data URL
              const base64Data = imageData.split(',')[1];
              imageBytes = Buffer.from(base64Data, 'base64');
            } else {
              // File path
              const imagePath = path.join(__dirname, '../../', imageData);
              imageBytes = await fs.readFile(imagePath);
            }

            // Embed image based on type
            let image;
            if (imageData.includes('png') || imageData.startsWith('data:image/png')) {
              image = await pdfDoc.embedPng(imageBytes);
            } else {
              image = await pdfDoc.embedJpg(imageBytes);
            }

            const imgWidth = field.width || 100;
            const imgHeight = field.height || 100;

            targetPage.drawImage(image, {
              x: field.x,
              y: height - field.y - imgHeight,
              width: imgWidth,
              height: imgHeight
            });
          } catch (imgError) {
            console.error(`Error embedding image for field ${fieldName}:`, imgError);
          }
        }
      }

      // Save the generated PDF
      const pdfBytes = await pdfDoc.save();

      // Create output directory if it doesn't exist
      const outputDir = path.join(__dirname, '../../uploads/generated-pdfs');
      await fs.mkdir(outputDir, { recursive: true });

      // Generate unique filename
      const timestamp = Date.now();
      const filename = `result-${studentId}-${attemptId}-${timestamp}.pdf`;
      const outputPath = path.join(outputDir, filename);
      const relativePath = `uploads/generated-pdfs/${filename}`;

      // Write PDF to file
      await fs.writeFile(outputPath, pdfBytes);

      // Record generation in database
      await executeQuery(`
        INSERT INTO pdf_generation_history (
          template_id,
          test_id,
          student_id,
          attempt_id,
          pdf_file_path,
          generation_status,
          generated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, NOW())
      `, [
        templateInfo.template_id,
        testId,
        studentId,
        attemptId,
        relativePath,
        'success'
      ]);

      return relativePath;
    } catch (error) {
      console.error('Error generating PDF:', error);

      // Record failure in database
      try {
        await executeQuery(`
          INSERT INTO pdf_generation_history (
            template_id,
            test_id,
            student_id,
            attempt_id,
            generation_status,
            generated_at
          ) VALUES ($1, $2, $3, $4, $5, NOW())
        `, [
          null,
          testId,
          studentId,
          attemptId,
          'failed'
        ]);
      } catch (dbError) {
        console.error('Error recording PDF generation failure:', dbError);
      }

      throw error;
    }
  }

  /**
   * Get field value from student data using field name mapping
   * @param {string} fieldName - Template field name (e.g., 'studentName', 'overallScore')
   * @param {object} studentData - Student data object
   * @returns {*} Field value
   */
  getFieldValue(fieldName, studentData) {
    const fieldMap = {
      // Student information (from users table - exact column names)
      'first_name': studentData.first_name || studentData.firstName || '',
      'last_name': studentData.last_name || studentData.lastName || '',
      'full_name': studentData.full_name || `${studentData.first_name || ''} ${studentData.last_name || ''}`.trim() || studentData.fullName || '',
      'email': studentData.email || studentData.studentEmail || '',
      'phone_number': studentData.phone_number || studentData.phoneNumber || '',
      'date_of_birth': studentData.date_of_birth || studentData.dateOfBirth || '',
      'gender': studentData.gender || '',
      'user_id': studentData.user_id || studentData.userId || studentData.id || '',
      'avatar': studentData.avatar || studentData.studentPhoto || '',

      // Address fields (from users.address JSONB field)
      'school_name': this.getAddressField(studentData, 'school_name') || this.getAddressField(studentData, 'schoolName') || '',
      'class': this.getAddressField(studentData, 'class') || this.getAddressField(studentData, 'grade') || studentData.class || studentData.grade || '',
      'roll_number': this.getAddressField(studentData, 'roll_number') || this.getAddressField(studentData, 'rollNumber') || '',
      'address_street': this.getAddressField(studentData, 'street') || this.getAddressField(studentData, 'address_street') || '',
      'address_city': this.getAddressField(studentData, 'city') || this.getAddressField(studentData, 'address_city') || '',
      'address_state': this.getAddressField(studentData, 'state') || this.getAddressField(studentData, 'address_state') || '',
      'address_country': this.getAddressField(studentData, 'country') || this.getAddressField(studentData, 'address_country') || '',

      // Backwards compatibility
      'studentName': studentData.studentName || studentData.fullName || `${studentData.first_name || ''} ${studentData.last_name || ''}`.trim() || '',
      'studentEmail': studentData.email || studentData.studentEmail || '',
      'studentId': studentData.studentId || studentData.student_id || studentData.id || '',
      'schoolName': this.getAddressField(studentData, 'school_name') || this.getAddressField(studentData, 'schoolName') || '',
      'studentClass': this.getAddressField(studentData, 'class') || studentData.class || studentData.grade || '',
      'rollNumber': this.getAddressField(studentData, 'roll_number') || this.getAddressField(studentData, 'rollNumber') || '',

      // Test information (from tests table)
      'test_title': studentData.test_title || studentData.testTitle || '',
      'test_description': studentData.test_description || studentData.testDescription || '',
      'test_type': studentData.test_type || studentData.testType || '',
      'total_duration': studentData.total_duration || studentData.totalDuration || '',
      'total_questions': studentData.total_questions || studentData.totalQuestions || '',
      'passing_score': studentData.passing_score || studentData.passingScore || '',
      'test_thumbnail': studentData.test_thumbnail || studentData.thumbnail || '',

      // Backwards compatibility
      'testTitle': studentData.testTitle || studentData.test_title || '',
      'testDate': studentData.completionDate || studentData.testDate || studentData.completed_at || '',

      // Test Attempt information (from test_attempts table)
      'attempt_number': studentData.attempt_number || studentData.attemptNumber || '1',
      'started_at': studentData.started_at || studentData.startedAt || '',
      'completed_at': studentData.completed_at || studentData.completedAt || studentData.completionDate || '',
      'total_time_spent': studentData.total_time_spent || studentData.totalTimeSpent || '',
      'status': studentData.status || '',

      // Score & Results (from test_attempts table)
      'total_score': studentData.total_score || studentData.totalScore || studentData.overallScore || '',
      'percentage': studentData.percentage || '',
      'max_possible_score': studentData.max_possible_score || studentData.maxPossibleScore || '',
      'total_questions_answered': studentData.total_questions_answered || studentData.totalQuestionsAnswered || '',
      'grade': studentData.grade || this.calculateGrade(studentData.percentage) || '',
      'result_status': studentData.result_status || (studentData.percentage >= (studentData.passing_score || 50) ? 'PASSED' : 'FAILED') || '',

      // Backwards compatibility
      'overallScore': studentData.overallScore || studentData.totalScore || studentData.total_score || '',
      'percentageScore': studentData.percentage || '',
      'correctAnswers': studentData.correctAnswers || studentData.total_questions_answered || '',
      'attemptNumber': studentData.attemptNumber || studentData.attempt_number || '1',

      // Section scores
      'section_scores': studentData.section_scores || studentData.sectionScores || '',
      'section_results': studentData.section_results || studentData.sectionResults || this.formatSectionResults(studentData.section_scores) || '',

      // Result Component information
      'result_code': studentData.result_code || studentData.resultCode || '',
      'component_name': studentData.component_name || studentData.componentName || '',
      'result_title': studentData.result_title || studentData.resultTitle || '',
      'result_description': studentData.result_description || studentData.resultDescription || '',

      // Backwards compatibility
      'resultCode': studentData.resultCode || studentData.result_code || '',
      'resultTitle': studentData.resultTitle || studentData.result_title || '',
      'resultDescription': studentData.resultDescription || studentData.result_description || '',

      // Certificate & Additional fields
      'certificate_id': studentData.certificate_id || studentData.certificateId || this.generateCertificateId(studentData) || '',
      'issue_date': studentData.issue_date || new Date().toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      }),
      'qr_code': studentData.qr_code || studentData.qrCode || '',
      'signature': studentData.signature || '',
      'school_logo': studentData.school_logo || studentData.schoolLogo || '',

      // Backwards compatibility
      'certificateId': studentData.certificateId || studentData.certificate_id || '',
      'issueDate': studentData.issueDate || new Date().toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      }),
      'completionDate': studentData.completionDate || studentData.completed_at || '',
      'studentPhoto': studentData.studentPhoto || studentData.avatar || '',
      'qrCode': studentData.qrCode || studentData.qr_code || '',
      'schoolLogo': studentData.schoolLogo || studentData.school_logo || ''
    };

    return fieldMap[fieldName] || studentData[fieldName] || '';
  }

  /**
   * Get field from address JSONB object
   * @param {object} studentData - Student data object
   * @param {string} fieldName - Field name to extract from address
   * @returns {string} Field value
   */
  getAddressField(studentData, fieldName) {
    if (!studentData.address) return '';

    // If address is a string (JSON), parse it
    if (typeof studentData.address === 'string') {
      try {
        const addressObj = JSON.parse(studentData.address);
        return addressObj[fieldName] || '';
      } catch (e) {
        return '';
      }
    }

    // If address is already an object
    if (typeof studentData.address === 'object') {
      return studentData.address[fieldName] || '';
    }

    return '';
  }

  /**
   * Calculate grade based on percentage
   * @param {number} percentage - Percentage score
   * @returns {string} Grade
   */
  calculateGrade(percentage) {
    if (!percentage) return '';
    if (percentage >= 90) return 'A+';
    if (percentage >= 80) return 'A';
    if (percentage >= 70) return 'B';
    if (percentage >= 60) return 'C';
    if (percentage >= 50) return 'D';
    return 'F';
  }

  /**
   * Generate certificate ID
   * @param {object} studentData - Student data
   * @returns {string} Certificate ID
   */
  generateCertificateId(studentData) {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    return `CERT-${year}${month}-${random}`;
  }

  /**
   * Format section results as readable text
   * @param {object|string} sectionScores - Section scores object or JSON string
   * @returns {string} Formatted section results
   */
  formatSectionResults(sectionScores) {
    if (!sectionScores) return '';

    let scores = sectionScores;
    if (typeof sectionScores === 'string') {
      try {
        scores = JSON.parse(sectionScores);
      } catch (e) {
        return sectionScores;
      }
    }

    if (typeof scores === 'object') {
      return Object.entries(scores)
        .map(([section, score]) => `${section}: ${score}`)
        .join(', ');
    }

    return String(sectionScores);
  }

  /**
   * Select appropriate PDF font based on font family and weight
   * @param {object} fonts - Available PDF fonts
   * @param {string} fontFamily - CSS font family string
   * @param {string} fontWeight - Font weight (normal, bold, 100-900)
   * @param {object} defaultFont - Default font fallback
   * @param {object} defaultBoldFont - Default bold font fallback
   * @returns {object} Selected PDF font
   */
  selectPDFFont(fonts, fontFamily, fontWeight, defaultFont, defaultBoldFont) {
    const isBold = fontWeight === 'bold' || parseInt(fontWeight) >= 600;

    // Map CSS font families to PDF fonts
    // Check for NexaRustSans/NexusRustSans first (custom font - support both spellings)
    if (fontFamily.includes('NexaRustSans') || fontFamily.includes('NexusRustSans') ||
        fontFamily.includes('Nexa Rust') || fontFamily.includes('Nexus Rust')) {
      return fonts['NexusRustSans'] || fonts['Helvetica']; // Fallback to Helvetica if not loaded
    } else if (fontFamily.includes('Times') || fontFamily.includes('serif')) {
      return isBold ? fonts['Times-Bold'] : fonts['Times-Roman'];
    } else if (fontFamily.includes('Courier') || fontFamily.includes('monospace')) {
      return isBold ? fonts['Courier-Bold'] : fonts['Courier'];
    } else {
      // Default to Helvetica (similar to Arial, sans-serif)
      return isBold ? fonts['Helvetica-Bold'] : fonts['Helvetica'];
    }
  }

  /**
   * Parse hex color to RGB values (0-1 range)
   * @param {string} hexColor - Hex color string (e.g., '#FF5733')
   * @returns {object} RGB object with r, g, b values
   */
  parseColor(hexColor) {
    const hex = hexColor.replace('#', '');
    return {
      r: parseInt(hex.substring(0, 2), 16) / 255,
      g: parseInt(hex.substring(2, 4), 16) / 255,
      b: parseInt(hex.substring(4, 6), 16) / 255
    };
  }

  /**
   * Get generated PDF for a specific attempt
   * @param {string} attemptId - Test attempt UUID
   * @returns {Promise<object>} PDF generation record
   */
  async getGeneratedPDF(attemptId) {
    return await getOne(`
      SELECT
        pgh.*,
        pt.template_name,
        t.title as test_title
      FROM pdf_generation_history pgh
      LEFT JOIN pdf_templates pt ON pgh.template_id = pt.template_id
      LEFT JOIN tests t ON pgh.test_id = t.id
      WHERE pgh.attempt_id = $1 AND pgh.generation_status = 'success'
      ORDER BY pgh.generated_at DESC
      LIMIT 1
    `, [attemptId]);
  }

  /**
   * Regenerate PDF for an existing attempt
   * @param {string} attemptId - Test attempt UUID
   * @param {object} studentData - Updated student data
   * @returns {Promise<string>} Path to regenerated PDF
   */
  async regeneratePDF(attemptId, studentData) {
    const existingRecord = await getOne(`
      SELECT test_id, student_id FROM pdf_generation_history
      WHERE attempt_id = $1
      LIMIT 1
    `, [attemptId]);

    if (!existingRecord) {
      throw new Error('No PDF generation record found for this attempt');
    }

    return await this.generateStudentPDF(
      existingRecord.test_id,
      existingRecord.student_id,
      attemptId,
      studentData
    );
  }
}

module.exports = new PDFGenerationService();
