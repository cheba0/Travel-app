// expenseFormUpdate.js
// Все функции для работы с формами трат

// Проверяем, существует ли объект expenseForm
if (!window.expenseForm) {
  window.expenseForm = {};
}

// ========== ОСНОВНЫЕ ФУНКЦИИ ==========

// 1. Показать модальное окно редактирования траты
window.expenseForm.showEditModal = function (expenseId) {
  console.log("Показать модальное окно для траты ID:", expenseId);

  const modal = document.getElementById("editExpenseModal");
  if (!modal) {
    console.error("❌ Модальное окно не найдено!");
    return;
  }

  // Находим поле с ID
  const expenseIdField = document.getElementById("expense_id");
  if (!expenseIdField) {
    console.error("❌ Поле expense_id не найдено!");
    return;
  }

  // Устанавливаем ID
  expenseIdField.value = expenseId;

  // Загружаем данные траты
  loadExpenseData(expenseId);

  // Показываем модальное окно
  modal.style.display = "flex";
};

// 2. Закрыть модальное окно редактирования
window.expenseForm.closeEditModal = function () {
  const modal = document.getElementById("editExpenseModal");
  if (modal) {
    modal.style.display = "none";

    // Очищаем форму
    const form = document.getElementById("editExpenseForm");
    if (form) {
      form.reset();
    }
  }
};

// 3. Удалить текущую трату (из модального окна)
window.expenseForm.deleteCurrentExpense = function () {
  const expenseIdField = document.getElementById("expense_id");

  if (!expenseIdField || !expenseIdField.value) {
    alert("❌ Ошибка: ID траты не найден");
    return;
  }

  const expenseId = expenseIdField.value;

  if (confirm("Вы уверены, что хотите удалить эту трату?")) {
    deleteExpense(expenseId);
  }
};

// ========== ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ ==========

// Загрузка данных траты
async function loadExpenseData(expenseId) {
  try {
    console.log("Загружаю данные траты ID:", expenseId);

    const response = await fetch(`/api/expenses/${expenseId}`);
    if (!response.ok) {
      throw new Error(`Ошибка сервера: ${response.status}`);
    }

    const result = await response.json();

    if (result.success && result.expense) {
      fillForm(result.expense);
    } else {
      alert("Не удалось загрузить данные траты");
      window.expenseForm.closeEditModal();
    }
  } catch (error) {
    console.error("Ошибка загрузки данных:", error);
    alert("Ошибка загрузки данных траты");
    window.expenseForm.closeEditModal();
  }
}

// Заполнение формы данными
function fillForm(expense) {
  console.log("Заполняю форму данными:", expense);

  // Находим все поля
  const nameField = document.getElementById("expense_name");
  const amountField = document.getElementById("amount");
  const dateField = document.getElementById("date");

  if (nameField) nameField.value = expense.name || expense.expense_name || "";
  if (amountField) amountField.value = expense.amount || "";

  if (dateField && expense.date) {
    // Форматируем дату для поля input[type="date"]
    try {
      const date = new Date(expense.date);
      if (!isNaN(date.getTime())) {
        dateField.value = date.toISOString().split("T")[0];
      }
    } catch (e) {
      dateField.value = expense.date;
    }
  }
}

// Отправка формы редактирования
async function submitExpenseForm(event) {
  event.preventDefault();
  console.log("Отправка формы редактирования траты");

  const form = event.target;
  if (!form) return;

  // Получаем ID траты
  const expenseIdField = document.getElementById("expense_id");
  if (!expenseIdField || !expenseIdField.value) {
    alert("❌ Ошибка: ID траты не найден");
    return;
  }

  const expenseId = expenseIdField.value;

  // Собираем данные
  const formData = {
    expense_name: document.getElementById("expense_name")?.value || "",
    amount: document.getElementById("amount")?.value || "",
    date: document.getElementById("date")?.value || "",
    trip_id: document.getElementById("trip_id")?.value || "",
  };

  // Валидация
  if (!formData.expense_name.trim()) {
    alert("❌ Введите название траты");
    return;
  }

  if (!formData.amount || parseFloat(formData.amount) <= 0) {
    alert("❌ Введите корректную сумму");
    return;
  }

  if (!formData.date) {
    alert("❌ Выберите дату");
    return;
  }

  // Отправка на сервер
  try {
    const submitBtn = form.querySelector('button[type="submit"]');
    const originalText = submitBtn.textContent;
    submitBtn.textContent = "Сохранение...";
    submitBtn.disabled = true;

    console.log("Отправляю данные:", formData);

    const response = await fetch(`/api/expenses/${expenseId}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(formData),
    });

    const result = await response.json();

    if (result.success) {
      alert("✅ Трата успешно обновлена!");
      window.expenseForm.closeEditModal();

      // Обновляем страницу
      setTimeout(() => {
        window.location.reload();
      }, 500);
    } else {
      alert("❌ Ошибка: " + (result.error || "Неизвестная ошибка"));
      submitBtn.textContent = originalText;
      submitBtn.disabled = false;
    }
  } catch (error) {
    console.error("Ошибка сети:", error);
    alert("❌ Ошибка сети");

    const submitBtn = form.querySelector('button[type="submit"]');
    submitBtn.textContent = "Сохранить изменения";
    submitBtn.disabled = false;
  }
}

// Удаление траты
async function deleteExpense(expenseId) {
  try {
    console.log("Удаляю трату ID:", expenseId);

    const response = await fetch(`/api/expenses/${expenseId}`, {
      method: "DELETE",
    });

    const result = await response.json();

    if (result.success) {
      alert("✅ Трата успешно удалена!");
      window.expenseForm.closeEditModal();

      // Обновляем страницу
      setTimeout(() => {
        window.location.reload();
      }, 500);
    } else {
      alert("❌ Ошибка: " + (result.error || "Неизвестная ошибка"));
    }
  } catch (error) {
    console.error("Ошибка удаления:", error);
    alert("❌ Ошибка сети при удалении");
  }
}

// ========== ИНИЦИАЛИЗАЦИЯ ==========

// Инициализация при загрузке страницы
document.addEventListener("DOMContentLoaded", function () {
  console.log("ExpenseFormUpdate.js загружен");

  // Находим форму редактирования
  const editForm = document.getElementById("editExpenseForm");
  if (editForm) {
    console.log("✅ Форма редактирования найдена");

    // Вешаем обработчик отправки формы
    editForm.addEventListener("submit", function (e) {
      submitExpenseForm(e);
    });
  } else {
    console.warn("⚠️ Форма редактирования не найдена");
  }

  // Находим модальное окно
  const modal = document.getElementById("editExpenseModal");
  if (modal) {
    console.log("✅ Модальное окно найдено");

    // Закрытие по клику вне окна
    modal.addEventListener("click", function (e) {
      if (e.target === this) {
        window.expenseForm.closeEditModal();
      }
    });

    // Закрытие по Escape
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && modal.style.display === "flex") {
        window.expenseForm.closeEditModal();
      }
    });
  } else {
    console.warn("⚠️ Модальное окно не найдено");
  }
});

// ========== ЭКСПОРТ ДЛЯ СТАРОГО КОДА ==========

// Для обратной совместимости с другими файлами
window.showEditExpenseModal = window.expenseForm.showEditModal;
window.closeEditExpenseModal = window.expenseForm.closeEditModal;
window.deleteCurrentExpense = window.expenseForm.deleteCurrentExpense;
window.submitEditExpenseForm = submitExpenseForm;
