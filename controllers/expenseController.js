// controllers/expenseController.js
const Expense = require("../Models/Expense_Model");
const Travel = require("../Models/Travel_model");
const { pool } = require("../db");
class ExpenseController {
  // Создание расхода с индивидуальными суммами
  static async create(req, res) {
    try {
      const {
        trip_id,
        expense_name,
        amount,
        date,
        description,
        category,
        paid_by,
      } = req.body;
      const userId = req.session.userId;

      console.log("📝 Создание расхода:", {
        trip_id,
        expense_name,
        amount,
        category,
        paid_by: paid_by || userId, // Используем переданного плательщика или текущего пользователя
      });

      // Проверка участия в поездке
      const check = await pool.query(
        `SELECT 1 FROM trip_participants WHERE trip_id = $1 AND user_id = $2`,
        [trip_id, userId],
      );

      if (check.rows.length === 0) {
        return res
          .status(403)
          .json({ success: false, error: "Вы не участник этой поездки" });
      }

      // Вставляем расход (paid_by = кто оплатил)
      const result = await pool.query(
        `INSERT INTO expenses (trip_id, expense_name, amount, date, description, paid_by, category) 
       VALUES ($1, $2, $3, $4, $5, $6, $7) 
       RETURNING *`,
        [
          trip_id,
          expense_name,
          amount,
          date,
          description,
          paid_by || userId,
          category || null,
        ],
      );

      const expense = result.rows[0];

      // Получаем участников (по умолчанию все участники поездки)
      const participantsResult = await pool.query(
        `SELECT u.id, u.username 
       FROM trip_participants tp 
       JOIN users u ON tp.user_id = u.id 
       WHERE tp.trip_id = $1`,
        [trip_id],
      );

      const participants = participantsResult.rows;
      const shareAmount = amount / participants.length;

      // Создаём записи о долях
      for (const participant of participants) {
        await pool.query(
          `INSERT INTO expense_shares (expense_id, user_id, amount_owed) 
         VALUES ($1, $2, $3)`,
          [expense.id, participant.id, shareAmount],
        );
      }

      console.log("✅ Расход создан:", expense);

      res.json({
        success: true,
        message: "Расход добавлен",
        expense: {
          ...expense,
          participants: participants.map((p) => ({
            id: p.id,
            username: p.username,
            amount_owed: shareAmount,
          })),
        },
      });
    } catch (error) {
      console.error("❌ Ошибка создания расхода:", error);
      res.status(500).json({ success: false, error: error.message });
    }
  }

