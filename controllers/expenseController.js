// controllers/expenseController.js
const Expense = require("../Models/Expense_Model");
const Travel = require("../Models/Travel_model");
const { TravelValidator } = require("../services/authService");

class ExpenseController {
  // Создание расхода
  static async create(req, res) {
    try {
      console.log("Create expense request:", req.body);

      const { expense_name, trip_id, category_id, amount, description, date } =
        req.body;
      const userId = req.session.userId;

      // Проверка авторизации
      TravelValidator.validateUserAuthorization(userId);

      // Валидация данных
      TravelValidator.validateExpenseData(req.body, false);

      // Проверяем доступ к путешествию
      const travel = await Travel.findById(trip_id, userId);
      if (!travel) {
        return res.status(404).json({
          success: false,
          error: "Путешествие не найдено или у вас нет к нему доступа",
        });
      }

      // Создаем расход
      const expense = await Expense.create({
        expense_name,
        trip_id,
        paid_by: userId,
        category_id: category_id || null,
        amount: parseFloat(amount),
        description: description || null,
        date,
      });

      return res.json({
        success: true,
        message: "Расход успешно добавлен",
        expense,
      });
    } catch (error) {
      console.error("Create expense error:", error);
      const status = error.message.includes("авторизованы")
        ? 401
        : error.message.includes("обязательные") ||
            error.message.includes("Сумма")
          ? 400
          : 500;
      return res.status(status).json({
        success: false,
        error: error.message,
      });
    }
  }

  // Получение расходов по ID путешествия
  static async getByTripId(req, res) {
    try {
      const { tripId } = req.params;
      const userId = req.session.userId;

      TravelValidator.validateUserAuthorization(userId);
      TravelValidator.validateId(tripId, "путешествия");

      // Проверяем доступ к путешествию
      const travel = await Travel.findById(tripId, userId);
      if (!travel) {
        return res.status(404).json({
          success: false,
          error: "Путешествие не найдено",
        });
      }

      const expenses = await Expense.findByTripId(tripId);

      return res.json({
        success: true,
        expenses,
      });
    } catch (error) {
      console.error("Get trip expenses error:", error);
      const status = error.message.includes("авторизованы")
        ? 401
        : error.message.includes("ID")
          ? 400
          : 500;
      return res.status(status).json({
        success: false,
        error: error.message,
      });
    }
  }

  // Получение расхода по ID
  static async getById(req, res) {
    try {
      const { id } = req.params;
      const userId = req.session.userId;

      TravelValidator.validateUserAuthorization(userId);
      TravelValidator.validateId(id, "расхода");

      const expense = await Expense.findById(id);

      if (!expense) {
        return res.status(404).json({
          success: false,
          error: "Расход не найден",
        });
      }

      // Проверяем доступ к путешествию
      const travel = await Travel.findById(expense.trip_id, userId);
      if (!travel) {
        return res.status(403).json({
          success: false,
          error: "Нет доступа к расходу",
        });
      }

      return res.json({
        success: true,
        expense,
      });
    } catch (error) {
      console.error("Get expense error:", error);
      const status = error.message.includes("авторизованы")
        ? 401
        : error.message.includes("ID")
          ? 400
          : 500;
      return res.status(status).json({
        success: false,
        error: error.message,
      });
    }
  }

  // Обновление расхода
  static async update(req, res) {
    try {
      const { id } = req.params;
      const userId = req.session.userId;
      const { expense_name, category_id, amount, description, date } = req.body;

      TravelValidator.validateUserAuthorization(userId);
      TravelValidator.validateId(id, "расхода");
      TravelValidator.validateExpenseData(req.body, true);

      // Получаем расход для проверки прав
      const expense = await Expense.findById(id);
      if (!expense) {
        return res.status(404).json({
          success: false,
          error: "Расход не найден",
        });
      }

      // Проверяем, что пользователь является владельцем расхода
      // if (expense.paid_by != userId) {
      //   return res.status(403).json({
      //     success: false,
      //     error: "Нет прав для редактирования этого расхода",
      //   });
      // }

      // Проверяем доступ к путешествию
      const travel = await Travel.findById(expense.trip_id, userId);
      if (!travel) {
        return res.status(403).json({
          success: false,
          error: "Нет доступа к путешествию",
        });
      }

      const updatedExpense = await Expense.updateExpense(id, userId, {
        expense_name,
        category_id: category_id || null,
        amount: parseFloat(amount),
        description: description || null,
        date,
      });

      return res.json({
        success: true,
        message: "Расход успешно обновлен",
        expense: updatedExpense,
      });
    } catch (error) {
      console.error("Update expense error:", error);
      const status = error.message.includes("авторизованы")
        ? 401
        : error.message.includes("ID") || error.message.includes("Сумма")
          ? 400
          : 500;
      return res.status(status).json({
        success: false,
        error: error.message,
      });
    }
  }

