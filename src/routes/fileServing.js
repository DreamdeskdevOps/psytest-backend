const express = require('express');
const path = require('path');
const fs = require('fs').promises;
const fileStorageService = require('../services/fileStorageService');

const router = express.Router();

// GET /api/v1/files/:filename - Serve files
router.get('/:filename', async (req, res) => {
  try {
    const { filename } = req.params;
    const { token } = req.query;

    // Get file metadata from database
    const fileRecord = await fileStorageService.getFileByFilename(filename);

    if (!fileRecord) {
      return res.status(404).json({
        success: false,
        message: 'File not found'
      });
    }

    // Check if file is expired
    if (fileRecord.expires_at && new Date() > new Date(fileRecord.expires_at)) {
      return res.status(410).json({
        success: false,
        message: 'File has expired'
      });
    }

    // Check access permissions
    if (!fileRecord.is_public && fileRecord.access_token !== token) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    // Construct file path
    const uploadsDir = path.join(__dirname, '../../uploads');
    const filePath = path.join(uploadsDir, fileRecord.file_path);

    // Check if file exists on disk
    try {
      await fs.access(filePath);
    } catch (error) {
      console.error('File not found on disk:', filePath);
      return res.status(404).json({
        success: false,
        message: 'File not found on server'
      });
    }

    // Set appropriate headers
    res.set({
      'Content-Type': fileRecord.mime_type,
      'Content-Length': fileRecord.file_size,
      'Cache-Control': 'public, max-age=31536000', // Cache for 1 year
      'ETag': `"${fileRecord.id}"`,
      'Last-Modified': new Date(fileRecord.updated_at).toUTCString()
    });

    // Handle conditional requests
    const ifNoneMatch = req.headers['if-none-match'];
    if (ifNoneMatch === `"${fileRecord.id}"`) {
      return res.status(304).end();
    }

    // Stream the file
    const fileStream = require('fs').createReadStream(filePath);

    fileStream.on('error', (error) => {
      console.error('Error streaming file:', error);
      if (!res.headersSent) {
        res.status(500).json({
          success: false,
          message: 'Error serving file'
        });
      }
    });

    fileStream.pipe(res);

  } catch (error) {
    console.error('File serving error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// GET /api/v1/files/download/:filename - Force download files
router.get('/download/:filename', async (req, res) => {
  try {
    const { filename } = req.params;
    const { token } = req.query;

    const fileRecord = await fileStorageService.getFileByFilename(filename);

    if (!fileRecord) {
      return res.status(404).json({
        success: false,
        message: 'File not found'
      });
    }

    // Check access permissions
    if (!fileRecord.is_public && fileRecord.access_token !== token) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    const uploadsDir = path.join(__dirname, '../../uploads');
    const filePath = path.join(uploadsDir, fileRecord.file_path);

    // Check if file exists
    try {
      await fs.access(filePath);
    } catch (error) {
      return res.status(404).json({
        success: false,
        message: 'File not found on server'
      });
    }

    // Force download
    res.set({
      'Content-Type': 'application/octet-stream',
      'Content-Disposition': `attachment; filename="${fileRecord.original_filename}"`,
      'Content-Length': fileRecord.file_size
    });

    const fileStream = require('fs').createReadStream(filePath);
    fileStream.pipe(res);

  } catch (error) {
    console.error('File download error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

module.exports = router;