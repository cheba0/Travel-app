// public/js/homeAuth.js (упрощенная версия)

// Основная функция проверки авторизации
async function checkHomePageAuth() {
  try {
    const response = await fetch("/api/auth/check", { credentials: "include" });
    const data = await response.json();

    const authContent = document.getElementById("authContent");
    const nonAuthContent = document.getElementById("nonAuthContent");

    if (data.isAuthenticated) {
      // Показываем контент для авторизованных
      authContent.style.display = "block";
      nonAuthContent.style.display = "none";

      // Сохраняем данные
      if (data.user) {
        localStorage.setItem("userId", data.user.id);
      }
    } else {
      // Показываем приветствие для неавторизованных
      authContent.style.display = "none";
      nonAuthContent.style.display = "block";
    }
  } catch (error) {
    // При ошибке показываем приветствие
    document.getElementById("authContent").style.display = "none";
    document.getElementById("nonAuthContent").style.display = "block";
  }
}

// Обработка кнопки "Начать"
document.addEventListener("DOMContentLoaded", function () {
  // Проверяем авторизацию
  checkHomePageAuth();

  // Обработчики для иконок навигации
  document.getElementById("addIcon").onclick = function (e) {
    e.preventDefault();
    const userId = localStorage.getItem("userId");
    window.location.href = userId ? "/add" : "/login";
  };

  document.getElementById("profileIcon").onclick = function (e) {
    e.preventDefault();
    const userId = localStorage.getItem("userId");
    window.location.href = userId ? "/profile" : "/login";
  };
});
