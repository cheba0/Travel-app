// public/js/login.js
console.log("login.js загружен");

document.addEventListener("DOMContentLoaded", function () {
  const loginForm = document.getElementById("loginForm");
  const messageDiv = document.getElementById("message");

  console.log("Форма входа найдена:", !!loginForm);

  if (loginForm) {
    loginForm.addEventListener("submit", async function (e) {
      e.preventDefault();
      console.log("ФОРМА ВХОДА ОТПРАВЛЯЕТСЯ ЧЕРЕЗ JS!");

      if (messageDiv) {
        messageDiv.style.color = "blue";
        messageDiv.textContent = "Выполняется вход...";
      }

      const formData = new FormData(loginForm);
      const loginData = Object.fromEntries(formData);

      console.log("Данные для входа:", loginData);

      try {
        console.log("Отправляю POST запрос для входа...");
        // ИЗМЕНИТЕ ЭТУ СТРОКУ:
        const response = await fetch("/api/login", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(loginData),
        });

        console.log("Статус ответа:", response.status);
        console.log("URL ответа:", response.url);

        const result = await response.json();
        console.log("Полный ответ сервера:", result);

        if (messageDiv) {
          if (result.success) {
            messageDiv.style.color = "green";

            if (result.user && result.user.username) {
              messageDiv.textContent =
                "Добро пожаловать, " +
                result.user.username +
                "! " +
                (result.message || "Вход выполнен успешно");
              if (result.user) {
                localStorage.setItem("userId", result.user.id);
                localStorage.setItem("userEmail", result.user.email);
                localStorage.setItem("username", result.user.username);
                console.log("💾 Данные сохранены в localStorage");
              }

              setTimeout(() => {
                window.location.href = "/";
              }, 2000);
            } else {
              messageDiv.textContent =
                result.message || "Вход выполнен успешно!";
            }

            loginForm.reset();
          } else {
            messageDiv.style.color = "red";
            messageDiv.textContent =
              "Ошибка: " + (result.error || "Неизвестная ошибка");
          }
        }
      } catch (error) {
        console.error("Ошибка сети:", error);
        if (messageDiv) {
          messageDiv.style.color = "red";
          messageDiv.textContent = "Сетевая ошибка: " + error.message;
        }
      }
    });
  }
});
