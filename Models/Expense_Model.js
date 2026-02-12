const pool = require("../db");
console.log("Expense model загружен");

class Expense {
  // СОЗДАНИЕ РАСХОДА С ИНДИВИДУАЛЬНЫМИ СУММАМИ (основной метод)
  static async create(expenseData) {
    if (!expenseData) {
      throw new Error("Данные для создания не переданы");
    }

    const {
      expense_name,
      trip_id,
      paid_by,
      category_id,
      amount,
      description,
      date,
      shares = [], // [{user_id, amount}] - ИНДИВИДУАЛЬНЫЕ СУММЫ
    } = expenseData;

    try {
      console.log("Создание расхода с индивидуальными суммами:", {
        expense_name,
        trip_id,
        paid_by,
        amount,
        shares,
      });

      // 1. Создаем сам расход
      const expenseResult = await pool.query(
        `INSERT INTO expenses (expense_name, trip_id, paid_by, category_id, amount, description, date) 
         VALUES ($1, $2, $3, $4, $5, $6, $7) 
         RETURNING id, expense_name, trip_id, paid_by, category_id, amount, description, date, is_settled, created_at`,
        [
          expense_name,
          trip_id,
          paid_by,
          category_id || null,
          parseFloat(amount),
          description || null,
          date || new Date().toISOString().split("T")[0],
        ],
      );

      const expense = expenseResult.rows[0];

      // 2. Добавляем участников с ИНДИВИДУАЛЬНЫМИ суммами
      if (shares && shares.length > 0) {
        for (const share of shares) {
          await pool.query(
            `INSERT INTO expense_shares (expense_id, user_id, amount_owed, is_paid) 
             VALUES ($1, $2, $3, $4)`,
            [
              expense.id,
              share.user_id,
              parseFloat(share.amount || 0),
              parseInt(share.user_id) === parseInt(paid_by), // is_paid = true только для плательщика
            ],
          );
        }
      }

      // 3. Получаем полную информацию
      return await this.findById(expense.id);
    } catch (error) {
      console.error("Ошибка при создании расхода:", error);
      throw error;
    }
  }

  // ОБНОВЛЕНИЕ РАСХОДА С ИНДИВИДУАЛЬНЫМИ СУММАМИ (основной метод)
  static async updateExpense(id, expenseData) {
    if (!expenseData) {
      throw new Error("Данные для обновления не переданы");
    }

    const {
      expense_name,
      amount,
      description,
      date,
      shares = [], // [{user_id, amount}] - ИНДИВИДУАЛЬНЫЕ СУММЫ
    } = expenseData;

    try {
      console.log("Обновление расхода с индивидуальными суммами:", {
        id,
        expense_name,
        amount,
        shares,
      });

      // 1. Обновляем основную информацию о расходе
      await pool.query(
        `UPDATE expenses 
         SET expense_name = $1, amount = $2, description = $3, date = $4
         WHERE id = $5`,
        [expense_name, parseFloat(amount), description || null, date, id],
      );

      // 2. Удаляем ВСЕ старые доли
      await pool.query(`DELETE FROM expense_shares WHERE expense_id = $1`, [
        id,
      ]);

      // 3. Добавляем НОВЫЕ доли с ИНДИВИДУАЛЬНЫМИ суммами
      if (shares && shares.length > 0) {
        for (const share of shares) {
          await pool.query(
            `INSERT INTO expense_shares (expense_id, user_id, amount_owed, is_paid) 
             VALUES ($1, $2, $3, $4)`,
            [id, share.user_id, parseFloat(share.amount || 0), false],
          );
        }
      }

      // 4. Получаем обновленный расход
      return await this.findById(id);
    } catch (error) {
      console.error("Ошибка при обновлении расхода:", error);
      throw error;
    }
  }

  // АЛИАС для обратной совместимости
  static async createWithCustomShares(expenseData) {
    return this.create(expenseData);
  }

