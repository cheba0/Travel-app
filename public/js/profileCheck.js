console.log("✅ profileCheck.js загружен");

class SessionChecker {
  constructor() {
    this.config = {
      sessionCheckEndpoint: "/api/session/check",
      profileCheckEndpoint: "/api/profile/check",
      sessionInfoEndpoint: "/api/session/info",
      logoutEndpoint: "/api/session/logout",
      redirectDelay: 1500,
      messageDuration: 3000,
      maxRetries: 2,
    };

    this.attempts = 0;
    this.isChecking = false;
    this.init();
  }

  init() {
    // Проверяем, есть ли сессия при загрузке страницы
    this.autoCheckOnLoad();

    // Настраиваем обработчики для всех кнопок профиля
    this.setupProfileButtons();

    // Добавляем глобальный метод
    window.checkUserSession = () => this.checkSession();
  }

  autoCheckOnLoad() {
    // Проверяем сессию при загрузке страницы, но только на главной
    if (
      window.location.pathname === "/" ||
      window.location.pathname === "/index.ejs" ||
      window.location.pathname.includes("index")
    ) {
      setTimeout(() => {
        this.checkSessionStatus();
      }, 1000);
    }
  }

  setupProfileButtons() {
    const profileSelectors = [
      "#profileIcon",
      ".profile-icon",
      "[data-profile]",
      '[data-action="profile"]',
      ".user-avatar",
      ".account-icon",
      ".login-btn",
      ".register-btn",
      '[href*="profile"]',
      '[href*="login"]',
      '[href*="register"]',
    ];

    profileSelectors.forEach((selector) => {
      const elements = document.querySelectorAll(selector);
      elements.forEach((element) => {
        element.addEventListener("click", (e) =>
          this.handleProfileClick(e, element)
        );
      });
    });

    // Также добавляем обработчик для всех ссылок с классом nav-link
    document.querySelectorAll(".nav-link").forEach((link) => {
      link.addEventListener("click", (e) => {
        if (
          link.href &&
          (link.href.includes("profile") ||
            link.href.includes("account") ||
            link.href.includes("dashboard"))
        ) {
          e.preventDefault();
          this.checkAndRedirect();
        }
      });
    });
  }

  handleProfileClick(e, element) {
    // Предотвращаем стандартное поведение только для ссылок
    if (element.tagName === "A") {
      e.preventDefault();
    }

    console.log("🎯 Нажата кнопка профиля:", {
      tag: element.tagName,
      id: element.id,
      class: element.className,
      href: element.href,
    });

    this.checkAndRedirect();
  }

  async checkAndRedirect() {
    if (this.isChecking) {
      console.log("⏳ Проверка уже выполняется...");
      return;
    }

    this.isChecking = true;
    this.showMessage("Проверка сессии...", "info");

    try {
      const hasSession = await this.checkSession();

      if (hasSession) {
        // Если есть сессия - перенаправляем на страницу профиля или авторизации
        this.redirectTo("/profile");
      } else {
        // Если нет сессии - проверяем, есть ли данные в localStorage
        const hasLocalData = this.checkLocalStorage();

        if (hasLocalData) {
          // Если есть локальные данные - проверяем через POST
          const hasProfile = await this.checkProfileViaPost();
          this.redirectTo(hasProfile ? "/login" : "/registration");
        } else {
          // Если нет локальных данных - на регистрацию
          this.redirectTo("/registration");
        }
      }
    } catch (error) {
      console.error("❌ Ошибка при проверке:", error);
      this.showMessage("Ошибка подключения", "error");
      // Запасной вариант
      setTimeout(() => {
        this.redirectTo("/registration");
      }, this.config.redirectDelay);
    } finally {
      this.isChecking = false;
    }
  }

  async checkSession() {
    this.attempts++;

    try {
      console.log("📡 Проверяем сессию на сервере...");

      const response = await fetch(this.config.sessionCheckEndpoint, {
        method: "GET",
        headers: {
          "Cache-Control": "no-cache",
          Pragma: "no-cache",
        },
        credentials: "include", // Важно для отправки кук
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log("📊 Ответ проверки сессии:", data);

      // Сохраняем информацию о сессии в localStorage
      if (data.isAuthenticated && data.user) {
        this.saveSessionToLocal(data.user);
        return true;
      } else {
        this.clearLocalSession();
        return false;
      }
    } catch (error) {
      console.error("❌ Ошибка проверки сессии:", error);

      // Пробуем еще раз, если не превышен лимит
      if (this.attempts < this.config.maxRetries) {
        console.log(
          `🔄 Повторная попытка ${this.attempts}/${this.config.maxRetries}`
        );
        return await this.checkSession();
      }

      return false;
    }
  }

  async checkProfileViaPost() {
    const userData = this.getLocalUserData();

    if (!userData.email && !userData.userId) {
      return false;
    }

    try {
      console.log("📡 Проверяем профиль через POST...");

      const response = await fetch(this.config.profileCheckEndpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          email: userData.email,
          userId: userData.userId,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log("📊 Ответ проверки профиля:", data);

      return data.hasProfile;
    } catch (error) {
      console.error("❌ Ошибка проверки профиля:", error);
      return false;
    }
  }

  checkLocalStorage() {
    const userData = this.getLocalUserData();
    const hasData = !!(userData.email || userData.userId || userData.token);

    console.log("📱 Проверка localStorage:", {
      hasData,
      email: userData.email ? "установлен" : "отсутствует",
      userId: userData.userId ? "установлен" : "отсутствует",
      token: userData.token ? "установлен" : "отсутствует",
    });

    return hasData;
  }

  getLocalUserData() {
    return {
      email:
        localStorage.getItem("userEmail") ||
        sessionStorage.getItem("userEmail"),
      userId:
        localStorage.getItem("userId") || sessionStorage.getItem("userId"),
      token:
        localStorage.getItem("authToken") ||
        sessionStorage.getItem("authToken"),
      name:
        localStorage.getItem("userName") || sessionStorage.getItem("userName"),
    };
  }

  saveSessionToLocal(user) {
    if (user.email) localStorage.setItem("userEmail", user.email);
    if (user.id) localStorage.setItem("userId", user.id);
    if (user.name) localStorage.setItem("userName", user.name);

    // Сохраняем время последней проверки
    localStorage.setItem("lastSessionCheck", Date.now());
    console.log("💾 Сессия сохранена в localStorage");
  }

  clearLocalSession() {
    // Очищаем только сессионные данные, но не все localStorage
    const keysToKeep = ["theme", "language", "settings"]; // Настройки, которые хотим сохранить
    const allKeys = Object.keys(localStorage);

    allKeys.forEach((key) => {
      if (!keysToKeep.includes(key) && key.startsWith("user")) {
        localStorage.removeItem(key);
      }
    });

    console.log("🗑️ Сессионные данные очищены из localStorage");
  }

  async checkSessionStatus() {
    // Проверяем, когда была последняя проверка
    const lastCheck = localStorage.getItem("lastSessionCheck");
    const now = Date.now();

    // Если прошло больше 5 минут с последней проверки
    if (!lastCheck || now - parseInt(lastCheck) > 5 * 60 * 1000) {
      const hasSession = await this.checkSession();

      if (hasSession) {
        this.updateUIForLoggedInUser();
      } else {
        this.updateUIForGuest();
      }
    }
  }
}
