const { Pool } = require("pg");

// Настройка подключения к PostgreSQL
const pool = new Pool({
  user: "postgres",

  // db
  // localhost
  // 26.96.80.103
  // 26.99.190.11
  host: "db",

  // postgres
  // travel_app
  database: "postgres",

  password: "postgres",
  port: 5432,
});

pool.on("connect", () => {
  console.log("Connected to PostgreSQL database");
});

pool.on("error", (err) => {
  console.error("Database connection error:", err);
});

module.exports = {
  query: (text, params) => pool.query(text, params),
  pool,
};
