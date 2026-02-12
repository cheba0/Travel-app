// controllers/qrControllerSimple.js
const db = require("../db");

class qrController {
  constructor() {
    console.log("✅ QR Controller SIMPLE загружен");
  }

  // Страница сканера
  showScannerPage(req, res) {
    console.log("📱 Страница сканера для travel:", req.params.travelId);
    res.render("scan", {
      travelId: req.params.travelId,
      title: "Сканирование чека",
    });
  }

  // Обработка QR - ИСПРАВЛЕННАЯ ВЕРСИЯ
  async processReceiptQR(req, res) {
    console.log("\n=== QR ЗАПРОС ПОЛУЧЕН ===");
    console.log("📦 req.body:", req.body);

    try {
      // 1. Получаем данные
      const { qrRawData, travelId } = req.body;
      const userId = req.session?.userId || 1;

      console.log(
        "1. qrRawData:",
        qrRawData ? qrRawData.substring(0, 100) + "..." : "ОТСУТСТВУЕТ",
      );
      console.log("2. travelId:", travelId);
      console.log("3. userId:", userId);

      // 2. Проверка
      if (!qrRawData || qrRawData.trim() === "") {
        return res.status(400).json({
          success: false,
          message: "Нет данных QR-кода",
        });
      }

      // 3. Извлекаем сумму
      let amount = 0;

      // Ищем s=123.45 (формат ФНС)
      const match =
        qrRawData.match(/s=([0-9.]+)/) || qrRawData.match(/s=([0-9,]+)/);

      if (match) {
        amount = parseFloat(match[1].replace(",", "."));
      }

      // Если не нашли - ищем любое число с копейками
      if (!amount || amount <= 0) {
        const anyNumber = qrRawData.match(/([0-9]+[.,][0-9]+)/);
        if (anyNumber) {
          amount = parseFloat(anyNumber[0].replace(",", "."));
        }
      }

      // Если всё равно нет - ставим 100
      if (!amount || amount <= 0) {
        amount = 100;
      }

      console.log("💰 Сумма:", amount);

      // 4. Сохраняем в БД - ИСПРАВЛЕНО! trip_id вместо travel_id
      const today = new Date().toISOString().split("T")[0];

      const query = `
        INSERT INTO expenses 
        (expense_name, trip_id, paid_by, amount, description, raw_qr_data, date)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING id, amount, description, date
      `;

      const values = [
        `Чек ${amount} руб.`,
        parseInt(travelId), // trip_id = travelId
        parseInt(userId), // paid_by = userId
        amount,
        `Сканированный чек`,
        qrRawData.substring(0, 500),
        today,
      ];

      console.log("📝 SQL:", query);
      console.log("📝 Values:", values);

      const result = await db.query(query, values);
      const expense = result.rows[0];

      console.log("✅ Сохранено:", expense);

      // 5. Успешный ответ
      return res.json({
        success: true,
        message: "Чек успешно добавлен!",
        expense: {
          id: expense.id,
          amount: expense.amount,
          description: expense.description,
          date: expense.date,
        },
      });
    } catch (error) {
      console.error("❌ Ошибка:", error);
      return res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  }

  // Проверка таблицы (опционально)
  async ensureTableExists() {
    try {
      await db.query(`
        CREATE TABLE IF NOT EXISTS expenses (
          id SERIAL PRIMARY KEY,
          expense_name VARCHAR(255) NOT NULL DEFAULT 'Чек',
          trip_id INTEGER NOT NULL,
          paid_by INTEGER NOT NULL,
          category_id INTEGER,
          amount DECIMAL(10,2) NOT NULL,
          description VARCHAR(255),
          date DATE NOT NULL DEFAULT CURRENT_DATE,
          raw_qr_data TEXT,
          shop_identifier VARCHAR(100),
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          is_settled BOOLEAN DEFAULT FALSE
        )
      `);
      console.log("✅ Таблица expenses проверена");
    } catch (error) {
      console.error("❌ Ошибка создания таблицы:", error.message);
    }
  }
}

// ✅ Экспортируем экземпляр
module.exports = new qrController();
