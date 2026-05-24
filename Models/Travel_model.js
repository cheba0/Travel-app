const pool = require("../db");
console.log("Travel model загружен");

class Travel {
  // Создание путешествия
  static async create(travelData) {
    // 🔧 1. Добавили photo в деструктуризацию
    const {
      trip_name,
      location,
      start_date,
      end_date,
      description,
      photo,
      user_id,
    } = travelData;

    try {
      console.log("Создание путешествия для пользователя:", user_id);

      // 🔧 2. Исправили плейсхолдеры: добавили $7, теперь их ровно 7
      const result = await pool.query(
        `INSERT INTO trips (trip_name, location, start_date, end_date, description, photo, user_id) 
       VALUES ($1, $2, $3, $4, $5, $6, $7) 
       RETURNING id, trip_name, location, start_date, end_date, description, photo, user_id, created_at`,
        [
          trip_name,
          location,
          start_date,
          end_date,
          description,
          photo,
          user_id,
        ],
      );

      const trip_id = result.rows[0].id;

      // Добавляем создателя в участники
      await pool.query(
        `INSERT INTO trip_participants (trip_id, user_id) 
       VALUES ($1, $2)`,
        [trip_id, user_id],
      );

      return result.rows[0];
    } catch (error) {
      console.error("Ошибка при создании путешествия:", error);
      throw error;
    }
  }

  // Получение ВСЕХ путешествий пользователя (созданные + где участник)
  static async findByUserId(userId) {
    try {
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
      return result.rows;
    } catch (error) {
      console.error("Ошибка при поиске путешествий пользователя:", error);
      throw error;
    }
  }
  // Удаление участника из путешествия
  static async removeParticipant(tripId, userId) {
    try {
      const result = await pool.query(
        `DELETE FROM trip_participants 
       WHERE trip_id = $1 AND user_id = $2 
       RETURNING *`,
        [tripId, userId],
      );
      return result.rows[0];
    } catch (error) {
      console.error("Ошибка при удалении участника:", error);
      throw error;
    }
  }
  // Получение путешествия по ID с проверкой доступа
  static async findById(id, userId = null) {
    try {
      let query = `SELECT t.*, u.username as creator_name
                   FROM trips t
                   LEFT JOIN users u ON t.user_id = u.id
                   WHERE t.id = $1`;
      let params = [id];

      // Если передан userId, проверяем доступ (создатель или участник)
      if (userId) {
        query += ` AND (t.user_id = $2 OR EXISTS (
          SELECT 1 FROM trip_participants tp 
          WHERE tp.trip_id = t.id AND tp.user_id = $2
        ))`;
        params.push(userId);
      }

      const result = await pool.query(query, params);
      return result.rows[0];
    } catch (error) {
      console.error("Ошибка при поиске путешествия:", error);
      throw error;
    }
  }

  // Получение участников путешествия
  static async getParticipants(tripId) {
    try {
      const result = await pool.query(
        `SELECT u.id, u.username, u.email, tp.joined_at
         FROM trip_participants tp
         JOIN users u ON tp.user_id = u.id
         WHERE tp.trip_id = $1`,
        [tripId],
      );
      return result.rows;
    } catch (error) {
      console.error("Ошибка при получении участников:", error);
      throw error;
    }
  }

  // Обновление путешествия
  static async update(id, userId, travelData) {
    const { trip_name, location, start_date, end_date, description } =
      travelData;

    try {
      const result = await pool.query(
        `UPDATE trips 
       SET trip_name = $1, location = $2, start_date = $3, end_date = $4, 
           description = $5, updated_at = NOW()
       WHERE id = $6 AND user_id = $7
       RETURNING id, trip_name, location, start_date, end_date, 
                description, user_id, updated_at`,
        [trip_name, location, start_date, end_date, description, id, userId],
      );

      return result.rows[0];
    } catch (error) {
      console.error("Ошибка при обновлении путешествия:", error);
      throw error;
    }
  }

  // ДОБАВЬТЕ этот метод если его нет - получение путешествия для редактирования
  static async findForEdit(id, userId) {
    try {
      const result = await pool.query(
        `SELECT t.*, u.username as creator_name
       FROM trips t
       LEFT JOIN users u ON t.user_id = u.id
       WHERE t.id = $1 AND t.user_id = $2`,
        [id, userId],
      );

      if (result.rows.length === 0) {
        return null;
      }

      return result.rows[0];
    } catch (error) {
      console.error(
        "Ошибка при получении путешествия для редактирования:",
        error,
      );
      throw error;
    }
  }

  // Удаление путешествия
  static async delete(id, userId) {
    try {
      const result = await pool.query(
        `DELETE FROM trips WHERE id = $1 AND user_id = $2 RETURNING id`,
        [id, userId],
      );
      return result.rows[0];
    } catch (error) {
      console.error("Ошибка при удалении путешествия:", error);
      throw error;
    }
  }

  // Проверка доступа к путешествию
  static async hasAccess(tripId, userId) {
    try {
      const result = await pool.query(
        `SELECT 1 
         FROM trips t
         LEFT JOIN trip_participants tp ON t.id = tp.trip_id
         WHERE t.id = $1 AND (t.user_id = $2 OR tp.user_id = $2)`,
        [tripId, userId],
      );
      return result.rows.length > 0;
    } catch (error) {
      console.error("Ошибка при проверке доступа:", error);
      throw error;
    }
  }
}

module.exports = Travel;
