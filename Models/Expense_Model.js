const pool = require("../db");
console.log("Expense model загружен");

class Expense {
  // Создание расхода
  static async create(expenseData) {
    const {
      expense_name,
      trip_id,
      paid_by,
      category_id,
      amount,
      description,
      date,
    } = expenseData;

    try {
      console.log("Создание расхода для путешествия:", trip_id);

      const result = await pool.query(
        `INSERT INTO expenses (expense_name, trip_id, paid_by, category_id, amount, description, date) 
         VALUES ($1, $2, $3, $4, $5, $6, $7) 
         RETURNING id, expense_name, trip_id, paid_by, category_id, amount, description, date, is_settled, created_at`,
        [expense_name, trip_id, paid_by, category_id, amount, description, date]
      );

      return result.rows[0];
    } catch (error) {
      console.error("Ошибка при создании расхода:", error);
      throw error;
    }
  }

  // Получение всех расходов путешествия
  static async findByTripId(tripId) {
    try {
      const result = await pool.query(
        `SELECT e.id, e.expense_name, e.trip_id, e.paid_by, e.category_id, 
                e.amount, e.description, e.date, e.is_settled, e.created_at,
                u.username as paid_by_name,
                ec.name as category_name
         FROM expenses e
         LEFT JOIN users u ON e.paid_by = u.id
         LEFT JOIN expense_categories ec ON e.category_id = ec.id
         WHERE e.trip_id = $1 
         ORDER BY e.date DESC, e.created_at DESC`,
        [tripId]
      );
      return result.rows;
    } catch (error) {
      console.error("Ошибка при поиске расходов путешествия:", error);
      throw error;
    }
  }

  // Получение расхода по ID
  static async findById(id, tripId = null) {
    try {
      let query = `SELECT e.id, e.expense_name, e.trip_id, e.paid_by, e.category_id, 
                          e.amount, e.description, e.date, e.is_settled, e.created_at,
                          u.username as paid_by_name,
                          ec.name as category_name
                   FROM expenses e
                   LEFT JOIN users u ON e.paid_by = u.id
                   LEFT JOIN expense_categories ec ON e.category_id = ec.id
                   WHERE e.id = $1`;
      let params = [id];

      // Если передан tripId, проверяем принадлежность
      if (tripId) {
        query += ` AND e.trip_id = $2`;
        params.push(tripId);
      }

      const result = await pool.query(query, params);
      return result.rows[0];
    } catch (error) {
      console.error("Ошибка при поиске расхода:", error);
      throw error;
    }
  }

  // Получение расходов пользователя в конкретном путешествии
  static async findByUserIdInTrip(userId, tripId) {
    try {
      const result = await pool.query(
        `SELECT e.id, e.expense_name, e.trip_id, e.paid_by, e.category_id, 
                e.amount, e.description, e.date, e.is_settled, e.created_at,
                u.username as paid_by_name,
                ec.name as category_name
         FROM expenses e
         LEFT JOIN users u ON e.paid_by = u.id
         LEFT JOIN expense_categories ec ON e.category_id = ec.id
         WHERE e.trip_id = $1 AND e.paid_by = $2
         ORDER BY e.date DESC, e.created_at DESC`,
        [tripId, userId]
      );
      return result.rows;
    } catch (error) {
      console.error(
        "Ошибка при поиске расходов пользователя в путешествии:",
        error
      );
      throw error;
    }
  }

  // Обновление расхода
  static async updateExpense(id, userId, expenseData) {
    const { expense_name, category_id, amount, description, date } =
      expenseData;

    try {
      const result = await pool.query(
        `UPDATE expenses 
         SET expense_name = $1, category_id = $2, amount = $3, 
             description = $4, date = $5
         WHERE id = $6 AND paid_by = $7
         RETURNING id, expense_name, trip_id, paid_by, category_id, 
                   amount, description, date, is_settled, created_at`,
        [expense_name, category_id, amount, description, date, id, userId]
      );

      return result.rows[0];
    } catch (error) {
      console.error("Ошибка при обновлении расхода:", error);
      throw error;
    }
  }

  // Обновление статуса урегулирования расхода
  static async updateSettlementStatus(id, tripId, isSettled) {
    try {
      const result = await pool.query(
        `UPDATE expenses 
         SET is_settled = $1
         WHERE id = $2 AND trip_id = $3
         RETURNING id, expense_name, is_settled`,
        [isSettled, id, tripId]
      );

      return result.rows[0];
    } catch (error) {
      console.error("Ошибка при обновлении статуса урегулирования:", error);
      throw error;
    }
  }

  // Удаление расхода
  static async deleteExpense(id, userId) {
    try {
      const result = await pool.query(
        `DELETE FROM expenses WHERE id = $1 AND paid_by = $2 RETURNING id, trip_id`,
        [id, userId]
      );
      return result.rows[0];
    } catch (error) {
      console.error("Ошибка при удалении расхода:", error);
      throw error;
    }
  }

  // Получение суммы расходов по категориям для путешествия
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
        [tripId]
      );
      return result.rows;
    } catch (error) {
      console.error(
        "Ошибка при получении сводки расходов по категориям:",
        error
      );
      throw error;
    }
  }

  // Получение общей суммы расходов для путешествия
  static async getTotalExpenses(tripId) {
    try {
      const result = await pool.query(
        `SELECT COALESCE(SUM(amount), 0) as total_amount,
                COUNT(id) as expense_count
         FROM expenses 
         WHERE trip_id = $1`,
        [tripId]
      );
      return result.rows[0];
    } catch (error) {
      console.error("Ошибка при получении общей суммы расходов:", error);
      throw error;
    }
  }
}

module.exports = Expense;