  // АЛИАС для обратной совместимости
  static async updateExpenseWithShares(id, expenseData) {
    return this.updateExpense(id, expenseData);
  }

  // ПОЛУЧЕНИЕ РАСХОДА ПО ID
  static async findById(id) {
    try {
      const query = `
        SELECT 
          e.id, 
          e.expense_name, 
          e.trip_id, 
          e.paid_by, 
          e.category_id, 
          e.amount, 
          e.description, 
          e.date, 
          e.is_settled, 
          e.created_at,
          u.username as paid_by_name,
          ec.name as category_name,
          COALESCE(
            (
              SELECT json_agg(json_build_object(
                'id', u2.id,
                'username', u2.username,
                'amount_owed', es.amount_owed,
                'is_paid', es.is_paid
              ) ORDER BY u2.username)
              FROM expense_shares es
              JOIN users u2 ON es.user_id = u2.id
              WHERE es.expense_id = e.id
            ),
            '[]'::json
          ) as participants
        FROM expenses e
        LEFT JOIN users u ON e.paid_by = u.id
        LEFT JOIN expense_categories ec ON e.category_id = ec.id
        WHERE e.id = $1
      `;

      const result = await pool.query(query, [id]);

      if (result.rows.length === 0) {
        return null;
      }

      const expense = result.rows[0];
      expense.participants = expense.participants || [];

      return expense;
    } catch (error) {
      console.error("Ошибка при поиске расхода:", error);
      throw error;
    }
  }

  // ПОЛУЧЕНИЕ ВСЕХ РАСХОДОВ ПУТЕШЕСТВИЯ
  static async findByTripId(tripId) {
    try {
      const result = await pool.query(
        `SELECT 
          e.id, 
          e.expense_name, 
          e.trip_id, 
          e.paid_by, 
          e.category_id, 
          e.amount, 
          e.description, 
          e.date, 
          e.is_settled, 
          e.created_at,
          u.username as paid_by_name,
          ec.name as category_name,
          COALESCE(
            (
              SELECT json_agg(json_build_object(
                'id', u2.id,
                'username', u2.username,
                'amount_owed', es.amount_owed,
                'is_paid', es.is_paid
              ))
              FROM expense_shares es
              JOIN users u2 ON es.user_id = u2.id
              WHERE es.expense_id = e.id
            ),
            '[]'::json
          ) as participants
         FROM expenses e
         LEFT JOIN users u ON e.paid_by = u.id
         LEFT JOIN expense_categories ec ON e.category_id = ec.id
         WHERE e.trip_id = $1 
         ORDER BY e.date DESC, e.created_at DESC`,
        [tripId],
      );

      return result.rows.map((row) => ({
        ...row,
        participants: row.participants || [],
      }));
    } catch (error) {
      console.error("Ошибка при поиске расходов путешествия:", error);
      throw error;
    }
  }

  // ДОБАВЛЕНИЕ УЧАСТНИКА С ИНДИВИДУАЛЬНОЙ СУММОЙ
  static async addParticipant(expenseId, userId, amount = 0) {
    try {
      // Проверяем, не является ли пользователь уже участником
      const existingParticipant = await pool.query(
        `SELECT * FROM expense_shares WHERE expense_id = $1 AND user_id = $2`,
        [expenseId, userId],
      );

      if (existingParticipant.rows.length > 0) {
        throw new Error("Пользователь уже является участником расхода");
      }

      // Добавляем нового участника с указанной суммой
      await pool.query(
        `INSERT INTO expense_shares (expense_id, user_id, amount_owed, is_paid) 
         VALUES ($1, $2, $3, $4)`,
        [expenseId, userId, parseFloat(amount || 0), false],
      );

      return {
        expense_id: expenseId,
        user_id: userId,
        amount_owed: parseFloat(amount || 0),
        is_paid: false,
      };
    } catch (error) {
      console.error("Ошибка при добавлении участника:", error);
      throw error;
    }
  }

