const fs = require('fs');
const { insertOne, getMany } = require('./src/config/database');

// Function to clean RTF formatting and convert to HTML
function rtfToHtml(rtfText) {
  // Remove RTF control words and formatting
  let text = rtfText
    .replace(/\\rtf1.*?\\uc1/s, '') // Remove RTF header
    .replace(/\\pard.*?(?=\\pard|$)/gs, match => {
      // Extract text from paragraph groups
      return match
        .replace(/\\par\s*/g, '<br>\n')
        .replace(/\\b\s*/g, '<strong>')
        .replace(/\\b0\s*/g, '</strong>')
        .replace(/\\fs\d+\s*/g, '')
        .replace(/\\f\d+\s*/g, '')
        .replace(/\\li\d+\s*/g, '')
        .replace(/\\fi-?\d+\s*/g, '')
        .replace(/\\sa\d+\s*/g, '')
        .replace(/\\sl\d+\s*/g, '')
        .replace(/\\slmult\d+\s*/g, '')
        .replace(/\\tx\d+\s*/g, '')
        .replace(/\\pn[^}]*}/g, '')
        .replace(/\{\\pntext[^}]*}/g, '<li>')
        .replace(/\\rquote\s*/g, "'")
        .replace(/\\ldblquote\s*/g, '"')
        .replace(/\\rdblquote\s*/g, '"')
        .replace(/\\emdash\s*/g, '—')
        .replace(/\\endash\s*/g, '–')
        .replace(/\{\\[^}]*}/g, '')
        .replace(/\\[a-z]+\d*\s*/gi, '')
        .replace(/[{}]/g, '');
    });

  // Clean up extra whitespace
  text = text
    .replace(/\s+/g, ' ')
    .replace(/<br>\s*<br>/g, '<br>')
    .trim();

  return text;
}

// Function to extract score sections from RTF
function extractScoreSections(rtfContent) {
  const sections = [];

  // Split by score headers (looking for "Artistic (A) – Score N")
  const scorePattern = /Artistic \(A\).*?Score (\d+)/gi;
  const matches = [...rtfContent.matchAll(scorePattern)];

  for (let i = 0; i < matches.length; i++) {
    const scoreNum = parseInt(matches[i][1]);
    const startIndex = matches[i].index;
    const endIndex = i < matches.length - 1 ? matches[i + 1].index : rtfContent.length;

    const sectionContent = rtfContent.substring(startIndex, endIndex);

    // Extract all text after the score header
    const contentAfterHeader = sectionContent.substring(matches[i][0].length);

    // Build HTML description
    let html = '<div class="holland-artistic-description">\n';

    // Extract sections
    const extractSection = (title, content) => {
      const titlePattern = new RegExp(`\\\\b\\s*${title}[:\\s]*\\\\b0`, 'i');
      const titleMatch = content.match(titlePattern);
      if (titleMatch) {
        const sectionStart = titleMatch.index + titleMatch[0].length;
        // Find next section or end
        const nextTitlePattern = /\\b\s*[A-Z][^:]*:/;
        const remainingContent = content.substring(sectionStart);
        const nextMatch = remainingContent.match(nextTitlePattern);
        const sectionEnd = nextMatch ? sectionStart + nextMatch.index : content.length;

        let sectionText = content.substring(sectionStart, sectionEnd);

        // Convert bullet points
        sectionText = sectionText
          .replace(/\{\\pntext[^}]*\}[^\\{]*/g, match => {
            const text = match.replace(/\{\\pntext[^}]*\}/g, '').trim();
            return text ? `<li>${text}</li>` : '';
          });

        // Wrap list items
        if (sectionText.includes('<li>')) {
          sectionText = '<ul>' + sectionText + '</ul>';
        }

        return `<h3>${title}</h3>\n${sectionText}\n`;
      }
      return '';
    };

    // Extract all standard sections
    const sectionTitles = [
      'What makes you unique',
      'Superpowers you bring to the table',
      'Growth zones for you',
      'Your approaches to relationships',
      'Work environment where you will thrive',
      'Dream Roles and Ideal Tasks for You',
      'Ideal Careers',
      'Big Picture Takeaway'
    ];

    for (const title of sectionTitles) {
      const section = extractSection(title, contentAfterHeader);
      if (section) {
        html += section;
      }
    }

    html += '</div>';

    sections.push({
      score: scoreNum,
      html: html
    });
  }

  return sections;
}

