// expenseFormUpdate.js
// Глобальные функции — должны быть доступны из HTML
window.showEditExpenseModal = function (expenseId) {
  console.log("Попытка открыть редактирование траты с ID:", expenseId);

  const modal = document.getElementById("editExpenseModal");
  if (!modal) {
    console.error("❌ Модальное окно editExpenseModal не найдено!");
    return;
  }

  const expenseInput = document.getElementById("expense_id");
  if (!expenseInput) {
    console.error("❌ Поле expense_id не найдено!");
    return;
  }

  // Только если всё есть — продолжаем
  expenseInput.value = expenseId;

  // Заполняем остальные поля (если есть данные)
  const expense = window.travelData?.expenses?.find((e) => e.id == expenseId);
  if (expense) {
    document.getElementById("expense_name").value = expense.name || "";
    document.getElementById("amount").value = expense.amount || "";
    document.getElementById("date").value =
      expense.date_raw || expense.date || "";
  }

  modal.style.display = "flex";
};

window.closeEditExpenseModal = function () {
  document.getElementById("editExpenseModal").style.display = "none";
};

document.addEventListener("DOMContentLoaded", function () {
  console.log("ExpenseFormUpdate инициализирован");

  // Автоматическая валидация при вводе
  const inputs = document.querySelectorAll(
    "#editExpenseForm input, #editExpenseForm textarea",
  );
  inputs.forEach((input) => {
    input.addEventListener("input", function () {
      clearError(this.id);
    });
    input.addEventListener("blur", function () {
      validateField(this);
    });
  });

  // Управление модальным окном удаления (если есть)
  setupDeleteModal();
});

// Валидация всей формы
function validateExpenseForm() {
  let isValid = true;

  // Очищаем предыдущие ошибки
  clearAllErrors();

  // Собираем данные формы
  const formData = {
    expense_name: document.getElementById("expense_name")?.value || "",
    amount: document.getElementById("amount")?.value || "",
    date: document.getElementById("date")?.value || "",
    description: document.getElementById("description")?.value || "",
  };

  // Валидация полей
  if (!formData.expense_name.trim()) {
    showError("expense_name", "Название расхода обязательно");
    isValid = false;
  }

  if (!formData.amount || parseFloat(formData.amount) <= 0) {
    showError("amount", "Сумма должна быть больше 0");
    isValid = false;
  }

  if (!formData.date) {
    showError("date", "Дата обязательна");
    isValid = false;
  }

  if (!isValid) {
    scrollToFirstError();
  }

  return isValid;
}

// Валидация отдельного поля
function validateField(inputElement) {
  const fieldName = inputElement.id;
  const value = inputElement.value;

  if (fieldName === "expense_name" && !value.trim()) {
    showError(fieldName, "Название обязательно");
    return false;
  }

  if (fieldName === "amount") {
    const num = parseFloat(value);
    if (!num || num <= 0) {
      showError(fieldName, "Сумма должна быть больше 0");
      return false;
    }
  }

  if (fieldName === "date" && !value) {
    showError(fieldName, "Дата обязательна");
    return false;
  }

  clearError(fieldName);
  return true;
}

// Показать ошибку
function showError(fieldName, message) {
  const inputElement = document.getElementById(fieldName);
  const errorElement = document.getElementById(fieldName + "Error");

  if (inputElement) {
    inputElement.style.borderColor = "#F44336";
  }

  if (errorElement) {
    errorElement.textContent = message;
    errorElement.style.display = "block";
  }
}

// Очистить ошибку
function clearError(fieldName) {
  const inputElement = document.getElementById(fieldName);
  const errorElement = document.getElementById(fieldName + "Error");

  if (inputElement) {
    inputElement.style.borderColor = "#e0e0e0";
  }

  if (errorElement) {
    errorElement.style.display = "none";
    errorElement.textContent = "";
  }
}

// Очистить все ошибки
function clearAllErrors() {
  const errorElements = document.querySelectorAll(".error-message");
  errorElements.forEach((el) => {
    el.style.display = "none";
    el.textContent = "";
  });

  const inputs = document.querySelectorAll(
    "#editExpenseForm input, #editExpenseForm textarea",
  );
  inputs.forEach((input) => {
    input.style.borderColor = "#e0e0e0";
  });
}

