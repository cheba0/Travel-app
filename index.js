const express = require("express");
const path = require("path");
const session = require("express-session");
const pgSession = require("connect-pg-simple")(session);
const db = require("./db");
require("dotenv").config();

const app = express();

// ========== НАСТРОЙКА APP ДО MIDDLEWARE ==========
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

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
  })
);

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

// app.get("/", async (req, res) => {
//   try {
//     const usersResult = await db.query("SELECT * FROM users LIMIT 5");
//     const tripsResult = await db.query("SELECT * FROM trips LIMIT 5");

//     res.render("index", {
//       users: usersResult.rows,
//       trips: tripsResult.rows,
//     });
//   } catch (error) {
//     console.error("Database error:", error);
//     res.render("index", {
//       users: [],
//       trips: [],
//       error: "Ошибка загрузки данных",
//     });
//   }
// });

// В самый конец index.js, перед app.listen

const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Server started: http://localhost:${PORT}`); //87.242.100.137 //localhost
});
