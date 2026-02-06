const express = require("express");
const AuthController = require("../controllers/authController");
const TravelController = require("../controllers/travelController");
const ExpenseController = require("../controllers/expenseController");
const qrController = require("../controllers/qrController");
const { pool } = require("../db");
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
// router.get("/travelList", (req, res) => {
//   console.log(" GET /travelList - страница travelList");
//   res.render("travelList", {
//     title: "Список путешествий",
//   });
// });
router.get("/travellist", TravelController.list);
router.get("/travelDetail", TravelController.showForm);
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
router.get("/api/auth/check", async (req, res) => {
  console.log("🔍 GET /check вызван");
  console.log("Session:", req.session);
  console.log("Session ID:", req.sessionID);

  // Проверяем сессию
  if (req.session && req.session.userId) {
    console.log("✅ Авторизован, userId:", req.session.userId);
    try {
      // Получаем данные пользователя из базы данных
      const result = await pool.query(
        "SELECT id, username, email FROM users WHERE id = $1",
        [req.session.userId],
      );

      if (result.rows.length > 0) {
        const userFromDB = result.rows[0];
        console.log("✅ Данные пользователя из БД:", userFromDB);

        return res.json({
          success: true,
          isAuthenticated: true,
          user: {
            id: userFromDB.id,
            username: userFromDB.username || "Пользователь",
            email: userFromDB.email || "",
            sessionId: req.sessionID,
          },
        });
      } else {
        console.log("⚠️ Пользователь не найден в БД");
      }
    } catch (error) {
      console.error("❌ Ошибка получения данных из БД:", error);
    }
  }

  console.log("❌ Не авторизован");
  return res.json({
    success: true,
    isAuthenticated: false,
    user: null,
    message: "Пользователь не авторизован",
    sessionExists: !!req.session,
    sessionId: req.sessionID,
  });
});

function formatDate(dateString) {
  if (!dateString) return "";
  const date = new Date(dateString);
  return date.toLocaleDateString("ru-RU", {
    day: "numeric",
    month: "numeric",
  });
}

router.post("/api/register", AuthController.register);
router.post("/api/login", AuthController.login);
router.post("/api/auth/logout", AuthController.logout);

router.get("/api/auth/logout", (req, res) => {
  console.log("🔍 GET /logout вызван");
});
router.post("/api/travels", TravelController.create);
router.get("/api/travels", TravelController.getUserTravels);
router.get("/api/travels/:id", TravelController.getTravelById);
router.get("/api/travels/:id/edit", TravelController.showForm);
router.get("/api/travels/:id/detail", TravelController.show);
router.get("/", TravelController.list);
router.put("/api/travels/:id", TravelController.update);
router.delete("/api/travels/:id", TravelController.delete);

router.post("/api/expenses", ExpenseController.create);
router.get("/api/expenses/:id", ExpenseController.getById);
router.put("/api/expenses/:id", ExpenseController.update);
router.delete("/api/expenses/:id", ExpenseController.delete);

// Маршрут для отображения страницы сканирования
router.get("/scan/:travelId", qrController.showScannerPage);
// Маршрут для ОБРАБОТКИ ДАННЫХ ЧЕКА (замените старый /process)
// router.post("/process-receipt", qrController.processReceiptQR);

router.post("/process-receipt", async (req, res) => {
  console.log("🔥 ПРОСТОЙ ОБРАБОТЧИК /process-receipt ВЫЗВАН");
  console.log("📦 Полное тело запроса:", JSON.stringify(req.body, null, 2));
  console.log("👤 Сессия:", req.session);

  try {
    // Простой тестовый ответ
    res.json({
      success: true,
      message: "✅ Простой обработчик работает!",
      receivedData: req.body,
      timestamp: new Date().toISOString(),
      server: "Node.js " + process.version,
    });
  } catch (error) {
    console.error("❌ Ошибка в простом обработчике:", error);
    res.status(500).json({
      success: false,
      error: error.message,
      stack: error.stack,
    });
  }
});

// Страница конкретного путешествия
router.get("/travel/:id", async (req, res) => {
  try {
    const travelId = req.params.id;

    console.log(`📱 Загрузка страницы путешествия ID: ${travelId}`);

    // Проверяем авторизацию
    if (!req.session.userId) {
      return res.redirect("/login");
    }

    // Получаем данные путешествия
    const result = await pool.query(
      `SELECT t.*, u.username as creator_name
       FROM trips t
       LEFT JOIN users u ON t.user_id = u.id
       WHERE t.id = $1`,
      [travelId],
    );

    if (result.rows.length === 0) {
      console.log("❌ Путешествие не найдено");
      return res.status(404).send("Путешествие не найдено");
    }

    const travel = result.rows[0];

    // Получаем участников
    const participantsResult = await pool.query(
      `SELECT u.id, u.username
       FROM trip_participants tp
       JOIN users u ON tp.user_id = u.id
       WHERE tp.trip_id = $1`,
      [travelId],
    );

    const expensesResult = await pool.query(
      `SELECT e.*, u.username as payer_name
       FROM expenses e
       JOIN users u ON e.paid_by = u.id
       WHERE e.trip_id = $1
       ORDER BY e.date DESC`,
      [travelId],
    );

    console.log(`✅ Загружено: ${expensesResult.rows.length} расходов`);

    // Подготавливаем данные для шаблона
    const travelData = {
      id: travel.id,
      name: travel.trip_name,
      start_date: formatDate(travel.start_date),
      end_date: formatDate(travel.end_date),
      date_range:
        formatDate(travel.start_date) +
        (travel.end_date ? " - " + formatDate(travel.end_date) : ""),
      location: travel.location || "",
      description: travel.description || "",
      currency: travel.currency || "RUB",
    };

    const participants = participantsResult.rows;
    const expenses = expensesResult.rows.map((exp) => ({
      id: exp.id, // ← ЭТА СТРОКА ОБЯЗАТЕЛЬНА!
      name: exp.expense_name || "Без названия",
      date: formatDate(exp.date),
      amount: exp.amount,
      payer: exp.payer_name,
      currency: travel.currency || "RUB",
    }));

    const userId = req.session.userId;

    res.render("travelPage", {
      title: travel.trip_name,
      travel: travelData,
      participants: participants,
      expenses: expenses,
      userId: userId,
      // Преобразуем данные в JSON строку для безопасной передачи
      travelJSON: JSON.stringify(travelData),
      participantsJSON: JSON.stringify(participants),
      expensesJSON: JSON.stringify(expenses),
    });
  } catch (error) {
    console.error("Ошибка загрузки страницы путешествия:", error);
  }
});

// // ========== PAGE ROUTES (страницы EJS) ==========
// // ВАЖНО: Страницы должны быть в ДРУГОМ файле или в server.js!

module.exports = router;
