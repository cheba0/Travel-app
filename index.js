const express = require("express");
const path = require("path");
const session = require("express-session");
const pgSession = require("connect-pg-simple")(session);
const db = require("./db");
require("dotenv").config();
const http = require("http");
const { Server } = require("socket.io");
const { pool } = require("./db");
const { decrypt } = require("./config/encryption");

const app = express();
app.use(express.static(path.join(__dirname, "public")));
// ========== НАСТРОЙКА APP ДО MIDDLEWARE ==========
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

app.use(express.json()); // ← ДЛЯ application/json
app.use(express.urlencoded({ extended: true }));
// ========== MIDDLEWARE (ТОЛЬКО ОДИН РАЗ!) ==========
app.use(express.static(path.join(__dirname, "public")));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Middleware для логирования запросов
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} ${req.method} ${req.url}`);
  next();
});

// ========== СЕССИИ ==========
const sessionStore = new pgSession({
  pool: db.pool,
  tableName: "user_sessions",
  createTableIfMissing: true,
});

app.use(
  session({
    store: sessionStore,
    secret: "secret",
    resave: false,
    saveUninitialized: false,
    cookie: {
      maxAge: 24 * 60 * 60 * 1000,
      httpOnly: true,
      secure: false,
    },
    name: "travel.sid",
    rolling: false,
  }),
);
app.use((req, res, next) => {
  // Разрешаем камеру
  res.setHeader("Permissions-Policy", "camera=*");
  res.setHeader("Feature-Policy", "camera *");
  next();
});
// ========== ПРОВЕРКА СЕССИИ (ИСПРАВЛЕННАЯ) ==========
const checkSession = (req, res, next) => {
  console.log("📋 Проверка сессии:", {
    sessionID: req.sessionID,
    userId: req.session.userId,
  });

  // Инициализируем переменные
  req.isAuthenticated = false;
  req.user = null;
  res.locals.isAuthenticated = false;
  res.locals.user = null;

  if (req.session && req.session.userId) {
    req.isAuthenticated = true;
    req.userId = req.session.userId;

    // Загружаем пользователя из БД ТОЛЬКО если нужно
    if (req.url.startsWith("/api/")) {
      // Для API-маршрутов не загружаем пользователя сразу
      next();
    } else {
      // Для страниц EJS загружаем пользователя
      db.query("SELECT id, username, email FROM users WHERE id = $1", [
        req.session.userId,
      ])
        .then((result) => {
          if (result.rows.length > 0) {
            req.user = result.rows[0];
            res.locals.user = req.user;
            res.locals.isAuthenticated = true;
          }
          next();
        })
        .catch((err) => {
          console.error("Ошибка загрузки пользователя:", err);
          next();
        });
      return; // Важно: не вызываем next() здесь
    }
  } else {
    next();
  }
};

app.use(checkSession);

try {
  const authRoutes = require("./routes/authRoutes");
  app.use("/", authRoutes);
  console.log("AuthRoutes подключен");
} catch (error) {
  console.error(" Ошибка подключения authRoutes:", error.message);
}

// const PORT = 3000;
// app.listen(PORT, () => {
//   console.log(`Server started: http://localhost:${PORT}`); //85.208.86.134 //localhost
// });
// ===== НАСТРОЙКА SOCKET.IO =====
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: process.env.FRONTEND_URL || "http://localhost:3000",
    methods: ["GET", "POST"],
  },
});

// Хранилище подключённых пользователей (в памяти, для продакшена лучше Redis)
const onlineUsers = new Map(); // Map<userId, socketId>

