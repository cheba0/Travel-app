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

      if (data.success && data.isAuthenticated) {
        updateProfileButton(true, data.user);
      } else {
        updateProfileButton(false, null);
      }
    } catch (jsonError) {
      console.error("❌ Ошибка парсинга JSON:", jsonError.message);
      console.log(
        "📄 Полный ответ (первые 500 символов):",
        responseText.substring(0, 500)
      );
      updateProfileButton(false, null);
    }
  } catch (error) {
    console.error("❌ Общая ошибка проверки авторизации:", error);
    console.error("Тип ошибки:", typeof error);
    console.error("Сообщение:", error.message);
    console.error("Стек:", error.stack);
    updateProfileButton(false, null);
  }
}

function updateProfileButton(isLoggedIn, user) {
  const profileIcon = document.getElementById("profileIcon");
  if (!profileIcon) {
    console.error("❌ Элемент profileIcon не найден!");
    return;
  }

  console.log(
    `🔄 Обновляю кнопку: ${isLoggedIn ? "авторизован" : "не авторизован"}`
  );

  if (isLoggedIn && user) {
    profileIcon.href = "/profile";
    profileIcon.title = `Профиль: ${user.username}`;
  } else {
    profileIcon.href = "/login";
    profileIcon.title = "Войти";
  }
}

async function handleProfileClick() {
  console.log("🖱️ Клик по профилю");

  // Просто переходим на страницу входа (без проверки)
  window.location.href = "/login";
}

// Экспортируем для глобального доступа
window.handleProfileClick = handleProfileClick;
