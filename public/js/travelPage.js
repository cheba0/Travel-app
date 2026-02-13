// public/js/travelPage.js

document.addEventListener("DOMContentLoaded", function () {
  console.log("Страница путешествия загружена");

  if (!window.travelData) {
    console.error("Данные путешествия не загружены");
    showError("Ошибка загрузки данных");
    return;
  }

  console.log("Данные путешествия:", window.travelData);

  // 1. Обновляем аватары участников
  updateParticipantsAvatars();

  // 2. Обновляем общую сумму расходов
  updateTotalAmount();

  // 3. Добавляем обработчики
  addEventListeners();
});

// Обновление аватаров участников
function updateParticipantsAvatars() {
  const avatarsContainer = document.getElementById("participantsAvatars");
  if (
    !avatarsContainer ||
    !window.travelData ||
    !window.travelData.participants
  ) {
    return;
  }

  const participants = window.travelData.participants;
  let html = "";

  // Показываем первые 3 аватара
  const shownParticipants = participants.slice(0, 3);
  const colors = ["#667eea", "#764ba2", "#2ecc71"];

  shownParticipants.forEach((participant, index) => {
    html += `
            <div style="
                display: inline-block;
                width: 30px;
                height: 30px;
                background: ${colors[index] || "#95a5a6"};
                color: white;
                border-radius: 50%;
                text-align: center;
                line-height: 25px;
                margin-left: ${index > 0 ? "-10px" : "0"};
                border: 2px solid white;
                font-size: 15px;
                font-weight: 500;
            ">
                ${
                  participant.username
                    ? participant.username.charAt(0).toUpperCase()
                    : "?"
                }
            </div>
        `;
  });

  // Если участников больше 3, показываем счетчик
  if (participants.length > 3) {
    html += `
            <div style="
                display: inline-block;
                width: 30px;
                height: 30px;
                background: #95a5a6;
                color: white;
                border-radius: 50%;
                text-align: center;
                line-height: 25px;
                margin-left: -10px;
                border: 2px solid white;
                font-size: 15px;
            ">
                +${participants.length - 3}
            </div>
        `;
  }

  avatarsContainer.innerHTML = html;
}

// Обновление общей суммы расходов
function updateTotalAmount() {
  const totalElement = document.getElementById("totalAmount");
  if (!totalElement || !window.travelData || !window.travelData.expenses) {
    return;
  }

  const userId = window.currentUserId;
  console.log("👤 Текущий пользователь:", userId);
  console.log("📊 Все расходы:", window.travelData.expenses);

  let myTotal = 0;
  let myExpensesCount = 0;

  window.travelData.expenses.forEach((expense) => {
    // Получаем участников расхода
    const participants = expense.participants || [];

    // Ищем текущего пользователя среди участников
    const myParticipant = participants.find((p) => p.id === userId);

    if (myParticipant) {
      // ✅ Берем НЕ весь расход, а только ДОЛЮ пользователя (amount_owed)
      const myShare = parseFloat(myParticipant.amount_owed || 0);

      if (!isNaN(myShare) && myShare > 0) {
        myTotal += myShare;
        myExpensesCount++;
        console.log(
          `✅ Расход #${expense.id}: моя доля ${myShare} ₽ из ${expense.amount} ₽`,
        );
      } else {
        console.log(`⚠️ Расход #${expense.id}: доля 0 ₽`);
      }
    } else {
      console.log(`❌ Расход #${expense.id}: я не участник`);
    }
  });

  const currency = window.travelData.currency || "RUB";
  console.log(
    `💰 Мои траты (доли): ${myExpensesCount} расходов на сумму ${myTotal} ${currency}`,
  );

  totalElement.textContent = `Мои траты: ${myTotal.toFixed(2)} ${currency}`;
}

// Запускаем после загрузки DOM
document.addEventListener("DOMContentLoaded", function () {
  console.log("🔄 Расчет моих долей...");
  console.log("📊 Данные travelData:", window.travelData);
  console.log("👤 currentUserId:", window.currentUserId);

  updateTotalAmount();
});

// Обновляем при изменении данных (например, после добавления расхода)
window.addEventListener("expensesUpdated", function () {
  updateTotalAmount();
});
function addEventListeners() {
  // Кнопка "Добавить первый расход"
  const addFirstBtn = document.getElementById("add_expense");
  if (addFirstBtn) {
    console.log(window.travelData.id);
    addFirstBtn.addEventListener("click", function () {
      window.location.href = "/add_expense/" + window.travelData.id;
    });
  }
  // В файле для списка путешествий
  // document.getElementById("add_expense").forEach((button) => {
  //   button.addEventListener("click", function () {
  //     const tripId = this.dataset.tripId;
  //     localStorage.setItem("tripId", tripId);
  //     window.location.href = `/travels/${tripId}/expenses/add`;
  //   });
  // });
  // Кнопка Share
  // const shareBtn = document.querySelector(".participants_share");
  // if (shareBtn) {
  //   shareBtn.addEventListener("click", function () {
  //     alert("Функция Share будет доступна позже");
  //   });
  // }

  // Кнопка фильтра
  const filterBtn = document.querySelector(".filter_icon");
  if (filterBtn) {
    filterBtn.addEventListener("click", function () {
      alert("Фильтры будут доступны позже");
    });
  }

  // Кнопки фильтров категорий
  document.querySelectorAll(".filter_item").forEach((item) => {
    item.addEventListener("click", function () {
      alert(`Фильтры будут доступны позже`);
    });
  });
}
