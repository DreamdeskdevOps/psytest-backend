const { getOne, insertOne, updateOne, deleteOne, getMany } = require('../config/database');

const TABLE_NAME = 'question_images';

// Create a new question image
const createQuestionImage = async (questionId, imageData, adminId) => {
  const {
    imageUrl,
    imageFilename,
    imageAltText = null,
    imageCaption = null,
    displayOrder = 1,
    imageNumber = null,
    imagePosition = 'inline',
    fileSize = null,
    mimeType = null,
    width = null,
    height = null
  } = imageData || {};

  // Ensure required parameters are present
  if (!questionId || !imageUrl || !imageFilename) {
    throw new Error('Missing required parameters: questionId, imageUrl, and imageFilename are required');
  }

  console.log('Creating question image with parameters:', {
    questionId,
    imageUrl,
    imageFilename,
    imageAltText,
    imageCaption,
    displayOrder,
    imageNumber,
    imagePosition,
    fileSize,
    mimeType,
    width,
    height
  });

  const query = `
    INSERT INTO ${TABLE_NAME} (
      question_id, image_url, image_filename, image_alt_text, image_caption,
      display_order, image_number, image_position, file_size, mime_type,
      width, height, created_at, updated_at
    ) VALUES (
      $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12,
      CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    ) RETURNING *
  `;

  const values = [
    questionId,       // $1
    imageUrl,         // $2
    imageFilename,    // $3
    imageAltText,     // $4
    imageCaption,     // $5
    displayOrder,     // $6
    imageNumber,      // $7
    imagePosition,    // $8
    fileSize,         // $9
    mimeType,         // $10
    width,            // $11
    height            // $12
  ];

  // Validate all parameters are defined (null is okay, undefined is not)
  values.forEach((value, index) => {
    if (value === undefined) {
      console.error(`Parameter $${index + 1} is undefined:`, {
        parameterNumber: index + 1,
        value,
        allValues: values
      });
      throw new Error(`Parameter $${index + 1} is undefined. Cannot execute SQL query.`);
    }
  });

  return await insertOne(query, values);
};

// Get all images for a question
const getQuestionImages = async (questionId) => {
  const query = `
    SELECT * FROM ${TABLE_NAME}
    WHERE question_id = $1 AND is_active = true
    ORDER BY display_order ASC, created_at ASC
  `;

  return await getMany(query, [questionId]);
};

// Get a single question image by ID
const getQuestionImageById = async (imageId) => {
  const query = `
    SELECT * FROM ${TABLE_NAME}
    WHERE id = $1 AND is_active = true
  `;

  return await getOne(query, [imageId]);
};

// Update question image
const updateQuestionImage = async (imageId, updateData) => {
  const {
    imageUrl,
    imageFilename,
    imageAltText,
    imageCaption,
    displayOrder,
    imageNumber,
    imagePosition,
    width,
    height
  } = updateData;

  const query = `
    UPDATE ${TABLE_NAME}
    SET
      image_url = COALESCE($2, image_url),
      image_filename = COALESCE($3, image_filename),
      image_alt_text = COALESCE($4, image_alt_text),
      image_caption = COALESCE($5, image_caption),
      display_order = COALESCE($6, display_order),
      image_number = COALESCE($7, image_number),
      image_position = COALESCE($8, image_position),
      width = COALESCE($9, width),
      height = COALESCE($10, height),
      updated_at = CURRENT_TIMESTAMP
    WHERE id = $1 AND is_active = true
    RETURNING *
  `;

  const values = [
    imageId, imageUrl, imageFilename, imageAltText, imageCaption,
    displayOrder, imageNumber, imagePosition, width, height
  ];

  return await updateOne(query, values);
};

// Delete question image (soft delete)
const deleteQuestionImage = async (imageId) => {
  const query = `
    UPDATE ${TABLE_NAME}
    SET is_active = false, updated_at = CURRENT_TIMESTAMP
    WHERE id = $1
    RETURNING *
  `;

  return await updateOne(query, [imageId]);
};

// Reorder question images
const reorderQuestionImages = async (questionId, imageOrders) => {
  // imageOrders = [{ imageId, newOrder }, ...]

  const updatePromises = imageOrders.map(({ imageId, newOrder }) => {
    const query = `
      UPDATE ${TABLE_NAME}
      SET display_order = $1, updated_at = CURRENT_TIMESTAMP
      WHERE id = $2 AND question_id = $3 AND is_active = true
      RETURNING id, display_order
    `;
    return updateOne(query, [newOrder, imageId, questionId]);
  });

  return await Promise.all(updatePromises);
};

