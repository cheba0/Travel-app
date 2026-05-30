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
    SELECT m.id, m.trip_id, m.user_id, m.text, m.image_url, m.created_at, m.status,
           u.username as user_name
    FROM messages m
    LEFT JOIN users u ON m.user_id = u.id
    WHERE m.trip_id = $1
    ORDER BY m.created_at ASC
    LIMIT $2
  `;
    const result = await pool.query(query, [tripId, limit]);
    return result.rows;
  }
}

module.exports = MessageModel;