// Прокрутить к первой ошибке
function scrollToFirstError() {
  const firstError = document.querySelector(
    '#editExpenseForm .error-message[style*="display: block"]',
  );
  if (firstError) {
    firstError.scrollIntoView({ behavior: "smooth", block: "center" });
    firstError.previousElementSibling?.focus();
  }
}

// Управление модальным окном удаления
function setupDeleteModal() {
  const deleteModal = document.getElementById("deleteExpenseModal");
  if (!deleteModal) return;

  function showDeleteModal() {
    deleteModal.style.display = "flex";
  }

  function closeDeleteModal() {
    deleteModal.style.display = "none";
  }

  // Назначаем обработчики для кнопок удаления
  const deleteButtons = document.querySelectorAll(
    '[onclick*="showDeleteExpenseModal"]',
  );
  deleteButtons.forEach((btn) => {
    btn.addEventListener("click", showDeleteModal);
  });

  // Закрытие при клике вне модального окна
  deleteModal.addEventListener("click", function (e) {
    if (e.target === this) {
      closeDeleteModal();
    }
  });

  // Кнопка отмены в модальном окне
  const cancelBtn = deleteModal.querySelector(
    '[onclick*="closeDeleteExpenseModal"]',
  );
  if (cancelBtn) {
    cancelBtn.addEventListener("click", closeDeleteModal);
  }

  // Экспортируем функции
  window.showDeleteExpenseModal = showDeleteModal;
  window.closeDeleteExpenseModal = closeDeleteModal;
}

// Отправка формы редактирования
async function submitEditExpenseForm(e) {
  e.preventDefault();

  // === ПРОВЕРКА ЭЛЕМЕНТОВ ===
  const getId = (id) => {
    const el = document.getElementById(id);
    if (!el) {
      console.error(`❌ Элемент с id="${id}" не найден!`);
      return null;
    }
    return el;
  };

  const expense_id = getId("expense_id");
  const expense_name = getId("expense_name");
  const amount = getId("amount");
  const date = getId("date");

  if (!expense_id || !expense_name || !amount || !date) {
    alert("Ошибка: форма редактирования не загружена. Обновите страницу.");
    return;
  }

  // === СБОР ДАННЫХ ===
  const formData = {
    expense_name: expense_name.value.trim(),
    amount: parseFloat(amount.value),
    date: date.value,
    description: document.getElementById("description")?.value || "",
    category_id: document.getElementById("category_id")?.value || null,
  };

  // Валидация
  if (!formData.expense_name) {
    showError("expense_name", "Название обязательно");
    return;
  }
  if (isNaN(formData.amount) || formData.amount <= 0) {
    showError("amount", "Сумма должна быть больше 0");
    return;
  }
  if (!formData.date) {
    showError("date", "Дата обязательна");
    return;
  }

  // === ОТПРАВКА ===
  try {
    const response = await fetch(`/api/expenses/${expense_id.value}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(formData),
    });

    const result = await response.json();
    if (result.success) {
      alert("✅ Трата обновлена!");
      window.location.reload(); // или обновите список через JS
    } else {
      alert("❌ Ошибка: " + (result.error || "неизвестная"));
    }
  } catch (err) {
    console.error(err);
    alert("Сеть недоступна");
  }
}
// Показать модальное окно редактирования
function showEditExpenseModal(expenseId) {
  // Находим трата в данных
  const expense = window.travelData.expenses.find((e) => e.id == expenseId);

  if (!expense) {
    alert("Трата не найдена");
    return;
  }

  // Заполняем форму
  document.getElementById("expense_id").value = expense.id;
  document.getElementById("expense_name").value = expense.name;
  document.getElementById("amount").value = expense.amount;
  document.getElementById("description").value = expense.description || "";
  document.getElementById("date").value = expense.date_raw || "";

  // Показываем модалку
  document.getElementById("editExpenseModal").style.display = "flex";
}

// Закрыть модальное окно
function closeEditExpenseModal() {
  document.getElementById("editExpenseModal").style.display = "none";
  clearAllErrors();
}

// Экспортируем функции
window.validateExpenseForm = validateExpenseForm;
window.submitEditExpenseForm = submitEditExpenseForm;
window.showEditExpenseModal = showEditExpenseModal;
window.closeEditExpenseModal = closeEditExpenseModal;
