const express = require("express");
const path = require("path");
const session = require("express-session");
const pgSession = require("connect-pg-simple")(session);
const db = require("./db");
require("dotenv").config();

const app = express();

app.use(express.static(path.join(__dirname, "public")));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.set("view engine", "ejs");

const sessionStore = new pgSession({
  pool: db.pool, // Используем пул соединений из db.js
  tableName: "user_sessions", // Таблица для хранения сессий
  createTableIfMissing: true, // Автоматическое создание таблицы
});

// Конфигурация сессий
app.use(
  session({
    store: sessionStore,
    secret: "secret",
    resave: false,
    saveUninitialized: false,
    cookie: {
      maxAge: 24 * 60 * 60 * 1000, // 24 часа - ДОБАВЬТЕ ЭТО!
      httpOnly: true,
      secure: false, // false для localhost
    },
    name: "travel.sid", // ЯВНОЕ ИМЯ КУКИ
  })
);

const checkSession = (req, res, next) => {
  console.log("📋 Проверка сессии:", {
    sessionID: req.sessionID,
    user: req.session.userId,
    expires: req.session.cookie.expires,
  });

  if (req.session && req.session.userId) {
    // ИЗМЕНИТЕ НА userId!
    req.isAuthenticated = true;
    req.userId = req.session.userId; // Сохраняем userId

    // ДОПОЛНИТЕЛЬНО: Загружаем пользователя из БД
    db.query("SELECT id, username, email FROM users WHERE id = $1", [
      req.session.userId,
    ])
      .then((result) => {
        if (result.rows.length > 0) {
          req.user = result.rows[0]; // Теперь есть req.user
          res.locals.user = req.user;
          res.locals.isAuthenticated = true;
        }
        next();
      })
      .catch((err) => {
        console.error("Ошибка загрузки пользователя:", err);
        req.isAuthenticated = false;
        res.locals.isAuthenticated = false;
        next();
      });
  } else {
    req.isAuthenticated = false;
    req.user = null;
  }

  // Добавляем в локальные переменные для EJS
  res.locals.isAuthenticated = req.isAuthenticated;
  res.locals.user = req.user;

  next();
};

// Middleware для логирования запросов
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} ${req.method} ${req.url}`);
  next();
});

// Настройка статических файлов
app.use(express.static(path.join(__dirname, "public")));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Настройка шаблонизатора
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

// Подключаем middleware проверки сессии ко всем маршрутам
app.use(checkSession);

try {
  const authRoutes = require("./routes/authRoutes");
  app.use("/", authRoutes);
  console.log("AuthRoutes подключен");
} catch (error) {
  console.error(" Ошибка подключения authRoutes:", error.message);
}

app.get("/", async (req, res) => {
  try {
    const usersResult = await db.query("SELECT * FROM users LIMIT 5");
    const tripsResult = await db.query("SELECT * FROM trips LIMIT 5");

    res.render("index", {
      users: usersResult.rows,
      trips: tripsResult.rows,
    });
  } catch (error) {
    console.error("Database error:", error);
    res.render("index", {
      users: [],
      trips: [],
      error: "Ошибка загрузки данных",
    });
  }
});

// В самый конец index.js, перед app.listen

const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Server started: http://127.0.0.1:${PORT}`);
});
