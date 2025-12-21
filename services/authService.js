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
// services/validationService.js
class TravelValidator {
  // Проверка авторизации пользователя
  static validateUserAuthorization(userId) {
    if (!userId) {
      throw new Error("Вы не авторизованы");
    }
    return true;
  }

  // Валидация ID (общая для всех сущностей)
  static validateId(id, entityName = "объекта") {
    if (!id || isNaN(parseInt(id)) || parseInt(id) <= 0) {
      throw new Error(`Некорректный ID ${entityName}`);
    }
    return true;
  }

  // Валидация данных путешествия
  static validateTravelData(travelData, isUpdate = false) {
    const { trip_name, location, start_date, end_date } = travelData;

    // Для создания проверяем обязательные поля
    if (!isUpdate) {
      if (!trip_name || !location || !start_date) {
        throw new Error(
          "Пожалуйста, заполните все обязательные поля: название, локация, дата начала"
        );
      }
    } else {
      // Для обновления проверяем только если поля предоставлены
      if (trip_name !== undefined && !trip_name.trim()) {
        throw new Error("Название путешествия не может быть пустым");
      }

      if (location !== undefined && !location.trim()) {
        throw new Error("Локация не может быть пустой");
      }

      if (start_date !== undefined && !start_date) {
        throw new Error("Дата начала обязательна");
      }
    }

    // Проверка дат (если предоставлены обе даты)
    if (start_date && end_date) {
      const startDate = new Date(start_date);
      const endDate = new Date(end_date);

      if (endDate < startDate) {
        throw new Error("Дата окончания не может быть раньше даты начала");
      }
    }

    // Дополнительные проверки
    if (trip_name && trip_name.length > 100) {
      throw new Error("Название путешествия не должно превышать 100 символов");
    }

    if (location && location.length > 200) {
      throw new Error("Локация не должна превышать 200 символов");
    }

    // Проверка формата дат
    if (start_date && isNaN(new Date(start_date).getTime())) {
      throw new Error("Некорректный формат даты начала");
    }

    if (end_date && end_date !== "" && isNaN(new Date(end_date).getTime())) {
      throw new Error("Некорректный формат даты окончания");
    }

    return true;
  }

  // Валидация данных расхода
  static validateExpenseData(expenseData, isUpdate = false) {
    const { expense_name, amount, date, trip_id, paid_by } = expenseData;

    // Для создания проверяем обязательные поля
    if (!isUpdate) {
      if (!expense_name || !amount || !date || !trip_id || !paid_by) {
        console.log("хуй");
        throw new Error(
          "Пожалуйста, заполните все обязательные поля: название, сумма, дата, ID путешествия"
        );
      }
    } else {
      // Для обновления проверяем только если поля предоставлены
      if (expense_name !== undefined && !expense_name.trim()) {
        throw new Error("Название расхода не может быть пустым");
      }

      if (amount !== undefined && (!amount || parseFloat(amount) <= 0)) {
        throw new Error("Сумма должна быть положительным числом");
      }

      if (date !== undefined && !date) {
        throw new Error("Дата обязательна");
      }
    }

    // Проверка суммы
    if (amount) {
      const amountNum = parseFloat(amount);
      if (isNaN(amountNum) || amountNum <= 0) {
        throw new Error("Сумма должна быть положительным числом");
      }

      if (amountNum > 10000000) {
        throw new Error("Сумма не должна превышать 10,000,000");
      }
    }

    // Дополнительные проверки
    if (expense_name && expense_name.length > 255) {
      throw new Error("Название расхода не должно превышать 255 символов");
    }

    // Проверка формата даты
    if (date && isNaN(new Date(date).getTime())) {
      throw new Error("Некорректный формат даты");
    }

    // Проверка описания
    if (expenseData.description && expenseData.description.length > 500) {
      throw new Error("Описание не должно превышать 500 символов");
    }

    return true;
  }
}

class TravelFormValidator {
  // Основная валидация формы
  static validateForm(formData, isUpdate = false) {
    const errors = {};

    // Для создания проверяем обязательные поля
    if (!isUpdate) {
      if (!formData.trip_name || !formData.trip_name.trim()) {
        errors.trip_name = "Пожалуйста, введите название";
      }

      if (!formData.location || !formData.location.trim()) {
        errors.location = "Пожалуйста, укажите место";
      }

      if (!formData.start_date) {
        errors.start_date = "Пожалуйста, выберите дату начала";
      }
    } else {
      // Для обновления проверяем только если поля предоставлены
      if (formData.trip_name !== undefined && !formData.trip_name.trim()) {
        errors.trip_name = "Название путешествия не может быть пустым";
      }

      if (formData.location !== undefined && !formData.location.trim()) {
        errors.location = "Локация не может быть пустой";
      }
    }

    // Проверка длины полей
    if (formData.trip_name && formData.trip_name.length > 100) {
      errors.trip_name =
        "Название путешествия не должно превышать 100 символов";
    }

    if (formData.location && formData.location.length > 200) {
      errors.location = "Локация не должна превышать 200 символов";
    }

    // Проверка дат
    if (formData.start_date && formData.end_date) {
      const startDate = new Date(formData.start_date);
      const endDate = new Date(formData.end_date);

      if (endDate < startDate) {
        errors.end_date = "Дата окончания не может быть раньше даты начала";
      }
    }

    // Проверка формата дат
    if (formData.start_date && isNaN(new Date(formData.start_date).getTime())) {
      errors.start_date = "Некорректный формат даты начала";
    }

    if (
      formData.end_date &&
      formData.end_date !== "" &&
      isNaN(new Date(formData.end_date).getTime())
    ) {
      errors.end_date = "Некорректный формат даты окончания";
    }

    return errors;
  }

  // Валидация отдельных полей
  static validateField(fieldName, value, formData = {}) {
    switch (fieldName) {
      case "trip_name":
        if (!value || !value.trim()) {
          return "Пожалуйста, введите название";
        }
        if (value.length > 100) {
          return "Название не должно превышать 100 символов";
        }
        break;

      case "location":
        if (!value || !value.trim()) {
          return "Пожалуйста, укажите место";
        }
        if (value.length > 200) {
          return "Локация не должна превышать 200 символов";
        }
        break;

      case "start_date":
        if (!value) {
          return "Пожалуйста, выберите дату начала";
        }
        if (isNaN(new Date(value).getTime())) {
          return "Некорректный формат даты";
        }
        break;

      case "end_date":
        if (value) {
          if (isNaN(new Date(value).getTime())) {
            return "Некорректный формат даты";
          }
          if (
            formData.start_date &&
            new Date(value) < new Date(formData.start_date)
          ) {
            return "Дата окончания не может быть раньше даты начала";
          }
        }
        break;

      case "description":
        if (value && value.length > 2000) {
          return "Описание не должно превышать 2000 символов";
        }
        break;
    }

    return "";
  }
}

module.exports.AuthService = AuthService;
module.exports.TravelValidator = TravelValidator;
module.exports.TravelFormValidator = TravelFormValidator;
