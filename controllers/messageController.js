// controllers/messageController.js
const MessageModel = require("../Models/Message_model");
const { decrypt } = require("../config/encryption");
const { pool } = require("../db");

class MessageController {
  static async getHistory(req, res) {
    try {
      const { tripId } = req.params;
      const userId = req.session.userId; // Берем из сессии (кто сейчас на сайте)

      console.log(`📜 Запрос истории чата: trip ${tripId}, user ${userId}`);

      // 1. 🛡️ ПРОВЕРКА ПРАВ (Охранник)
      // Проверяем, состоит ли пользователь в этом путешествии
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

      // 2. 📦 ПОЛУЧЕНИЕ ДАННЫХ (Просим Кладовщика)
      // Данные придут ЗАШИФРОВАННЫЕ
      let messages = await MessageModel.findByTripId(tripId);

      // 3. 🔓 РАСШИФРОВКА (Переводчик)
      // Превращаем зашифрованные данные в читаемый текст
      const decryptedMessages = messages.map((msg) => ({
        id: msg.id,
        tripId: msg.trip_id,
        userId: msg.user_id,
        text: msg.is_encrypted ? decrypt(msg.text) : msg.text, // Расшифруем если нужно
        imageUrl: msg.image_url,
        createdAt: msg.created_at,
      }));

      // 4. ✅ ОТВЕТ
      return res.json({
        success: true,
        messages: decryptedMessages,
      });
    } catch (error) {
      console.error("❌ Ошибка получения истории:", error);
      return res.status(500).json({ success: false, error: error.message });
    }
  }
}

module.exports = MessageController;
