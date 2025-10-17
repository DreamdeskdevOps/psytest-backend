const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const fileStorageService = require('../../services/fileStorageService');
const { authenticateAdmin } = require('../../middleware/auth');

const router = express.Router();

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
    files: 10 // Maximum 10 files at once
  },
  fileFilter: (req, file, cb) => {
    // Allow images only
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'), false);
    }
  }
});

// POST /api/v1/admin/files/upload - Upload single file
router.post('/upload', authenticateAdmin, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file provided',
        data: null
      });
    }

    const {
      entityType = 'question',
      entityId = null,
      isTemporary = false,
      expiresInHours = 24
    } = req.body;

    const result = await fileStorageService.saveFile(
      req.file.buffer,
      req.file.originalname,
      {
        fileType: 'question_image',
        entityType,
        entityId,
        uploadedBy: req.admin.id,
        uploadedByType: 'admin',
        isTemporary: Boolean(isTemporary),
        expiresInHours: parseInt(expiresInHours) || 24
      }
    );

    return res.status(201).json({
      success: true,
      message: 'File uploaded successfully',
      data: result
    });

  } catch (error) {
    console.error('File upload error:', error);

    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        message: 'File size too large. Maximum size is 10MB.',
        data: null
      });
    }

    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to upload file',
      data: null
    });
  }
});

// POST /api/v1/admin/files/upload-multiple - Upload multiple files
router.post('/upload-multiple', authenticateAdmin, upload.array('files', 10), async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No files provided',
        data: null
      });
    }

    const {
      entityType = 'question',
      entityId = null,
      isTemporary = false,
      expiresInHours = 24
    } = req.body;

    const result = await fileStorageService.saveQuestionImages(
      req.files,
      entityId,
      {
        uploadedBy: req.admin.id,
        uploadedByType: 'admin',
        isTemporary: Boolean(isTemporary),
        expiresInHours: parseInt(expiresInHours) || 24
      }
    );

    const statusCode = result.success ? 201 : 207; // 207 Multi-Status for partial success

    return res.status(statusCode).json({
      success: result.success,
      message: result.success
        ? 'All files uploaded successfully'
        : `${result.successCount}/${result.totalFiles} files uploaded successfully`,
      data: result
    });

  } catch (error) {
    console.error('Multiple file upload error:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to upload files',
      data: null
    });
  }
});

// GET /api/v1/admin/files/:fileId - Get file metadata
router.get('/:fileId', authenticateAdmin, async (req, res) => {
  try {
    const { fileId } = req.params;
    const file = await fileStorageService.getFile(fileId);

    if (!file) {
      return res.status(404).json({
        success: false,
        message: 'File not found',
        data: null
      });
    }

    return res.status(200).json({
      success: true,
      message: 'File metadata retrieved successfully',
      data: file
    });

  } catch (error) {
    console.error('Get file error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve file metadata',
      data: null
    });
  }
});

// PUT /api/v1/admin/files/:fileId - Update file metadata
router.put('/:fileId', authenticateAdmin, async (req, res) => {
  try {
    const { fileId } = req.params;
    const updates = req.body;

    // Remove non-updatable fields
    delete updates.id;
    delete updates.stored_filename;
    delete updates.file_path;
    delete updates.file_size;
    delete updates.mime_type;
    delete updates.created_at;
    delete updates.updated_at;

    const result = await fileStorageService.updateFileMetadata(fileId, updates);

    if (!result) {
      return res.status(404).json({
        success: false,
        message: 'File not found',
        data: null
      });
    }

    return res.status(200).json({
      success: true,
      message: 'File metadata updated successfully',
      data: result
    });

  } catch (error) {
    console.error('Update file error:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to update file metadata',
      data: null
    });
  }
});

