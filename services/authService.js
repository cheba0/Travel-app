const User = require("../Models/User");
console.log(" AuthService загружен");
class AuthService {
  // Регистрация пользователя
  static async register(userData) {
    try {
      // Валидация данных
      this.validateRegistrationData(userData);

      // Создание пользователя
      const user = await User.create(userData);

      return {
        success: true,
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
        },
        message: "Пользователь успешно зарегистрирован",
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  // Вход пользователя
  static async login(email, password) {
    try {
      // Валидация
      if (!email || !password) {
        throw new Error("Email и пароль обязательны");
      }

      // Поиск пользователя
      const user = await User.findByEmail(email);
      if (!user) {
        throw new Error("Пользователь с таким email не найден");
      }

      // Проверка пароля
      const isPasswordValid = await User.verifyPassword(
        password,
        user.password_hash
      );
      if (!isPasswordValid) {
        throw new Error("Неверный пароль");
      }

      // Возвращаем пользователя без пароля
      const { password_hash, ...userWithoutPassword } = user;

      return {
        success: true,
        user: userWithoutPassword,
        message: "Вход выполнен успешно",
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  // Валидация данных регистрации
  static validateRegistrationData(userData) {
    const { username, email, password, confirmPassword } = userData;

    if (!username || !email || !password) {
      throw new Error("Имя пользователя, email и пароль обязательны");
    }

    if (password !== confirmPassword) {
      throw new Error("Пароли не совпадают");
    }

    if (password.length < 6) {
      throw new Error("Пароль должен содержать минимум 6 символов");
    }

    if (!this.isValidEmail(email)) {
      throw new Error("Некорректный формат email");
    }
  }
  static isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }
}

module.exports = AuthService;