  // Удаление расхода
  static async delete(req, res) {
    try {
      const { id } = req.params;
      const userId = req.session.userId;

      TravelValidator.validateUserAuthorization(userId);
      TravelValidator.validateId(id, "расхода");

      // Получаем расход для проверки прав
      const expense = await Expense.findById(id);
      if (!expense) {
        return res.status(404).json({
          success: false,
          error: "Расход не найден",
        });
      }

      // Проверяем, что пользователь является владельцем расхода
      // if (expense.paid_by != userId) {
      //   return res.status(403).json({
      //     success: false,
      //     error: "Нет прав для удаления этого расхода",
      //   });
      // }

      const deletedExpense = await Expense.deleteExpense(id, userId);

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
      const status = error.message.includes("авторизованы")
        ? 401
        : error.message.includes("ID")
          ? 400
          : 500;
      return res.status(status).json({
        success: false,
        error: error.message,
      });
    }
  }

  // Получение статистики расходов по категориям
  static async getSummary(req, res) {
    try {
      const { tripId } = req.params;
      const userId = req.session.userId;

      TravelValidator.validateUserAuthorization(userId);
      TravelValidator.validateId(tripId, "путешествия");

      // Проверяем доступ к путешествию
      const travel = await Travel.findById(tripId, userId);
      if (!travel) {
        return res.status(404).json({
          success: false,
          error: "Путешествие не найдено",
        });
      }

      const summary = await Expense.getExpensesSummaryByCategory(tripId);

      return res.json({
        success: true,
        summary,
      });
    } catch (error) {
      console.error("Get summary error:", error);
      const status = error.message.includes("авторизованы")
        ? 401
        : error.message.includes("ID")
          ? 400
          : 500;
      return res.status(status).json({
        success: false,
        error: error.message,
      });
    }
  }

  // Получение общей суммы расходов
  static async getTotal(req, res) {
    try {
      const { tripId } = req.params;
      const userId = req.session.userId;

      TravelValidator.validateUserAuthorization(userId);
      TravelValidator.validateId(tripId, "путешествия");

      // Проверяем доступ к путешествию
      const travel = await Travel.findById(tripId, userId);
      if (!travel) {
        return res.status(404).json({
          success: false,
          error: "Путешествие не найдено",
        });
      }

      const total = await Expense.getTotalExpenses(tripId);

      return res.json({
        success: true,
        total,
      });
    } catch (error) {
      console.error("Get total error:", error);
      const status = error.message.includes("авторизованы")
        ? 401
        : error.message.includes("ID")
          ? 400
          : 500;
      return res.status(status).json({
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

      TravelValidator.validateUserAuthorization(userId);
      TravelValidator.validateId(tripId, "путешествия");

      // Проверяем доступ к путешествию
      const travel = await Travel.findById(tripId, userId);
      if (!travel) {
        return res.redirect("/travels");
      }

      const expenses = await Expense.findByTripId(tripId);
      const summary = await Expense.getExpensesSummaryByCategory(tripId);
      const total = await Expense.getTotalExpenses(tripId);

      res.render("expenses", {
        title: "Расходы",
        travel,
        expenses,
        summary,
        total,
        user: req.session.user,
      });
    } catch (error) {
      console.error("Show expenses page error:", error);
      res.redirect("/travels");
    }
  }

  // Отображение формы добавления/редактирования расхода
  static async showForm(req, res) {
    try {
      const { tripId, id } = req.params;
      const userId = req.session.userId;

      TravelValidator.validateUserAuthorization(userId);
      TravelValidator.validateId(tripId, "путешествия");

      // Проверяем доступ к путешествию
      const travel = await Travel.findById(tripId, userId);
      if (!travel) {
        return res.redirect("/travels");
      }

      let expense = null;
      if (id) {
        TravelValidator.validateId(id, "расхода");
        expense = await Expense.findById(id, tripId);

        if (expense && expense.paid_by != userId) {
          return res.redirect(`/travels/${tripId}/expenses`);
        }
      }

      res.render("expense-form", {
        title: expense ? "Редактировать расход" : "Добавить расход",
        travel,
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
