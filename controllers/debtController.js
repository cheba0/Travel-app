const { pool } = require("../db");
const { getIO } = require("../socket");

class DebtController {
  /**
   * Расчёт текущих долгов в путешествии
   * Возвращает упрощённый список "кто кому должен"
   */
  static async getDebts(req, res) {
    try {
      const { tripId } = req.params;
      const userId = req.session.userId;

      if (!userId) {
        return res
          .status(401)
          .json({ success: false, error: "Требуется авторизация" });
      }

      // Проверка участия в поездке
      const check = await pool.query(
        `SELECT 1 FROM trip_participants WHERE trip_id = $1 AND user_id = $2`,
        [tripId, userId],
      );

      if (check.rows.length === 0) {
        return res
          .status(403)
          .json({ success: false, error: "Вы не участник этой поездки" });
      }

      // Получаем все расходы с информацией о плательщиках и долях
      const expensesResult = await pool.query(
        `SELECT 
          e.id,
          e.amount,
          e.paid_by,
          u.username as payer_name,
          es.user_id,
          es.amount_owed
        FROM expenses e
        JOIN users u ON e.paid_by = u.id
        JOIN expense_shares es ON e.id = es.expense_id
        WHERE e.trip_id = $1
        ORDER BY e.date DESC`,
        [tripId],
      );

      // Получаем всех участников
      const participantsResult = await pool.query(
        `SELECT u.id, u.username
        FROM trip_participants tp
        JOIN users u ON tp.user_id = u.id
        WHERE tp.trip_id = $1`,
        [tripId],
      );

      const participants = participantsResult.rows;
      const expenses = expensesResult.rows;

      // Шаг 1: Считаем net balance для каждого участника
      const balances = {};

      // Инициализируем всех участников с нулевым балансом
      participants.forEach((p) => {
        balances[p.id] = {
          userId: p.id,
          username: p.username,
          paid: 0, // Сколько заплатил
          owed: 0, // Сколько должен (его доли)
          balance: 0, // Итог: paid - owed
        };
      });

      // Считаем по каждому расходу
      expenses.forEach((exp) => {
        const paidBy = exp.paid_by;
        const amount = parseFloat(exp.amount);
        const owed = parseFloat(exp.amount_owed);

        // Плательщик заплатил эту сумму
        if (balances[paidBy]) {
          balances[paidBy].paid += amount;
        }

        // Участник должен свою долю
        if (balances[exp.user_id]) {
          balances[exp.user_id].owed += owed;
        }
      });

      // Считаем итоговый баланс
      Object.values(balances).forEach((b) => {
        b.balance = b.paid - b.owed;
      });

      console.log("📊 Балансы участников:", balances);

      // 🔹 ШАГ 2: Учитываем уже совершённые транзакции
      const settlementsResult = await pool.query(
        `SELECT from_user_id, to_user_id, amount
         FROM debt_settlements
         WHERE trip_id = $1`,
        [tripId],
      );

      console.log("💰 Найденные транзакции:", settlementsResult.rows.length);

      // Корректируем балансы с учётом транзакций
      settlementsResult.rows.forEach((tx) => {
        const amount = parseFloat(tx.amount);

        // Кто платил (должник) — его долг уменьшается (баланс растёт)
        if (balances[tx.from_user_id]) {
          balances[tx.from_user_id].balance += amount;
          console.log(
            `  ✅ ${tx.from_user_id} заплатил ${amount}₽ → баланс: ${balances[tx.from_user_id].balance}`,
          );
        }

        // Кто получал (кредитор) — его требование уменьшается (баланс падает)
        if (balances[tx.to_user_id]) {
          balances[tx.to_user_id].balance -= amount;
          console.log(
            `  ✅ ${tx.to_user_id} получил ${amount}₽ → баланс: ${balances[tx.to_user_id].balance}`,
          );
        }
      });

      console.log("📊 Балансы после учёта транзакций:", balances);

      // Шаг 3: Сводим долги (алгоритм минимума транзакций)
      const debtors = []; // Те, кто должен (balance < 0)
      const creditors = []; // Те, кому должны (balance > 0)

      Object.values(balances).forEach((b) => {
        if (b.balance < -0.01) {
          debtors.push({ ...b, remaining: Math.abs(b.balance) });
        } else if (b.balance > 0.01) {
          creditors.push({ ...b, remaining: b.balance });
        }
      });

      // Сортируем: самые большие долги/кредиты первые
      debtors.sort((a, b) => b.remaining - a.remaining);
      creditors.sort((a, b) => b.remaining - a.remaining);

      // Сводим долги
      const settlements = [];
      let i = 0,
        j = 0;

      while (i < debtors.length && j < creditors.length) {
        const debtor = debtors[i];
        const creditor = creditors[j];

        const amount = Math.min(debtor.remaining, creditor.remaining);

        settlements.push({
          fromUserId: debtor.userId,
          fromUsername: debtor.username,
          toUserId: creditor.userId,
          toUsername: creditor.username,
          amount: Math.round(amount * 100) / 100, // Округляем до копеек
        });

        debtor.remaining -= amount;
        creditor.remaining -= amount;

        if (debtor.remaining < 0.01) i++;
        if (creditor.remaining < 0.01) j++;
      }

      // Получаем историю транзакций
      const historyResult = await pool.query(
        `SELECT 
          ds.*,
          fu.username as from_username,
          tu.username as to_username
        FROM debt_settlements ds
        JOIN users fu ON ds.from_user_id = fu.id
        JOIN users tu ON ds.to_user_id = tu.id
        WHERE ds.trip_id = $1
        ORDER BY ds.created_at DESC`,
        [tripId],
      );

      // Общая сумма расходов
      const totalExpenses = participants.reduce(
        (sum, p) => sum + (balances[p.id]?.owed || 0),
        0,
      );

      res.json({
        success: true,
        tripId: parseInt(tripId),
        totalExpenses: Math.round(totalExpenses * 100) / 100,
        balances: Object.values(balances).map((b) => ({
          userId: b.userId,
          username: b.username,
          paid: Math.round(b.paid * 100) / 100,
          owed: Math.round(b.owed * 100) / 100,
          balance: Math.round(b.balance * 100) / 100,
        })),
        settlements: settlements,
        history: historyResult.rows,
        participantsCount: participants.length,
      });
    } catch (error) {
      console.error("❌ Ошибка расчёта долгов:", error);
      res.status(500).json({ success: false, error: error.message });
    }
  }

