const express = require("express");
const router = express.Router();
const AuthController = require("../controllers/authController");
const TravelController = require("../controllers/travelController");
const ExpenseController = require("../controllers/expenseController");
const qrController = require("../controllers/qrController");
const MessageController = require("../controllers/messageController");
const ticketService = require("../services/ticketService");
const tutuService = require("../services/tutuService");
const xoteloService = require("../services/xoteloService");
const { upload, chatUpload } = require("../config/multer");
const { pool } = require("../db");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const DebtController = require("../controllers/debtController");

console.log("✅ AuthRoutes загружен");

// ========== СТРАНИЦЫ ==========
router.get("/", (req, res) => {
  console.log(" GET / - главная страница");
  res.render("index", { title: "Главная" });
});

router.get("/last_travel", (req, res) => {
  console.log(" GET /last_travel - страница путешествий");
  res.render("last_travel", { title: "Путешествия" });
});

router.get("/add", (req, res) => {
  console.log(" GET /add - страница добавить путешествия");
  res.render("add", { title: "Добавить путешествия" });
});

router.get("/profile", (req, res) => {
  console.log(" GET /profile - страница профиль");
  res.render("profile", { title: "Профиль" });
});

router.get("/add_expense/:travelId", async (req, res) => {
  try {
    const travelId = req.params.travelId;
    console.log(
      `📱 Загрузка страницы добавления траты для путешествия ID: ${travelId}`,
    );

    if (!req.session.userId) {
      console.log("❌ Пользователь не авторизован");
      return res.redirect("/login");
    }

    const result = await pool.query(
      `SELECT id, trip_name, currency FROM trips WHERE id = $1`,
      [travelId],
    );

    if (result.rows.length === 0) {
      console.log("❌ Путешествие не найдено");
      return res.status(404).send("Путешествие не найдено");
    }

    const travel = result.rows[0];
    console.log(`✅ Путешествие найдено: ${travel.trip_name}`);

    res.render("add_expense", {
      title: "Добавить трату",
      travel: { id: travel.id, name: travel.trip_name },
      user: { id: req.session.userId },
    });
  } catch (error) {
    console.error("❌ Ошибка при загрузке страницы добавления траты:", error);
    res.status(500).send("Ошибка сервера");
  }
});

router.get("/travellist", TravelController.list);
router.get("/travelDetail", TravelController.showForm);

router.get("/registration", (req, res) => {
  console.log(" GET /registration - страница регистрации");
  res.render("registration", { title: "Регистрация" });
});

router.get("/login", (req, res) => {
  console.log(" GET /login - страница входа");
  res.render("login", { title: "Вход в систему" });
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

router.post(
  "/api/travels",
  upload.single("image"),
  (req, res, next) => {
    console.log(
      "🔍 Multer отработал. req.file =",
      req.file ? req.file.filename : "UNDEFINED",
    );
    next();
  },
  TravelController.create,
);

router.get("/api/travels", TravelController.getUserTravels);
router.delete(
  "/api/trips/:tripId/participants/:userId",
  TravelController.removeParticipant,
);
router.get("/api/travels/:id", TravelController.getTravelById);
router.get("/api/travels/:id/edit", TravelController.showForm);
router.get("/api/travels/:id/detail", TravelController.show);
router.get("/", TravelController.list);
router.put("/api/travels/:id", TravelController.update);
router.delete("/api/travels/:id", TravelController.delete);
router.get("/api/trips/:tripId/messages", MessageController.getHistory);

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

router.get("/scan/:travelId", qrController.showScannerPage);
router.post("/process-receipt", qrController.processReceiptQR);

// ========== ЗАГРУЗКА ГОЛОСОВЫХ СООБЩЕНИЙ =====
const voiceStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(__dirname, "../public/uploads/voice");
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    cb(
      null,
      "voice_" + Date.now() + "-" + Math.round(Math.random() * 1e9) + ".webm",
    );
  },
});
const voiceUpload = multer({
  storage: voiceStorage,
  limits: { fileSize: 10 * 1024 * 1024 },
});

