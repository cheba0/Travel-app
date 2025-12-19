// public/js/homeAuth.js

// Основная функция проверки авторизации
async function checkHomePageAuth() {
  const authContent = document.getElementById("authContent");
  const authContentHeader = document.getElementById("authContentHeader");
  const nonAuthContent = document.getElementById("nonAuthContent");

  if (authContent) authContent.hidden = true;
  if (authContentHeader) authContentHeader.hidden = true;
  if (nonAuthContent) nonAuthContent.hidden = true;

  try {
    const response = await fetch("/api/auth/check", { credentials: "include" });
    if (!response.ok) return;
    const data = await response.json();

    if (data.isAuthenticated) {
      // Показываем контент для авторизованных
      authContent.hidden = false;
      authContentHeader.hidden = false;
    } else {
      // Показываем приветствие для неавторизованных
      nonAuthContent.hidden = false;
    }
  } catch (error) {
    // При ошибке показываем приветствие
    document.getElementById("authContent").hidden = true;
    document.getElementById("authContentHeader").hidden = true;
    document.getElementById("nonAuthContent").hidden = true;
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
