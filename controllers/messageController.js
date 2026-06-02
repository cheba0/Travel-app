// controllers/messageController.js
const MessageModel = require("../Models/Message_model");
const { pool } = require("../db");

class MessageController {
  static async getHistory(req, res) {
    try {
      const { tripId } = req.params;
      const userId = req.session.userId;

      console.log(`📜 Запрос истории чата: trip ${tripId}, user ${userId}`);

      // 1. Проверка прав
      const check = await pool.query(
        `SELECT 1 FROM trip_participants WHERE trip_id = $1 AND user_id = $2`,
        [tripId, userId],
      );

      if (check.rows.length === 0) {
        return res.status(403).json({
          success: false,
          error: "Доступ запрещён. Вы не участник этого путешествия.",
        });
      }

      // 2. Получение данных
      let messages = await MessageModel.findByTripId(tripId);

      // 3. Подготовка ответа (гарантируем обычный текст)
      const cleanMessages = messages.map((msg) => ({
        id: msg.id,
        tripId: msg.trip_id,
        userId: msg.user_id,
        text: msg.text || "", // Сервер хранит plain text
        imageUrl: msg.image_url,
        createdAt: msg.created_at,
        status: msg.status || "sent",
      }));

      return res.json({ success: true, messages: cleanMessages });
    } catch (error) {
      console.error("❌ Ошибка получения истории:", error);
      return res.status(500).json({ success: false, error: error.message });
    }
  }
}

module.exports = MessageController;
