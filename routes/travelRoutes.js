const express = require("express");
const TravelController = require("../controllers/travelController");
const router = express.Router();

// API маршруты
router.post("/api/travels", TravelController.create);
router.get("/api/travels", TravelController.getUserTravels);
router.get("/api/travels/:id", TravelController.getTravelById);
router.put("/api/travels/:id", TravelController.update);
router.delete("/api/travels/:id", TravelController.delete);

// Страница конкретного путешествия
router.get("/travel/:id", async (req, res) => {
  try {
    const travelId = req.params.id;

    // Проверяем авторизацию
    if (!req.session.userId) {
      return res.redirect("/login");
    }

    // Получаем данные путешествия
    const travel = await require("../Models/Travel_model").findById(
      travelId,
      req.session.userId
    );

    if (!travel) {
      return res.status(404).render("error", {
        title: "Ошибка",
        message: "Путешествие не найдено",
      });
    }

    res.render("travel", {
      title: travel.trip_name,
      travel: travel,
      userId: req.session.userId,
    });
  } catch (error) {
    console.error("Ошибка загрузки страницы путешествия:", error);
    res.status(500).render("error", {
      title: "Ошибка",
      message: "Не удалось загрузить страницу путешествия",
    });
  }
});

module.exports = router;
