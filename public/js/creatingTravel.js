// public/js/creatingTravel.js
console.log("✅ creatingTravel.js загружен");

document.addEventListener("DOMContentLoaded", function () {
  console.log("✅ DOM полностью загружен");

  const travelForm = document.getElementById("addForm");
  const messageDiv = document.getElementById("message");

  console.log("Найдена форма 'addForm':", !!travelForm);
  console.log("Найден div 'message':", !!messageDiv);

  // Проверим все поля формы
  if (travelForm) {
    console.log("Поля формы:");
    const inputs = travelForm.querySelectorAll("input, textarea, select");
    inputs.forEach((input) => {
      console.log(
        `- ${input.name || input.id}: type="${input.type}", name="${
          input.name
        }"`
      );
    });
  }

  if (travelForm) {
    travelForm.addEventListener("submit", async function (e) {
      e.preventDefault();
      console.log("✅ Форма отправляется через Travel.js");

      if (messageDiv) {
        messageDiv.style.color = "blue";
        messageDiv.textContent = "Создание путешествия...";
      }

      // СПОСОБ 1: Используем FormData
      const formData = new FormData(travelForm);

      // Отладочный вывод всех данных формы
      console.log("=== ВСЕ ДАННЫЕ ИЗ FORMDATA ===");
      for (let [key, value] of formData.entries()) {
        console.log(`${key}:`, value);
      }

      // Преобразуем в объект
      const travelData = {
        trip_name: formData.get("trip_name"),
        location: formData.get("location"),
        start_date: formData.get("start_date"),
        end_date: formData.get("end_date") || null,
        description: formData.get("description") || "",
      };

      console.log("✅ Данные для отправки:", travelData);

      // Проверяем, есть ли обязательные данные
      if (
        !travelData.trip_name ||
        !travelData.location ||
        !travelData.start_date
      ) {
        console.error("❌ Отсутствуют обязательные поля:");
        console.error("- trip_name:", travelData.trip_name);
        console.error("- location:", travelData.location);
        console.error("- start_date:", travelData.start_date);

        if (messageDiv) {
          messageDiv.style.color = "red";
          messageDiv.textContent = "Заполните все обязательные поля!";
        }
        return;
      }

      try {
        console.log("📤 Отправляю POST запрос на /api/travels...");

        const response = await fetch("/api/travels", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(travelData),
        });

        console.log("📥 Статус ответа:", response.status);
        console.log("📥 URL ответа:", response.url);

        const result = await response.json();
        console.log("📥 Полный ответ сервера:", result);

        if (messageDiv) {
          if (result.success) {
            messageDiv.style.color = "green";
            messageDiv.textContent = "Путешествие успешно создано!";

            if (result.travel) {
              messageDiv.textContent += ` (ID: ${result.travel.id})`;
            }

            setTimeout(() => {
              window.location.href = `/`;
            }, 1000);

            travelForm.reset();
          } else {
            messageDiv.style.color = "red";
            messageDiv.textContent =
              "Ошибка: " + (result.error || "Неизвестная ошибка");
          }
        }
      } catch (error) {
        console.error("❌ Ошибка при создании путешествия:", error);
        if (messageDiv) {
          messageDiv.style.color = "red";
          messageDiv.textContent =
            "Сетевая ошибка: /last_travel" + error.message;
        }
      }
    });
  } else {
    console.error("❌ Форма с id='addForm' не найдена!");
  }
});
