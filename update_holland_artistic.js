const fs = require('fs');
const { sequelize } = require('./src/config/database');
const { Sequelize } = require('sequelize');

// Parse RTF file and extract score data
async function parseRTFFile(filePath) {
  console.log('Reading RTF file:', filePath);
  const rtfContent = fs.readFileSync(filePath, 'utf8');

  const scores = [];
  const lines = rtfContent.split('\n');

  let currentScore = null;
  let currentSections = {};
  let currentSection = null;
  let currentBullets = [];
  let inBulletList = false;

  for (let line of lines) {
    // Clean RTF codes from the line
    let cleanLine = line
      .replace(/\{\\pntext[^}]*\}/g, '') // Remove bullet point markers
      .replace(/\{\\[*][^}]*\}/g, '') // Remove other RTF control groups
      .replace(/\\pard[^\\]*/g, '')
      .replace(/\\fi-?\d+/g, '')
      .replace(/\\li\d+/g, '')
      .replace(/\\sa\d+/g, '')
      .replace(/\\sl\d+/g, '')
      .replace(/\\slmult\d+/g, '')
      .replace(/\\tx\d+/g, '')
      .replace(/\\qc/g, '')
      .replace(/\\f\d+/g, '')
      .replace(/\\fs\d+/g, '')
      .replace(/\\lang\d+/g, '')
      .replace(/\\b\s*/g, '')
      .replace(/\\b0\s*/g, '')
      .replace(/\\rquote/g, "'")
      .replace(/\\ldblquote/g, '"')
      .replace(/\\rdblquote/g, '"')
      .replace(/\\emdash/g, '—')
      .replace(/\\endash/g, '–')
      .replace(/\\par/g, '')
      .replace(/\\line/g, ' ')
      .replace(/[{}]/g, '')
      .replace(/\\\\/g, '')
      .replace(/\\[a-z]+\d*/gi, '')
      .trim();

    // Skip empty lines and separator lines
    if (!cleanLine || cleanLine.match(/^_+$/) || cleanLine.match(/^[\s\d]+$/)) {
      // Check if we're at a section separator
      if (cleanLine.match(/^_+$/)) {
        // Save current section and score
        if (currentSection && currentBullets.length > 0) {
          currentSections[currentSection] = [...currentBullets];
        }
        if (currentScore !== null && Object.keys(currentSections).length > 0) {
          scores.push({
            score: currentScore,
            sections: currentSections
          });
        }
        currentScore = null;
        currentSections = {};
        currentSection = null;
        currentBullets = [];
        inBulletList = false;
      }
      continue;
    }

    // Check for new score header
    const scoreMatch = cleanLine.match(/Artistic\s*\(A\)\s*.\s*Score\s*(\d+)/i);
    if (scoreMatch) {
      // Save previous score if exists
      if (currentSection && currentBullets.length > 0) {
        currentSections[currentSection] = [...currentBullets];
      }
      if (currentScore !== null && Object.keys(currentSections).length > 0) {
        scores.push({
          score: currentScore,
          sections: currentSections
        });
      }

      currentScore = parseInt(scoreMatch[1]);
      currentSections = {};
      currentSection = null;
      currentBullets = [];
      inBulletList = false;
      continue;
    }

    // Check for section headers
    if (cleanLine.match(/^What makes you unique:?$/i)) {
      if (currentSection && currentBullets.length > 0) {
        currentSections[currentSection] = [...currentBullets];
      }
      currentSection = 'unique';
      currentBullets = [];
      inBulletList = true;
    } else if (cleanLine.match(/^Superpowers you bring to the table:?$/i)) {
      if (currentSection && currentBullets.length > 0) {
        currentSections[currentSection] = [...currentBullets];
      }
      currentSection = 'superpowers';
      currentBullets = [];
      inBulletList = true;
    } else if (cleanLine.match(/^Growth zones for you:?$/i)) {
      if (currentSection && currentBullets.length > 0) {
        currentSections[currentSection] = [...currentBullets];
      }
      currentSection = 'growth';
      currentBullets = [];
      inBulletList = true;
    } else if (cleanLine.match(/^Your approaches to relationships:?$/i)) {
      if (currentSection && currentBullets.length > 0) {
        currentSections[currentSection] = [...currentBullets];
      }
      currentSection = 'relationships';
      currentBullets = [];
      inBulletList = true;
    } else if (cleanLine.match(/^Work environment where you will thrive:?$/i)) {
      if (currentSection && currentBullets.length > 0) {
        currentSections[currentSection] = [...currentBullets];
      }
      currentSection = 'work';
      currentBullets = [];
      inBulletList = true;
    } else if (cleanLine.match(/^Dream Roles and Ideal Tasks for You:?$/i)) {
      if (currentSection && currentBullets.length > 0) {
        currentSections[currentSection] = [...currentBullets];
      }
      currentSection = 'roles';
      currentBullets = [];
      inBulletList = true;
    } else if (cleanLine.match(/^Ideal Careers:?$/i)) {
      if (currentSection && currentBullets.length > 0) {
        currentSections[currentSection] = [...currentBullets];
      }
      currentSection = 'careers';
      currentBullets = [];
      inBulletList = false; // Careers is a paragraph
    } else if (cleanLine.match(/^Big Picture Takeaway:?$/i)) {
      if (currentSection && currentBullets.length > 0) {
        currentSections[currentSection] = [...currentBullets];
      }
      currentSection = 'takeaway';
      currentBullets = [];
      inBulletList = false; // Takeaway is a paragraph
    } else if (currentSection && cleanLine.length > 0) {
      // This is content for the current section
      currentBullets.push(cleanLine);
    }
  }

  // Save last score
  if (currentSection && currentBullets.length > 0) {
    currentSections[currentSection] = [...currentBullets];
  }
  if (currentScore !== null && Object.keys(currentSections).length > 0) {
    scores.push({
      score: currentScore,
      sections: currentSections
    });
  }

  return scores;
}

