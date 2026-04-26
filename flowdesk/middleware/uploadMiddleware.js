// Concept: Third-party middleware, multer
const multer = require('multer');
const path = require('path');
const { AppError } = require('../utils/asyncHandler');

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, path.join(__dirname, '../public/uploads/'));
  },
  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname);
    cb(null, Date.now() + ext);
  }
});

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
