const pool = require("../db");
console.log("Travel model загружен");

class Travel {
  // Создание путешествия
  static async create(travelData) {
    const { trip_name, location, start_date, end_date, description, user_id } =
      travelData;

    try {
      console.log("Создание путешествия для пользователя:", user_id);

      // Сохраняем путешествие
      const result = await pool.query(
        `INSERT INTO trips (trip_name, location, start_date, end_date, description, user_id) 
         VALUES ($1, $2, $3, $4, $5, $6) 
         RETURNING id, trip_name, location, start_date, end_date, description, user_id, created_at`,
        [trip_name, location, start_date, end_date, description, user_id],
      );

      const trip_id = result.rows[0].id;

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

  // Получение всех путешествий пользователя
  static async findByUserId(userId) {
    try {
      const result = await pool.query(
        `SELECT id, trip_name, location, start_date, end_date, description, created_at
         FROM trips 
         WHERE user_id = $1 
         ORDER BY created_at DESC`,
        [userId],
      );
      return result.rows;
    } catch (error) {
      console.error("Ошибка при поиске путешествий пользователя:", error);
      throw error;
    }
  }

  // Получение путешествия по ID
  static async findById(id, userId = null) {
    try {
      let query = `SELECT id, trip_name, location, start_date, end_date, description, user_id, created_at 
                   FROM trips WHERE id = $1`;
      let params = [id];

      // Если передан userId, проверяем принадлежность
      if (userId) {
        query += ` AND user_id = $2`;
        params.push(userId);
      }

      const result = await pool.query(query, params);
      return result.rows[0];
    } catch (error) {
      console.error("Ошибка при поиске путешествия:", error);
      throw error;
    }
  }

  // Обновление путешествия
  static async updateTravel(id, userId, travelData) {
    const { trip_name, location, start_date, end_date, description } =
      travelData;

    try {
      const result = await pool.query(
        `UPDATE trips 
         SET trip_name = $1, location = $2, start_date = $3, end_date = $4, description = $5, updated_at = NOW()
         WHERE id = $6 AND user_id = $7
         RETURNING id, trip_name, location, start_date, end_date, description, updated_at`,
        [trip_name, location, start_date, end_date, description, id, userId],
      );

      return result.rows[0];
    } catch (error) {
      console.error("Ошибка при обновлении путешествия:", error);
      throw error;
    }
  }

  // Удаление путешествия
  static async deleteTravel(id, userId) {
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
}

module.exports = Travel;
