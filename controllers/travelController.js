// controllers/travelController.js
const Travel = require("../Models/Travel_model");

class TravelController {
  static async create(req, res) {
    try {
      console.log("Create travel request:", req.body);
      console.log("User ID from session:", req.session.userId);

      const { trip_name, location, start_date, end_date, description } =
        req.body;
      const userId = req.session.userId;

      // Проверка авторизации
      if (!userId) {
        return res.status(401).json({
          success: false,
          error: "Вы не авторизованы",
        });
      }

      // Валидация обязательных полей
      if (!trip_name || !location || !start_date) {
        return res.status(400).json({
          success: false,
          error:
            "Пожалуйста, заполните все обязательные поля: название, локация, дата начала",
        });
      }

      // Проверка дат
      if (end_date && new Date(end_date) < new Date(start_date)) {
        return res.status(400).json({
          success: false,
          error: "Дата окончания не может быть раньше даты начала",
        });
      }

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
      return res.status(500).json({
        success: false,
        error: error.message || "Внутренняя ошибка сервера",
      });
    }
  }

  static async getUserTravels(req, res) {
    try {
      const userId = req.session.userId;

      if (!userId) {
        return res.status(401).json({
          success: false,
          error: "Вы не авторизованы",
        });
      }

      const travels = await Travel.findByUserId(userId);

      return res.json({
        success: true,
        travels,
      });
    } catch (error) {
      console.error("Get user travels error:", error);
      return res.status(500).json({
        success: false,
        error: "Внутренняя ошибка сервера",
      });
    }
  }

  static async getTravelById(req, res) {
    try {
      const { id } = req.params;
      const userId = req.session.userId;

      if (!userId) {
        return res.status(401).json({
          success: false,
          error: "Вы не авторизованы",
        });
      }

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
      return res.status(500).json({
        success: false,
        error: "Внутренняя ошибка сервера",
      });
    }
  }

  static async update(req, res) {
    try {
      const { id } = req.params;
      const userId = req.session.userId;
      const { trip_name, location, start_date, end_date, description } =
        req.body;

      if (!userId) {
        return res.status(401).json({
          success: false,
          error: "Вы не авторизованы",
        });
      }

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
      return res.status(500).json({
        success: false,
        error: "Внутренняя ошибка сервера",
      });
    }
  }

  static async delete(req, res) {
    try {
      const { id } = req.params;
      const userId = req.session.userId;

      if (!userId) {
        return res.status(401).json({
          success: false,
          error: "Вы не авторизованы",
        });
      }

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
      return res.status(500).json({
        success: false,
        error: "Внутренняя ошибка сервера",
      });
    }
  }
}

module.exports = TravelController;
