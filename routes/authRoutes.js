const express = require("express");
const router = express.Router();
const AuthController = require("../controllers/authController");
const session = require("express-session");
const User = require("../Models/User");
const bcrypt = require("bcrypt");

console.log("AuthRoutes загружен");

const checkSession = (req, res, next) => {
  // В authRoutes у нас нет доступа к req.session из основного файла
  // Нужно проверять по-другому
  console.log("📋 Проверка сессии в authRoutes");

  // Просто передаем управление дальше
  // Проверку сессии будет делать основной middleware в app.js
  next();
};

router.get("/api/session/check", checkSession, (req, res) => {
  console.log("🔍 GET запрос проверки сессии");

  res.json({
    success: true,
    isAuthenticated: req.isAuthenticated,
    user: req.isAuthenticated
      ? {
          id: req.user.id,
          email: req.user.email,
          name: req.user.name,
        }
      : null,
    sessionId: req.sessionID,
    timestamp: new Date().toISOString(),
  });
});

// Главная страница
router.get("/", (req, res) => {
  console.log(" GET / - главная страница");
  res.render("index", {
    title: "Главная",
  });
});

// Страница путешествий
router.get("/last_travel", (req, res) => {
  console.log(" GET /last_travel - страница путешествий");
  res.render("last_travel", {
    title: "Путешествия",
  });
});

// Страница добавить путешествия
router.get("/add", (req, res) => {
  console.log(" GET /add - страница добавить путешествия");
  res.render("add", {
    title: "Добавить путешествия",
  });
});

// Страница профиль
router.get("/profile", (req, res) => {
  console.log(" GET /profile - страница профиль");
  res.render("profile", {
    title: "Профиль",
  });
});

// Страница add_expense
router.get("/add_expense", (req, res) => {
  console.log(" GET /add_expense - страница add_expense");
  res.render("add_expense", {
    title: "Добавить траты",
  });
});

// Страница регистрации
router.get("/registration", (req, res) => {
  console.log(" GET /registration - страница регистрации");
  res.render("registration", {
    title: "Регистрация",
  });
});

// Страница входа
router.get("/login", (req, res) => {
  console.log(" GET /login - страница входа");
  res.render("login", {
    title: "Вход в систему",
  });
});

router.get("/api/profile/check", async (req, res) => {
  try {
    console.log("🔍 GET /api/profile/check - проверка профиля");

    // Простая проверка - всегда говорим что профиля нет
    // (В реальном приложении здесь проверка БД по сессии/кукам)
    res.json({
      success: true,
      hasProfile: false,
      message: "Используйте /register для создания профиля",
    });
  } catch (error) {
    console.error("❌ Ошибка проверки профиля:", error);
    res.status(500).json({
      success: false,
      error: "Ошибка проверки профиля",
      hasProfile: false,
    });
  }
});

router.post("/api/register", AuthController.register);

router.post("/api/login", AuthController.login);

router.post("/api/profile/check", checkSession, async (req, res) => {
  try {
    console.log("🔍 POST запрос проверки профиля:", req.body);

    const { email, userId } = req.body;
    let hasProfile = false;
    let userData = null;

    // Проверяем по сессии
    if (req.isAuthenticated) {
      hasProfile = true;
      userData = req.user;
    }
    // Если нет сессии, но есть данные в запросе
    else if (email || userId) {
      // Ищем пользователя в базе данных
      const query = {};
      if (email) query.email = email;
      if (userId) query._id = userId;

      const user = await User.findOne(query).select("-passwordhash");
      if (user) {
        hasProfile = true;
        userData = {
          id: user._id,
          email: user.email,
          name: user.name,
        };

        // Создаем сессию для найденного пользователя
        req.session.user = userData;
        await req.session.save();
        console.log("✅ Сессия создана для пользователя:", user.email);
      }
    }

    res.json({
      success: true,
      hasProfile,
      user: userData,
      sessionId: req.sessionID,
      message: hasProfile ? "Профиль найден" : "Профиль не найден",
    });
  } catch (error) {
    console.error("❌ Ошибка проверки профиля:", error);
    res.status(500).json({
      success: false,
      hasProfile: false,
      error: "Ошибка сервера при проверке профиля",
    });
  }
});

router.post("/api/session/logout", (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error("❌ Ошибка при выходе:", err);
      return res.status(500).json({ success: false, error: "Ошибка выхода" });
    }

    // Очищаем куки на клиенте
    res.clearCookie("connect.sid");
    res.json({ success: true, message: "Сессия завершена" });
  });
});

module.exports = router;
