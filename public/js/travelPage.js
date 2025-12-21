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
                font-size: 20px;
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

  let total = 0;
  window.travelData.expenses.forEach((expense) => {
    const amount = parseFloat(expense.amount);
    if (!isNaN(amount)) {
      total += amount;
    }
  });

  const currency = window.travelData.currency || "RUB";
  totalElement.textContent = `Мои траты: ${total.toFixed(2)} ${currency}`;
}

function addEventListeners() {
  // Кнопка "Добавить первый расход"
  const addFirstBtn = document.getElementById("add_expense");
  if (addFirstBtn) {
    console.log(window.travelData.id);
    addFirstBtn.addEventListener("click", function () {
      window.location.href = "/add_expense?trip_id=" + window.travelData.id;
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
  const shareBtn = document.querySelector(".participants_share");
  if (shareBtn) {
    shareBtn.addEventListener("click", function () {
      alert("Функция Share будет доступна позже");
    });
  }

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
