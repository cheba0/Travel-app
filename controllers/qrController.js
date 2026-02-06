// controllers/qrControllerSimple.js
const db = require("../db");

class qrController {
  constructor() {
    console.log("✅ SimpleQRController загружен");
  }

  // Показать страницу сканера
  showScannerPage(req, res) {
    console.log("📱 showScannerPage вызван");
    res.render("scan", {
      travelId: req.params.travelId,
      title: "Сканирование чека",
    });
  }

  // Обработать QR-код (упрощенная версия)
  async processReceiptQR(req, res) {
    console.log("\n=== НАЧАЛО ОБРАБОТКИ ЧЕКА ===");

    try {
      // Детальное логирование
      console.log("📦 Headers:", JSON.stringify(req.headers, null, 2));
      console.log("📦 Body:", JSON.stringify(req.body, null, 2));
      console.log("📦 Session:", req.session);
      console.log("📦 Raw body:", req.body);

      // Проверка body
      if (!req.body) {
        throw new Error("req.body is null or undefined");
      }

      const { qrRawData, travelId } = req.body;
      const userId = req.session.userId || 1; // Для теста

      console.log("✅ Данные получены:", { qrRawData, travelId, userId });

      // Проверяем обязательные поля
      if (!qrRawData) {
        console.error("❌ Ошибка: qrRawData отсутствует");
        return res.status(400).json({
          success: false,
          message: "Отсутствуют данные QR-кода",
          debug: { body: req.body },
        });
      }

      // ПРОСТОЙ ПАРСИНГ
      const amount = this.extractAmount(qrRawData);
      console.log("✅ Извлеченная сумма:", amount);

      if (amount <= 0) {
        return res.status(400).json({
          success: false,
          message: `Не удалось извлечь сумму из QR-кода: ${qrRawData.substring(0, 50)}...`,
          debug: { qrRawData },
        });
      }

      // Сохраняем в БД
      const expense = await this.saveExpense({
        travelId: parseInt(travelId) || 1,
        userId: userId,
        amount: amount,
        description: `Чек покупки (${amount} руб.)`,
        qrData: qrRawData,
      });

      console.log("✅ Чек сохранен:", expense);

      // УСПЕШНЫЙ ОТВЕТ - ДОЛЖЕН СОДЕРЖАТЬ expense с amount!
      res.json({
        success: true,
        message: "Чек успешно добавлен из чека!",
        expense: {
          id: newExpense.id, // ОБЯЗАТЕЛЬНО
          amount: newExpense.amount, // ОБЯЗАТЕЛЬНО - именно это поле ищет клиент
          description: newExpense.description || "Чек покупки",
          date: newExpense.date || new Date(),
          category: newExpense.category || "Покупки",
        },
        debug: {
          // опционально
          rawData: qrRawData?.substring(0, 100),
          timestamp: new Date().toISOString(),
        },
      });
    } catch (error) {
      console.error("Ошибка:", error);
      res.status(500).json({
        success: false, // Важно: success: false при ошибке
        message: "Ошибка обработки чека",
        error:
          process.env.NODE_ENV === "development" ? error.message : undefined,
      });
    }
  }

  // Извлечение суммы из QR-строки
  extractAmount(qrString) {
    console.log("🔍 Извлечение суммы из:", qrString.substring(0, 100));

    // Пробуем найти сумму по ключу 's='
    if (qrString.includes("s=")) {
      const match = qrString.match(/s=([\d.,]+)/);
      if (match && match[1]) {
        const amount = parseFloat(match[1].replace(",", "."));
        if (!isNaN(amount) && amount > 0) {
          return amount;
        }
      }
    }

    // Ищем любое число с копейками
    const amountMatch = qrString.match(/(\d+[.,]\d{2})/);
    if (amountMatch) {
      const amount = parseFloat(amountMatch[0].replace(",", "."));
      if (!isNaN(amount) && amount > 0) {
        return amount;
      }
    }

    // Ищем просто число
    const simpleMatch = qrString.match(/(\d+)/);
    if (simpleMatch) {
      const amount = parseFloat(simpleMatch[0]);
      if (!isNaN(amount) && amount > 0) {
        return amount;
      }
    }

    return 0;
  }

  // Сохранение в БД
  async saveExpense(data) {
    try {
      // Сначала проверяем/создаем таблицу
      await this.ensureTableExists();

      // Простой запрос
      const query = `
        INSERT INTO expenses 
        (travel_id, user_id, amount, description, raw_qr_data)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING id, amount, description, created_at
      `;

      const values = [
        data.travelId,
        data.userId,
        data.amount,
        data.description,
        data.qrData,
      ];

      const result = await db.query(query, values);
      return result.rows[0];
    } catch (dbError) {
      console.error("Ошибка БД:", dbError);
      throw dbError;
    }
  }

  // Создание таблицы если нет
  async ensureTableExists() {
    try {
      await db.query(`
        CREATE TABLE IF NOT EXISTS expenses (
          id SERIAL PRIMARY KEY,
          travel_id INTEGER,
          user_id INTEGER,
          amount DECIMAL(10,2),
          description TEXT,
          raw_qr_data TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);
    } catch (error) {
      console.error("Ошибка создания таблицы:", error);
    }
  }
}

// Экспорт
const controller = new qrController();
module.exports = qrController;
module.exports = {
  showScannerPage: (req, res) => controller.showScannerPage(req, res),
  processReceiptQR: (req, res) => controller.processReceiptQR(req, res),
};
