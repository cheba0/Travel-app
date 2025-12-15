const AuthService = require("../services/authService");

class AuthController {
  static async register(req, res) {
    try {
      console.log("Register request:", req.body);
      const result = await AuthService.register(req.body);

      if (result.success && result.user) {
        // Устанавливаем сессию
        req.session.userId = result.user.id;
        req.session.user = {
          id: result.user.id,
          username: result.user.username,
          email: result.user.email,
        };

        return res.json({
          success: true,
          message: "Регистрация успешна",
          user: {
            id: result.user.id,
            username: result.user.username,
            email: result.user.email,
          },
        });
      }

      return res.status(400).json(result);
    } catch (error) {
      console.error("Register error:", error);
      return res.status(500).json({
        success: false,
        error: "Внутренняя ошибка сервера",
      });
    }
  }

  static async login(req, res) {
    try {
      const { email, password } = req.body;
      const result = await AuthService.login(email, password);

      if (result.success && result.user) {
        // Устанавливаем сессию
        req.session.userId = result.user.id;
        req.session.user = {
          id: result.user.id,
          username: result.user.username,
          email: result.user.email,
        };

        return res.json({
          success: true,
          message: "Вход выполнен успешно",
          user: {
            id: result.user.id,
            username: result.user.username,
            email: result.user.email,
          },
        });
      }

      return res.status(401).json(result);
    } catch (error) {
      console.error("Login error:", error);
      return res.status(500).json({
        success: false,
        error: "Внутренняя ошибка сервера",
      });
    }
  }

  static async checkAuth(req, res) {
    try {
      console.log("🔍 checkAuth вызван, сессия:", req.session);

      if (req.session && req.session.userId) {
        console.log("✅ Пользователь авторизован, ID:", req.session.userId);
        return res.json({
          success: true,
          isAuthenticated: true,
          user: {
            id: req.session.userId,
            username: req.session.user?.username || "Пользователь",
            email: req.session.user?.email || "",
          },
        });
      } else {
        console.log("❌ Пользователь не авторизован");
        return res.json({
          success: true,
          isAuthenticated: false,
          user: null,
        });
      }
    } catch (error) {
      console.error("Ошибка в checkAuth:", error);
      return res.status(500).json({
        success: false,
        error: "Internal server error",
      });
    }
  }
}
module.exports = AuthController;
