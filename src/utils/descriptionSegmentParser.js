/**
 * Description Segment Parser
 *
 * Parses HTML description text and extracts segments (key-value pairs)
 * for use in PDF templates and dynamic content generation.
 *
 * Example Input (HTML):
 * <p>You see the world through depth...</p>
 * <h3>Power match!</h3>
 * <p>Your vibe matches...</p>
 * <h3>⦁ Introversion (I):</h3>
 * <p>Recharges through solitude...</p>
 *
 * Example Output (Object):
 * {
 *   "intro": { key: "", value: "You see the world...", type: "paragraph" },
 *   "power_match": { key: "Power match!", value: "Your vibe...", type: "paragraph" },
 *   "introversion_i": { key: "⦁ Introversion (I):", value: "Recharges...", type: "paragraph" }
 * }
 */

const { JSDOM } = require('jsdom');

/**
 * Generate a consistent segment key from heading text
 * @param {string} text - The heading text
 * @returns {string} - Snake_case segment key
 *
 * Examples:
 * "⦁ Introversion (I):" → "introversion_i"
 * "Growth Zones for You" → "growth_zones_for_you"
 * "Power match!" → "power_match"
 */
function generateSegmentKey(text) {
  if (!text) return '';

  return text
    .replace(/⦁|•|:|\.|\(|\)|–|-|—|!|\?|,|"|'/g, '') // Remove special characters
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '_') // Replace spaces with underscores
    .replace(/_+/g, '_') // Remove duplicate underscores
    .replace(/^_|_$/g, '') // Remove leading/trailing underscores
    .substring(0, 50); // Limit length to 50 chars
}

/**
 * Detect if content is a list (has bullet points)
 * @param {string} text - The content text
 * @param {Element[]} elements - DOM elements
 * @returns {boolean}
 */
function isListContent(text, elements) {
  // Check for bullet characters
  if (text.includes('⦁') || text.includes('•')) return true;

  // Check for HTML list tags
  if (elements.some(el => el.tagName === 'UL' || el.tagName === 'OL')) return true;

  // Check for multiple <li> tags
  if (elements.some(el => el.tagName === 'LI')) return true;

  return false;
}

/**
 * Extract text content from elements, preserving structure
 * @param {Element[]} elements - Array of DOM elements
 * @returns {string} - Combined text with line breaks
 */
function extractTextContent(elements) {
  return elements
    .map(el => {
      if (el.tagName === 'UL' || el.tagName === 'OL') {
        // Extract list items
        const items = Array.from(el.querySelectorAll('li'));
        return items.map(li => `⦁ ${li.textContent.trim()}`).join('\n');
      } else if (el.tagName === 'LI') {
        return `⦁ ${el.textContent.trim()}`;
      } else {
        return el.textContent.trim();
      }
    })
    .filter(text => text.length > 0)
    .join('\n');
}

/**
 * Get all content elements after a heading until the next heading
 * @param {Element} heading - The heading element
 * @param {Element[]} allElements - All body elements
 * @returns {Element[]} - Content elements
 */
function getContentAfterHeading(heading, allElements) {
  const headingIndex = allElements.indexOf(heading);
  const contentElements = [];

  for (let i = headingIndex + 1; i < allElements.length; i++) {
    const el = allElements[i];

    // Stop at next heading
    if (['H1', 'H2', 'H3', 'H4', 'H5', 'H6'].includes(el.tagName)) {
      break;
    }

    // Skip empty elements
    if (!el.textContent.trim()) continue;

    contentElements.push(el);
  }

  return contentElements;
}

/**
 * Parse HTML description into segments
 * @param {string} htmlString - HTML description string
 * @returns {Object} - Parsed segments object
 *
 * Returns format:
 * {
 *   "segment_key": {
 *     key: "Display Title",
 *     value: "Content text...",
 *     type: "paragraph" | "list"
 *   }
 * }
 */