  /**
   * Получить историю транзакций
   */
  static async getDebtHistory(req, res) {
    try {
      const { tripId } = req.params;
      const userId = req.session.userId;

      if (!userId) {
        return res
          .status(401)
          .json({ success: false, error: "Требуется авторизация" });
      }

      const check = await pool.query(
        `SELECT 1 FROM trip_participants WHERE trip_id = $1 AND user_id = $2`,
        [tripId, userId],
      );

      if (check.rows.length === 0) {
        return res
          .status(403)
          .json({ success: false, error: "Вы не участник этой поездки" });
      }

      const result = await pool.query(
        `SELECT 
          ds.*,
          fu.username as from_username,
          tu.username as to_username
        FROM debt_settlements ds
        JOIN users fu ON ds.from_user_id = fu.id
        JOIN users tu ON ds.to_user_id = tu.id
        WHERE ds.trip_id = $1
        ORDER BY ds.created_at DESC`,
        [tripId],
      );

      res.json({
        success: true,
        history: result.rows,
      });
    } catch (error) {
      console.error("❌ Ошибка получения истории:", error);
      res.status(500).json({ success: false, error: error.message });
    }
  }

  /**
   * Отметить оплату долга
   * Поддерживает два режима:
   * - "Я заплатил" (fromUserId = текущий пользователь)
   * - "Мне заплатили" (fromUserId = другой участник, toUserId = текущий пользователь)
   */
  static async settleDebt(req, res) {
    try {
      const { tripId } = req.params;
      const { fromUserId, toUserId, amount, note } = req.body;
      const currentUserId = req.session.userId;

      console.log("📥 settleDebt запрос:", {
        tripId,
        fromUserId,
        toUserId,
        amount,
        note,
      });
      console.log("👤 Текущий пользователь:", currentUserId);

      if (!currentUserId) {
        return res
          .status(401)
          .json({ success: false, error: "Требуется авторизация" });
      }

      if (!amount || amount <= 0) {
        return res
          .status(400)
          .json({ success: false, error: "Неверная сумма" });
      }

      // 🔹 Определяем реальных участников транзакции
      // Если fromUserId не передан — значит режим "Я заплатил" (from = я)
      // Если fromUserId передан — значит режим "Мне заплатили" (from = другой, to = я)
      const actualFromUserId = fromUserId
        ? parseInt(fromUserId)
        : currentUserId;
      const actualToUserId = toUserId ? parseInt(toUserId) : currentUserId;

      console.log("🔹 Реальные участники:", {
        from: actualFromUserId,
        to: actualToUserId,
      });

      if (actualFromUserId === actualToUserId) {
        return res
          .status(400)
          .json({ success: false, error: "Нельзя заплатить самому себе" });
      }

      // Проверка участия плательщика в поездке
      const checkFrom = await pool.query(
        `SELECT 1 FROM trip_participants WHERE trip_id = $1 AND user_id = $2`,
        [tripId, actualFromUserId],
      );

      if (checkFrom.rows.length === 0) {
        return res.status(403).json({
          success: false,
          error: "Плательщик не участник этой поездки",
        });
      }

      // Проверка участия получателя в поездке
      const checkTo = await pool.query(
        `SELECT 1 FROM trip_participants WHERE trip_id = $1 AND user_id = $2`,
        [tripId, actualToUserId],
      );

      if (checkTo.rows.length === 0) {
        return res.status(400).json({
          success: false,
          error: "Получатель не участник этой поездки",
        });
      }

      // 🔹 Проверка прав: текущий пользователь должен быть либо плательщиком, либо получателем
      if (
        actualFromUserId !== currentUserId &&
        actualToUserId !== currentUserId
      ) {
        return res.status(403).json({
          success: false,
          error: "Вы не являетесь участником этой транзакции",
        });
      }

      // Записываем транзакцию
      const result = await pool.query(
        `INSERT INTO debt_settlements (trip_id, from_user_id, to_user_id, amount, note)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING *`,
        [tripId, actualFromUserId, actualToUserId, amount, note || null],
      );

      console.log(
        `✅ Записана транзакция: ${actualFromUserId} → ${actualToUserId}: ${amount}₽`,
      );

      // 🔹 ОТПРАВЛЯЕМ УВЕДОМЛЕНИЕ ЧЕРЕЗ SOCKET.IO
      try {
        const io = getIO();

        // Получаем имена пользователей
        const fromUser = await pool.query(
          "SELECT username FROM users WHERE id = $1",
          [actualFromUserId],
        );
        const toUser = await pool.query(
          "SELECT username FROM users WHERE id = $1",
          [actualToUserId],
        );

        const fromUsername = fromUser.rows[0]?.username || "Пользователь";
        const toUsername = toUser.rows[0]?.username || "Пользователь";

        const notification = {
          type: "debt_paid",
          tripId: parseInt(tripId),
          from: fromUsername,
          to: toUsername,
          amount: parseFloat(amount),
          message: `${fromUsername} заплатил ${toUsername} ${amount}₽`,
          timestamp: new Date().toISOString(),
        };

        // Отправляем всем участникам поездки
        io.to(`trip_${tripId}`).emit("notification", notification);
        console.log("📢 Уведомление отправлено:", notification.message);
      } catch (notifError) {
        console.error("⚠️ Ошибка отправки уведомления:", notifError);
        // Не прерываем выполнение — уведомление не критично
      }

      res.json({
        success: true,
        message: "Транзакция записана",
        settlement: result.rows[0],
      });
    } catch (error) {
      console.error("❌ Ошибка записи транзакции:", error);
      res.status(500).json({ success: false, error: error.message });
    }
  }
}

module.exports = DebtController;