router.post(
  "/api/chat/upload-voice",
  voiceUpload.single("voiceMessage"),
  async (req, res) => {
    try {
      if (!req.file)
        return res
          .status(400)
          .json({ success: false, error: "Файл не загружен" });
      const { tripId } = req.body;
      const userId = req.session.userId;
      if (!tripId || !userId)
        return res
          .status(400)
          .json({ success: false, error: "Неверные параметры" });

      const check = await pool.query(
        `SELECT 1 FROM trip_participants WHERE trip_id = $1 AND user_id = $2`,
        [tripId, userId],
      );
      if (check.rows.length === 0)
        return res
          .status(403)
          .json({ success: false, error: "Доступ запрещён" });

      res.json({
        success: true,
        audioUrl: "/uploads/voice/" + req.file.filename,
      });
    } catch (error) {
      console.error("❌ Ошибка загрузки голосового:", error);
      res.status(500).json({ success: false, error: "Ошибка сервера" });
    }
  },
);

// ========== ЗАГРУЗКА ВИДЕОКРУЖОЧКОВ =====
const videoStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(__dirname, "../public/uploads/video");
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    cb(
      null,
      "video_" + Date.now() + "-" + Math.round(Math.random() * 1e9) + ".webm",
    );
  },
});
const videoUpload = multer({
  storage: videoStorage,
  limits: { fileSize: 20 * 1024 * 1024 },
});