// Convert sections to HTML
function sectionsToHtml(sections) {
  let html = '<div class="holland-artistic-description">\n';

  const sectionConfig = [
    { key: 'unique', title: 'What makes you unique', isList: true },
    { key: 'superpowers', title: 'Superpowers you bring to the table', isList: true },
    { key: 'growth', title: 'Growth zones for you', isList: true },
    { key: 'relationships', title: 'Your approaches to relationships', isList: true },
    { key: 'work', title: 'Work environment where you will thrive', isList: true },
    { key: 'roles', title: 'Dream Roles and Ideal Tasks for You', isList: true },
    { key: 'careers', title: 'Ideal Careers', isList: false },
    { key: 'takeaway', title: 'Big Picture Takeaway', isList: false }
  ];

  for (const { key, title, isList } of sectionConfig) {
    if (sections[key] && sections[key].length > 0) {
      html += `  <h3>${title}</h3>\n`;

      if (isList) {
        html += '  <ul>\n';
        sections[key].forEach(item => {
          if (item.trim().length > 0) {
            html += `    <li>${item.trim()}</li>\n`;
          }
        });
        html += '  </ul>\n';
      } else {
        // Paragraph content
        const paragraph = sections[key].join(' ').trim();
        html += `  <p>${paragraph}</p>\n`;
      }
    }
  }

  html += '</div>';
  return html;
}