function parseDescription(htmlString) {
  if (!htmlString || typeof htmlString !== 'string') {
    console.warn('⚠️ Invalid HTML string provided to parser');
    return {};
  }

  // Handle if description is already a JSON object (old format)
  try {
    const parsed = JSON.parse(htmlString);
    if (typeof parsed === 'object' && parsed !== null) {
      console.log('ℹ️ Description is already a JSON object, returning as-is');
      return parsed;
    }
  } catch (e) {
    // Not JSON, continue with HTML parsing
  }

  const segments = {};

  try {
    // Parse HTML using JSDOM
    const dom = new JSDOM(htmlString);
    const document = dom.window.document;
    const body = document.body;

    // Get all body elements
    const allElements = Array.from(body.children);

    if (allElements.length === 0) {
      console.warn('⚠️ No elements found in HTML description');
      return {};
    }

    // Find all headings
    const headings = allElements.filter(el =>
      ['H1', 'H2', 'H3', 'H4', 'H5', 'H6'].includes(el.tagName)
    );

    console.log(`📋 Found ${headings.length} headings in description`);

    // Handle intro content (before first heading)
    const firstHeadingIndex = allElements.indexOf(headings[0]);
    if (firstHeadingIndex > 0) {
      const introElements = allElements.slice(0, firstHeadingIndex);
      const introText = extractTextContent(introElements);

      if (introText) {
        segments['intro'] = {
          key: '',
          value: introText,
          type: isListContent(introText, introElements) ? 'list' : 'paragraph'
        };
        console.log('✅ Extracted intro segment');
      }
    }

    // Process each heading and its content
    headings.forEach((heading, index) => {
      const keyText = heading.textContent.trim();
      const segmentKey = generateSegmentKey(keyText);

      // Get content after this heading
      const contentElements = getContentAfterHeading(heading, allElements);
      const valueText = extractTextContent(contentElements);

      if (segmentKey && valueText) {
        const isList = isListContent(valueText, contentElements);

        segments[segmentKey] = {
          key: keyText,
          value: valueText,
          type: isList ? 'list' : 'paragraph'
        };

        console.log(`✅ Extracted segment: "${segmentKey}" (${isList ? 'list' : 'paragraph'})`);
      } else {
        console.warn(`⚠️ Skipped heading "${keyText}" - no content or invalid key`);
      }
    });

    console.log(`✅ Successfully parsed ${Object.keys(segments).length} segments`);

  } catch (error) {
    console.error('❌ Error parsing description HTML:', error);
    return {};
  }

  return segments;
}

/**
 * Generate field definitions for PDF template creation
 * @param {Object} segments - Parsed segments from parseDescription()
 * @param {string} sourceInfo - Source information (e.g., "Result: ENFJ")
 * @returns {Array} - Array of field definitions
 *
 * Returns format:
 * [
 *   {
 *     name: "result_description",
 *     segment_key: "introversion_i",
 *     segment_part: "key",
 *     label: "Introversion I - Key",
 *     placeholder: "{{result_description:introversion_i:key}}",
 *     type: "text",
 *     example: "⦁ Introversion (I):",
 *     source: "Result: ENFJ",
 *     segmentType: "key"
 *   },
 *   ...
 * ]
 */
function generateFieldDefinitions(segments, sourceInfo = '') {
  const fields = [];

  Object.entries(segments).forEach(([segmentKey, segmentData]) => {
    // Add KEY field
    if (segmentData.key) {
      fields.push({
        name: 'result_description',
        segment_key: segmentKey,
        segment_part: 'key',
        label: `${formatLabel(segmentKey)} - Key`,
        placeholder: `{{result_description:${segmentKey}:key}}`,
        type: 'text',
        example: segmentData.key,
        source: sourceInfo,
        segmentType: 'key'
      });
    }

    // Add VALUE field
    fields.push({
      name: 'result_description',
      segment_key: segmentKey,
      segment_part: 'value',
      label: `${formatLabel(segmentKey)} - Value`,
      placeholder: `{{result_description:${segmentKey}:value}}`,
      type: 'text',
      example: segmentData.value.substring(0, 100) + (segmentData.value.length > 100 ? '...' : ''),
      source: sourceInfo,
      segmentType: segmentData.type // 'paragraph' or 'list'
    });
  });

  return fields;
}

/**
 * Format segment key into human-readable label
 * @param {string} segmentKey - Snake_case segment key
 * @returns {string} - Title Case label
 *
 * Example: "introversion_i" → "Introversion I"
 */
function formatLabel(segmentKey) {
  return segmentKey
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

/**
 * Get segment value by key from parsed segments
 * @param {Object} segments - Parsed segments object
 * @param {string} segmentKey - The segment key to retrieve
 * @param {string} part - 'key' or 'value'
 * @returns {string} - The segment content or empty string
 */
function getSegmentValue(segments, segmentKey, part = 'value') {
  if (!segments || !segmentKey) return '';

  const segment = segments[segmentKey];
  if (!segment) return '';

  return segment[part] || '';
}

module.exports = {
  parseDescription,
  generateSegmentKey,
  generateFieldDefinitions,
  getSegmentValue,
  formatLabel
};
