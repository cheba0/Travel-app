// travelForm.js
document.addEventListener("DOMContentLoaded", function () {
  // Инициализация
  console.log("TravelForm инициализирован");

  // Автозаполнение даты окончания
  const startDateInput = document.getElementById("start_date");
  const endDateInput = document.getElementById("end_date");

  if (startDateInput) {
    startDateInput.addEventListener("change", function () {
      if (!endDateInput.value && this.value) {
        const startDate = new Date(this.value);
        startDate.setDate(startDate.getDate() + 7); // По умолчанию +7 дней
        endDateInput.valueAsDate = startDate;
      }
    });
  }

  // Автоматическая валидация при вводе
  const inputs = document.querySelectorAll("input, textarea");
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
function validateForm() {
  let isValid = true;

  // Очищаем предыдущие ошибки
  clearAllErrors();

  // Собираем данные формы
  const formData = {
    trip_name: document.getElementById("trip_name")?.value || "",
    location: document.getElementById("location")?.value || "",
    start_date: document.getElementById("start_date")?.value || "",
    end_date: document.getElementById("end_date")?.value || "",
    description: document.getElementById("description")?.value || "",
  };

  // Валидируем все поля
  const errors = TravelFormValidator.validateForm(
    formData,
    !!window.isUpdateMode
  );

  // Отображаем ошибки
  Object.keys(errors).forEach((fieldName) => {
    showError(fieldName, errors[fieldName]);
    isValid = false;
  });

  if (!isValid) {
    // Прокручиваем к первой ошибке
    scrollToFirstError();
  }

  return isValid;
}

// Валидация отдельного поля
function validateField(inputElement) {
  const fieldName = inputElement.id;
  const value = inputElement.value;
  const formData = getFormData();

  const error = TravelFormValidator.validateField(fieldName, value, formData);

  if (error) {
    showError(fieldName, error);
    return false;
  } else {
    clearError(fieldName);
    return true;
  }
}

// Получение данных формы
function getFormData() {
  return {
    trip_name: document.getElementById("trip_name")?.value || "",
    location: document.getElementById("location")?.value || "",
    start_date: document.getElementById("start_date")?.value || "",
    end_date: document.getElementById("end_date")?.value || "",
    description: document.getElementById("description")?.value || "",
  };
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

  const inputs = document.querySelectorAll("input, textarea");
  inputs.forEach((input) => {
    input.style.borderColor = "#e0e0e0";
  });
}

// Прокрутить к первой ошибке
function scrollToFirstError() {
  const firstError = document.querySelector(
    '.error-message[style*="display: block"]'
  );
  if (firstError) {
    firstError.scrollIntoView({ behavior: "smooth", block: "center" });
    firstError.previousElementSibling?.focus();
  }
}

// Управление модальным окном удаления
function setupDeleteModal() {
  const deleteModal = document.getElementById("deleteModal");
  if (!deleteModal) return;

  function showDeleteModal() {
    deleteModal.style.display = "flex";
  }

  function closeDeleteModal() {
    deleteModal.style.display = "none";
  }

  // Назначаем обработчики для кнопок удаления
  const deleteButtons = document.querySelectorAll(
    '[onclick*="showDeleteModal"]'
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
  const cancelBtn = deleteModal.querySelector('[onclick*="closeDeleteModal"]');
  if (cancelBtn) {
    cancelBtn.addEventListener("click", closeDeleteModal);
  }

  // Экспортируем функции для использования в HTML
  window.showDeleteModal = showDeleteModal;
  window.closeDeleteModal = closeDeleteModal;
}

// Экспортируем функции для использования в HTML
window.validateForm = validateForm;