// Set numbered images for a question
const setNumberedImages = async (questionId, imageNumberMap) => {
  // imageNumberMap = [{ imageId, imageNumber }, ...]

  const updatePromises = imageNumberMap.map(({ imageId, imageNumber }) => {
    const query = `
      UPDATE ${TABLE_NAME}
      SET image_number = $1, updated_at = CURRENT_TIMESTAMP
      WHERE id = $2 AND question_id = $3 AND is_active = true
      RETURNING id, image_number
    `;
    return updateOne(query, [imageNumber, imageId, questionId]);
  });

  return await Promise.all(updatePromises);
};

// Delete all images for a question
const deleteAllQuestionImages = async (questionId) => {
  const query = `
    UPDATE ${TABLE_NAME}
    SET is_active = false, updated_at = CURRENT_TIMESTAMP
    WHERE question_id = $1
    RETURNING id, image_url
  `;

  return await getMany(query, [questionId]);
};

// Bulk create question images
const bulkCreateQuestionImages = async (questionId, imagesData, adminId) => {
  if (!imagesData || imagesData.length === 0) {
    return [];
  }

  const values = [];
  const placeholderRows = [];
  let paramIndex = 1;

  imagesData.forEach((imageData, index) => {
    const {
      imageUrl,
      imageFilename,
      imageAltText,
      imageCaption,
      displayOrder = index + 1,
      imageNumber,
      imagePosition = 'inline',
      fileSize,
      mimeType,
      width,
      height
    } = imageData;

    placeholderRows.push(
      `($${paramIndex}, $${paramIndex + 1}, $${paramIndex + 2}, $${paramIndex + 3}, $${paramIndex + 4},
       $${paramIndex + 5}, $${paramIndex + 6}, $${paramIndex + 7}, $${paramIndex + 8}, $${paramIndex + 9},
       $${paramIndex + 10}, $${paramIndex + 11}, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`
    );

    values.push(
      questionId, imageUrl, imageFilename, imageAltText, imageCaption,
      displayOrder, imageNumber, imagePosition, fileSize, mimeType,
      width, height
    );

    paramIndex += 12;
  });

  const query = `
    INSERT INTO ${TABLE_NAME} (
      question_id, image_url, image_filename, image_alt_text, image_caption,
      display_order, image_number, image_position, file_size, mime_type,
      width, height, created_at, updated_at
    ) VALUES ${placeholderRows.join(', ')}
    RETURNING *
  `;

  return await getMany(query, values);
};

// Get questions with their images (for bulk operations)
const getQuestionsWithImages = async (questionIds) => {
  if (!questionIds || questionIds.length === 0) {
    return [];
  }

  const placeholders = questionIds.map((_, index) => `$${index + 1}`).join(', ');

  const query = `
    SELECT
      q.id as question_id,
      q.question_text,
      q.question_content_type,
      qi.id as image_id,
      qi.image_url,
      qi.image_filename,
      qi.image_alt_text,
      qi.image_caption,
      qi.display_order,
      qi.image_number,
      qi.image_position,
      qi.file_size,
      qi.mime_type,
      qi.width,
      qi.height
    FROM questions q
    LEFT JOIN ${TABLE_NAME} qi ON q.id = qi.question_id AND qi.is_active = true
    WHERE q.id IN (${placeholders}) AND q.is_active = true
    ORDER BY q.id, qi.display_order ASC, qi.created_at ASC
  `;

  const results = await getMany(query, questionIds);

  // Group by question
  const questionsMap = {};
  results.forEach(row => {
    if (!questionsMap[row.question_id]) {
      questionsMap[row.question_id] = {
        questionId: row.question_id,
        questionText: row.question_text,
        questionContentType: row.question_content_type,
        images: []
      };
    }

    if (row.image_id) {
      questionsMap[row.question_id].images.push({
        id: row.image_id,
        imageUrl: row.image_url,
        imageFilename: row.image_filename,
        imageAltText: row.image_alt_text,
        imageCaption: row.image_caption,
        displayOrder: row.display_order,
        imageNumber: row.image_number,
        imagePosition: row.image_position,
        fileSize: row.file_size,
        mimeType: row.mime_type,
        width: row.width,
        height: row.height
      });
    }
  });

  return Object.values(questionsMap);
};

module.exports = {
  createQuestionImage,
  getQuestionImages,
  getQuestionImageById,
  updateQuestionImage,
  deleteQuestionImage,
  reorderQuestionImages,
  setNumberedImages,
  deleteAllQuestionImages,
  bulkCreateQuestionImages,
  getQuestionsWithImages
};