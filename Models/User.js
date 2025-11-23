const pool = require("../db");
const bcrypt = require("bcrypt");
console.log("✅ User model загружен");
class User {
  // Создание пользователя
  static async create(userData) {
    const { username, email, password } = userData;

    try {
      console.log("🔍 Проверяем подключение к БД...");
      const test = await pool.query("SELECT NOW()");
      console.log("Подключение к БД работает:", test.rows[0]);
      // Проверяем существование пользователя
      const existingUser = await pool.query(
        "SELECT id FROM users WHERE email = $1 OR username = $2",
        [email, username]
      );

      if (existingUser.rows.length > 0) {
        throw new Error("Пользователь с таким email или именем уже существует");
      }

      // Хешируем пароль
      const passwordHash = await bcrypt.hash(password, 10);

      // Сохраняем пользователя
      const result = await pool.query(
        `INSERT INTO users (username, email, password_hash) 
       VALUES ($1, $2, $3) 
       RETURNING id, username, email`,
        [username, email, passwordHash]
      );

      return result.rows[0];
    } catch (error) {
      console.error("Ошибка при создании пользователя:", error);
      throw error;
    }
  }

  // Поиск пользователя по email
  static async findByEmail(email) {
    try {
      const result = await pool.query("SELECT * FROM users WHERE email = $1", [
        email,
      ]);
      return result.rows[0];
    } catch (error) {
      console.error("Ошибка при поиске пользователя:", error);
      throw error;
    }
  }

  // Поиск пользователя по ID
  static async findById(id) {
    try {
      const result = await pool.query(
        `SELECT id, username, email, created_at 
         FROM users WHERE id = $1`,
        [id]
      );
      return result.rows[0];
    } catch (error) {
      console.error("Ошибка при поиске пользователя:", error);
      throw error;
    }
  }

  // Проверка пароля
  static async verifyPassword(password, hash) {
    return await bcrypt.compare(password, hash);
  }
}

module.exports = User;
