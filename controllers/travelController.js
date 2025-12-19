// controllers/travelController.js
const Travel = require("../Models/Travel_model");
const { TravelValidator } = require("../services/authService");

class TravelController {
  static async create(req, res) {
    try {
      console.log("Create travel request:", req.body);
      console.log("User ID from session:", req.session.userId);

      const { trip_name, location, start_date, end_date, description } =
        req.body;
      const userId = req.session.userId;

      // Проверка авторизации
      TravelValidator.validateUserAuthorization(userId);

      // Валидация данных путешествия
      TravelValidator.validateTravelData({
        trip_name,
        location,
        start_date,
        end_date,
      });

      // Создаем путешествие
      const travel = await Travel.create({
        trip_name,
        location,
        start_date,
        end_date,
        description,
        user_id: userId,
      });

      console.log("Travel created:", travel);

      return res.json({
        success: true,
        message: "Путешествие успешно создано",
        travel: {
          id: travel.id,
          trip_name: travel.trip_name,
          location: travel.location,
          start_date: travel.start_date,
          end_date: travel.end_date,
          description: travel.description,
          user_id: travel.user_id,
          created_at: travel.created_at,
        },
      });
    } catch (error) {
      console.error("Create travel error:", error);
      return res
        .status(
          error.message.includes("авторизованы")
            ? 401
            : error.message.includes("обязательные поля")
            ? 400
            : 500
        )
        .json({
          success: false,
          error: error.message || "Внутренняя ошибка сервера",
        });
    }
  }

  static async getUserTravels(req, res) {
    try {
      const userId = req.session.userId;

      TravelValidator.validateUserAuthorization(userId);

      const travels = await Travel.findByUserId(userId);

      return res.json({
        success: true,
        travels,
      });
    } catch (error) {
      console.error("Get user travels error:", error);
      return res
        .status(error.message.includes("авторизованы") ? 401 : 500)
        .json({
          success: false,
          error: error.message || "Внутренняя ошибка сервера",
        });
    }
  }

  static async getTravelById(req, res) {
    try {
      const { id } = req.params;
      const userId = req.session.userId;

      TravelValidator.validateUserAuthorization(userId);
      TravelValidator.validateTravelId(id);

      const travel = await Travel.findById(id, userId);

      if (!travel) {
        return res.status(404).json({
          success: false,
          error: "Путешествие не найдено или у вас нет к нему доступа",
        });
      }

      return res.json({
        success: true,
        travel,
      });
    } catch (error) {
      console.error("Get travel by id error:", error);
      const statusCode = error.message.includes("авторизованы")
        ? 401
        : error.message.includes("ID")
        ? 400
        : 500;
      return res.status(statusCode).json({
        success: false,
        error: error.message || "Внутренняя ошибка сервера",
      });
    }
  }

  static async showForm(req, res) {
    try {
      let travel = null;

      // Если редактируем существующее путешествие
      if (req.params.id) {
        TravelValidator.validateTravelId(req.params.id);

        travel = await Travel.findById(req.params.id, req.session.userId);

        if (!travel) {
          return res.status(404).render("error", {
            error: "Путешествие не найдено",
            user: req.session.user,
          });
        }
      }

      res.render("travelDetail", {
        // travel: travel,
        // user: req.session.user,
        // title: travel ? "Редактировать" : "Создать",
        title: "Редактировать путешествие",
        travel: travel,
        user: { id: req.session.userId },
        successMessage: null, // или req.flash('success') если используете flash
        error: null,
      });
    } catch (error) {
      console.error("Ошибка при загрузке формы:", error);
      res.status(500).render("error", {
        error: "Ошибка сервера",
        user: req.session.user,
      });
    }
  }

  static async list(req, res) {
    try {
      TravelValidator.validateUserAuthorization(req.session.userId);

      const travels = await Travel.findByUserId(req.session.userId);

      res.render("travelList", {
        travels: travels,
        user: req.session.user,
        successMessage: req.query.success,
        error: req.query.error,
      });
    } catch (error) {
      console.error("Ошибка при загрузке списка:", error);
      res.status(500).render("error", {
        error: "Ошибка сервера",
        user: req.session.user,
      });
    }
  }

  static async show(req, res) {
    try {
      const travel = await Travel.findById(req.params.id);

      if (!travel) {
        return res.status(404).render("error", {
          error: "Путешествие не найдено",
          user: req.session.user,
        });
      }

      res.render("travel-details", {
        travel: travel,
        user: req.session.user,
        successMessage: req.query.success,
        error: req.query.error,
      });
    } catch (error) {
      console.error("Ошибка при загрузке:", error);
      res.status(500).render("error", {
        error: "Ошибка сервера",
        user: req.session.user,
      });
    }
  }

  static async update(req, res) {
    try {
      const { id } = req.params;
      const userId = req.session.userId;
      const { trip_name, location, start_date, end_date, description } =
        req.body;

      TravelValidator.validateUserAuthorization(userId);
      TravelValidator.validateTravelId(id);
      TravelValidator.validateTravelData(
        {
          trip_name,
          location,
          start_date,
          end_date,
        },
        true
      ); // true - означает режим обновления

      const travel = await Travel.findById(id, userId);

      if (!travel) {
        return res.status(404).json({
          success: false,
          error: "Путешествие не найдено или у вас нет к нему доступа",
        });
      }

      const updatedTravel = await Travel.update(id, userId, {
        trip_name,
        location,
        start_date,
        end_date,
        description,
      });

      return res.json({
        success: true,
        message: "Путешествие успешно обновлено",
        travel: updatedTravel,
      });
    } catch (error) {
      console.error("Update travel error:", error);
      const statusCode = error.message.includes("авторизованы")
        ? 401
        : error.message.includes("ID") || error.message.includes("обязательные")
        ? 400
        : 500;
      return res.status(statusCode).json({
        success: false,
        error: error.message || "Внутренняя ошибка сервера",
      });
    }
  }

  static async delete(req, res) {
    try {
      const { id } = req.params;
      const userId = req.session.userId;

      TravelValidator.validateUserAuthorization(userId);
      TravelValidator.validateTravelId(id);

      const deletedTravel = await Travel.delete(id, userId);

      if (!deletedTravel) {
        return res.status(404).json({
          success: false,
          error: "Путешествие не найдено или у вас нет к нему доступа",
        });
      }

      return res.json({
        success: true,
        message: "Путешествие успешно удалено",
      });
    } catch (error) {
      console.error("Delete travel error:", error);
      const statusCode = error.message.includes("авторизованы")
        ? 401
        : error.message.includes("ID")
        ? 400
        : 500;
      return res.status(statusCode).json({
        success: false,
        error: error.message || "Внутренняя ошибка сервера",
      });
    }
  }
}

module.exports = TravelController;