// Simple RTF parser - read file and extract text between score markers
async function parseRTFFile(filePath) {
  console.log('Reading RTF file:', filePath);
  const rtfContent = fs.readFileSync(filePath, 'utf8');

  const scores = [];

  // Find all score sections using a more direct approach
  const lines = rtfContent.split('\\par');

  let currentScore = null;
  let currentSections = {};
  let currentSection = null;
  let currentBullets = [];

  for (let line of lines) {
    // Clean the line
    line = line
      .replace(/\\f\d+/g, '')
      .replace(/\\fs\d+/g, '')
      .replace(/\\b\s*/g, '')
      .replace(/\\b0\s*/g, '')
      .replace(/\\rquote/g, "'")
      .replace(/\\ldblquote/g, '"')
      .replace(/\\rdblquote/g, '"')
      .replace(/\\emdash/g, '—')
      .replace(/\\endash/g, '–')
      .replace(/[{}]/g, '')
      .trim();

    // Check for new score
    const scoreMatch = line.match(/Artistic\s*\(A\)\s*.\s*Score\s*(\d+)/i);
    if (scoreMatch) {
      // Save previous score if exists
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
      continue;
    }

    // Check for section headers
    if (line.match(/What makes you unique:/i)) {
      if (currentSection) currentSections[currentSection] = [...currentBullets];
      currentSection = 'unique';
      currentBullets = [];
    } else if (line.match(/Superpowers you bring to the table:/i)) {
      if (currentSection) currentSections[currentSection] = [...currentBullets];
      currentSection = 'superpowers';
      currentBullets = [];
    } else if (line.match(/Growth zones for you:/i)) {
      if (currentSection) currentSections[currentSection] = [...currentBullets];
      currentSection = 'growth';
      currentBullets = [];
    } else if (line.match(/Your approaches to relationships:/i)) {
      if (currentSection) currentSections[currentSection] = [...currentBullets];
      currentSection = 'relationships';
      currentBullets = [];
    } else if (line.match(/Work environment where you will thrive:/i)) {
      if (currentSection) currentSections[currentSection] = [...currentBullets];
      currentSection = 'work';
      currentBullets = [];
    } else if (line.match(/Dream Roles and Ideal Tasks for You:/i)) {
      if (currentSection) currentSections[currentSection] = [...currentBullets];
      currentSection = 'roles';
      currentBullets = [];
    } else if (line.match(/Ideal Careers:/i)) {
      if (currentSection) currentSections[currentSection] = [...currentBullets];
      currentSection = 'careers';
      currentBullets = [];
    } else if (line.match(/Big Picture Takeaway:/i)) {
      if (currentSection) currentSections[currentSection] = [...currentBullets];
      currentSection = 'takeaway';
      currentBullets = [];
    } else if (line.includes('_____')) {
      // Section separator - save current score
      if (currentSection) currentSections[currentSection] = [...currentBullets];
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
    } else if (currentSection && line.length > 0 && !line.match(/^[\s\d]+$/)) {
      // This is content - add to current section
      currentBullets.push(line);
    }
  }

  // Save last score
  if (currentSection) currentSections[currentSection] = [...currentBullets];
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
  let html = '<div class="holland-artistic-result">\n';

  const sectionTitles = {
    unique: 'What makes you unique',
    superpowers: 'Superpowers you bring to the table',
    growth: 'Growth zones for you',
    relationships: 'Your approaches to relationships',
    work: 'Work environment where you will thrive',
    roles: 'Dream Roles and Ideal Tasks for You',
    careers: 'Ideal Careers',
    takeaway: 'Big Picture Takeaway'
  };

  for (const [key, title] of Object.entries(sectionTitles)) {
    if (sections[key] && sections[key].length > 0) {
      html += `  <h3>${title}</h3>\n`;

      if (key === 'careers' || key === 'takeaway') {
        // These are paragraphs, not bullet points
        html += `  <p>${sections[key].join(' ')}</p>\n`;
      } else {
        // Bullet points
        html += '  <ul>\n';
        sections[key].forEach(bullet => {
          if (bullet.trim().length > 0) {
            html += `    <li>${bullet.trim()}</li>\n`;
          }
        });
        html += '  </ul>\n';
      }
    }
  }

  html += '</div>';
  return html;
}

// Main function
async function importHollandArtistic() {
  try {
    console.log('Starting Holland Artistic (A) import...\n');

    // Get test ID for Strong Interest Inventory (SII)
    const tests = await getMany(
      "SELECT id, title FROM tests WHERE title ILIKE '%strong%' OR title ILIKE '%interest%' OR test_type = 'CAREER_ASSESSMENT'"
    );

    if (tests.length === 0) {
      throw new Error('No Strong Interest Inventory test found in database');
    }

    const testId = tests[0].id;
    console.log(`Found test: ${tests[0].title} (ID: ${testId})\n`);

    // Parse RTF file
    const filePath = 'C:\\Users\\rds21\\OneDrive\\Desktop\\ARTISTIC (A)_HOLLAND CODES.rtf';
    const scores = await parseRTFFile(filePath);

    console.log(`Extracted ${scores.length} score sections\n`);

    // Check existing components
    const existing = await getMany(
      'SELECT component_code, score_value FROM result_components WHERE test_id = $1 AND component_code = $2',
      [testId, 'A']
    );

    if (existing.length > 0) {
      console.log(`Warning: Found ${existing.length} existing Artistic (A) components. These will be duplicated.`);
      console.log('Existing scores:', existing.map(e => e.score_value).join(', '));
      console.log('');
    }

    // Insert each score
    let insertedCount = 0;
    const errors = [];

    for (const scoreData of scores) {
      try {
        const html = sectionsToHtml(scoreData.sections);

        const query = `
          INSERT INTO result_components (
            test_id,
            component_code,
            component_name,
            score_value,
            description,
            order_priority,
            is_active
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7)
          RETURNING id, component_code, score_value
        `;

        const values = [
          testId,
          'A',
          'Artistic',
          scoreData.score,
          html,
          scoreData.score,
          true
        ];

        const result = await insertOne(query, values);
        insertedCount++;
        console.log(`✓ Inserted Score ${scoreData.score} (ID: ${result.id})`);
      } catch (error) {
        errors.push({ score: scoreData.score, error: error.message });
        console.error(`✗ Failed to insert Score ${scoreData.score}: ${error.message}`);
      }
    }

    // Summary
    console.log('\n' + '='.repeat(50));
    console.log('IMPORT SUMMARY');
    console.log('='.repeat(50));
    console.log(`Total scores processed: ${scores.length}`);
    console.log(`Successfully inserted: ${insertedCount}`);
    console.log(`Failed: ${errors.length}`);

    if (errors.length > 0) {
      console.log('\nErrors:');
      errors.forEach(err => {
        console.log(`  Score ${err.score}: ${err.error}`);
      });
    }

    console.log('\n✅ Import completed!');
    process.exit(0);

  } catch (error) {
    console.error('\n❌ Import failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// Run import
importHollandArtistic();
