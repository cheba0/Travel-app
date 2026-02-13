const express = require("express");
const AuthController = require("../controllers/authController");
const TravelController = require("../controllers/travelController");
const ExpenseController = require("../controllers/expenseController");
const qrController = require("../controllers/qrController");

const { pool } = require("../db");
const router = express.Router();

console.log("✅ AuthRoutes загружен");

// ========== СТРАНИЦЫ ==========
router.get("/", (req, res) => {
  console.log(" GET / - главная страница");
  res.render("index", {
    title: "Главная",
  });
});

router.get("/last_travel", (req, res) => {
  console.log(" GET /last_travel - страница путешествий");
  res.render("last_travel", {
    title: "Путешествия",
  });
});

router.get("/add", (req, res) => {
  console.log(" GET /add - страница добавить путешествия");
  res.render("add", {
    title: "Добавить путешествия",
  });
});

router.get("/profile", (req, res) => {
  console.log(" GET /profile - страница профиль");
  res.render("profile", {
    title: "Профиль",
  });
});

// router.get("/add_expense", (req, res) => {
//   console.log(" GET /add_expense - страница add_expense");
//   res.render("add_expense", {
//     title: "Добавить траты",
//   });
// });
router.get("/add_expense/:travelId", async (req, res) => {
  try {
    const travelId = req.params.travelId;
    console.log(
      `📱 Загрузка страницы добавления траты для путешествия ID: ${travelId}`,
    );

    // Проверяем авторизацию
    if (!req.session.userId) {
      console.log("❌ Пользователь не авторизован");
      return res.redirect("/login");
    }

    // Получаем данные путешествия из БД
    const result = await pool.query(
      `SELECT id, trip_name, currency 
       FROM trips 
       WHERE id = $1`,
      [travelId],
    );

    if (result.rows.length === 0) {
      console.log("❌ Путешествие не найдено");
      return res.status(404).send("Путешествие не найдено");
    }

    const travel = result.rows[0];

    console.log(`✅ Путешествие найдено: ${travel.trip_name}`);

    // Рендерим страницу и передаем travel объект
    res.render("add_expense", {
      title: "Добавить трату",
      travel: {
        id: travel.id,
        name: travel.trip_name,
      },
      user: {
        id: req.session.userId,
      },
    });
  } catch (error) {
    console.error("❌ Ошибка при загрузке страницы добавления траты:", error);
    res.status(500).send("Ошибка сервера");
  }
});
// router.get("/add_expense/:travelId", async (req, res) => {
//   try {
//     const travel = await Travel.findById(req.params.travelId);
//     res.render("add_expense", {
//       // travel: travel,
//       // user: req.user,
//     });
//   } catch (error) {
//     console.error(error);
//     res.redirect("/travels");
//   }
// });
router.get("/travellist", TravelController.list);
router.get("/travelDetail", TravelController.showForm);

router.get("/registration", (req, res) => {
  console.log(" GET /registration - страница регистрации");
  res.render("registration", {
    title: "Регистрация",
  });
});

router.get("/login", (req, res) => {
  console.log(" GET /login - страница входа");
  res.render("login", {
    title: "Вход в систему",
  });
});

