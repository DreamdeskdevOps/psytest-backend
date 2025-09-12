const multer = require('multer');
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const cloudinary = require('cloudinary').v2;

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Set up Cloudinary storage
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'uploads', // The name of the folder in Cloudinary
    allowed_formats: ['jpg', 'png', 'gif', 'webp'], // Allowed file formats
  },
});

// Initialize multer with the Cloudinary storage
const upload = multer({ storage: storage });

// Middleware for handling file uploads
const uploadMiddleware = (req, res, next) => {
  upload.single('file')(req, res, (error) => {
    if (error) {
      return res.status(400).json({ error: error.message });
    }
    next();
  });
};

module.exports = uploadMiddleware;