// clear-sessions.js
const { Pool } = require("pg");
require("dotenv").config();

const pool = new Pool({
  user: process.env.DB_USER || "postgres",
  host: process.env.DB_HOST || "localhost",
  database: process.env.DB_NAME || "travel_app",
  password: process.env.DB_PASSWORD || "password",
  port: process.env.DB_PORT || 5432,
});

async function clearAllSessions() {
  try {
    console.log("🧹 Очистка всех сессий...");
    const result = await pool.query("DELETE FROM user_sessions");
    console.log(`✅ Удалено ${result.rowCount} сессий`);
  } catch (error) {
    console.error("❌ Ошибка:", error.message);
  } finally {
    await pool.end();
  }
}

async function clearExpiredSessions() {
  try {
    console.log("🧹 Очистка устаревших сессий...");
    const result = await pool.query(
      "DELETE FROM user_sessions WHERE expire < NOW()"
    );
    console.log(`✅ Удалено ${result.rowCount} устаревших сессий`);
  } catch (error) {
    console.error("❌ Ошибка:", error.message);
  } finally {
    await pool.end();
  }
}

async function listSessions() {
  try {
    console.log("📋 Список активных сессий:");
    const result = await pool.query(`
      SELECT 
        sid, 
        sess->>'userId' as user_id,
        expire,
        AGE(expire, NOW()) as time_left
      FROM user_sessions 
      WHERE expire > NOW()
      ORDER BY expire DESC
    `);

    console.log(`📊 Найдено ${result.rows.length} активных сессий:`);
    result.rows.forEach((row, i) => {
      console.log(
        `${i + 1}. SID: ${row.sid.substring(0, 15)}... | User: ${
          row.user_id || "guest"
        } | Истекает: ${row.expire} | Осталось: ${row.time_left}`
      );
    });
  } catch (error) {
    console.error("❌ Ошибка:", error.message);
  } finally {
    await pool.end();
  }
}

// Выбор действия через аргументы командной строки
const action = process.argv[2];

switch (action) {
  case "clear-all":
    clearAllSessions();
    break;
  case "clear-expired":
    clearExpiredSessions();
    break;
  case "list":
    listSessions();
    break;
  default:
    console.log("Использование:");
    console.log("  node clear-sessions.js clear-all     - очистить все сессии");
    console.log(
      "  node clear-sessions.js clear-expired - очистить устаревшие сессии"
    );
    console.log(
      "  node clear-sessions.js list          - показать активные сессии"
    );
    process.exit(1);
}