// Main function
async function updateHollandArtistic() {
  try {
    console.log('Starting Holland Artistic (A) update...\n');

    // Get test ID
    const tests = await sequelize.query(
      "SELECT id, title FROM tests WHERE title ILIKE '%strong%' OR test_type = 'CAREER_ASSESSMENT'",
      {
        type: Sequelize.QueryTypes.SELECT
      }
    );

    if (tests.length === 0) {
      throw new Error('No Strong Interest Inventory test found');
    }

    const testId = tests[0].id;
    console.log(`Found test: ${tests[0].title} (ID: ${testId})\n`);

    // Parse RTF file
    const filePath = 'C:\\Users\\rds21\\OneDrive\\Desktop\\ARTISTIC (A)_HOLLAND CODES.rtf';
    const scores = await parseRTFFile(filePath);

    console.log(`Extracted ${scores.length} score sections\n`);

    // Filter to only scores 1-12 as requested
    const targetScores = scores.filter(s => s.score >= 1 && s.score <= 12);
    console.log(`Targeting scores 1-12: ${targetScores.length} records\n`);

    // Get existing components for scores 1-12
    const existing = await sequelize.query(
      'SELECT id, component_code, score_value FROM result_components WHERE test_id = ? AND component_code = ? AND score_value BETWEEN 1 AND 12 ORDER BY score_value',
      {
        replacements: [testId, 'A'],
        type: Sequelize.QueryTypes.SELECT
      }
    );

    console.log(`Found ${existing.length} existing records for scores 1-12\n`);

    // Update each score
    let updatedCount = 0;
    let insertedCount = 0;
    const errors = [];

    for (const scoreData of targetScores) {
      try {
        const html = sectionsToHtml(scoreData.sections);

        // Check if this score already exists
        const existingRecord = existing.find(e => e.score_value === scoreData.score);

        if (existingRecord) {
          // Update existing record
          await sequelize.query(
            `UPDATE result_components
             SET description = ?,
                 component_name = ?,
                 updated_at = CURRENT_TIMESTAMP
             WHERE id = ?`,
            {
              replacements: [html, 'Artistic', existingRecord.id],
              type: Sequelize.QueryTypes.UPDATE
            }
          );
          updatedCount++;
          console.log(`✓ Updated Score ${scoreData.score} (ID: ${existingRecord.id})`);
        } else {
          // Insert new record
          const [result] = await sequelize.query(
            `INSERT INTO result_components (
              test_id, component_code, component_name, score_value,
              description, order_priority, is_active
            )
            VALUES (?, ?, ?, ?, ?, ?, ?)
            RETURNING id`,
            {
              replacements: [testId, 'A', 'Artistic', scoreData.score, html, scoreData.score, true],
              type: Sequelize.QueryTypes.INSERT
            }
          );
          insertedCount++;
          console.log(`✓ Inserted Score ${scoreData.score} (ID: ${result[0].id})`);
        }
      } catch (error) {
        errors.push({ score: scoreData.score, error: error.message });
        console.error(`✗ Failed Score ${scoreData.score}: ${error.message}`);
      }
    }

    // Delete the wrongly inserted records (scores 14-20)
    console.log('\n Cleaning up incorrectly inserted records (scores > 13)...');
    const deleteResult = await sequelize.query(
      'DELETE FROM result_components WHERE test_id = ? AND component_code = ? AND score_value > 13',
      {
        replacements: [testId, 'A'],
        type: Sequelize.QueryTypes.DELETE
      }
    );
    console.log(`✓ Deleted ${deleteResult[1]} incorrect records\n`);

    // Summary
    console.log('='.repeat(60));
    console.log('UPDATE SUMMARY');
    console.log('='.repeat(60));
    console.log(`Target scores (1-12): ${targetScores.length}`);
    console.log(`Updated existing records: ${updatedCount}`);
    console.log(`Inserted new records: ${insertedCount}`);
    console.log(`Failed: ${errors.length}`);
    console.log(`Cleaned up incorrect records: ${deleteResult[1]}`);

    if (errors.length > 0) {
      console.log('\nErrors:');
      errors.forEach(err => {
        console.log(`  Score ${err.score}: ${err.error}`);
      });
    }

    // Final verification
    const final = await sequelize.query(
      'SELECT score_value, LEFT(description, 80) as preview FROM result_components WHERE test_id = ? AND component_code = ? ORDER BY score_value',
      {
        replacements: [testId, 'A'],
        type: Sequelize.QueryTypes.SELECT
      }
    );

    console.log('\nFinal state of Artistic (A) components:');
    console.log(JSON.stringify(final, null, 2));

    console.log('\n✅ Update completed!');
    process.exit(0);

  } catch (error) {
    console.error('\n❌ Update failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// Run update
updateHollandArtistic();
