// public/js/profileCheck.js

document.addEventListener("DOMContentLoaded", function () {
  console.log("✅ profileCheck.js загружен");

  // Не вызываем сразу проверку, дадим время на загрузку
  setTimeout(checkAuthStatus, 1000);

  const profileIcon = document.getElementById("profileIcon");
  if (profileIcon) {
    profileIcon.addEventListener("click", function (e) {
      e.preventDefault();
      handleProfileClick();
    });
  }

  const addIcon = document.getElementById("addIcon");
  if (addIcon) {
    addIcon.addEventListener("click", function (e) {
      e.preventDefault();
      handleAddClick();
    });
  }
});

async function checkAuthStatus() {
  console.log("🔍 Начинаю проверку авторизации...");

  try {
    // Пробуем несколько вариантов URL
    const urls = [
      "/api/auth/check",
      "http://localhost:3000/api/auth/check",
      "/check",
    ];

    let response = null;
    let urlUsed = "";

    // Пробуем каждый URL
    for (const url of urls) {
      try {
        console.log(`Пробую URL: ${url}`);
        response = await fetch(url, {
          method: "GET",
          headers: {
            Accept: "application/json",
          },
        });
        urlUsed = url;
        console.log(`Ответ от ${url}: статус ${response.status}`);
        break; // Если получили ответ, выходим из цикла
      } catch (err) {
        console.log(`Ошибка для ${url}:`, err.message);
        continue; // Пробуем следующий URL
      }
    }

    if (!response) {
      console.error("❌ Не получили ответ ни от одного URL");
      updateProfileButton(false, null);
      return;
    }

    // Получаем текст ответа
    const responseText = await response.text();
    console.log("📄 Текст ответа:", responseText.substring(0, 200));

    // Пытаемся распарсить JSON
    try {
      const data = JSON.parse(responseText);
      console.log("✅ JSON распарсен:", data);
    } catch (jsonError) {
      console.error("❌ Ошибка парсинга JSON:", jsonError.message);
      console.log(
        "📄 Полный ответ (первые 500 символов):",
        responseText.substring(0, 500)
      );
    }
  } catch (error) {
    console.error("❌ Общая ошибка проверки авторизации:", error);
    console.error("Тип ошибки:", typeof error);
    console.error("Сообщение:", error.message);
    console.error("Стек:", error.stack);
  }
}

async function handleProfileClick() {
  console.log("🖱️ Клик по профилю");

  // Сначала проверяем localStorage (быстро)
  const userId = localStorage.getItem("userId");

  if (userId) {
    console.log("✅ Есть данные в localStorage, переход на профиль");
    window.location.href = "/profile";
    return;
  }

  // Если в localStorage нет, проверяем сервер
  try {
    console.log("🔍 Проверяю серверную авторизацию перед переходом...");
    const response = await fetch("/api/auth/check");

    if (response.ok) {
      const data = await response.json();

      if (data.success && data.isAuthenticated) {
        console.log("✅ Сервер подтвердил авторизацию");

        // Сохраняем в localStorage
        if (data.user) {
          localStorage.setItem("userId", data.user.id);
          localStorage.setItem("username", data.user.username);
        }

        window.location.href = "/profile";
        return;
      }
    }
  } catch (error) {
    console.error("Ошибка при проверке:", error);
  }

  // Если не авторизован, идем на вход
  console.log("❌ Не авторизован, переход на вход");
  localStorage.removeItem("userId");
  localStorage.removeItem("username");
  localStorage.removeItem("userEmail");

  console.log("✅ Переход на вход");
  window.location.href = "/login";
}

async function handleAddClick() {
  console.log("🖱️ Клик по add");

  // Сначала проверяем localStorage (быстро)
  const userId = localStorage.getItem("userId");

  if (userId) {
    console.log("✅ Есть данные в localStorage, переход на add");
    window.location.href = "/add";
    return;
  }

  // Если в localStorage нет, проверяем сервер
  try {
    console.log("🔍 Проверяю серверную авторизацию перед переходом...");
    const response = await fetch("/api/auth/check");

    if (response.ok) {
      const data = await response.json();

      if (data.success && data.isAuthenticated) {
        console.log("✅ Сервер подтвердил авторизацию");

        // Сохраняем в localStorage
        if (data.user) {
          localStorage.setItem("userId", data.user.id);
          localStorage.setItem("username", data.user.username);
        }

        window.location.href = "/add";
        return;
      }
    }
  } catch (error) {
    console.error("Ошибка при проверке:", error);
  }

  // Если не авторизован, идем на вход
  console.log("❌ Не авторизован, переход на вход");
  localStorage.removeItem("userId");
  localStorage.removeItem("username");
  localStorage.removeItem("userEmail");

  console.log("✅ Переход на вход");
  window.location.href = "/login";
}

// Функция для обновления данных после входа/регистрации
function updateAfterAuth(userData) {
  console.log("💾 Обновляю данные после авторизации:", userData);

  if (userData && userData.id) {
    localStorage.setItem("userId", userData.id);
    localStorage.setItem("username", userData.username || "Пользователь");
    localStorage.setItem("userEmail", userData.email || "");

    // Перезагружаем проверку сервера
    setTimeout(checkServerAuth, 1000);
  }
}

// Экспортируем функции для глобального доступа
window.handleProfileClick = handleProfileClick;
window.updateAfterAuth = updateAfterAuth;