  // УДАЛЕНИЕ УЧАСТНИКА
  static async removeParticipant(expenseId, userId) {
    try {
      const deleteResult = await pool.query(
        `DELETE FROM expense_shares 
         WHERE expense_id = $1 AND user_id = $2 
         RETURNING *`,
        [expenseId, userId],
      );

      if (deleteResult.rows.length === 0) {
        throw new Error("Участник не найден в расходе");
      }

      return deleteResult.rows[0];
    } catch (error) {
      console.error("Ошибка при удалении участника:", error);
      throw error;
    }
  }

  // ИЗМЕНЕНИЕ СУММЫ УЧАСТНИКА
  static async updateParticipantShare(expenseId, userId, newAmount) {
    try {
      const updateResult = await pool.query(
        `UPDATE expense_shares 
         SET amount_owed = $1
         WHERE expense_id = $2 AND user_id = $3
         RETURNING *`,
        [parseFloat(newAmount || 0), expenseId, userId],
      );

      if (updateResult.rows.length === 0) {
        throw new Error("Участник не найден в расходе");
      }

      return updateResult.rows[0];
    } catch (error) {
      console.error("Ошибка при изменении доли участника:", error);
      throw error;
    }
  }

  // УДАЛЕНИЕ РАСХОДА
  static async deleteExpense(id) {
    try {
      const result = await pool.query(
        `DELETE FROM expenses WHERE id = $1 RETURNING id, trip_id`,
        [id],
      );

      return result.rows[0] || null;
    } catch (error) {
      console.error("Ошибка при удалении расхода:", error);
      throw error;
    }
  }

  // ПОЛУЧЕНИЕ УЧАСТНИКОВ РАСХОДА
  static async getParticipants(expenseId) {
    try {
      const result = await pool.query(
        `SELECT es.*, u.username, u.email
         FROM expense_shares es
         JOIN users u ON es.user_id = u.id
         WHERE es.expense_id = $1
         ORDER BY es.is_paid DESC, u.username`,
        [expenseId],
      );
      return result.rows;
    } catch (error) {
      console.error("Ошибка при получении участников расхода:", error);
      throw error;
    }
  }

  // ПОЛУЧЕНИЕ БАЛАНСОВ
  static async getBalances(tripId) {
    try {
      const result = await pool.query(
        `WITH user_payments AS (
          -- Сколько каждый заплатил
          SELECT 
            e.paid_by as user_id,
            SUM(e.amount) as total_paid
          FROM expenses e
          WHERE e.trip_id = $1
          GROUP BY e.paid_by
        ),
        user_debts AS (
          -- Сколько каждый должен
          SELECT 
            es.user_id,
            SUM(es.amount_owed) as total_owed
          FROM expense_shares es
          JOIN expenses e ON es.expense_id = e.id
          WHERE e.trip_id = $1
          GROUP BY es.user_id
        ),
        all_users AS (
          -- Все участники путешествия
          SELECT DISTINCT user_id FROM trip_participants WHERE travel_id = $1
          UNION
          SELECT paid_by FROM expenses WHERE trip_id = $1
          UNION
          SELECT user_id FROM expense_shares es 
          JOIN expenses e ON es.expense_id = e.id 
          WHERE e.trip_id = $1
        )
        SELECT 
          u.id,
          u.username,
          COALESCE(up.total_paid, 0) as total_paid,
          COALESCE(ud.total_owed, 0) as total_owed,
          COALESCE(up.total_paid, 0) - COALESCE(ud.total_owed, 0) as balance
        FROM all_users au
        JOIN users u ON au.user_id = u.id
        LEFT JOIN user_payments up ON u.id = up.user_id
        LEFT JOIN user_debts ud ON u.id = ud.user_id
        ORDER BY balance DESC`,
        [tripId],
      );

      return result.rows;
    } catch (error) {
      console.error("Ошибка при получении балансов:", error);
      throw error;
    }
  }

