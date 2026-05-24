const multer = require('multer');
const path = require('path');
const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const { AppError } = require('../utils/asyncHandler');

// Check if Cloudinary is configured
const isCloudinaryConfigured = 
  process.env.CLOUDINARY_CLOUD_NAME && 
  process.env.CLOUDINARY_CLOUD_NAME !== 'your_cloud_name_here' &&
  process.env.CLOUDINARY_CLOUD_NAME.trim() !== '';

let storage;

if (isCloudinaryConfigured) {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
  });

  storage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: async (req, file) => {
      let folder = 'flowdesk/others';
      if (file.fieldname === 'avatar') {
        folder = 'flowdesk/avatars';
      } else if (file.fieldname === 'attachments') {
        folder = 'flowdesk/attachments';
      }

      const allowedFormats = ['jpeg', 'jpg', 'png', 'gif', 'pdf'];
      const fileExt = path.extname(file.originalname).substring(1).toLowerCase();
      
      return {
        folder: folder,
        format: allowedFormats.includes(fileExt) ? fileExt : 'png',
        public_id: Date.now() + '-' + path.parse(file.originalname).name
      };
    }
  });
  console.log('Cloudinary Storage active for uploads.');
} else {
  // Fallback to local disk storage
  storage = multer.diskStorage({
    destination: function (req, file, cb) {
      cb(null, path.join(__dirname, '../public/uploads/'));
    },
    filename: function (req, file, cb) {
      const ext = path.extname(file.originalname);
      cb(null, Date.now() + ext);
    }
  });
  console.log('Fallback local disk storage active for uploads (Cloudinary keys missing).');
}

const fileFilter = (req, file, cb) => {
  const allowedMimeTypes = /jpeg|jpg|png|gif|pdf/;
  const allowedExts = /jpeg|jpg|png|gif|pdf/i;

  const extName = allowedExts.test(path.extname(file.originalname).toLowerCase());
  const mimeType = allowedMimeTypes.test(file.mimetype);

  if (extName && mimeType) {
    return cb(null, true);
  } else {
    cb(new AppError('Only images and PDFs are allowed', 400), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB
  }
});

exports.uploadSingle = upload.single('avatar');
exports.uploadMultiple = upload.array('attachments', 5);
