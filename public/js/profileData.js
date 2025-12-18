async function loadAndDisplayUserData() {
  try {
    console.log("📡 Загружаю данные пользователя...");

    // Делаем запрос к серверу за данными пользователя
    const response = await fetch("/api/auth/check", {
      method: "GET",
    });

    if (!response.ok) {
      console.error("❌ Ошибка сервера:", response.status);
      return;
    }

    const data = await response.json();

    // Если пользователь авторизован (он должен быть, иначе нас бы сюда не пустили)
    if (data.success && data.isAuthenticated && data.user) {
      // Выводим имя пользователя
      document.getElementById("userNameDisplay").textContent =
        data.user.username;

      // Выводим email (он всегда есть по условию)
      document.getElementById("userEmailDisplay").textContent = data.user.email;

      console.log("✅ Данные пользователя загружены:", data.user.username);
    }
  } catch (error) {
    console.error("❌ Ошибка загрузки данных пользователя:", error);
  }
}

// Экспортируем функции для использования в HTML
window.loadAndDisplayUserData = loadAndDisplayUserData;

// Автоматически загружаем данные при загрузке скрипта
document.addEventListener("DOMContentLoaded", loadAndDisplayUserData);
