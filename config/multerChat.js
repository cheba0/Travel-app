// Добавьте в конец config/multer.js:

// Хранилище для изображений чата
const chatStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    const dir = path.join(__dirname, "../public/uploads/chat");
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: function (req, file, cb) {
    const unique = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, "chat_" + unique + path.extname(file.originalname));
  },
});

const chatUpload = multer({
  storage: chatStorage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = /jpeg|jpg|png|gif|webp/;
    if (allowed.test(file.mimetype)) cb(null, true);
    else cb(new Error("Только изображения"));
  },
});

// Экспортируем оба
module.exports = upload; // для путешествий
module.exports.chatUpload = chatUpload; // для чата