router.post(
  "/api/chat/upload-video",
  videoUpload.single("videoMessage"),
  async (req, res) => {
    try {
      if (!req.file)
        return res
          .status(400)
          .json({ success: false, error: "Файл не загружен" });
      const { tripId } = req.body;
      const userId = req.session.userId;
      if (!tripId || !userId)
        return res
          .status(400)
          .json({ success: false, error: "Неверные параметры" });

      const check = await pool.query(
        `SELECT 1 FROM trip_participants WHERE trip_id = $1 AND user_id = $2`,
        [tripId, userId],
      );
      if (check.rows.length === 0)
        return res
          .status(403)
          .json({ success: false, error: "Доступ запрещён" });

      res.json({
        success: true,
        videoUrl: "/uploads/video/" + req.file.filename,
      });
    } catch (error) {
      console.error("❌ Ошибка загрузки видео:", error);
      res.status(500).json({ success: false, error: "Ошибка сервера" });
    }
  },
);

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
// ========== СТРАНИЦА долгового расчета ==========
router.get("/api/trips/:tripId/debts", DebtController.getDebts);
router.get("/api/trips/:tripId/debt-history", DebtController.getDebtHistory);
router.post("/api/trips/:tripId/settle-debt", DebtController.settleDebt);
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

    // 🔹 ИСПРАВЛЕНО: добавлены поля category и paid_by
    const expensesResult = await pool.query(
      `SELECT 
          e.id,
          e.expense_name,
          e.amount,
          e.date,
          e.description,
          e.category,
          e.paid_by,
          u.username as payer_name,
          (
            SELECT json_agg(json_build_object(
              'id', u2.id,
              'username', u2.username,
              'amount_owed', es.amount_owed
            ))
            FROM expense_shares es
            JOIN users u2 ON es.user_id = u2.id
            WHERE es.expense_id = e.id
          ) as participants
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
      date_range:
        formatDate(travel.start_date) +
        (travel.end_date ? " - " + formatDate(travel.end_date) : ""),
      location: travel.location || "",
      description: travel.description || "",
      currency: travel.currency || "RUB",
      photo: travel.photo,
      user_id: travel.user_id,
    };

    const participants = participantsResult.rows;

    // 🔹 ИСПРАВЛЕНО: добавлены поля category и paid_by
    const expenses = expensesResult.rows.map((exp) => ({
      id: exp.id,
      name: exp.expense_name || "Без названия",
      date: formatDate(exp.date),
      amount: exp.amount,
      payer: exp.payer_name,
      paid_by: exp.paid_by, // 🔹 ID плательщика
      category: exp.category, // 🔹 Категория расхода
      currency: travel.currency || "RUB",
      participants: exp.participants || [],
    }));

    const userId = req.session.userId;

    console.log("📊 Пример первого расхода:", expenses[0]);

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

// Маршрут для загрузки картинок чата
router.post(
  "/api/chat/upload-image",
  chatUpload.single("chatImage"),
  async (req, res) => {
    try {
      if (!req.file) {
        return res
          .status(400)
          .json({ success: false, error: "Файл не загружен" });
      }

      const tripId = req.body.tripId;
      const userId = req.session.userId;

      if (!tripId || !userId) {
        return res
          .status(400)
          .json({ success: false, error: "Неверные параметры" });
      }

      const check = await pool.query(
        `SELECT 1 FROM trip_participants WHERE trip_id = $1 AND user_id = $2`,
        [tripId, userId],
      );

      if (check.rows.length === 0) {
        return res
          .status(403)
          .json({ success: false, error: "Доступ запрещён" });
      }

      const imageUrl = "/uploads/chat/" + req.file.filename;

      res.json({
        success: true,
        imageUrl,
      });
    } catch (error) {
      console.error("❌ Ошибка загрузки изображения чата:", error);
      res.status(500).json({ success: false, error: "Ошибка сервера" });
    }
  },
);

// ===== РЕДАКТИРОВАНИЕ СООБЩЕНИЯ =====
router.put("/api/messages/:messageId/edit", async (req, res) => {
  try {
    const { messageId } = req.params;
    const { text } = req.body;
    const userId = req.session.userId;

    if (!userId) {
      return res
        .status(401)
        .json({ success: false, error: "Требуется авторизация" });
    }

    if (!text || text.trim() === "") {
      return res
        .status(400)
        .json({ success: false, error: "Текст не может быть пустым" });
    }

    const msgResult = await pool.query(
      `SELECT m.id, m.user_id, m.created_at, t.user_id as trip_creator 
       FROM messages m 
       JOIN trips t ON m.trip_id = t.id 
       WHERE m.id = $1`,
      [messageId],
    );

    if (msgResult.rows.length === 0) {
      return res
        .status(404)
        .json({ success: false, error: "Сообщение не найдено" });
    }

    const message = msgResult.rows[0];

    if (message.user_id !== userId) {
      return res.status(403).json({
        success: false,
        error: "Можно редактировать только свои сообщения",
      });
    }

    const messageTime = new Date(message.created_at);
    const now = new Date();
    const minutesDiff = (now - messageTime) / (1000 * 60);

    if (minutesDiff > 5) {
      return res.status(400).json({
        success: false,
        error: "Редактирование только в течение 5 минут",
      });
    }

    await pool.query(`UPDATE messages SET text = $1 WHERE id = $2`, [
      text.trim(),
      messageId,
    ]);

    res.json({
      success: true,
      message: "Сообщение обновлено",
      updatedMessage: {
        id: messageId,
        text: text.trim(),
      },
    });
  } catch (error) {
    console.error("❌ Ошибка редактирования:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ===== УДАЛЕНИЕ СООБЩЕНИЯ =====
router.delete("/api/messages/:messageId", async (req, res) => {
  try {
    const { messageId } = req.params;
    const userId = req.session.userId;

    console.log(`🗑️ Удаление: messageId=${messageId}, userId=${userId}`);

    if (!userId) {
      return res
        .status(401)
        .json({ success: false, error: "Требуется авторизация" });
    }

    const msgResult = await pool.query(
      `SELECT m.id, m.user_id, m.trip_id 
       FROM messages m 
       WHERE m.id = $1`,
      [messageId],
    );

    if (msgResult.rows.length === 0) {
      return res
        .status(404)
        .json({ success: false, error: "Сообщение не найдено" });
    }

    const message = msgResult.rows[0];

    if (message.user_id !== userId) {
      return res.status(403).json({
        success: false,
        error: "Можно удалять только свои сообщения",
      });
    }

    await pool.query(`DELETE FROM messages WHERE id = $1`, [messageId]);

    console.log(`✅ Сообщение ${messageId} удалено`);

    res.json({
      success: true,
      message: "Сообщение удалено",
      deletedMessage: { id: messageId },
    });
  } catch (error) {
    console.error("❌ Ошибка удаления:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});
// ========== ЭКСПОРТ ДОЛГОВ В CSV ==========
router.get("/api/trips/:tripId/debts/export", async (req, res) => {
  try {
    const { tripId } = req.params;
    const userId = req.session.userId;

    if (!userId) {
      return res
        .status(401)
        .json({ success: false, error: "Требуется авторизация" });
    }

    const check = await pool.query(
      `SELECT 1 FROM trip_participants WHERE trip_id = $1 AND user_id = $2`,
      [tripId, userId],
    );

    if (check.rows.length === 0) {
      return res
        .status(403)
        .json({ success: false, error: "Вы не участник этой поездки" });
    }

    // Получаем данные о путешествии
    const tripResult = await pool.query(
      `SELECT trip_name, currency FROM trips WHERE id = $1`,
      [tripId],
    );
    const trip = tripResult.rows[0];

    // Получаем все долги
    const debtsResult = await pool.query(
      `SELECT 
        ds.*,
        fu.username as from_username,
        tu.username as to_username
      FROM debt_settlements ds
      JOIN users fu ON ds.from_user_id = fu.id
      JOIN users tu ON ds.to_user_id = tu.id
      WHERE ds.trip_id = $1
      ORDER BY ds.created_at DESC`,
      [tripId],
    );

    // Получаем балансы участников
    const balancesResult = await pool.query(
      `SELECT 
        u.id,
        u.username,
        COALESCE(SUM(e.amount), 0) as total_paid,
        COALESCE((
          SELECT SUM(es.amount_owed)
          FROM expense_shares es
          JOIN expenses e2 ON es.expense_id = e2.id
          WHERE es.user_id = u.id AND e2.trip_id = $1
        ), 0) as total_owed
      FROM trip_participants tp
      JOIN users u ON tp.user_id = u.id
      LEFT JOIN expenses e ON e.paid_by = u.id AND e.trip_id = $1
      WHERE tp.trip_id = $1
      GROUP BY u.id, u.username`,
      [tripId],
    );

    // Генерируем CSV
    let csv = "\uFEFF"; // BOM для Excel
    csv += `Отчёт по долгами: ${trip.trip_name}\n`;
    csv += `Валюта: ${trip.currency}\n`;
    csv += `Дата генерации: ${new Date().toLocaleString("ru-RU")}\n\n`;

    // Балансы участников
    csv += `БАЛАНСЫ УЧАСТНИКОВ:\n`;
    csv += `Участник;Заплатил;Должен;Баланс\n`;
    balancesResult.rows.forEach((row) => {
      const balance = parseFloat(row.total_paid) - parseFloat(row.total_owed);
      csv += `${row.username};${row.total_paid};${row.total_owed};${balance}\n`;
    });

    csv += `\n`;

    // История транзакций
    csv += `ИСТОРИЯ ТРАНЗАКЦИЙ:\n`;
    csv += `Дата;От кого;Кому;Сумма;Заметка\n`;
    debtsResult.rows.forEach((row) => {
      const date = new Date(row.created_at).toLocaleString("ru-RU");
      csv += `${date};${row.from_username};${row.to_username};${row.amount};${row.note || ""}\n`;
    });

    // Отправляем файл
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="debts_${tripId}_${Date.now()}.csv"`,
    );
    res.send(csv);
  } catch (error) {
    console.error("Ошибка экспорта:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});
// ===== ПОИСК ПО СООБЩЕНИЯМ =====
router.get("/api/trips/:tripId/messages/search", async (req, res) => {
  try {
    const { tripId } = req.params;
    const { q } = req.query;
    const userId = req.session.userId;

    if (!q || q.trim().length < 1) {
      return res.json({ success: true, messages: [] });
    }

    const check = await pool.query(
      `SELECT 1 FROM trip_participants WHERE trip_id = $1 AND user_id = $2`,
      [tripId, userId],
    );
    if (check.rows.length === 0) {
      return res.status(403).json({ success: false, error: "Доступ запрещён" });
    }

    const result = await pool.query(
      `SELECT id, trip_id, user_id, text, image_url, created_at 
       FROM messages 
       WHERE trip_id = $1 
         AND text IS NOT NULL 
         AND text != ''
         AND text ILIKE $2
       ORDER BY created_at DESC
       LIMIT 50`,
      [tripId, `%${q}%`],
    );

    res.json({ success: true, messages: result.rows });
  } catch (error) {
    console.error("❌ Ошибка поиска:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Страница тестирования авиабилетов
router.get("/store", (req, res) => {
  console.log("✈️ GET /store - страница поиска билетов");
  res.render("store", {
    title: "Поиск авиабилетов",
  });
});
router.get("/tickets", (req, res) => {
  console.log("✈️ GET /tickets - страница поиска билетов");
  res.render("tickets", {
    title: "Поиск авиабилетов",
  });
});

router.get("/api/flights/search", async (req, res) => {
  console.log("✈️ API: поиск авиабилетов", req.query);

  const { from, to, departure_date, return_date } = req.query;

  if (!from || !to || !departure_date) {
    return res.status(400).json({
      success: false,
      message: "Необходимо указать from, to, departure_date",
    });
  }

  const result = await ticketService.searchFlights(
    from,
    to,
    departure_date,
    return_date || null,
  );
  res.json(result);
});

// 2. Поиск ЖД билетов
router.get("/api/trains/search", async (req, res) => {
  console.log("🚂 API: поиск ЖД билетов (Tutu)", req.query);

  const { from, to, date } = req.query;

  if (!from || !to) {
    return res.status(400).json({
      success: false,
      message: "Необходимо указать from и to",
    });
  }

  const result = await tutuService.searchTrains(from, to, date);
  if (result.success && result.trains && result.trains.length > 0) {
    console.log(
      "🔍 Первый поезд в ответе сервера:",
      JSON.stringify(result.trains[0], null, 2),
    );
  }

  res.json(result);
});

// 3. Поиск автобусов
router.get("/api/buses/search", async (req, res) => {
  console.log("🚌 API: поиск автобусов (Яндекс)", req.query);

  const { from, to, date } = req.query;

  if (!from || !to) {
    return res.status(400).json({
      success: false,
      message: "Необходимо указать from и to",
    });
  }

  const result = await ticketService.searchBuses(from, to, date);
  res.json(result);
});

// Поиск отелей по названию/городу
router.get("/api/xotelo/search", async (req, res) => {
  console.log("🔍 API: поиск отелей Xotelo", req.query);

  const { query } = req.query;

  if (!query) {
    return res.status(400).json({
      success: false,
      message: "Необходимо указать query (название отеля или города)",
    });
  }

  const result = await xoteloService.searchHotels(query);
  res.json(result);
});

// Получение отелей по локации
router.get("/api/xotelo/list", async (req, res) => {
  console.log("🏨 API: список отелей по локации", req.query);

  const {
    locationKey,
    limit = 30,
    offset = 0,
    sort = "best_value",
  } = req.query;

  if (!locationKey) {
    return res.status(400).json({
      success: false,
      message: "Необходимо указать locationKey",
    });
  }

  const result = await xoteloService.getHotelsByLocation(
    locationKey,
    parseInt(limit),
    parseInt(offset),
    sort,
  );
  res.json(result);
});

// Получение цен на отель
router.get("/api/xotelo/rates", async (req, res) => {
  console.log("💰 API: цены на отель", req.query);

  const {
    hotelKey,
    checkIn,
    checkOut,
    currency = "RUB",
    rooms = 1,
    adults = 2,
    childrenAges = "",
  } = req.query;

  if (!hotelKey || !checkIn || !checkOut) {
    return res.status(400).json({
      success: false,
      message: "Необходимо указать hotelKey, checkIn, checkOut",
    });
  }

  const result = await xoteloService.getHotelRates(
    hotelKey,
    checkIn,
    checkOut,
    currency,
    parseInt(rooms),
    parseInt(adults),
    childrenAges,
  );
  res.json(result);
});

// Полный поиск (отель + цены за один запрос)
router.get("/api/xotelo/searchWithRates", async (req, res) => {
  console.log("🔍💰 API: полный поиск отеля с ценами", req.query);

  const { query, checkIn, checkOut, adults = 2 } = req.query;

  if (!query || !checkIn || !checkOut) {
    return res.status(400).json({
      success: false,
      message: "Необходимо указать query, checkIn, checkOut",
    });
  }

  const result = await xoteloService.searchHotelWithRates(
    query,
    checkIn,
    checkOut,
    parseInt(adults),
  );
  res.json(result);
});

module.exports = router;
