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

      TravelValidator.validateUserAuthorization(userId);
      TravelValidator.validateTravelData({
        trip_name,
        location,
        start_date,
        end_date,
      });

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
              : 500,
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

      // Используем обновленный метод модели
      const travels = await Travel.findByUserId(userId);

      // Добавляем участников к каждому путешествию
      const travelsWithParticipants = await Promise.all(
        travels.map(async (travel) => {
          const participants = await Travel.getParticipants(travel.id);
          return {
            ...travel,
            participants: participants,
            participant_count: participants.length,
          };
        }),
      );

      return res.json({
        success: true,
        travels: travelsWithParticipants,
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

      // Используем обновленный метод модели с проверкой доступа
      const travel = await Travel.findById(id, userId);

      if (!travel) {
        return res.status(404).json({
          success: false,
          error: "Путешествие не найдено или у вас нет к нему доступа",
        });
      }

      // Получаем участников
      const participants = await Travel.getParticipants(id);

      return res.json({
        success: true,
        travel: {
          ...travel,
          participants: participants,
          participant_count: participants.length,
        },
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

        // Проверяем доступ
        const hasAccess = await Travel.hasAccess(
          req.params.id,
          req.session.userId,
        );
        if (!hasAccess) {
          return res.status(403).render("error", {
            error: "Нет доступа к этому путешествию",
            user: req.session.user,
          });
        }

        travel = await Travel.findById(req.params.id, req.session.userId);

        if (!travel) {
          return res.status(404).render("error", {
            error: "Путешествие не найдено",
            user: req.session.user,
          });
        }

        // Получаем участников для отображения
        travel.participants = await Travel.getParticipants(req.params.id);
      }

      res.render("travelDetail", {
        title: travel ? "Редактировать" : "Создать",
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
      const userId = req.session.userId;

      TravelValidator.validateUserAuthorization(userId);

      // Используем обновленный метод модели
      const travels = await Travel.findByUserId(userId);

      // Добавляем участников к каждому путешествию
      const travelsWithParticipants = await Promise.all(
        travels.map(async (travel) => {
          const participants = await Travel.getParticipants(travel.id);
          return {
            ...travel,
            participants: participants,
            participant_count: participants.length,
          };
        }),
      );

      res.render("travelList", {
        travels: travelsWithParticipants,
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
      const userId = req.session.userId;

      if (!userId) {
        return res.status(401).render("error", {
          error: "Требуется авторизация",
          user: null,
        });
      }

      // Проверяем доступ
      const hasAccess = await Travel.hasAccess(req.params.id, userId);
      if (!hasAccess) {
        return res.status(403).render("error", {
          error: "Нет доступа к этому путешествию",
          user: req.session.user,
        });
      }

      const travel = await Travel.findById(req.params.id, userId);

      if (!travel) {
        return res.status(404).render("error", {
          error: "Путешествие не найдено",
          user: req.session.user,
        });
      }

      // Получаем участников
      const participants = await Travel.getParticipants(req.params.id);

      res.render("travel-details", {
        travel: {
          ...travel,
          participants: participants,
          participant_count: participants.length,
        },
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
        true,
      );

      // Проверяем, является ли пользователь создателем
      const travel = await Travel.findById(id, userId);
      if (!travel) {
        return res.status(404).json({
          success: false,
          error: "Путешествие не найдено или у вас нет прав для редактирования",
        });
      }

      // Только создатель может редактировать
      if (travel.user_id !== userId) {
        return res.status(403).json({
          success: false,
          error: "Только создатель может редактировать путешествие",
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

      // Проверяем, является ли пользователь создателем
      const travel = await Travel.findById(id, userId);
      if (!travel) {
        return res.status(404).json({
          success: false,
          error: "Путешествие не найдено",
        });
      }

      // Только создатель может удалять
      if (travel.user_id !== userId) {
        return res.status(403).json({
          success: false,
          error: "Только создатель может удалить путешествие",
        });
      }

      const deletedTravel = await Travel.delete(id, userId);

      if (!deletedTravel) {
        return res.status(404).json({
          success: false,
          error: "Путешествие не найдено",
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
