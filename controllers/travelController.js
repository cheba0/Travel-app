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

      const travels = await Travel.findByUserId(userId);

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
      TravelValidator.validateId(id, "путешествия");

      const travel = await Travel.findById(id, userId);

      if (!travel) {
        return res.status(404).json({
          success: false,
          error: "Путешествие не найдено или у вас нет к нему доступа",
        });
      }

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
      console.log("=== showForm вызван ===");
      console.log("ID путешествия:", req.params.id);
      console.log("ID пользователя:", req.session.userId);

      const userId = req.session.userId;

      if (!userId) {
        return res.status(401).send(`
          <h1>Требуется авторизация</h1>
          <p>Пожалуйста, <a href="/login">войдите в систему</a>.</p>
        `);
      }

      const travelId = req.params.id;
      let travel = null;
      let isEdit = false;

      if (travelId) {
        isEdit = true;
        TravelValidator.validateId(travelId, "путешествия");

        // Получаем данные путешествия
        travel = await Travel.findById(travelId, userId);
        if (!travel) {
          return res.status(404).send(`
            <h1>Путешествие не найдено</h1>
            <p>Путешествие с ID ${travelId} не существует или у вас нет доступа.</p>
            <a href="/travels">Вернуться к списку</a>
          `);
        }

        // Проверяем, является ли пользователь создателем
        if (travel.user_id !== userId) {
          return res.status(403).send(`
            <h1>Доступ запрещен</h1>
            <p>Только создатель может редактировать это путешествие.</p>
            <a href="/travel/${travelId}">Вернуться к просмотру</a>
          `);
        }

        // Получаем участников
        travel.participants = await Travel.getParticipants(travelId);
      }

      // Форматируем даты
      const formatDate = (dateString) => {
        if (!dateString) return "";
        try {
          const date = new Date(dateString);
          return date.toISOString().split("T")[0];
        } catch (e) {
          return "";
        }
      };

      // Подготавливаем данные для шаблона
      const templateData = {
        title: isEdit
          ? `Редактировать: ${travel.trip_name}`
          : "Создать путешествие",
        travel: isEdit
          ? {
              id: travel.id,
              trip_name: travel.trip_name,
              location: travel.location || "",
              start_date: formatDate(travel.start_date),
              end_date: formatDate(travel.end_date),
              description: travel.description || "",
              user_id: travel.user_id,
            }
          : null,
        user: { id: userId },
        isEdit: isEdit,
        actionUrl: isEdit ? `/api/travels/${travel.id}` : "/api/travels",
        cancelUrl: isEdit ? `/travel/${travel.id}` : "/travels",
      };

      // Пробуем шаблон travelFormUpdate
      try {
        return res.render("travelFormUpdate", templateData);
      } catch (renderError) {
        console.log(
          "Шаблон travelFormUpdate не найден, показываю HTML форму:",
          renderError.message,
        );

        // Если шаблон не найден, отображаем HTML форму
        return res.send(this.getFormHtml(templateData));
      }
    } catch (error) {
      console.error("Ошибка при загрузке формы:", error);
      res.status(500).send(`
        <h1>Ошибка сервера</h1>
        <p>${error.message}</p>
        <a href="/">На главную</a>
      `);
    }
  }

  // HTML форма для создания/редактирования (если шаблон не найден)
  static getFormHtml(data) {
    const { title, travel, isEdit, actionUrl, cancelUrl } = data;

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <title>${title}</title>
        <style>
          body { font-family: Arial; padding: 20px; background: #f5f5f5; }
          .container { max-width: 600px; margin: 50px auto; background: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
          h1 { color: #28a745; margin-bottom: 20px; }
          .form-group { margin-bottom: 20px; }
          label { display: block; margin-bottom: 5px; font-weight: bold; color: #333; }
          input, textarea { width: 100%; padding: 12px; border: 1px solid #ddd; border-radius: 5px; font-size: 16px; }
          textarea { height: 100px; resize: vertical; }
          .btn { padding: 12px 24px; border: none; border-radius: 5px; font-size: 16px; cursor: pointer; text-decoration: none; display: inline-block; }
          .btn-primary { background: #28a745; color: white; }
          .btn-secondary { background: #6c757d; color: white; margin-left: 10px; }
          .btn-danger { background: #dc3545; color: white; margin-left: 10px; }
          .button-group { margin-top: 30px; display: flex; gap: 10px; }
        </style>
      </head>
      <body>
        <div class="container">
          <h1>${isEdit ? "✏️ Редактировать путешествие" : "🧳 Создать путешествие"}</h1>
          
          <form id="travelForm">
            <div class="form-group">
              <label for="trip_name">Название путешествия *</label>
              <input type="text" id="trip_name" name="trip_name" 
                     value="${isEdit ? travel.trip_name : ""}" 
                     required placeholder="Например: Отпуск в горах">
            </div>

            <div class="form-group">
              <label for="location">Место</label>
              <input type="text" id="location" name="location" 
                     value="${isEdit ? travel.location || "" : ""}" 
                     placeholder="Например: Алтай, Россия">
            </div>

            <div class="form-group">
              <label for="start_date">Дата начала</label>
              <input type="date" id="start_date" name="start_date" 
                     value="${isEdit ? travel.start_date : ""}">
            </div>

            <div class="form-group">
              <label for="end_date">Дата окончания</label>
              <input type="date" id="end_date" name="end_date" 
                     value="${isEdit ? travel.end_date : ""}">
            </div>

            <div class="form-group">
              <label for="description">Описание</label>
              <textarea id="description" name="description" 
                        placeholder="Опишите ваше путешествие...">${isEdit ? travel.description || "" : ""}</textarea>
            </div>

            <div class="button-group">
              <button type="submit" class="btn btn-primary">
                ${isEdit ? "💾 Сохранить изменения" : "➕ Создать путешествие"}
              </button>
              <a href="${cancelUrl}" class="btn btn-secondary">
                ↩️ Отмена
              </a>
              ${
                isEdit
                  ? `
                <button type="button" class="btn btn-danger" onclick="deleteTravel()">
                  🗑️ Удалить
                </button>
              `
                  : ""
              }
            </div>
          </form>
        </div>

        <script>
          document.getElementById('travelForm').addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const submitBtn = this.querySelector('button[type="submit"]');
            const originalText = submitBtn.textContent;
            submitBtn.textContent = 'Сохранение...';
            submitBtn.disabled = true;
            
            const formData = new FormData(this);
            const data = Object.fromEntries(formData.entries());
            
            const method = ${isEdit ? "'PUT'" : "'POST'"};
            
            try {
              const response = await fetch('${actionUrl}', {
                method: method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
              });
              
              const result = await response.json();
              
              if (result.success) {
                alert('✅ ${isEdit ? "Изменения сохранены!" : "Путешествие создано!"}');
                window.location.href = '${cancelUrl}';
              } else {
                alert('❌ Ошибка: ' + (result.error || 'Неизвестная ошибка'));
                submitBtn.textContent = originalText;
                submitBtn.disabled = false;
              }
            } catch (error) {
              alert('❌ Ошибка сети');
              submitBtn.textContent = originalText;
              submitBtn.disabled = false;
            }
          });
          
          ${
            isEdit
              ? `
          async function deleteTravel() {
            if (confirm('Вы уверены, что хотите удалить это путешествие?')) {
              try {
                const response = await fetch('/api/travels/${travel.id}', {
                  method: 'DELETE'
                });
                
                const result = await response.json();
                
                if (result.success) {
                  alert('✅ Путешествие удалено!');
                  window.location.href = '/travels';
                } else {
                  alert('❌ Ошибка: ' + (result.error || 'Неизвестная ошибка'));
                }
              } catch (error) {
                alert('❌ Ошибка сети');
              }
            }
          }
          `
              : ""
          }
        </script>
      </body>
      </html>
    `;
  }

  static async list(req, res) {
    try {
      const userId = req.session.userId;

      TravelValidator.validateUserAuthorization(userId);

      const travels = await Travel.findByUserId(userId);

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
      res.status(500).send(`
        <h1>Ошибка сервера</h1>
        <p>${error.message}</p>
        <a href="/">На главную</a>
      `);
    }
  }

  static async show(req, res) {
    try {
      const userId = req.session.userId;

      if (!userId) {
        return res.status(401).send(`
          <h1>Требуется авторизация</h1>
          <p>Пожалуйста, <a href="/login">войдите в систему</a>.</p>
        `);
      }

      const travelId = req.params.id;

      // Проверяем доступ
      const hasAccess = await Travel.hasAccess(travelId, userId);
      if (!hasAccess) {
        return res.status(403).send(`
          <h1>Нет доступа к этому путешествию</h1>
          <a href="/travels">Вернуться к списку</a>
        `);
      }

      const travel = await Travel.findById(travelId, userId);

      if (!travel) {
        return res.status(404).send(`
          <h1>Путешествие не найдено</h1>
          <a href="/travels">Вернуться к списку</a>
        `);
      }

      // Получаем участников
      const participants = await Travel.getParticipants(travelId);

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
      res.status(500).send(`
        <h1>Ошибка сервера</h1>
        <p>${error.message}</p>
        <a href="/">На главную</a>
      `);
    }
  }

  static async update(req, res) {
    try {
      const { id } = req.params;
      const userId = req.session.userId;
      const { trip_name, location, start_date, end_date, description } =
        req.body;

      TravelValidator.validateUserAuthorization(userId);
      TravelValidator.validateId(id, "путешествия");
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
      TravelValidator.validateId(id, "путешествия");

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
