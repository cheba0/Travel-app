const express = require("express");
const router = express.Router();
const AuthController = require("../controllers/authController");

console.log("AuthRoutes загружен");

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

router.post("/api/register", AuthController.register);

// router.post("/api/login", AuthController.login);

module.exports = router;