// DELETE /api/v1/admin/files/:fileId - Delete file
router.delete('/:fileId', authenticateAdmin, async (req, res) => {
  try {
    const { fileId } = req.params;
    const { deleteFromDisk = false } = req.query;

    const result = await fileStorageService.deleteFile(fileId, Boolean(deleteFromDisk));

    if (!result) {
      return res.status(404).json({
        success: false,
        message: 'File not found',
        data: null
      });
    }

    return res.status(200).json({
      success: true,
      message: 'File deleted successfully',
      data: result
    });

  } catch (error) {
    console.error('Delete file error:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to delete file',
      data: null
    });
  }
});

// GET /api/v1/admin/files/entity/:entityType/:entityId - Get files by entity
router.get('/entity/:entityType/:entityId', authenticateAdmin, async (req, res) => {
  try {
    const { entityType, entityId } = req.params;
    const files = await fileStorageService.getFilesByEntity(entityType, entityId);

    return res.status(200).json({
      success: true,
      message: 'Files retrieved successfully',
      data: files
    });

  } catch (error) {
    console.error('Get entity files error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve files',
      data: null
    });
  }
});

// POST /api/v1/admin/files/cleanup - Clean up expired temporary files
router.post('/cleanup', authenticateAdmin, async (req, res) => {
  try {
    const result = await fileStorageService.cleanupExpiredFiles();

    return res.status(200).json({
      success: true,
      message: `Cleanup completed. ${result.cleanedCount}/${result.totalExpired} expired files removed.`,
      data: result
    });

  } catch (error) {
    console.error('Cleanup files error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to cleanup expired files',
      data: null
    });
  }
});

// ========== RESULT IMAGE UPLOAD ROUTES ==========

// Configure multer for result images (disk storage)
const resultImageStorage = multer.diskStorage({
  destination: async function (req, file, cb) {
    const uploadDir = path.join(__dirname, '../../../uploads/result-images');
    
    // Ensure directory exists
    try {
      await fs.mkdir(uploadDir, { recursive: true });
    } catch (error) {
      console.error('Error creating upload directory:', error);
    }
    
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    // Generate unique filename
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    const nameWithoutExt = path.basename(file.originalname, ext);
    const sanitizedName = nameWithoutExt.replace(/[^a-z0-9]/gi, '-').toLowerCase();
    cb(null, sanitizedName + '-' + uniqueSuffix + ext);
  }
});

const resultImageUpload = multer({
  storage: resultImageStorage,
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only JPG, JPEG and PNG are allowed.'), false);
    }
  },
  limits: {
    fileSize: 2 * 1024 * 1024 // 2MB max
  }
});

// POST /api/v1/admin/files/upload-result-image - Upload result image
router.post('/upload-result-image', authenticateAdmin, resultImageUpload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No image file provided'
      });
    }

    // Return relative path from backend root
    const relativePath = `uploads/result-images/${req.file.filename}`;
    
    console.log('✅ Result image uploaded:', relativePath);

    return res.status(200).json({
      success: true,
      message: 'Image uploaded successfully',
      data: {
        path: relativePath,
        filename: req.file.filename,
        size: req.file.size,
        mimetype: req.file.mimetype
      }
    });

  } catch (error) {
    console.error('Result image upload error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to upload image',
      error: error.message
    });
  }
});

// DELETE /api/v1/admin/files/delete-result-image - Delete result image
router.delete('/delete-result-image', authenticateAdmin, async (req, res) => {
  try {
    const { path: imagePath } = req.body;

    if (!imagePath) {
      return res.status(400).json({
        success: false,
        message: 'Image path is required'
      });
    }

    // Construct full path
    const fullPath = path.join(__dirname, '../../../', imagePath);

    // Check if file exists
    try {
      await fs.access(fullPath);
    } catch (error) {
      return res.status(404).json({
        success: false,
        message: 'Image file not found'
      });
    }

    // Delete file
    await fs.unlink(fullPath);

    console.log('✅ Result image deleted:', imagePath);

    return res.status(200).json({
      success: true,
      message: 'Image deleted successfully'
    });

  } catch (error) {
    console.error('Result image delete error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to delete image',
      error: error.message
    });
  }
});

module.exports = router;