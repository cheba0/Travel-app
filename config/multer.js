// config/multer.js
const multer = require("multer");
const path = require("path");
const fs = require("fs");

// ===== ХРАНИЛИЩЕ ДЛЯ ФОТО ПУТЕШЕСТВИЙ =====
const travelUploadDir = path.join(__dirname, "../public/uploads/trips");
if (!fs.existsSync(travelUploadDir)) {
  fs.mkdirSync(travelUploadDir, { recursive: true });
}

const travelStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, travelUploadDir),
  filename: (req, file, cb) => {
    const unique = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, unique + path.extname(file.originalname));
  },
});

const travelFileFilter = (req, file, cb) => {
  const allowed = /jpeg|jpg|png|gif|webp/;
  if (
    allowed.test(file.mimetype) &&
    allowed.test(path.extname(file.originalname).toLowerCase())
  ) {
    cb(null, true);
  } else {
    cb(new Error("Только изображения: jpeg, jpg, png, gif, webp"));
  }
};

const upload = multer({
  storage: travelStorage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: travelFileFilter,
});

// ===== ХРАНИЛИЩЕ ДЛЯ ФОТО ЧАТА =====
const chatUploadDir = path.join(__dirname, "../public/uploads/chat");
if (!fs.existsSync(chatUploadDir)) {
  fs.mkdirSync(chatUploadDir, { recursive: true });
}

const chatStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, chatUploadDir),
  filename: (req, file, cb) => {
    const unique = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, "chat_" + unique + path.extname(file.originalname));
  },
});

const chatFileFilter = (req, file, cb) => {
  const allowed = /jpeg|jpg|png|gif|webp/;
  if (allowed.test(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error("Только изображения"));
  }
};

const chatUpload = multer({
  storage: chatStorage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: chatFileFilter,
});

// ===== ЭКСПОРТ (важно!) =====
module.exports = {
  upload,
  chatUpload,
};
