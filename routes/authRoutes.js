const express = require("express");
const AuthController = require("../controllers/authController");
const router = express.Router();

console.log("✅ AuthRoutes загружен");

// ========== ПРЯМОЙ API (без контроллера для теста) ==========
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
// Проверка авторизации - GET /api/auth/check
router.get("/api/auth/check", (req, res) => {
  console.log("🔍 GET /check вызван");
  console.log("Session:", req.session);
  console.log("Session ID:", req.sessionID);

  // Проверяем сессию
  if (req.session && req.session.userId) {
    console.log("✅ Авторизован, userId:", req.session.userId);
    return res.json({
      success: true,
      isAuthenticated: true,
      user: {
        id: req.session.userId,
        username: req.session.user?.username || "Пользователь",
        email: req.session.user?.email || "",
      },
    });
  }

  console.log("❌ Не авторизован");
  return res.json({
    success: true,
    isAuthenticated: false,
    user: null,
  });
});

router.post("/api/register", AuthController.register);
router.post("/api/login", AuthController.login);

// // Вход - POST /api/auth/login
// router.post("/api/login", async (req, res) => {
//   console.log("🔐 POST /login вызван");
//   console.log("Тело запроса:", req.body);

//   try {
//     // Здесь должна быть проверка логина/пароля
//     // Пока просто создаем сессию для теста
//     req.session.userId = Date.now().toString();
//     req.session.user = {
//       id: req.session.userId,
//       username: "Тестовый пользователь",
//       email: req.body.email || "test@example.com",
//     };

//     console.log("✅ Создана сессия для входа:", req.session.userId);

//     return res.json({
//       success: true,
//       message: "Вход выполнен успешно (тест)",
//       user: req.session.user,
//     });
//   } catch (error) {
//     console.error("Ошибка входа:", error);
//     return res.status(500).json({
//       success: false,
//       error: "Ошибка сервера",
//     });
//   }
// });

// Выход - POST /api/auth/logout
router.post("/logout", (req, res) => {
  console.log("🚪 POST /logout вызван");

  req.session.destroy((err) => {
    if (err) {
      console.error("Ошибка выхода:", err);
      return res.status(500).json({
        success: false,
        error: "Ошибка выхода",
      });
    }

    res.clearCookie("travel.sid");
    return res.json({
      success: true,
      message: "Выход выполнен",
    });
  });
});

// ========== PAGE ROUTES (страницы EJS) ==========
// ВАЖНО: Страницы должны быть в ДРУГОМ файле или в server.js!

module.exports = router;