// ===== ЛОГИКА ЧАТА SOCKET.IO =====
io.on("connection", (socket) => {
  console.log(`🔌 Подключён клиент: ${socket.id}`);

  // 1. Аутентификация пользователя
  socket.on("authenticate", (userId) => {
    if (!userId) return socket.disconnect();
    onlineUsers.set(userId, socket.id);
    socket.emit("authenticated", { success: true });
    console.log(`✅ Пользователь ${userId} аутентифицирован`);
  });

  // 2. Вход в комнату чата поездки
  socket.on("join_trip_chat", async ({ tripId, userId }) => {
    const roomName = `trip_${tripId}`;

    // Проверяем, что пользователь действительно участник (базовая проверка)
    try {
      const check = await pool.query(
        `SELECT 1 FROM trip_participants WHERE trip_id = $1 AND user_id = $2`,
        [tripId, userId],
      );
      if (check.rows.length === 0) {
        return socket.emit("error", {
          message: "Вы не участник этого путешествия",
        });
      }
    } catch (e) {
      console.error("Ошибка проверки участника:", e);
    }

    socket.join(roomName);
    console.log(`👥 Пользователь ${userId} вошёл в комнату ${roomName}`);
    socket.emit("chat_joined", { tripId, roomName });
  });

  // 3. Отправка сообщения
  socket.on("send_message", async ({ tripId, userId, text, imageUrl }) => {
    try {
      const { encrypt } = require("./config/encryption");
      const encryptedText = text ? encrypt(text) : null;

      // Сохраняем в БД
      const result = await pool.query(
        `INSERT INTO messages (trip_id, user_id, text, image_url, is_encrypted) 
         VALUES ($1, $2, $3, $4, TRUE) RETURNING *`,
        [tripId, userId, encryptedText, imageUrl || null],
      );

      const msg = result.rows[0];

      // Рассылаем всем в комнате (текст уже зашифрован)
      io.to(`trip_${tripId}`).emit("new_message", {
        id: msg.id,
        tripId: msg.trip_id,
        userId: msg.user_id,
        text: msg.is_encrypted ? decrypt(msg.text) : msg.text, // ← расшифрованный!
        imageUrl: msg.image_url,
        created_at: msg.created_at,
      });

      console.log(
        `💬 Сообщение #${msg.id} сохранено и отправлено в trip_${tripId}`,
      );
    } catch (error) {
      console.error("❌ Ошибка отправки сообщения:", error);
      socket.emit("error", { message: "Не удалось отправить сообщение" });
    }
  });

  // 4. Отключение
  socket.on("disconnect", () => {
    for (let [uid, sid] of onlineUsers) {
      if (sid === socket.id) {
        onlineUsers.delete(uid);
        break;
      }
    }
  });
  // 🔹 Обработка редактирования сообщения
  socket.on("message_edited", async ({ tripId, messageId, newText }) => {
    // Рассылаем всем в комнате (кроме отправителя)
    socket.to(`trip_${tripId}`).emit("message_edited", {
      messageId,
      newText,
    });
  });

  // 🔹 Обработка удаления сообщения
  socket.on("message_deleted", async ({ tripId, messageId }) => {
    // Рассылаем всем в комнате (кроме отправителя)
    socket.to(`trip_${tripId}`).emit("message_deleted", {
      messageId,
    });
  });
  // Хранилище статусов "печатает" по комнатам
  const typingStatus = new Map(); // Map<tripId, Map<userId, {username, lastUpdate}>>

  // 🔹 Пользователь начал печатать
  socket.on("typing_start", async ({ tripId, userId }) => {
    if (!tripId || !userId) return;

    // Получаем имя пользователя
    try {
      const userResult = await pool.query(
        "SELECT username FROM users WHERE id = $1",
        [userId],
      );
      const username = userResult.rows[0]?.username || "Пользователь";

      // Сохраняем статус
      if (!typingStatus.has(tripId)) {
        typingStatus.set(tripId, new Map());
      }
      typingStatus
        .get(tripId)
        .set(userId, { username, lastUpdate: Date.now() });

      // Рассылаем всем в комнате (кроме отправителя)
      socket.to(`trip_${tripId}`).emit("typing_update", {
        tripId,
        userId,
        username,
        isTyping: true,
      });
    } catch (e) {
      console.error("Ошибка получения имени пользователя:", e);
    }
  });

  // 🔹 Пользователь перестал печатать
  socket.on("typing_stop", ({ tripId, userId }) => {
    if (!tripId || !userId) return;

    // Удаляем статус
    if (typingStatus.has(tripId)) {
      typingStatus.get(tripId).delete(userId);
    }

    // Рассылаем всем в комнате
    socket.to(`trip_${tripId}`).emit("typing_update", {
      tripId,
      userId,
      isTyping: false,
    });
  });

  // 🔹 Очистка при отключении
  socket.on("disconnect", () => {
    // Удаляем все статусы этого пользователя
    for (let [tripId, users] of typingStatus) {
      if (users.has(socket.userId)) {
        users.delete(socket.userId);
        io.to(`trip_${tripId}`).emit("typing_update", {
          tripId,
          userId: socket.userId,
          isTyping: false,
        });
      }
    }
  });

  socket.on("disconnect", () => {
    // Удаляем все статусы этого пользователя
    for (let [tripId, users] of typingStatus) {
      if (users.has(socket.userId)) {
        users.delete(socket.userId);
        io.to(`trip_${tripId}`).emit("typing_update", {
          tripId,
          userId: socket.userId,
          isTyping: false,
        });
      }
    }
  });
});

const PORT = process.env.PORT || 3000;

server.listen(PORT, () => {
  console.log(`🚀 Сервер запущен на порту ${PORT}`);
  console.log(`🔌 Socket.io готов к подключениям`);
});
