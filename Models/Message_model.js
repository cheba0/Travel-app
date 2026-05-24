// Models/Message_model.js
const { pool } = require("../db");

class MessageModel {
  // Сохранить сообщение (зашифрованное)
  static async create({ tripId, userId, text, imageUrl, isEncrypted }) {
    const query = `
      INSERT INTO messages (trip_id, user_id, text, image_url, is_encrypted)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `;
    const values = [tripId, userId, text, imageUrl, isEncrypted];
    const result = await pool.query(query, values);
    return result.rows[0];
  }

  // Получить историю сообщений (всё ещё зашифрованные!)
  static async findByTripId(tripId, limit = 50) {
    const query = `
      SELECT * FROM messages
      WHERE trip_id = $1
      ORDER BY created_at ASC
      LIMIT $2
    `;
    const result = await pool.query(query, [tripId, limit]);
    return result.rows;
  }
}

module.exports = MessageModel;
