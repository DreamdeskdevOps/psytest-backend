const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;

// Configure multer for image upload
const storage = multer.diskStorage({
  destination: async function (req, file, cb) {
    const uploadDir = path.join(__dirname, '../../uploads/result-images');
    
    // Ensure directory exists
    try {
      await fs.mkdir(uploadDir, { recursive: true });
    } catch (error) {
      console.error('Error creating upload directory:', error);
    }
    
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    // Generate unique filename: timestamp-originalname
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    const nameWithoutExt = path.basename(file.originalname, ext);
    const sanitizedName = nameWithoutExt.replace(/[^a-z0-9]/gi, '-').toLowerCase();
    cb(null, sanitizedName + '-' + uniqueSuffix + ext);
  }
});

// File filter - only allow images
const fileFilter = (req, file, cb) => {
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png'];
  
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only JPG, JPEG and PNG are allowed.'), false);
  }
};

// Multer upload configuration
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 2 * 1024 * 1024 // 2MB max file size
  }
});

/**
 * Upload result image
 * POST /api/admin/upload-result-image
 */
const uploadResultImage = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No image file provided'
      });
    }

    // Return relative path from backend root
    const relativePath = `uploads/result-images/${req.file.filename}`;
    
    console.log('✅ Image uploaded successfully:', relativePath);

    res.status(200).json({
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
    console.error('Error uploading image:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to upload image',
      error: error.message
    });
  }
};

/**
 * Delete result image
 * DELETE /api/admin/delete-result-image
 */
const deleteResultImage = async (req, res) => {
  try {
    const { path: imagePath } = req.body;

    if (!imagePath) {
      return res.status(400).json({
        success: false,
        message: 'Image path is required'
      });
    }

    // Construct full path
    const fullPath = path.join(__dirname, '../../', imagePath);

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

    console.log('✅ Image deleted successfully:', imagePath);

    res.status(200).json({
      success: true,
      message: 'Image deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting image:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete image',
      error: error.message
    });
  }
};

module.exports = {
  upload,
  uploadResultImage,
  deleteResultImage
};
