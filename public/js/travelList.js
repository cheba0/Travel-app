// Переменные для модального окна
let currentTravelId = null;

// Показать модальное окно удаления
function showDeleteModal(id, name) {
  currentTravelId = id;
  document.getElementById("travelName").textContent = name;
  document.getElementById("deleteForm").action = `/travels/${id}/delete`;
  document.getElementById("deleteModal").style.display = "flex";
}

// Закрыть модальное окно
function closeDeleteModal() {
  document.getElementById("deleteModal").style.display = "none";
  currentTravelId = null;
}

// Функция для показа всплывающих сообщений
function showToast(message, type) {
  // Удаляем старые сообщения
  const oldToasts = document.querySelectorAll(".toast");
  oldToasts.forEach((toast) => toast.remove());

  // Создаем новое сообщение
  const toast = document.createElement("div");
  toast.className = `toast toast-${type}`;
  toast.textContent = message;
  toast.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 15px 25px;
        border-radius: 10px;
        color: white;
        font-weight: 500;
        z-index: 1001;
        animation: slideIn 0.3s ease-out;
        box-shadow: 0 5px 15px rgba(0,0,0,0.2);
    `;

  if (type === "success") {
    toast.style.background =
      "linear-gradient(135deg, #4CAF50 0%, #2E7D32 100%)";
  } else {
    toast.style.background =
      "linear-gradient(135deg, #F44336 0%, #C62828 100%)";
  }

  document.body.appendChild(toast);

  // Удаляем через 3 секунды
  setTimeout(() => {
    toast.style.animation = "slideOut 0.3s ease-out";
    setTimeout(() => toast.remove(), 300);
  }, 3000);

  // Добавляем анимации если их нет
  if (!document.querySelector("#toast-animations")) {
    const style = document.createElement("style");
    style.id = "toast-animations";
    style.textContent = `
            @keyframes slideIn {
                from {
                    transform: translateX(100%);
                    opacity: 0;
                }
                to {
                    transform: translateX(0);
                    opacity: 1;
                }
            }
            
            @keyframes slideOut {
                from {
                    transform: translateX(0);
                    opacity: 1;
                }
                to {
                    transform: translateX(100%);
                    opacity: 0;
                }
            }
        `;
    document.head.appendChild(style);
  }
}

// Автоматическое скрытие сообщений
function autoHideAlerts() {
  setTimeout(() => {
    const alerts = document.querySelectorAll(".alert");
    alerts.forEach((alert) => {
      alert.style.opacity = "0";
      alert.style.transition = "opacity 0.5s";
      setTimeout(() => alert.remove(), 500);
    });
  }, 5000);
}

// Удаление путешествия через AJAX
async function deleteTravel(travelId) {
  if (!travelId) return false;

  try {
    // Отправляем AJAX запрос
    const response = await fetch(`/travels/api/${travelId}`, {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
      },
    });

    const result = await response.json();

    if (result.success) {
      // Удаляем карточку из DOM
      const card = document.querySelector(`[data-id="${travelId}"]`);
      if (card) {
        card.style.opacity = "0";
        card.style.transform = "scale(0.9)";
        setTimeout(() => {
          card.remove();

          // Показываем сообщение
          showToast("✅ Путешествие успешно удалено", "success");

          // Если не осталось карточек, обновляем страницу
          const cards = document.querySelectorAll(".travel-card");
          if (cards.length === 0) {
            location.reload();
          }
        }, 300);
      }
      return true;
    } else {
      showToast("❌ " + result.error, "error");
      return false;
    }
  } catch (error) {
    console.error("Ошибка удаления:", error);
    showToast("❌ Ошибка при удалении", "error");
    return false;
  }
}

// Инициализация при загрузке страницы
document.addEventListener("DOMContentLoaded", function () {
  // Назначаем обработчики кнопок удаления
  document.querySelectorAll(".btn-delete").forEach((button) => {
    const travelId = button.closest(".travel-card").dataset.id;
    const travelName = button
      .closest(".travel-card")
      .querySelector(".travel-card-title").textContent;

    button.addEventListener("click", function (e) {
      e.preventDefault();
      showDeleteModal(travelId, travelName.trim());
    });
  });

  // Закрытие модального окна при клике вне его
  document
    .getElementById("deleteModal")
    ?.addEventListener("click", function (e) {
      if (e.target === this) {
        closeDeleteModal();
      }
    });

  // Обработка удаления через AJAX
  document
    .getElementById("deleteForm")
    ?.addEventListener("submit", async function (e) {
      e.preventDefault();

      if (!currentTravelId) return;

      const form = this;
      const deleteBtn = form.querySelector('button[type="submit"]');
      const originalText = deleteBtn.textContent;

      // Меняем текст кнопки
      deleteBtn.textContent = "Удаление...";
      deleteBtn.disabled = true;

      // Выполняем удаление
      await deleteTravel(currentTravelId);

      // Восстанавливаем кнопку
      deleteBtn.textContent = originalText;
      deleteBtn.disabled = false;
      closeDeleteModal();
    });

  // Автоматическое скрытие алертов
  autoHideAlerts();
});
