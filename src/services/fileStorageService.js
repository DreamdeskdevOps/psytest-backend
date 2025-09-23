const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');
const { getOne, insertOne, updateOne, deleteOne, getMany } = require('../config/database');

class FileStorageService {
  constructor() {
    this.uploadsDir = path.join(__dirname, '../../uploads');
    this.questionsDir = path.join(this.uploadsDir, 'questions');
    this.tempDir = path.join(this.uploadsDir, 'temp');

    this.initDirectories();
  }

  async initDirectories() {
    try {
      await fs.mkdir(this.uploadsDir, { recursive: true });
      await fs.mkdir(this.questionsDir, { recursive: true });
      await fs.mkdir(this.tempDir, { recursive: true });

      // Create subdirectories for better organization
      await fs.mkdir(path.join(this.questionsDir, 'images'), { recursive: true });
      await fs.mkdir(path.join(this.questionsDir, 'thumbnails'), { recursive: true });
      await fs.mkdir(path.join(this.questionsDir, 'compressed'), { recursive: true });
    } catch (error) {
      console.error('Error creating upload directories:', error);
    }
  }

  // Generate unique filename with timestamp and random string
  generateUniqueFilename(originalFilename, prefix = '') {
    const timestamp = Date.now();
    const random = crypto.randomBytes(8).toString('hex');
    const extension = path.extname(originalFilename);
    const baseName = path.basename(originalFilename, extension);

    // Sanitize filename - remove special characters
    const sanitizedBaseName = baseName.replace(/[^a-zA-Z0-9_-]/g, '_');

    return `${prefix}${timestamp}_${random}_${sanitizedBaseName}${extension}`;
  }

  // Save file to local storage
  async saveFile(fileBuffer, originalFilename, options = {}) {
    const {
      fileType = 'question_image',
      entityType = 'question',
      entityId = null,
      uploadedBy = null,
      uploadedByType = 'admin',
      isTemporary = false,
      expiresInHours = 24
    } = options;

    try {
      // Generate unique filename
      const storedFilename = this.generateUniqueFilename(originalFilename, 'img_');

      // Determine file path based on type
      let filePath;
      if (fileType === 'question_image') {
        filePath = path.join(this.questionsDir, 'images', storedFilename);
      } else {
        filePath = path.join(this.uploadsDir, storedFilename);
      }

      // Save file to disk
      await fs.writeFile(filePath, fileBuffer);

      // Get file stats
      const stats = await fs.stat(filePath);
      const fileSize = stats.size;

      // Determine MIME type
      const mimeType = this.getMimeType(originalFilename);

      // Set expiration for temporary files
      const expiresAt = isTemporary
        ? new Date(Date.now() + (expiresInHours * 60 * 60 * 1000))
        : null;

      // Generate access token for private files
      const accessToken = crypto.randomBytes(32).toString('hex');

      // Save file metadata to database
      const fileRecord = await this.saveFileMetadata({
        originalFilename,
        storedFilename,
        filePath: path.relative(this.uploadsDir, filePath), // Store relative path
        fileSize,
        mimeType,
        fileType,
        entityType,
        entityId,
        uploadedBy,
        uploadedByType,
        isTemporary,
        expiresAt,
        accessToken
      });

      return {
        success: true,
        fileId: fileRecord.id,
        filename: storedFilename,
        filePath: filePath,
        fileUrl: this.generateFileUrl(storedFilename, accessToken),
        fileSize,
        mimeType,
        accessToken
      };

    } catch (error) {
      console.error('Error saving file:', error);
      throw new Error(`Failed to save file: ${error.message}`);
    }
  }

  // Save file metadata to database
  async saveFileMetadata(metadata) {
    const query = `
      INSERT INTO file_uploads (
        original_filename, stored_filename, file_path, file_size, mime_type,
        file_type, entity_type, entity_id, uploaded_by, uploaded_by_type,
        is_temporary, expires_at, access_token, created_at, updated_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13,
        CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
      ) RETURNING *
    `;

    const values = [
      metadata.originalFilename,
      metadata.storedFilename,
      metadata.filePath,
      metadata.fileSize,
      metadata.mimeType,
      metadata.fileType,
      metadata.entityType,
      metadata.entityId,
      metadata.uploadedBy,
      metadata.uploadedByType,
      metadata.isTemporary,
      metadata.expiresAt,
      metadata.accessToken
    ];

    return await insertOne(query, values);
  }

  // Get file by ID
  async getFile(fileId) {
    const query = `
      SELECT * FROM file_uploads
      WHERE id = $1 AND is_active = true
    `;
    return await getOne(query, [fileId]);
  }

  // Get file by stored filename
  async getFileByFilename(storedFilename) {
    const query = `
      SELECT * FROM file_uploads
      WHERE stored_filename = $1 AND is_active = true
    `;
    return await getOne(query, [storedFilename]);
  }

  // Get files by entity
  async getFilesByEntity(entityType, entityId) {
    const query = `
      SELECT * FROM file_uploads
      WHERE entity_type = $1 AND entity_id = $2 AND is_active = true
      ORDER BY created_at DESC
    `;
    return await getMany(query, [entityType, entityId]);
  }