// ========== API ==========
router.get("/api/auth/check", async (req, res) => {
  console.log("🔍 GET /check вызван");
  console.log("Session:", req.session);

  if (req.session && req.session.userId) {
    console.log("✅ Авторизован, userId:", req.session.userId);
    try {
      const result = await pool.query(
        "SELECT id, username, email FROM users WHERE id = $1",
        [req.session.userId],
      );

      if (result.rows.length > 0) {
        const userFromDB = result.rows[0];
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

router.get("/api/travelsbyuserId/:id", TravelController.getUserTravelsmob);
router.get("/api/travelsbyuserId/:id", TravelController.getUserTravelsPublic);

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
router.get("/api/expenses/trip/:tripId", ExpenseController.getByTripId);
router.get(
  "/api/travels/:tripId/participants",
  TravelController.getParticipants,
);
router.delete(
  "/api/expenses/:expenseId/participants/:userId",
  ExpenseController.removeParticipant,
);
router.get("/trip/:trip_id/balance", ExpenseController.getTripBalance);
router.get("/:id/edit", ExpenseController.getExpenseForEdit);
// router.post("/:id/settle", ExpenseController.settleDebt);

router.get("/scan/:travelId", qrController.showScannerPage);
router.post("/process-receipt", qrController.processReceiptQR);

// ========== УЧАСТНИКИ ПУТЕШЕСТВИЙ ==========

// 1. Поиск пользователей
router.get("/api/users/search", async (req, res) => {
  try {
    const { query } = req.query;
    const userId = req.session ? req.session.userId : null;

    console.log("🔍 Поиск пользователей:", query, "userId:", userId);

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Требуется авторизация",
      });
    }

    if (!query || query.trim().length < 2) {
      return res.json({
        success: true,
        users: [],
      });
    }

    const result = await pool.query(
      `SELECT id, username, email 
       FROM users 
       WHERE (username ILIKE $1 OR email ILIKE $1) 
         AND id != $2
       LIMIT 10`,
      [`%${query.trim()}%`, userId],
    );

    console.log("✅ Найдено пользователей:", result.rows.length);

    res.json({
      success: true,
      users: result.rows,
    });
  } catch (error) {
    console.error("❌ Ошибка поиска пользователей:", error);
    res.status(500).json({
      success: false,
      message: "Ошибка поиска пользователей",
    });
  }
});

// 2. Пригласить участника
router.post("/api/trips/:tripId/invite", async (req, res) => {
  try {
    const { tripId } = req.params;
    const { userId: invitedUserId } = req.body;
    const currentUserId = req.session ? req.session.userId : null;

    if (!currentUserId) {
      return res.status(401).json({
        success: false,
        message: "Требуется авторизация",
      });
    }

    console.log(
      `👥 Приглашение от ${currentUserId} в путешествие ${tripId}, пользователь ${invitedUserId}`,
    );

    const tripResult = await pool.query(
      "SELECT user_id FROM trips WHERE id = $1",
      [tripId],
    );

    if (tripResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Путешествие не найдено",
      });
    }

    const userResult = await pool.query(
      "SELECT id, username FROM users WHERE id = $1",
      [invitedUserId],
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Пользователь не найден",
      });
    }

    const invitedUser = userResult.rows[0];

    const existing = await pool.query(
      "SELECT * FROM trip_participants WHERE trip_id = $1 AND user_id = $2",
      [tripId, invitedUserId],
    );

    if (existing.rows.length > 0) {
      return res.json({
        success: false,
        message: `${invitedUser.username} уже участник`,
      });
    }

    await pool.query(
      `INSERT INTO trip_participants (trip_id, user_id, joined_at) 
       VALUES ($1, $2, NOW())`,
      [tripId, invitedUserId],
    );

    console.log(
      `✅ Пользователь ${invitedUser.username} приглашен в путешествие ${tripId}`,
    );

    res.json({
      success: true,
      message: `${invitedUser.username} приглашен в путешествие`,
    });
  } catch (error) {
    console.error("❌ Ошибка приглашения:", error);
    res.status(500).json({
      success: false,
      message: "Ошибка приглашения",
    });
  }
});

// 3. Получить участников
router.get("/api/trips/:tripId/participants", async (req, res) => {
  try {
    const { tripId } = req.params;
    const userId = req.session ? req.session.userId : null;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Требуется авторизация",
      });
    }

    console.log(`👥 Получение участников путешествия ${tripId}`);

    const result = await pool.query(
      `SELECT u.id, u.username, u.email, tp.joined_at
       FROM trip_participants tp
       JOIN users u ON tp.user_id = u.id
       WHERE tp.trip_id = $1`,
      [tripId],
    );

    res.json({
      success: true,
      participants: result.rows,
    });
  } catch (error) {
    console.error("❌ Ошибка получения участников:", error);
    res.status(500).json({
      success: false,
      message: "Ошибка получения участников",
    });
  }
});

// 4. Получить все путешествия пользователя
router.get("/api/my-travels", async (req, res) => {
  try {
    const userId = req.session ? req.session.userId : null;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Требуется авторизация",
      });
    }

    console.log(`🧳 Получение путешествий пользователя ${userId}`);

    const result = await pool.query(
      `SELECT DISTINCT t.*, u.username as creator_name,
        CASE 
          WHEN t.user_id = $1 THEN 'creator'
          ELSE 'participant'
        END as user_role
       FROM trips t
       LEFT JOIN users u ON t.user_id = u.id
       LEFT JOIN trip_participants tp ON t.id = tp.trip_id
       WHERE t.user_id = $1 OR tp.user_id = $1
       ORDER BY t.created_at DESC`,
      [userId],
    );

    res.json({
      success: true,
      travels: result.rows,
    });
  } catch (error) {
    console.error("❌ Ошибка получения путешествий:", error);
    res.status(500).json({
      success: false,
      message: "Ошибка получения путешествий",
    });
  }
});

// ========== СТРАНИЦА ПУТЕШЕСТВИЯ ==========
router.get("/travel/:id", async (req, res) => {
  try {
    const travelId = req.params.id;

    console.log(`📱 Загрузка страницы путешествия ID: ${travelId}`);

    if (!req.session.userId) {
      return res.redirect("/login");
    }

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
      id: exp.id,
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
      travelJSON: JSON.stringify(travelData),
      participantsJSON: JSON.stringify(participants),
      expensesJSON: JSON.stringify(expenses),
    });
  } catch (error) {
    console.error("Ошибка загрузки страницы путешествия:", error);
    res.status(500).send("Ошибка загрузки страницы");
  }
});

module.exports = router;
