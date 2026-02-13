// js/expenseFormUpdate.js

const expenseForm = {
  // Хранилище данных
  currentExpense: null,
  tripParticipants: [],

  // Открытие модального окна
  openEditModal: async function (expenseId) {
    try {
      console.log("Loading expense:", expenseId);

      // 1. Загружаем расход
      const expenseRes = await fetch(`/api/expenses/${expenseId}`);
      const expenseData = await expenseRes.json();

      if (!expenseData.success) throw new Error(expenseData.error);

      // 2. Загружаем участников путешествия
      const tripRes = await fetch(
        `/api/trips/${expenseData.expense.trip_id}/participants`,
      );
      const tripData = await tripRes.json();

      // 3. Сохраняем данные
      this.currentExpense = expenseData.expense;
      this.tripParticipants = tripData.success ? tripData.participants : [];

      // 4. Заполняем форму
      this.fillForm();

      // 5. Отображаем участников
      this.renderParticipants();

      // 6. Показываем модалку
      document.getElementById("editExpenseModal").style.display = "block";
    } catch (error) {
      console.error("Error:", error);
      alert("Ошибка загрузки: " + error.message);
    }
  },

  // Заполнение формы
  fillForm: function () {
    const e = this.currentExpense;
    document.getElementById("expense_id").value = e.id;
    document.getElementById("expense_name").value = e.expense_name;
    document.getElementById("amount").value = e.amount;
    document.getElementById("date").value = e.date;
    document.getElementById("description").value = e.description || "";
  },

  // Отрисовка участников
  renderParticipants: function () {
    const container = document.getElementById("participantsContainer");
    if (!container) return;

    // Получаем участников расхода
    const expenseParticipants = this.currentExpense.participants || [];

    // Создаем Map для быстрого доступа к суммам
    const shareMap = new Map();
    expenseParticipants.forEach((p) => {
      shareMap.set(p.id, {
        amount: p.amount_owed,
        username: p.username,
      });
    });

    // Формируем HTML
    let html =
      '<div class="participants-list" style="max-height: 300px; overflow-y: auto;">';

    // Отображаем ВСЕХ участников, без приоритета плательщика
    shareMap.forEach((share, userId) => {
      const isPayer = userId === window.currentUserId;
      html += this.createParticipantHTML(
        userId,
        share.username,
        share.amount,
        isPayer,
      );
    });

    html += "</div>";

    // Кнопка добавления участника
    html += `<button type="button" onclick="expenseForm.showParticipantSearch()" 
                 style="width: 100%; padding: 10px; margin: 10px 0; background: #f5de4c; border: none; color: #000; border-radius: 8px; cursor: pointer; font-size: 13px;" >
                    + Добавить участника
                 </button>`;

    // Информация о суммах
    const totalAmount = parseFloat(this.currentExpense.amount);
    const sharesTotal = this.calculateTotalShares();
    const isEqual = Math.abs(sharesTotal - totalAmount) < 0.01;

    html += `
            <div style=" padding: 12px; background: #f5f5f5; border-radius: 8px;">
                <div style="display: flex; justify-content: space-between;">
                    <span>Общая сумма:</span>
                    <span style="font-weight: bold;">${totalAmount.toFixed(2)} ₽</span>
                </div>
                <div style="display: flex; justify-content: space-between; margin-top: 5px;">
                    <span>Сумма долей:</span>
                    <span style="font-weight: bold; color: ${isEqual ? "#28a745" : "#dc3545"};">
                        ${sharesTotal.toFixed(2)} ₽
                    </span>
                </div>
            </div>
        `;

    container.innerHTML = html;
  },

  // Создание HTML для одного участника
  createParticipantHTML: function (userId, username, amount, isPayer) {
    return `
            <div class="participant-row" data-user-id="${userId}" style="
                display: flex;
                align-items: center;
                justify-content: space-between;
                padding: 10px;
                border-bottom: 1px solid #eee;
            ">
                <div style="display: flex; align-items: center; gap: 10px;">
                    <span style="font-weight: ${isPayer ? "bold" : "normal"};">
                        ${username}
                        ${isPayer ? " (вы)" : ""}
                    </span>
                </div>
                <div style="display: flex; align-items: center; gap: 8px;">
                    <input type="number" 
                           step="0.01" 
                           min="0"
                           value="${parseFloat(amount).toFixed(2)}"
                           data-user-id="${userId}"
                           onchange="expenseForm.updateAmount(this)"
                           style="width: 100px; padding: 5px; border: 1px solid #ddd; border-radius: 4px;">
                    <span>₽</span>
                    <button type="button" 
                            onclick="expenseForm.removeParticipant(${userId})"
                            style="background: none; border: none; color: #dc3545; cursor: pointer; font-size: 18px;">
                        ×
                    </button>
                </div>
            </div>
        `;
  },

  // Показать поиск участников
  showParticipantSearch: function () {
    // Удаляем старый попап если есть
    const oldPopup = document.getElementById("participantSearchPopup");
    if (oldPopup) oldPopup.remove();

    // Получаем ID текущих участников
    const currentIds = this.getCurrentParticipantIds();

    // Фильтруем доступных (только те, кого еще нет в расходе)
    const available = this.tripParticipants.filter(
      (p) => !currentIds.includes(p.id),
    );

    if (available.length === 0) {
      alert("Нет доступных участников для добавления");
      return;
    }

    // Создаем попап
    const popup = document.createElement("div");
    popup.id = "participantSearchPopup";
    popup.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            width: 400px;
            max-width: 90%;
            background: white;
            border-radius: 8px;
            box-shadow: 0 4px 20px rgba(0,0,0,0.2);
            z-index: 10000;
            padding: 20px;
        `;

    // Заголовок
    popup.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;">
                <h3 style="margin: 0;">Добавить участника</h3>
                <button onclick="expenseForm.closeParticipantSearch()" 
                        style="background: none; border: none; font-size: 24px; cursor: pointer;">&times;</button>
            </div>
            <div style="margin-bottom: 15px;">
                <input type="text" 
                       id="participantSearchInput" 
                       placeholder="Введите имя участника..."
                       autocomplete="off"
                       style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 4px; box-sizing: border-box;">
            </div>
            <div id="participantSearchResults" style="max-height: 300px; overflow-y: auto;">
                ${this.renderSearchResults(available, "")}
            </div>
            <div style="margin-top: 15px; text-align: right;">
                <button onclick="expenseForm.closeParticipantSearch()"
                        style="padding: 8px 16px; background: #6c757d; color: white; border: none; border-radius: 4px; cursor: pointer;">
                    Отмена
                </button>
            </div>
        `;

    document.body.appendChild(popup);

    // Добавляем полупрозрачный фон
    const overlay = document.createElement("div");
    overlay.id = "participantSearchOverlay";
    overlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0,0,0,0.5);
            z-index: 9999;
        `;
    overlay.onclick = () => this.closeParticipantSearch();
    document.body.appendChild(overlay);

    // Добавляем обработчик поиска
    const searchInput = document.getElementById("participantSearchInput");
    searchInput.focus();
    searchInput.addEventListener("input", (e) => {
      const resultsDiv = document.getElementById("participantSearchResults");
      resultsDiv.innerHTML = this.renderSearchResults(
        available,
        e.target.value,
      );
    });
  },

  // Рендеринг результатов поиска
  renderSearchResults: function (available, searchTerm) {
    const filtered = available.filter((p) =>
      p.username.toLowerCase().includes(searchTerm.toLowerCase()),
    );

    if (filtered.length === 0) {
      return '<p style="color: #666; text-align: center; padding: 20px;">Участники не найдены</p>';
    }

    let html = "";
    filtered.forEach((p) => {
      html += `
                <div onclick="expenseForm.addParticipant(${p.id}, '${p.username}')"
                     style="padding: 10px; border-bottom: 1px solid #eee; cursor: pointer; display: flex; align-items: center; gap: 10px;">
                    <div style="width: 32px; height: 32px; border-radius: 50%; background: #007bff; color: white; display: flex; align-items: center; justify-content: center; font-weight: bold;">
                        ${p.username.charAt(0).toUpperCase()}
                    </div>
                    <div>
                        <div style="font-weight: 500;">${p.username}</div>
                        <div style="font-size: 12px; color: #666;">ID: ${p.id}</div>
                    </div>
                </div>
            `;
    });

    return html;
  },

  // Закрыть поиск
  closeParticipantSearch: function () {
    const popup = document.getElementById("participantSearchPopup");
    const overlay = document.getElementById("participantSearchOverlay");
    if (popup) popup.remove();
    if (overlay) overlay.remove();
  },

  // Добавление участника
  addParticipant: function (userId, username) {
    // Добавляем с суммой 0
    if (!this.currentExpense.participants) {
      this.currentExpense.participants = [];
    }

    this.currentExpense.participants.push({
      id: userId,
      username: username,
      amount_owed: 0,
      is_paid: userId === window.currentUserId,
    });

    // Перерисовываем
    this.renderParticipants();

    // Закрываем поиск
    this.closeParticipantSearch();
  },

  // Удаление участника
  removeParticipant: async function (userId) {
    if (!confirm("Удалить участника из расхода?")) return;

    const expenseId = this.currentExpense.id;

    try {
      const response = await fetch(
        `/api/expenses/${expenseId}/participants/${userId}`,
        {
          method: "DELETE",
        },
      );

      const result = await response.json();

      if (result.success) {
        // Удаляем из массива
        this.currentExpense.participants =
          this.currentExpense.participants.filter((p) => p.id !== userId);
        // Перерисовываем
        this.renderParticipants();
      } else {
        alert("Ошибка: " + result.error);
      }
    } catch (error) {
      console.error("Error:", error);
      alert("Ошибка при удалении");
    }
  },

  // Обновление суммы
  updateAmount: function (input) {
    const userId = parseInt(input.dataset.userId);
    const amount = parseFloat(input.value) || 0;

    // Обновляем в currentExpense
    const participant = this.currentExpense.participants.find(
      (p) => p.id === userId,
    );
    if (participant) {
      participant.amount_owed = amount;
    }

    // Обновляем отображение суммы долей
    const totalAmount = parseFloat(this.currentExpense.amount);
    const sharesTotal = this.calculateTotalShares();

    // Находим элемент с суммой долей и обновляем его
    const container = document.getElementById("participantsContainer");
    const totalDiv = container.querySelector(
      'div[style*="background: #f5f5f5"]',
    );
    if (totalDiv) {
      const spans = totalDiv.querySelectorAll("span");
      if (spans.length >= 4) {
        spans[3].textContent = `${sharesTotal.toFixed(2)} ₽`;
        spans[3].style.color =
          Math.abs(sharesTotal - totalAmount) < 0.01 ? "#28a745" : "#dc3545";
      }
    }
  },

  // Подсчет общей суммы долей
  calculateTotalShares: function () {
    if (!this.currentExpense.participants) return 0;
    return this.currentExpense.participants.reduce(
      (sum, p) => sum + (parseFloat(p.amount_owed) || 0),
      0,
    );
  },

  // Получение ID текущих участников
  getCurrentParticipantIds: function () {
    return this.currentExpense.participants
      ? this.currentExpense.participants.map((p) => p.id)
      : [];
  },

  // Сохранение изменений
  saveExpense: async function (event) {
    event.preventDefault();

    const expenseId = this.currentExpense.id;

    // Подготавливаем данные
    const data = {
      expense_name: document.getElementById("expense_name").value,
      amount: parseFloat(document.getElementById("amount").value),
      date: document.getElementById("date").value,
      description: document.getElementById("description").value,
      participants: this.currentExpense.participants.map((p) => ({
        id: p.id,
        amount_owed: parseFloat(p.amount_owed) || 0,
      })),
    };

    // Проверяем сумму
    const totalShares = data.participants.reduce(
      (sum, p) => sum + p.amount_owed,
      0,
    );
    if (Math.abs(totalShares - data.amount) > 0.01) {
      if (
        !confirm(
          `Сумма долей (${totalShares.toFixed(2)}) не равна общей сумме (${data.amount.toFixed(2)}). Продолжить?`,
        )
      ) {
        return;
      }
    }

    try {
      const response = await fetch(`/api/expenses/${expenseId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (result.success) {
        alert("Расход обновлен");
        this.closeEditModal();
        location.reload();
      } else {
        alert("Ошибка: " + result.error);
      }
    } catch (error) {
      console.error("Error:", error);
      alert("Ошибка при сохранении");
    }
  },

  // Закрытие
  closeEditModal: function () {
    document.getElementById("editExpenseModal").style.display = "none";
    this.currentExpense = null;
    this.tripParticipants = [];
    this.closeParticipantSearch();
  },

  // Удаление расхода
  deleteCurrentExpense: async function () {
    if (!confirm("Удалить трату?")) return;

    const expenseId = this.currentExpense.id;

    try {
      const response = await fetch(`/api/expenses/${expenseId}`, {
        method: "DELETE",
      });

      const result = await response.json();

      if (result.success) {
        alert("Расход удален");
        this.closeEditModal();
        location.reload();
      } else {
        alert("Ошибка: " + result.error);
      }
    } catch (error) {
      console.error("Error:", error);
      alert("Ошибка при удалении");
    }
  },
};

// Глобальная функция для вызова из HTML
window.showEditExpenseModal = function (expenseId) {
  expenseForm.openEditModal(expenseId);
};

// Инициализация
document.addEventListener("DOMContentLoaded", function () {
  const form = document.getElementById("editExpenseForm");
  if (form) {
    form.addEventListener("submit", function (e) {
      expenseForm.saveExpense(e);
    });
  }
});
