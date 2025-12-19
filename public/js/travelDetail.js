// travelDetail.js
console.log("TravelDetail скрипт загружен");

class TravelDetail {
  constructor(travelData) {
    this.travelData = travelData;
    this.deleteModal = null;
    this.deleteBtn = null;
    this.cancelDeleteBtn = null;
    this.deleteForm = null;
  }

  // Инициализация
  static init(travelData) {
    const instance = new TravelDetail(travelData);
    instance.setupEventListeners();
    console.log(
      "TravelDetail инициализирован для путешествия:",
      travelData.name
    );
    return instance;
  }

  // Настройка обработчиков событий
  setupEventListeners() {
    this.deleteModal = document.getElementById("deleteModal");
    this.deleteBtn = document.getElementById("deleteBtn");
    this.cancelDeleteBtn = document.getElementById("cancelDeleteBtn");
    this.deleteForm = document.getElementById("deleteForm");

    // Обработчик кнопки удаления
    if (this.deleteBtn) {
      this.deleteBtn.addEventListener("click", () => this.showDeleteModal());
    }

    // Обработчик кнопки отмены удаления
    if (this.cancelDeleteBtn) {
      this.cancelDeleteBtn.addEventListener("click", () =>
        this.hideDeleteModal()
      );
    }

    // Закрытие модального окна при клике вне его
    if (this.deleteModal) {
      this.deleteModal.addEventListener("click", (e) => {
        if (e.target === this.deleteModal) {
          this.hideDeleteModal();
        }
      });
    }

    // Обработчик отправки формы удаления
    if (this.deleteForm) {
      this.deleteForm.addEventListener("submit", (e) =>
        this.handleDeleteSubmit(e)
      );
    }

    // Добавляем клавиатурные сокращения
    this.setupKeyboardShortcuts();
  }

  // Показать модальное окно удаления
  showDeleteModal() {
    if (this.deleteModal) {
      this.deleteModal.style.display = "flex";
      // Блокируем прокрутку фона
      document.body.style.overflow = "hidden";

      // Фокусируемся на кнопке отмены для доступности
      setTimeout(() => {
        if (this.cancelDeleteBtn) {
          this.cancelDeleteBtn.focus();
        }
      }, 100);
    }
  }

  // Скрыть модальное окно удаления
  hideDeleteModal() {
    if (this.deleteModal) {
      this.deleteModal.style.display = "none";
      // Восстанавливаем прокрутку
      document.body.style.overflow = "";

      // Возвращаем фокус на кнопку удаления
      if (this.deleteBtn) {
        this.deleteBtn.focus();
      }
    }
  }

  // Обработчик отправки формы удаления
  handleDeleteSubmit(e) {
    e.preventDefault();

    // Показываем индикатор загрузки
    const submitBtn = this.deleteForm.querySelector('button[type="submit"]');
    const originalText = submitBtn.textContent;
    submitBtn.textContent = "Удаление...";
    submitBtn.disabled = true;

    // Опционально: отправляем данные через fetch для лучшего UX
    const formData = new FormData(this.deleteForm);
    const url = this.deleteForm.action;

    fetch(url, {
      method: "POST",
      body: formData,
      headers: {
        "X-Requested-With": "XMLHttpRequest",
      },
    })
      .then((response) => {
        if (response.ok) {
          // Перенаправление произойдет на сервере
          // Можно показать сообщение об успехе
          this.showSuccessMessage();
        } else {
          throw new Error("Ошибка удаления");
        }
      })
      .catch((error) => {
        console.error("Ошибка при удалении:", error);
        submitBtn.textContent = originalText;
        submitBtn.disabled = false;
        alert("Произошла ошибка при удалении. Попробуйте еще раз.");
      });
  }

  // Показать сообщение об успехе
  showSuccessMessage() {
    const container = document.querySelector(".travel-container");
    const successMsg = document.createElement("div");
    successMsg.className = "success-message";
    successMsg.innerHTML = `
            <div style="background: #d4edda; color: #155724; padding: 15px; border-radius: 10px; margin: 20px; text-align: center;">
                ✅ Путешествие "${this.travelData.name}" успешно удалено
            </div>
        `;

    container.insertBefore(successMsg, container.firstChild);

    // Через 2 секунды перенаправляем на список путешествий
    setTimeout(() => {
      window.location.href = "/travels";
    }, 2000);
  }

  // Настройка клавиатурных сокращений
  setupKeyboardShortcuts() {
    document.addEventListener("keydown", (e) => {
      // ESC - закрыть модальное окно
      if (
        e.key === "Escape" &&
        this.deleteModal &&
        this.deleteModal.style.display === "flex"
      ) {
        this.hideDeleteModal();
      }

      // Ctrl+E - редактировать (кроме текстовых полей)
      if (e.ctrlKey && e.key === "e" && !this.isTextInput(e.target)) {
        e.preventDefault();
        const editBtn = document.querySelector(".btn-edit");
        if (editBtn) {
          editBtn.click();
        }
      }
    });
  }

  // Проверка, является ли элемент текстовым полем
  isTextInput(element) {
    const tagName = element.tagName.toLowerCase();
    const type = element.type ? element.type.toLowerCase() : "";
    return (
      tagName === "input" ||
      tagName === "textarea" ||
      element.isContentEditable ||
      type === "text" ||
      type === "email" ||
      type === "password" ||
      type === "search"
    );
  }

  // Вспомогательные функции для работы с датами
  static formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString("ru-RU", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  }

  static calculateDuration(startDate, endDate) {
    const start = new Date(startDate);
    const end = endDate ? new Date(endDate) : new Date();
    const duration = Math.ceil((end - start) / (1000 * 60 * 60 * 24));

    if (duration === 1) return "1 день";
    if (duration < 5) return `${duration} дня`;
    return `${duration} дней`;
  }
}

// Экспортируем класс для глобального использования
window.TravelDetail = TravelDetail;

// Автоматическая инициализация, если есть данные
document.addEventListener("DOMContentLoaded", function () {
  // Проверяем, есть ли данные путешествия на странице
  if (window.travelData && typeof TravelDetail !== "undefined") {
    TravelDetail.init(window.travelData);
  }

  // Добавляем анимации для плавного появления
  const elements = document.querySelectorAll(".travel-container > *");
  elements.forEach((el, index) => {
    el.style.opacity = "0";
    el.style.transform = "translateY(20px)";

    setTimeout(() => {
      el.style.transition = "opacity 0.5s ease, transform 0.5s ease";
      el.style.opacity = "1";
      el.style.transform = "translateY(0)";
    }, index * 100);
  });
});
