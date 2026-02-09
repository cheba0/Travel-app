console.log("expenses.js загружен");

document.addEventListener("DOMContentLoaded", function () {
  const expenseForm = document.getElementById("expenseForm");
  const messageDiv = document.getElementById("expenseMessage");
  const expensesList = document.getElementById("expensesList");

  // Получаем tripId из разных источников (в порядке приоритета)
  const tripIdInput = document.getElementById("tripId");
  const urlParams = new URLSearchParams(window.location.search);
  const tripIdFromUrl = urlParams.get("trip_id");
  if (tripIdFromUrl && tripIdInput) {
    tripIdInput.value = tripIdFromUrl;
  }
  const tripId = tripIdInput?.value || tripIdFromUrl;
  const userId = localStorage.getItem("userId");

  console.log("Форма расходов найдена:", !!expenseForm);
  console.log("ID путешествия:", tripId);
  console.log("ID пользователя:", userId);

  // Если не нашли tripId, показываем ошибку
  if (!tripId && (expenseForm || expensesList)) {
    showMessage("Ошибка: ID путешествия не указан", "red");
    setTimeout(() => {
      window.location.href = "/travels";
    }, 2000);
    return;
  }

  // Сохраняем tripId в localStorage для будущего использования
  if (tripId) {
    localStorage.setItem("tripId", tripId);
  }
  // Если есть форма для добавления расхода
  if (expenseForm) {
    expenseForm.addEventListener("submit", async function (e) {
      e.preventDefault();
      console.log("ФОРМА РАСХОДА ОТПРАВЛЯЕТСЯ ЧЕРЕЗ JS!");

      if (!userId) {
        showMessage("Ошибка: Вы не авторизованы", "red");
        setTimeout(() => {
          window.location.href = "/login";
        }, 2000);
        return;
      }

      if (messageDiv) {
        messageDiv.style.color = "blue";
        messageDiv.textContent = "Добавление расхода...";
      }

      const formData = new FormData(expenseForm);
      const expenseData = {
        ...Object.fromEntries(formData),
        trip_id: tripId,
        paid_by: userId,
        amount: parseFloat(formData.get("amount")),
        date: formData.get("date"),
        expense_name: formData.get("expense_name"),
      };

      console.log("Данные расхода для отправки:", expenseData);

      try {
        console.log("Отправляю POST запрос на создание расхода...");
        const response = await fetch("/api/expenses", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(expenseData),
        });

        console.log("Статус ответа:", response.status);

        const result = await response.json();
        console.log("Полный ответ сервера:", result);

        if (messageDiv) {
          if (result.success) {
            messageDiv.style.color = "green";
            messageDiv.textContent = "Путешествие успешно создано!";
          }
        }
        if (result.success) {
          // showMessage(result.message || "Расход успешно добавлен!", "green");

          // Сбрасываем форму
          expenseForm.reset();
        }
      } catch (error) {
        console.error("Ошибка:", error);
        // showMessage("Сетевая ошибка: " + error.message, "red");
      }
    });
  }
});