  // УПРОЩЕННЫЕ ТРАНЗАКЦИИ
  static async getSimplifiedTransactions(tripId) {
    try {
      const balances = await this.getBalances(tripId);

      const debtors = balances
        .filter((p) => p.balance < 0)
        .map((p) => ({
          ...p,
          balance: Math.abs(p.balance),
        }));

      const creditors = balances.filter((p) => p.balance > 0);

      const transactions = [];

      let i = 0,
        j = 0;
      while (i < debtors.length && j < creditors.length) {
        const debtor = debtors[i];
        const creditor = creditors[j];

        const amount = Math.min(debtor.balance, creditor.balance);

        if (amount > 0.01) {
          transactions.push({
            from_user_id: debtor.id,
            from_username: debtor.username,
            to_user_id: creditor.id,
            to_username: creditor.username,
            amount: parseFloat(amount.toFixed(2)),
          });

          debtor.balance -= amount;
          creditor.balance -= amount;
        }

        if (debtor.balance <= 0.01) i++;
        if (creditor.balance <= 0.01) j++;
      }

      return transactions;
    } catch (error) {
      console.error("Ошибка при расчете упрощенных транзакций:", error);
      throw error;
    }
  }

  // ДЕТАЛИЗАЦИЯ ДОЛГОВ
  static async getDebtDetailsWithExpenseInfo(tripId) {
    try {
      const result = await pool.query(
        `SELECT 
          e.id as expense_id,
          e.expense_name,
          e.date as expense_date,
          payer.id as payer_id,
          payer.username as payer_name,
          debtor.id as debtor_id,
          debtor.username as debtor_name,
          es.amount_owed,
          es.is_paid,
          e.amount as total_expense_amount
       FROM expenses e
       JOIN expense_shares es ON e.id = es.expense_id
       JOIN users payer ON e.paid_by = payer.id
       JOIN users debtor ON es.user_id = debtor.id
       WHERE e.trip_id = $1 
         AND es.user_id != e.paid_by
         AND es.amount_owed > 0
       ORDER BY e.date DESC, e.expense_name`,
        [tripId],
      );

      return result.rows;
    } catch (error) {
      console.error("Ошибка при получении детализации долгов:", error);
      throw error;
    }
  }

  // ДЕТАЛИЗАЦИЯ ДОЛГОВ (упрощенная)
  static async getDebtDetails(tripId) {
    try {
      const result = await pool.query(
        `SELECT 
          e.paid_by as payer_id,
          payer.username as payer_name,
          es.user_id as debtor_id,
          debtor.username as debtor_name,
          SUM(es.amount_owed) as total_debt,
          BOOL_AND(es.is_paid) as all_paid
        FROM expenses e
        JOIN users payer ON e.paid_by = payer.id
        JOIN expense_shares es ON e.id = es.expense_id
        JOIN users debtor ON es.user_id = debtor.id
        WHERE e.trip_id = $1 AND es.user_id != e.paid_by
        GROUP BY e.paid_by, payer.username, es.user_id, debtor.username
        HAVING SUM(es.amount_owed) > 0
        ORDER BY payer_name, debtor_name`,
        [tripId],
      );
      return result.rows;
    } catch (error) {
      console.error("Ошибка при получении детализации долгов:", error);
      throw error;
    }
  }

  // РАСХОДЫ УЧАСТНИКА
  static async getExpensesByParticipant(userId, tripId) {
    try {
      const result = await pool.query(
        `SELECT e.*, es.amount_owed, es.is_paid,
                u.username as paid_by_name,
                ec.name as category_name
         FROM expense_shares es
         JOIN expenses e ON es.expense_id = e.id
         LEFT JOIN users u ON e.paid_by = u.id
         LEFT JOIN expense_categories ec ON e.category_id = ec.id
         WHERE es.user_id = $1 AND e.trip_id = $2
         ORDER BY e.date DESC`,
        [userId, tripId],
      );
      return result.rows;
    } catch (error) {
      console.error("Ошибка при получении расходов участника:", error);
      throw error;
    }
  }

