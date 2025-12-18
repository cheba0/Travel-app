// public/js/homeAuth.js (упрощенная версия)

// Основная функция проверки авторизации
async function checkHomePageAuth() {
  const authContent = document.getElementById("authContent");
  const authContentHeader = document.getElementById("authContentHeader");
  const nonAuthContent = document.getElementById("nonAuthContent");

  if (authContent) authContent.style.display = "none";
  if (authContentHeader) authContentHeader.style.display = "none";
  if (nonAuthContent) nonAuthContent.style.display = "none";

  try {
    const response = await fetch("/api/auth/check", { credentials: "include" });
    const data = await response.json();

    if (data.isAuthenticated) {
      // Показываем контент для авторизованных
      authContent.style.display = "block";
      authContentHeader.style.display = "block";

      // Сохраняем данные
      if (data.user) {
        localStorage.setItem("userId", data.user.id);
      }
    } else {
      // Показываем приветствие для неавторизованных
      nonAuthContent.style.display = "block";
    }
  } catch (error) {
    // При ошибке показываем приветствие
    document.getElementById("authContent").style.display = "none";
    document.getElementById("authContentHeader").style.display = "none";
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
