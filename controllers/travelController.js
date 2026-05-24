// controllers/travelController.js
const Travel = require("../Models/Travel_model");
const { TravelValidator } = require("../services/authService");

class TravelController {
  static async create(req, res) {
    try {
      console.log("📥 Create travel request:", req.body);
      console.log("📸 Uploaded file:", req.file);

      const { trip_name, location, start_date, description } = req.body;
      const userId = req.session.userId;

      if (!userId) {
        return res.status(401).json({
          success: false,
          error: "Пользователь не авторизован",
        });
      }

      // Валидация обязательных полей (без end_date)
      if (!trip_name || !location || !start_date) {
        return res.status(400).json({
          success: false,
          error: "Заполните все обязательные поля: название, локация, даты",
        });
      }

      // 🔹 Обработка фото
      let photo = null;
      if (req.file && req.file.filename) {
        photo = "/uploads/trips/" + req.file.filename;
        console.log("✅ Фото загружено:", photo);
      } else {
        console.log("ℹ️ Фото не загружено (необязательно)");
      }

      // Создаем путешествие (без end_date)
      const travel = await Travel.create({
        trip_name,
        location,
        start_date,
        description: description || null,
        photo,
        user_id: userId,
      });

      console.log("✅ Путешествие создано:", travel.id);

      return res.json({
        success: true,
        message: "Путешествие успешно создано",
        travel: {
          id: travel.id,
          trip_name: travel.trip_name,
          location: travel.location,
          start_date: travel.start_date,
          description: travel.description,
          photo: travel.photo,
          user_id: travel.user_id,
          created_at: travel.created_at,
        },
      });
    } catch (error) {
      console.error("❌ Ошибка создания путешествия:", error);
      return res.status(500).json({
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

  //=================================================================

  static async getUserTravelsmob(req, res) {
    try {
      const userId = req.params.id;

      if (!userId) {
        return res.status(400).json({
          success: false,
          error: "ID пользователя не указан",
        });
      }

      TravelValidator.validateUserAuthorization(userId);
      const travels = await Travel.findByUserId(userId);

      return res.json({
        success: true,
        travels,
      });
    } catch (error) {
      console.error("Get user travels error:", error);
      let statusCode = 500;
      if (
        error.message.includes("авторизованы") ||
        error.message.includes("не найден")
      ) {
        statusCode = 401;
      } else if (
        error.message.includes("не указан") ||
        error.message.includes("неверный")
      ) {
        statusCode = 400;
      }

      return res.status(statusCode).json({
        success: false,
        error: error.message || "Внутренняя ошибка сервера",
      });
    }
  }

  static async getParticipants(req, res) {
    try {
      const { tripId } = req.params;
      const userId = req.session.userId;

      const travel = await Travel.findById(tripId, userId);
      if (!travel) {
        return res.status(404).json({
          success: false,
          error: "Путешествие не найдено",
        });
      }

      const participants = await Travel.getParticipants(tripId);

      return res.json({
        success: true,
        participants,
      });
    } catch (error) {
      console.error("Get participants error:", error);
      return res.status(500).json({
        success: false,
        error: "Ошибка при получении участников",
      });
    }
  }

  static async removeParticipant(req, res) {
    try {
      const { tripId, userId: participantId } = req.params;
      const currentUserId = req.session.userId;

      if (!currentUserId) {
        return res.status(401).json({
          success: false,
          error: "Требуется авторизация",
        });
      }

      const travel = await Travel.findById(tripId, currentUserId);
      if (!travel) {
        return res.status(404).json({
          success: false,
          error: "Путешествие не найдено или доступ запрещен",
        });
      }

      if (travel.user_id !== currentUserId) {
        return res.status(403).json({
          success: false,
          error: "Только создатель путешествия может удалять участников",
        });
      }

      if (parseInt(participantId) === travel.user_id) {
        return res.status(400).json({
          success: false,
          error: "Создатель не может удалить себя через этот метод",
        });
      }

      const removed = await Travel.removeParticipant(tripId, participantId);

      if (!removed) {
        return res.status(404).json({
          success: false,
          error: "Участник не найден в путешествии",
        });
      }

      return res.json({
        success: true,
        message: "Участник удален из путешествия",
        participantId: participantId,
      });
    } catch (error) {
      console.error("Remove participant error:", error);
      return res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  }

  static async getUserTravelsPublic(req, res) {
    try {
      const { id } = req.params;

      if (!id || isNaN(parseInt(id))) {
        return res.status(400).json({
          success: false,
          error: "Некорректный ID пользователя",
        });
      }
      const travels = await Travel.findByUserId(id);

      return res.json({
        success: true,
        travels,
      });
    } catch (error) {
      console.error("Get user travels public error:", error);
      return res.status(500).json({
        success: false,
        error: error.message || "Внутренняя ошибка сервера",
      });
    }
  }

  //=================================================================

  static async getTravelById(req, res) {
    try {
      const { id } = req.params;
      const userId = req.session.userId;

      TravelValidator.validateUserAuthorization(userId);
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
        title: "Редактировать путешествие",
        travel: travel,
        user: { id: req.session.userId },
        successMessage: null,
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
      const { trip_name, location, start_date, description } = req.body;

      TravelValidator.validateUserAuthorization(userId);
      TravelValidator.validateTravelId(id);

      // Валидация без end_date
      TravelValidator.validateTravelData(
        { trip_name, location, start_date },
        true,
      );

      const travel = await Travel.findById(id, userId);

      if (!travel) {
        return res.status(404).json({
          success: false,
          error: "Путешествие не найдено или у вас нет к нему доступа",
        });
      }

      // Обновление без end_date
      const updatedTravel = await Travel.update(id, userId, {
        trip_name,
        location,
        start_date,
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
