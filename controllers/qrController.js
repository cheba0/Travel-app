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

  // Обработать QR-код
  async processReceiptQR(req, res) {
    console.log("\n=== НАЧАЛО ОБРАБОТКИ ЧЕКА ===");

    try {
      const { qrRawData, travelId } = req.body;
      const userId = req.session.userId || 1;

      console.log("✅ Данные получены:", {
        qrRawData: qrRawData?.substring(0, 50) + "...",
        travelId,
        userId,
      });

      if (!qrRawData) {
        return res.status(400).json({
          success: false,
          message: "Отсутствуют данные QR-кода",
        });
      }

      // Извлекаем сумму И дату из QR-кода
      const { amount, date } = this.extractReceiptData(qrRawData);
      console.log("💰 Извлеченная сумма:", amount);
      console.log("📅 Извлеченная дата:", date);

      if (amount <= 0) {
        return res.status(400).json({
          success: false,
          message: "Не удалось извлечь сумму из QR-кода",
        });
      }

      console.log("💾 Сохраняем в БД...");
      const newExpense = await this.saveExpense({
        travelId: parseInt(travelId) || 1,
        userId: userId,
        amount: amount,
        description: `Чек покупки (${amount} руб.)`,
        qrData: qrRawData,
        date: date, // Передаем дату из чека
      });

      console.log("✅ Чек сохранен с датой:", newExpense.date);

      // УСПЕШНЫЙ ОТВЕТ
      res.json({
        success: true,
        message: "Чек успешно добавлен!",
        expense: {
          id: newExpense.id,
          amount: newExpense.amount,
          description: newExpense.description || newExpense.expense_name,
          date: newExpense.date, // Дата из чека
          created_at: newExpense.created_at,
          category: "Покупки",
        },
      });
    } catch (error) {
      console.error("🔥 ОШИБКА в processReceiptQR:", error.message);

      res.status(500).json({
        success: false,
        message: "Ошибка обработки чека: " + error.message,
      });
    }
  }

  // ИЗВЛЕЧЕНИЕ ДАННЫХ ИЗ ЧЕКА (сумма + дата)
  extractReceiptData(qrString) {
    console.log("🔍 Извлечение данных из чека:", qrString.substring(0, 100));

    let amount = 0;
    let date = null;

    // 1. ФИСКАЛЬНЫЕ QR-коды РФ (ФНС)
    if (qrString.includes("t=") && qrString.includes("s=")) {
      console.log("🧾 Фискальный QR-код (ФНС РФ)");

      // Извлекаем сумму (s=)
      const amountMatch = qrString.match(/s=([\d.,]+)/);
      if (amountMatch && amountMatch[1]) {
        amount = parseFloat(amountMatch[1].replace(",", "."));
        if (!isNaN(amount) && amount > 0) {
          console.log("✅ Сумма из чека:", amount, "руб.");
        }
      }

      // Извлекаем дату (t=)
      const dateMatch = qrString.match(/t=(\d{8})T?(\d{0,6})/);
      if (dateMatch && dateMatch[1]) {
        const dateStr = dateMatch[1]; // 20250206
        // Преобразуем 20250206 в 2025-02-06
        const year = dateStr.substring(0, 4);
        const month = dateStr.substring(4, 6);
        const day = dateStr.substring(6, 8);
        date = `${year}-${month}-${day}`;
        console.log("📅 Дата из чека:", date);
      }

      if (amount > 0 && date) {
        return { amount, date };
      }
    }

    // 2. ОНЛАЙН-ЧЕКИ (URL)
    try {
      const url = new URL(qrString);
      console.log("🔗 Онлайн-чек:", url.hostname);

      // Для checkout.ru и подобных
      if (url.hostname.includes("checkout.ru")) {
        console.log("🛒 Чек checkout.ru");

        // Пробуем извлечь сумму из параметров
        const params = url.searchParams;
        const amountParam =
          params.get("s") || params.get("sum") || params.get("amount");
        if (amountParam) {
          amount = parseFloat(amountParam.replace(",", "."));
          if (!isNaN(amount) && amount > 0) {
            console.log("✅ Сумма из параметров:", amount);
          }
        }

        // Пробуем извлечь дату
        const dateParam = params.get("t") || params.get("date");
        if (dateParam) {
          // Формат может быть разным, пробуем распарсить
          try {
            // Пробуем формат 20250206
            if (dateParam.match(/^\d{8}$/)) {
              const year = dateParam.substring(0, 4);
              const month = dateParam.substring(4, 6);
              const day = dateParam.substring(6, 8);
              date = `${year}-${month}-${day}`;
            }
            // Или уже готовый формат
            else if (dateParam.match(/^\d{4}-\d{2}-\d{2}$/)) {
              date = dateParam;
            }
            console.log("📅 Дата из параметров:", date);
          } catch (e) {
            console.log("❌ Не удалось распарсить дату");
          }
        }

        // Если не нашли дату, берем сегодняшнюю
        if (!date) {
          date = new Date().toISOString().split("T")[0];
          console.log("📅 Использую текущую дату:", date);
        }

        if (amount > 0) {
          return { amount, date };
        }
      }
    } catch (e) {
      // Не URL
    }

    // 3. ТЕКСТОВЫЕ QR-коды
    console.log("📄 Анализируем как текст...");

    // Ищем сумму
    const amountPattern = qrString.match(/(\d+[.,]\d{2})/);
    if (amountPattern) {
      amount = parseFloat(amountPattern[0].replace(",", "."));
      if (!isNaN(amount) && amount > 0) {
        console.log("✅ Сумма из текста:", amount);
      }
    }

    // Ищем дату в тексте
    const datePatterns = [
      /(\d{4})[-./](\d{2})[-./](\d{2})/, // 2025-02-06
      /(\d{2})[-./](\d{2})[-./](\d{4})/, // 06.02.2025
      /(\d{4})(\d{2})(\d{2})/, // 20250206
    ];

    for (const pattern of datePatterns) {
      const dateMatch = qrString.match(pattern);
      if (dateMatch) {
        let year, month, day;

        if (pattern.toString().includes("\\d{4}.\\d{2}.\\d{2}")) {
          // 2025-02-06
          year = dateMatch[1];
          month = dateMatch[2];
          day = dateMatch[3];
        } else if (pattern.toString().includes("\\d{2}.\\d{2}.\\d{4}")) {
          // 06.02.2025
          day = dateMatch[1];
          month = dateMatch[2];
          year = dateMatch[3];
        } else if (pattern.toString().includes("\\d{4}\\d{2}\\d{2}")) {
          // 20250206
          year = dateMatch[1].substring(0, 4);
          month = dateMatch[1].substring(4, 6);
          day = dateMatch[1].substring(6, 8);
        }

        if (year && month && day) {
          date = `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
          console.log("📅 Дата из текста:", date);
          break;
        }
      }
    }

    // Если дату не нашли, берем сегодняшнюю
    if (!date) {
      date = new Date().toISOString().split("T")[0];
      console.log("📅 Использую текущую дату:", date);
    }

    if (amount <= 0) {
      console.log("❌ Не удалось извлечь сумму");
      return { amount: 0, date };
    }

    return { amount, date };
  }

  // Сохранение в БД с датой из чека
  async saveExpense(data) {
    console.log("📝 saveExpense вызван с данными:", data);
    console.log("📅 Дата для сохранения:", data.date);

    try {
      // Проверяем/создаем таблицу
      await this.ensureTableExists();

      // SQL запрос с датой из чека
      const query = `
        INSERT INTO expenses 
        (expense_name, trip_id, paid_by, amount, description, raw_qr_data, date)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING id, expense_name, amount, description, date, created_at
      `;

      const values = [
        `Чек ${data.amount} руб.`,
        data.travelId,
        data.userId,
        data.amount,
        data.description,
        data.qrData.substring(0, 500),
        data.date || new Date().toISOString().split("T")[0], // Дата из чека
      ];

      console.log("💾 Сохраняем с датой из чека:", data.date);

      const result = await db.query(query, values);
      console.log("✅ Данные сохранены. Дата в БД:", result.rows[0].date);

      return result.rows[0];
    } catch (dbError) {
      console.error("❌ ОШИБКА БАЗЫ ДАННЫХ:");
      console.error("Сообщение:", dbError.message);
      console.error("Детали:", dbError.detail);
      throw dbError;
    }
  }

  // Создание таблицы если нет
  async ensureTableExists() {
    try {
      await db.query(`
        CREATE TABLE IF NOT EXISTS expenses (
          id SERIAL PRIMARY KEY,
          expense_name VARCHAR(255) DEFAULT 'Чек покупки' NOT NULL,
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

// Экспорт
const controller = new qrController();
module.exports = {
  showScannerPage: (req, res) => controller.showScannerPage(req, res),
  processReceiptQR: (req, res) => controller.processReceiptQR(req, res),
};