  // Update file metadata
  async updateFileMetadata(fileId, updates) {
    const allowedFields = [
      'original_filename', 'entity_type', 'entity_id',
      'is_public', 'expires_at', 'is_temporary'
    ];

    const updateFields = [];
    const values = [];
    let paramIndex = 1;

    Object.keys(updates).forEach(field => {
      if (allowedFields.includes(field)) {
        updateFields.push(`${field} = $${paramIndex}`);
        values.push(updates[field]);
        paramIndex++;
      }
    });

    if (updateFields.length === 0) {
      throw new Error('No valid fields to update');
    }

    updateFields.push(`updated_at = $${paramIndex}`);
    values.push(new Date());
    values.push(fileId); // For WHERE clause

    const query = `
      UPDATE file_uploads
      SET ${updateFields.join(', ')}
      WHERE id = $${paramIndex + 1} AND is_active = true
      RETURNING *
    `;

    return await updateOne(query, values);
  }

  // Delete file (soft delete)
  async deleteFile(fileId, deleteFromDisk = false) {
    try {
      // Get file info first
      const fileRecord = await this.getFile(fileId);
      if (!fileRecord) {
        throw new Error('File not found');
      }

      // Soft delete from database
      const query = `
        UPDATE file_uploads
        SET is_active = false, updated_at = CURRENT_TIMESTAMP
        WHERE id = $1
        RETURNING *
      `;

      const result = await updateOne(query, [fileId]);

      // Optionally delete from disk
      if (deleteFromDisk) {
        const fullPath = path.join(this.uploadsDir, fileRecord.file_path);
        try {
          await fs.unlink(fullPath);
        } catch (diskError) {
          console.warn('File not found on disk:', fullPath);
        }
      }

      return result;
    } catch (error) {
      console.error('Error deleting file:', error);
      throw error;
    }
  }

  // Clean up expired temporary files
  async cleanupExpiredFiles() {
    try {
      // Get expired files
      const expiredFilesQuery = `
        SELECT * FROM file_uploads
        WHERE is_temporary = true
        AND expires_at < CURRENT_TIMESTAMP
        AND is_active = true
      `;

      const expiredFiles = await getMany(expiredFilesQuery, []);
      let cleanedCount = 0;

      for (const file of expiredFiles) {
        try {
          // Delete from disk
          const fullPath = path.join(this.uploadsDir, file.file_path);
          await fs.unlink(fullPath);

          // Mark as inactive in database
          await this.deleteFile(file.id, false); // Don't try to delete from disk again
          cleanedCount++;
        } catch (error) {
          console.warn(`Failed to cleanup file ${file.stored_filename}:`, error.message);
        }
      }

      return {
        success: true,
        cleanedCount,
        totalExpired: expiredFiles.length
      };
    } catch (error) {
      console.error('Error during cleanup:', error);
      throw error;
    }
  }

  // Generate file URL for serving
  generateFileUrl(storedFilename, accessToken = null) {
    const baseUrl = process.env.BASE_URL || 'http://localhost:5000';
    if (accessToken) {
      return `${baseUrl}/api/v1/files/${storedFilename}?token=${accessToken}`;
    }
    return `${baseUrl}/api/v1/files/${storedFilename}`;
  }

  // Get MIME type based on file extension
  getMimeType(filename) {
    const ext = path.extname(filename).toLowerCase();
    const mimeTypes = {
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.gif': 'image/gif',
      '.webp': 'image/webp',
      '.svg': 'image/svg+xml',
      '.pdf': 'application/pdf',
      '.doc': 'application/msword',
      '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      '.xls': 'application/vnd.ms-excel',
      '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    };

    return mimeTypes[ext] || 'application/octet-stream';
  }

  // Validate file type and size
  validateFile(fileBuffer, filename, options = {}) {
    const {
      allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
      maxSize = 5 * 1024 * 1024, // 5MB default
      minSize = 100 // 100 bytes minimum
    } = options;

    const mimeType = this.getMimeType(filename);
    const fileSize = fileBuffer.length;

    // Check file type
    if (!allowedTypes.includes(mimeType)) {
      throw new Error(`File type ${mimeType} not allowed. Allowed types: ${allowedTypes.join(', ')}`);
    }

    // Check file size
    if (fileSize > maxSize) {
      throw new Error(`File size ${fileSize} bytes exceeds maximum allowed size of ${maxSize} bytes`);
    }

    if (fileSize < minSize) {
      throw new Error(`File size ${fileSize} bytes is below minimum required size of ${minSize} bytes`);
    }

    return true;
  }

  // Save multiple files for a question
  async saveQuestionImages(files, questionId, options = {}) {
    const savedFiles = [];
    const errors = [];

    for (let i = 0; i < files.length; i++) {
      try {
        const file = files[i];

        // Validate file
        this.validateFile(file.buffer, file.originalname);

        // Save file
        const result = await this.saveFile(file.buffer, file.originalname, {
          fileType: 'question_image',
          entityType: 'question',
          entityId: questionId,
          ...options
        });

        savedFiles.push({
          index: i,
          ...result
        });
      } catch (error) {
        errors.push({
          index: i,
          filename: files[i]?.originalname || 'unknown',
          error: error.message
        });
      }
    }

    return {
      success: errors.length === 0,
      savedFiles,
      errors,
      totalFiles: files.length,
      successCount: savedFiles.length,
      errorCount: errors.length
    };
  }
}

module.exports = new FileStorageService();