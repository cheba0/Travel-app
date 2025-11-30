// public/js/Register.js
console.log(" Register.js загружен");

document.addEventListener("DOMContentLoaded", function () {
  const registerForm = document.getElementById("registerForm");
  const messageDiv = document.getElementById("message");

  console.log(" Форма найдена:", !!registerForm);

  if (registerForm) {
    registerForm.addEventListener("submit", async function (e) {
      e.preventDefault();
      console.log(" ФОРМА ОТПРАВЛЯЕТСЯ ЧЕРЕЗ JS!");

      if (messageDiv) {
        messageDiv.style.color = "blue";
        messageDiv.textContent = "Отправка данных...";
      }

      const formData = new FormData(registerForm);
      const userData = Object.fromEntries(formData);

      console.log(" Данные для отправки:", userData);

      try {
        console.log("Отправляю POST запрос...");
        const response = await fetch("/api/register", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(userData),
        });

        console.log(" Статус ответа:", response.status);
        console.log(" URL ответа:", response.url);

        const result = await response.json();
        console.log(" Полный ответ сервера:", result);

        if (messageDiv) {
          if (result.success) {
            messageDiv.style.color = "green";

            if (result.user && result.user.id) {
              messageDiv.textContent =
                result.message + " (ID: " + result.user.id + ")";
            } else {
              messageDiv.textContent =
                result.message + " (Регистрация успешна!)";
            }
            registerForm.reset();
          } else {
            messageDiv.style.color = "red";
            messageDiv.textContent =
              "Ошибка: " + (result.error || "Неизвестная ошибка");
          }
        }
      } catch (error) {
        console.error("Ошибка:", error);
        if (messageDiv) {
          messageDiv.style.color = "red";
          messageDiv.textContent = "Сетевая ошибка: " + error.message;
        }
      }
    });
  }
});
