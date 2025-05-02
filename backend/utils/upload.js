const path = require('path');
const multer = require('multer');
const ErrorResponse = require('./errorResponse');

// Configure multer for file storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    // Create unique filename with original extension
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1E9)}`;
    cb(null, `${uniqueSuffix}${path.extname(file.originalname)}`);
  }
});

// File filter
const fileFilter = (req, file, cb) => {
  // Accept images and pdfs only
  if (file.mimetype.startsWith('image/') || file.mimetype === 'application/pdf') {
    cb(null, true);
  } else {
    cb(new ErrorResponse('Please upload only images or PDF files', 400), false);
  }
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  }
});

// Middleware to attach file URL to request
const attachFileUrl = (req, res, next) => {
  if (!req.file) {
    return next(new ErrorResponse('Please upload a file', 400));
  }

  // Create file path relative to uploads directory
  req.file.path = `uploads/${req.file.filename}`;
  
  // Create accessible URL path for frontend
  req.file.url = `/uploads/${req.file.filename}`;
  next();
};

module.exports = {
  upload,
  attachFileUrl
};