  // ОБНОВЛЕНИЕ СТАТУСА ОПЛАТЫ
  static async updateSharePaymentStatus(expenseId, userId, isPaid) {
    try {
      const result = await pool.query(
        `UPDATE expense_shares 
         SET is_paid = $1
         WHERE expense_id = $2 AND user_id = $3
         RETURNING *`,
        [isPaid, expenseId, userId],
      );

      return result.rows[0];
    } catch (error) {
      console.error("Ошибка при обновлении статуса оплаты:", error);
      throw error;
    }
  }

  // СУММА РАСХОДОВ ПОЛЬЗОВАТЕЛЯ
  static async getUserTotalInTrip(userId, tripId) {
    try {
      const result = await pool.query(
        `SELECT 
            COALESCE(SUM(es.amount_owed), 0) as total_owed,
            COALESCE(SUM(CASE WHEN e.paid_by = $1 THEN e.amount ELSE 0 END), 0) as total_paid,
            COALESCE(COUNT(DISTINCT e.id), 0) as expense_count
         FROM expense_shares es
         JOIN expenses e ON es.expense_id = e.id
         WHERE es.user_id = $1 AND e.trip_id = $2`,
        [userId, tripId],
      );
      return result.rows[0];
    } catch (error) {
      console.error("Ошибка при получении суммы расходов пользователя:", error);
      throw error;
    }
  }

  // РАСХОДЫ ПОЛЬЗОВАТЕЛЯ (КАК ПЛАТЕЛЬЩИКА)
  static async findByUserIdInTrip(userId, tripId) {
    try {
      const result = await pool.query(
        `SELECT e.*, u.username as paid_by_name, ec.name as category_name
         FROM expenses e
         LEFT JOIN users u ON e.paid_by = u.id
         LEFT JOIN expense_categories ec ON e.category_id = ec.id
         WHERE e.trip_id = $1 AND e.paid_by = $2
         ORDER BY e.date DESC, e.created_at DESC`,
        [tripId, userId],
      );
      return result.rows;
    } catch (error) {
      console.error("Ошибка при поиске расходов пользователя:", error);
      throw error;
    }
  }

  // ОБНОВЛЕНИЕ СТАТУСА УРЕГУЛИРОВАНИЯ
  static async updateSettlementStatus(id, tripId, isSettled) {
    try {
      const result = await pool.query(
        `UPDATE expenses 
         SET is_settled = $1
         WHERE id = $2 AND trip_id = $3
         RETURNING id, expense_name, is_settled`,
        [isSettled, id, tripId],
      );

      return result.rows[0];
    } catch (error) {
      console.error("Ошибка при обновлении статуса урегулирования:", error);
      throw error;
    }
  }

  // СВОДКА ПО КАТЕГОРИЯМ
  static async getExpensesSummaryByCategory(tripId) {
    try {
      const result = await pool.query(
        `SELECT 
            ec.id as category_id,
            ec.name as category_name,
            COUNT(e.id) as expense_count,
            COALESCE(SUM(e.amount), 0) as total_amount
         FROM expense_categories ec
         LEFT JOIN expenses e ON ec.id = e.category_id AND e.trip_id = $1
         GROUP BY ec.id, ec.name
         ORDER BY ec.name`,
        [tripId],
      );
      return result.rows;
    } catch (error) {
      console.error("Ошибка при получении сводки по категориям:", error);
      throw error;
    }
  }

  // ОБЩАЯ СУММА РАСХОДОВ
  static async getTotalExpenses(tripId) {
    try {
      const result = await pool.query(
        `SELECT COALESCE(SUM(amount), 0) as total_amount,
                COUNT(id) as expense_count
         FROM expenses 
         WHERE trip_id = $1`,
        [tripId],
      );
      return result.rows[0];
    } catch (error) {
      console.error("Ошибка при получении общей суммы расходов:", error);
      throw error;
    }
  }
}

module.exports = Expense;
