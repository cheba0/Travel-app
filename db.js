const { Pool } = require("pg");

// Настройка подключения к PostgreSQL
const pool = new Pool({
  user: "postgres",
  // host: "localhost",
  // host: "26.96.80.103",
  host: "85.208.86.134",
  // database: "postgres",
  database: "db",
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
