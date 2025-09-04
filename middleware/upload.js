const multer = require('multer');
const { GridFSBucket } = require('mongodb');
const mongoose = require('mongoose');
const ErrorResponse = require('../utils/errorResponse');

// GridFS bucket for storing images
let bucket;

// Initialize GridFS bucket when MongoDB connection is ready
mongoose.connection.once('open', () => {
  bucket = new GridFSBucket(mongoose.connection.db, {
    bucketName: 'eventImages'
  });
});

// Multer memory storage configuration
const storage = multer.memoryStorage();

// File filter for images only
const fileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new ErrorResponse('Only image files are allowed', 400), false);
  }
};

// Multer configuration
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: fileFilter
});

// Upload single image to GridFS
const uploadToGridFS = (file, filename) => {
  return new Promise((resolve, reject) => {
    if (!bucket) {
      return reject(new Error('GridFS bucket not initialized'));
    }

    const uploadStream = bucket.openUploadStream(filename, {
      metadata: {
        originalName: file.originalname,
        mimetype: file.mimetype,
        uploadDate: new Date()
      }
    });

    uploadStream.on('error', (error) => {
      reject(error);
    });

    uploadStream.on('finish', () => {
      resolve(uploadStream.id);
    });

    uploadStream.end(file.buffer);
  });
};

// Get image from GridFS
const getImageFromGridFS = (fileId) => {
  return new Promise((resolve, reject) => {
    if (!bucket) {
      return reject(new Error('GridFS bucket not initialized'));
    }

    try {
      const downloadStream = bucket.openDownloadStream(fileId);
      const chunks = [];

      downloadStream.on('data', (chunk) => {
        chunks.push(chunk);
      });

      downloadStream.on('end', () => {
        resolve(Buffer.concat(chunks));
      });

      downloadStream.on('error', (error) => {
        // Handle GridFS specific errors
        if (error.code === 'ENOENT' || error.message.includes('FileNotFound')) {
          reject(new Error('File not found'));
        } else {
          reject(error);
        }
      });
    } catch (error) {
      reject(error);
    }
  });
};

// Delete image from GridFS
const deleteImageFromGridFS = (fileId) => {
  return new Promise(async (resolve, reject) => {
    if (!bucket) {
      return reject(new Error('GridFS bucket not initialized'));
    }

    try {
      // Convert to ObjectId if it's a string
      const mongoose = require('mongoose');
      let objectId;
      
      try {
        objectId = new mongoose.Types.ObjectId(fileId);
      } catch (conversionError) {
        console.log('Invalid ObjectId for deletion:', fileId);
        return resolve(); // Don't fail if ID is invalid, just skip deletion
      }

      // First check if file exists
      const files = await bucket.find({ _id: objectId }).toArray();
      
      if (files.length === 0) {
        console.log('File not found for deletion:', objectId);
        return resolve(); // Don't fail if file doesn't exist
      }

      // Delete the file
      await bucket.delete(objectId);
      console.log('Successfully deleted file:', objectId);
      resolve();
      
    } catch (error) {
      console.error('Error deleting file from GridFS:', error);
      // Don't reject on deletion errors to prevent upload failures
      resolve();
    }
  });
};

module.exports = {
  upload,
  uploadToGridFS,
  getImageFromGridFS,
  deleteImageFromGridFS,
  bucket: () => bucket
};