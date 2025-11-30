const express = require("express");
const router = express.Router();
const AuthController = require("../controllers/authController");

console.log("AuthRoutes загружен");

// Страница регистрации
router.get("/register", (req, res) => {
  console.log(" GET /register - страница регистрации");
  res.render("register", {
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