  // Получение расхода для редактирования
  static async getExpenseForEdit(req, res) {
    try {
      const { id } = req.params;
      const userId = req.session.userId;

      if (!userId) {
        return res.status(401).json({
          success: false,
          error: "Необходима авторизация",
        });
      }

      const expense = await Expense.findById(id);

      if (!expense) {
        return res.status(404).json({
          success: false,
          error: "Расход не найден",
        });
      }

      const formattedExpense = {
        id: expense.id,
        expense_name: expense.expense_name,
        trip_id: expense.trip_id,
        paid_by: expense.paid_by,
        paid_by_name: expense.paid_by_name,
        amount: parseFloat(expense.amount),
        description: expense.description || "",
        date: expense.date,
        participants: expense.participants
          ? expense.participants.map((p) => ({
              id: p.id,
              username: p.username,
              amount_owed: parseFloat(p.amount_owed || 0),
              is_paid: p.is_paid || false,
            }))
          : [],
      };

      return res.json({
        success: true,
        expense: formattedExpense,
      });
    } catch (error) {
      console.error("Get expense for edit error:", error);
      return res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  }

  // Обновление расхода - БЕЗ ПРОВЕРОК
  static async update(req, res) {
    try {
      const { id } = req.params;
      const {
        expense_name,
        amount,
        date,
        description,
        category,
        participants,
      } = req.body;
      const userId = req.session.userId;

      console.log("✏️ Обновление расхода:", {
        id,
        expense_name,
        amount,
        category,
        participants_count: participants?.length,
      });

      // Проверяем, что расход существует
      const check = await pool.query(
        `SELECT e.* FROM expenses e
       JOIN trip_participants tp ON e.trip_id = tp.trip_id
       WHERE e.id = $1 AND tp.user_id = $2`,
        [id, userId],
      );

      if (check.rows.length === 0) {
        return res
          .status(404)
          .json({ success: false, error: "Расход не найден" });
      }

      // 🔹 ИСПРАВЛЕНО: category может быть null или пустой строкой
      await pool.query(
        `UPDATE expenses 
       SET expense_name = $1, 
           amount = $2, 
           date = $3, 
           description = $4, 
           category = NULLIF($5, '')  -- 🔹 Пустую строку превращаем в NULL
       WHERE id = $6`,
        [expense_name, amount, date, description, category || null, id],
      );

      // Если есть участники — обновляем их доли
      if (participants && participants.length > 0) {
        // Удаляем старые доли
        await pool.query(`DELETE FROM expense_shares WHERE expense_id = $1`, [
          id,
        ]);

        // Добавляем новые
        for (const p of participants) {
          await pool.query(
            `INSERT INTO expense_shares (expense_id, user_id, amount_owed) 
           VALUES ($1, $2, $3)`,
            [id, p.id, p.amount_owed || 0],
          );
        }
      }

      // Получаем обновленный расход с участниками
      const updatedExpense = await pool.query(
        `SELECT 
          e.*, 
          u.username as payer_name,
          (
            SELECT json_agg(json_build_object(
              'id', u2.id,
              'username', u2.username,
              'amount_owed', es.amount_owed
            ))
            FROM expense_shares es
            JOIN users u2 ON es.user_id = u2.id
            WHERE es.expense_id = e.id
          ) as participants
       FROM expenses e
       JOIN users u ON e.paid_by = u.id
       WHERE e.id = $1`,
        [id],
      );

      res.json({
        success: true,
        message: "Расход обновлён",
        expense: updatedExpense.rows[0],
      });
    } catch (error) {
      console.error("❌ Ошибка обновления расхода:", error);
      res.status(500).json({ success: false, error: error.message });
    }
  }

  // Удаление расхода - БЕЗ ПРОВЕРКИ
  static async delete(req, res) {
    try {
      const { id } = req.params;

      const deletedExpense = await Expense.deleteExpense(id);

      if (!deletedExpense) {
        return res.status(404).json({
          success: false,
          error: "Расход не найден",
        });
      }

      return res.json({
        success: true,
        message: "Расход успешно удален",
      });
    } catch (error) {
      console.error("Delete expense error:", error);
      return res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  }

  // Добавление участника - БЕЗ ПРОВЕРКИ
  static async addParticipant(req, res) {
    try {
      const { expenseId } = req.params;
      const { userId: participantId, amount } = req.body;

      if (!amount && amount !== 0) {
        return res.status(400).json({
          success: false,
          error: "Необходимо указать сумму для участника",
        });
      }

      const participant = await Expense.addParticipant(
        expenseId,
        participantId,
        parseFloat(amount || 0),
      );

      return res.json({
        success: true,
        message: "Участник успешно добавлен",
        participant,
      });
    } catch (error) {
      console.error("Add participant error:", error);
      return res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  }

  // Обновление суммы участника - БЕЗ ПРОВЕРКИ
  static async updateParticipantShare(req, res) {
    try {
      const { expenseId, userId: participantId } = req.params;
      // 🔧 ИСПРАВЛЕНО: используем amount_owed как на фронтенде
      const { amount_owed } = req.body;

      // 🔧 УЛУЧШЕННАЯ валидация
      if (amount_owed === undefined || amount_owed === null) {
        return res.status(400).json({
          success: false,
          error: "Необходимо указать сумму доли (amount_owed)",
          field: "amount_owed",
        });
      }

      const amount = parseFloat(amount_owed);

      if (isNaN(amount)) {
        return res.status(400).json({
          success: false,
          error: "Сумма должна быть числом",
          field: "amount_owed",
        });
      }

      if (amount < 0) {
        return res.status(400).json({
          success: false,
          error: "Сумма не может быть отрицательной",
          field: "amount_owed",
        });
      }

      // 🔧 Валидация параметров маршрута
      const expenseIdNum = parseInt(expenseId);
      const participantIdNum = parseInt(participantId);

      if (isNaN(expenseIdNum) || isNaN(participantIdNum)) {
        return res.status(400).json({
          success: false,
          error: "Некорректный ID расхода или участника",
        });
      }

      // 🔧 Вызов модели с валидированными данными
      const updatedShare = await Expense_Model.updateParticipantShare(
        expenseIdNum,
        participantIdNum,
        amount,
      );

      // 🔧 Если модель не нашла запись — возвращаем 404
      if (!updatedShare) {
        return res.status(404).json({
          success: false,
          error: "Участник не найден в этом расходе",
        });
      }

      return res.json({
        success: true,
        message: "Сумма участника обновлена",
        data: {
          participant_id: participantIdNum,
          amount_owed: amount,
          updated_at: new Date().toISOString(),
        },
      });
    } catch (error) {
      console.error("Update participant share error:", error);

      // 🔧 Различаем ошибки БД и сервера
      if (error.code === "23503") {
        // PostgreSQL foreign key violation
        return res.status(400).json({
          success: false,
          error: "Невозможно обновить: расход или участник не существует",
        });
      }

      return res.status(500).json({
        success: false,
        error:
          process.env.NODE_ENV === "development"
            ? error.message
            : "Внутренняя ошибка сервера",
      });
    }
  }

  // Удаление участника - БЕЗ ПРОВЕРКИ
  static async removeParticipant(req, res) {
    try {
      const { expenseId, userId: participantId } = req.params;

      const participant = await Expense.removeParticipant(
        expenseId,
        participantId,
      );

      return res.json({
        success: true,
        message: "Участник успешно удален",
      });
    } catch (error) {
      console.error("Remove participant error:", error);
      return res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  }

  // Обновление статуса оплаты
  static async updatePaymentStatus(req, res) {
    try {
      const { expenseId, userId } = req.params;
      const { is_paid } = req.body;

      const updatedShare = await Expense.updateSharePaymentStatus(
        expenseId,
        userId,
        is_paid === true || is_paid === "true",
      );

      return res.json({
        success: true,
        message: "Статус оплаты обновлен",
        share: updatedShare,
      });
    } catch (error) {
      console.error("Update payment status error:", error);
      return res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  }

  // Получение расхода по ID
  static async getById(req, res) {
    try {
      const { id } = req.params;

      const expense = await Expense.findById(id);

      if (!expense) {
        return res.status(404).json({
          success: false,
          error: "Расход не найден",
        });
      }

      return res.json({
        success: true,
        expense,
      });
    } catch (error) {
      console.error("Get expense error:", error);
      return res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  }

  // Получение всех расходов путешествия
  static async getByTripId(req, res) {
    try {
      const { tripId } = req.params;

      const expenses = await Expense.findByTripId(tripId);

      return res.json({
        success: true,
        expenses,
      });
    } catch (error) {
      console.error("Get trip expenses error:", error);
      return res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  }

  // Получение участников расхода
  static async getExpenseParticipants(req, res) {
    try {
      const { expenseId } = req.params;

      const participants = await Expense.getParticipants(expenseId);

      return res.json({
        success: true,
        participants,
      });
    } catch (error) {
      console.error("Get expense participants error:", error);
      return res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  }

  // Получение балансов
  static async getBalances(req, res) {
    try {
      const { tripId } = req.params;

      const balances = await Expense.getBalances(tripId);

      return res.json({
        success: true,
        balances,
      });
    } catch (error) {
      console.error("Get balances error:", error);
      return res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  }

  // Получение детализации долгов
  static async getDebtDetails(req, res) {
    try {
      const { tripId } = req.params;

      const debtDetails = await Expense.getDebtDetails(tripId);

      return res.json({
        success: true,
        debtDetails,
      });
    } catch (error) {
      console.error("Get debt details error:", error);
      return res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  }

  // Получение детализации долгов с информацией о расходах
  static async getDebtDetailsWithExpenseInfo(req, res) {
    try {
      const { trip_id } = req.params;

      const debts = await Expense.getDebtDetailsWithExpenseInfo(trip_id);

      return res.json({
        success: true,
        debts,
      });
    } catch (error) {
      console.error("Error getting debt details:", error);
      return res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  }

  // Получение упрощенных транзакций
  static async getSimplifiedTransactions(req, res) {
    try {
      const { trip_id } = req.params;

      const transactions = await Expense.getSimplifiedTransactions(trip_id);

      return res.json({
        success: true,
        transactions,
      });
    } catch (error) {
      console.error("Error getting simplified transactions:", error);
      return res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  }

  // Получение баланса путешествия
  static async getTripBalance(req, res) {
    try {
      const { trip_id } = req.params;

      const balances = await Expense.getBalances(trip_id);
      const transactions = await Expense.getSimplifiedTransactions(trip_id);
      const debtDetails = await Expense.getDebtDetailsWithExpenseInfo(trip_id);

      return res.json({
        success: true,
        data: {
          participants: balances,
          simplified_transactions: transactions,
          all_debts: debtDetails,
          summary: {
            total_expenses: balances.reduce(
              (sum, p) => sum + parseFloat(p.total_spent || 0),
              0,
            ),
            total_debts: debtDetails.reduce(
              (sum, d) => sum + parseFloat(d.amount_owed || 0),
              0,
            ),
          },
        },
      });
    } catch (error) {
      console.error("Get trip balance error:", error);
      return res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  }

  // Получение расходов пользователя
  static async getUserExpenses(req, res) {
    try {
      const { tripId } = req.params;
      const userId = req.session.userId;

      const expenses = await Expense.getExpensesByParticipant(userId, tripId);
      const userTotal = await Expense.getUserTotalInTrip(userId, tripId);

      return res.json({
        success: true,
        expenses,
        total: userTotal,
      });
    } catch (error) {
      console.error("Get user expenses error:", error);
      return res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  }

  // Получение сводки по категориям
  static async getSummary(req, res) {
    try {
      const { tripId } = req.params;

      const summary = await Expense.getExpensesSummaryByCategory(tripId);

      return res.json({
        success: true,
        summary,
      });
    } catch (error) {
      console.error("Get summary error:", error);
      return res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  }

  // Получение общей суммы расходов
  static async getTotal(req, res) {
    try {
      const { tripId } = req.params;

      const total = await Expense.getTotalExpenses(tripId);

      return res.json({
        success: true,
        total,
      });
    } catch (error) {
      console.error("Get total error:", error);
      return res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  }

  // Отображение страницы расходов
  static async showPage(req, res) {
    try {
      const { tripId } = req.params;
      const userId = req.session.userId;

      if (!userId) {
        return res.redirect("/login");
      }

      const expenses = await Expense.findByTripId(tripId);
      const summary = await Expense.getExpensesSummaryByCategory(tripId);
      const total = await Expense.getTotalExpenses(tripId);
      const balances = await Expense.getBalances(tripId);

      res.render("expenses", {
        title: "Расходы",
        expenses,
        summary,
        total,
        balances,
        user: req.session.user,
      });
    } catch (error) {
      console.error("Show expenses page error:", error);
      res.redirect("/travels");
    }
  }

  // Отображение формы расхода
  static async showForm(req, res) {
    try {
      const { tripId, id } = req.params;
      const userId = req.session.userId;

      if (!userId) {
        return res.redirect("/login");
      }

      let expense = null;
      if (id) {
        expense = await Expense.findById(id);
      }

      res.render("expense-form", {
        title: expense ? "Редактировать расход" : "Добавить расход",
        expense,
        user: req.session.user,
      });
    } catch (error) {
      console.error("Show expense form error:", error);
      res.redirect("/travels");
    }
  }
}

module.exports = ExpenseController;
