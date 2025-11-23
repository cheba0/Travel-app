const AuthService = require("../services/authService");

class AuthController {
  static async register(req, res) {
    try {
      console.log("Получены данные регистрации:", req.body);
      const userData = req.body;

      const result = await AuthService.register(userData);

      if (result.success) {
        res.json(result);
      } else {
        res.status(400).json(result);
      }
    } catch (error) {
      console.error("Ошибка в контроллере регистрации:", error);
      res.status(500).json({
        success: false,
        error: "Внутренняя ошибка сервера",
      });
    }
  }

  static async login(req, res) {
    try {
      const { email, password } = req.body;
      const result = await AuthService.login(email, password);

      if (result.success) {
        res.json(result);
      } else {
        res.status(401).json(result);
      }
    } catch (error) {
      console.error("Ошибка в контроллере входа:", error);
      res.status(500).json({
        success: false,
        error: "Внутренняя ошибка сервера",
      });
    }
  }
}

module.exports = AuthController;
