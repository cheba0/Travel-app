// public/js/travelPage.js
// ===== ГЛОБАЛЬНЫЕ ПЕРЕМЕННЫЕ =====
let activeFilter = null;
let activeSort = null;
let allExpenses = [];

// ===== ИНИЦИАЛИЗАЦИЯ =====
document.addEventListener("DOMContentLoaded", function () {
  console.log("✅ Страница путешествия загружена");

  if (!window.travelData) {
    console.error("❌ Данные путешествия не загружены");
    return;
  }

  console.log("📦 Данные:", window.travelData);
  console.log("👤 Текущий пользователь:", window.currentUserId);

  // Инициализируем массив всех расходов
  allExpenses = [...(window.travelData.expenses || [])];

  // 1. Обновляем аватары участников
  updateParticipantsAvatars();

  // 2. Обновляем общую сумму (мои траты)
  updateTotalAmount();

  // 3. Добавляем обработчики кнопок
  setupFilterButtons();
  setupSortButton();
  setupAddExpenseButton();
});

// ===== АВАТАРЫ УЧАСТНИКОВ =====
function updateParticipantsAvatars() {
  const avatarsContainer = document.getElementById("participantsAvatars");
  if (!avatarsContainer || !window.travelData?.participants) return;

  const participants = window.travelData.participants;
  let html = "";
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
        ${participant.username ? participant.username.charAt(0).toUpperCase() : "?"}
      </div>
    `;
  });

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

// ===== МОИ ТРАТЫ (по долям) =====
function updateTotalAmount() {
  const totalElement = document.getElementById("totalAmount");
  if (!totalElement || !window.travelData?.expenses) return;

  const userId = window.currentUserId;
  let myTotal = 0;
  let myExpensesCount = 0;

  window.travelData.expenses.forEach((expense) => {
    const participants = expense.participants || [];
    const myParticipant = participants.find((p) => p.id === userId);

    if (myParticipant) {
      const myShare = parseFloat(myParticipant.amount_owed || 0);
      if (!isNaN(myShare) && myShare > 0) {
        myTotal += myShare;
        myExpensesCount++;
      }
    }
  });

  const currency = window.travelData.currency || "RUB";
  totalElement.textContent = `Мои траты: ${myTotal.toFixed(2)} ${currency}`;
}

// ===== ОБРАБОТЧИКИ КНОПОК ФИЛЬТРОВ =====
function setupFilterButtons() {
  const filterItems = document.querySelectorAll(".filter_item");
  console.log(`🔘 Найдено кнопок фильтров: ${filterItems.length}`);

  filterItems.forEach((item, index) => {
    item.addEventListener("click", function (e) {
      e.stopPropagation();
      console.log(`🖱️ Клик по кнопке фильтра #${index}`);

      // Toggle: если уже активна — сбрасываем
      if (this.classList.contains("active")) {
        console.log("🔄 Сброс фильтра");
        this.classList.remove("active");
        renderExpensesList(allExpenses);
        updateTotalAmount();
        activeFilter = null;
        return;
      }

      // Убираем активный класс со всех
      filterItems.forEach((btn) => btn.classList.remove("active"));

      // Добавляем на нажатую
      this.classList.add("active");

      // Действие по индексу
      if (index === 0) {
        filterExpensesByCategory("transport");
      } else if (index === 1) {
        filterExpensesByCategory("food");
      } else if (index === 2) {
        showExpensesChart();
      }
    });
  });
}

// ===== КНОПКА СОРТИРОВКИ =====
function setupSortButton() {
  const filterIcon = document.querySelector(".filter_icon");
  if (filterIcon) {
    filterIcon.addEventListener("click", function (e) {
      e.stopPropagation();
      showSortMenu();
    });
  }
}

// ===== КНОПКА ДОБАВЛЕНИЯ РАСХОДА =====
function setupAddExpenseButton() {
  const addBtn = document.getElementById("add_expense");
  if (addBtn) {
    addBtn.addEventListener("click", function () {
      window.location.href = "/add_expense/" + window.travelData.id;
    });
  }
}

// ===== ФИЛЬТРАЦИЯ ПО КАТЕГОРИИ =====
function filterExpensesByCategory(category) {
  console.log(`🔍 Фильтр по категории: ${category}`);

  const keywords = {
    transport: [
      "такси",
      "авто",
      "транспорт",
      "бензин",
      "топливо",
      "машина",
      "билет",
      "поезд",
      "самолет",
      "автобус",
    ],
    food: [
      "еда",
      "продукты",
      "ресторан",
      "кафе",
      "завтрак",
      "обед",
      "ужин",
      "продукт",
      "кушать",
    ],
  };

  const filtered = allExpenses.filter((expense) => {
    const name = (expense.name || "").toLowerCase();
    const expenseCategory = (expense.category || "").toLowerCase();

    const matchesKeywords = keywords[category]?.some((keyword) =>
      name.includes(keyword),
    );
    const matchesCategory = expenseCategory === category;

    return matchesKeywords || matchesCategory;
  });

  // Сортируем по дате (новые сначала)
  filtered.sort((a, b) => new Date(b.date) - new Date(a.date));

  console.log(`✅ Отфильтровано: ${filtered.length} из ${allExpenses.length}`);
  renderExpensesList(filtered);
  activeFilter = category;
  updateTotalAmount();
}

// ===== ДИАГРАММА (КТО СКОЛЬКО ДОЛЖЕН - ПО ДОЛЯМ) =====
function showExpensesChart() {
  if (typeof Chart === "undefined") {
    alert("Библиотека Chart.js не загружена");
    return;
  }

  console.log("📊 Открываем диаграмму");

  const allTravelExpenses = window.travelData.expenses || [];
  const allParticipants = window.travelData.participants || [];

  console.log("📊 Всего расходов:", allTravelExpenses.length);
  console.log("👥 Всего участников:", allParticipants.length);

  // Считаем сколько каждый участник ДОЛЖЕН (по всем расходам)
  const participantDebt = {};
  let totalSpent = 0;

  // Инициализируем всех участников
  allParticipants.forEach((participant) => {
    participantDebt[participant.username] = 0;
  });

  console.log("📊 Подсчет долей участников:");

  // Считаем доли по всем расходам
  allTravelExpenses.forEach((expense, idx) => {
    const amount = parseFloat(expense.amount) || 0;
    totalSpent += amount;

    console.log(`  ${idx + 1}. Расход "${expense.name}": ${amount} ₽`);

    // Берем участников из expense.participants
    if (expense.participants && expense.participants.length > 0) {
      expense.participants.forEach((p) => {
        const shareAmount = parseFloat(p.amount_owed) || 0;
        participantDebt[p.username] += shareAmount;
        console.log(
          `    ${p.username}: ${shareAmount} ₽ (всего: ${participantDebt[p.username]} ₽)`,
        );
      });
    } else {
      // Если нет participants - делим поровну
      const equalShare = amount / allParticipants.length;
      allParticipants.forEach((p) => {
        participantDebt[p.username] += equalShare;
        console.log(`    ${p.username}: ${equalShare} ₽ (поровну)`);
      });
    }
  });

  console.log("📈 Итоговые доли:", participantDebt);
  console.log("💰 Общая сумма:", totalSpent);

  // Создаем модальное окно
  const modal = document.createElement("div");
  modal.id = "chartModal";
  modal.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0,0,0,0.5);
    z-index: 10000;
    display: flex;
    justify-content: center;
    align-items: center;
  `;

  modal.innerHTML = `
    <div style="background: white; border-radius: 16px; padding: 24px; max-width: 500px; width: 90%; max-height: 80vh; overflow-y: auto;">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
        <h3 style="margin: 0; font-size: 20px;">📊 Кто сколько должен</h3>
        <button onclick="document.getElementById('chartModal').remove()" style="background: none; border: none; font-size: 28px; cursor: pointer; color: #666;">&times;</button>
      </div>
      <div style="max-width: 400px; margin: 0 auto;">
        <canvas id="expensesChart"></canvas>
      </div>
      <div id="chartStats" style="margin-top: 20px; text-align: center; color: #666; font-size: 14px;"></div>
    </div>
  `;

  document.body.appendChild(modal);

  modal.addEventListener("click", function (e) {
    if (e.target === modal) modal.remove();
  });

  setTimeout(() => {
    if (allParticipants.length === 0) {
      const statsDiv = document.getElementById("chartStats");
      if (statsDiv) {
        statsDiv.innerHTML =
          '<span style="color: #dc3545;">Нет участников</span>';
      }
      return;
    }

    // Подготавливаем данные для диаграммы
    const labels = Object.keys(participantDebt);
    const data = Object.values(participantDebt);

    const backgroundColors = [
      "#FF6384",
      "#36A2EB",
      "#FFCE56",
      "#4BC0C0",
      "#9966FF",
      "#FF9F40",
      "#8A2BE2",
      "#C9CBCF",
      "#20B2AA",
      "#FF69B4",
      "#00CED1",
      "#FF1493",
      "#32CD32",
      "#FFD700",
      "#DC143C",
    ];

    // Создаем диаграмму
    const ctx = document.getElementById("expensesChart");
    new Chart(ctx, {
      type: "pie",
      data: {
        labels: labels,
        datasets: [
          {
            data: data,
            backgroundColor: backgroundColors.slice(0, labels.length),
            borderWidth: 2,
            borderColor: "#fff",
            hoverOffset: 10,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: true,
        animation: {
          duration: 1000,
          animateScale: true,
        },
        plugins: {
          legend: {
            position: "bottom",
            labels: {
              padding: 15,
              font: { size: 12, family: "Arial, sans-serif" },
              boxWidth: 15,
            },
          },
          tooltip: {
            backgroundColor: "rgba(0,0,0,0.8)",
            padding: 12,
            titleFont: { size: 14 },
            bodyFont: { size: 13 },
            callbacks: {
              label: function (context) {
                const label = context.label || "";
                const value = context.parsed || 0;
                const percentage =
                  totalSpent > 0 ? ((value / totalSpent) * 100).toFixed(1) : 0;
                return `${label}: ${value.toFixed(2)} ${window.travelData.currency} (${percentage}%)`;
              },
            },
          },
        },
      },
    });

    // Показываем детальную статистику
    const statsDiv = document.getElementById("chartStats");
    if (statsDiv) {
      const sortedParticipants = Object.entries(participantDebt).sort(
        (a, b) => b[1] - a[1],
      ); // Сортируем по убыванию суммы

      statsDiv.innerHTML = `
        <div style="margin-bottom: 15px;">
          <strong>💰 Общая сумма всех расходов: ${totalSpent.toFixed(2)} ${window.travelData.currency}</strong>
        </div>
        <div style="font-size: 12px; margin-bottom: 15px;">
          Всего участников: ${allParticipants.length}
        </div>
        <div style="text-align: left; max-width: 350px; margin: 0 auto; background: #f8f9fa; padding: 15px; border-radius: 8px;">
          <h4 style="margin: 0 0 10px 0; text-align: center; font-size: 14px;">📋 Долг каждого участника:</h4>
          ${sortedParticipants
            .map(([name, amount], index) => {
              const percentage =
                totalSpent > 0 ? ((amount / totalSpent) * 100).toFixed(1) : 0;
              const colors = [
                "#FF6384",
                "#36A2EB",
                "#FFCE56",
                "#4BC0C0",
                "#9966FF",
                "#FF9F40",
              ];
              const color = colors[index % colors.length];
              const currentUser = window.travelData.participants.find(
                (p) => p.id === window.currentUserId,
              );
              const isCurrentUser =
                currentUser && name === currentUser.username;

              return `
              <div style="display: flex; justify-content: space-between; align-items: center; padding: 8px 0; border-bottom: 1px solid #dee2e6;">
                <div style="display: flex; align-items: center; gap: 8px;">
                  <div style="width: 12px; height: 12px; background: ${color}; border-radius: 50%;"></div>
                  <span style="font-weight: ${isCurrentUser ? "bold" : "normal"};">${name}${isCurrentUser ? " (вы)" : ""}</span>
                </div>
                <div style="text-align: right;">
                  <div style="font-weight: bold; color: ${color};">${amount.toFixed(2)} ${window.travelData.currency}</div>
                  <div style="font-size: 11px; color: #6c757d;">${percentage}%</div>
                </div>
              </div>
            `;
            })
            .join("")}
        </div>
      `;
    }
  }, 100);
}

// ===== МЕНЮ СОРТИРОВКИ =====
function showSortMenu() {
  // Удаляем старое меню если есть
  const oldMenu = document.getElementById("sortMenu");
  if (oldMenu) oldMenu.remove();

  const menu = document.createElement("div");
  menu.id = "sortMenu";
  menu.style.cssText = `
    position: absolute;
    top: 60px;
    right: 20px;
    background: white;
    border-radius: 12px;
    box-shadow: 0 4px 20px rgba(0,0,0,0.15);
    padding: 8px;
    z-index: 1000;
    min-width: 200px;
  `;

  menu.innerHTML = `
    <button onclick="sortExpenses('date')" style="display:block;width:100%;padding:12px;border:none;background:none;text-align:left;cursor:pointer;border-radius:8px;font-size:14px;" onmouseover="this.style.background='#f5f5f5'" onmouseout="this.style.background='none'">📅 По дате</button>
    <button onclick="sortExpenses('amount')" style="display:block;width:100%;padding:12px;border:none;background:none;text-align:left;cursor:pointer;border-radius:8px;font-size:14px;" onmouseover="this.style.background='#f5f5f5'" onmouseout="this.style.background='none'">💰 По сумме</button>
    <button onclick="sortExpenses('participants')" style="display:block;width:100%;padding:12px;border:none;background:none;text-align:left;cursor:pointer;border-radius:8px;font-size:14px;" onmouseover="this.style.background='#f5f5f5'" onmouseout="this.style.background='none'">👥 По участникам</button>
    <button onclick="sortExpenses('name')" style="display:block;width:100%;padding:12px;border:none;background:none;text-align:left;cursor:pointer;border-radius:8px;font-size:14px;" onmouseover="this.style.background='#f5f5f5'" onmouseout="this.style.background='none'">🔤 По названию</button>
  `;

  const expensesHeader = document.querySelector(".expenses_header");
  if (expensesHeader) {
    expensesHeader.style.position = "relative";
    expensesHeader.appendChild(menu);
  }

  // Закрытие по клику вне
  setTimeout(() => {
    const closeHandler = function (e) {
      if (!menu.contains(e.target) && !e.target.closest(".filter_icon")) {
        menu.remove();
        document.removeEventListener("click", closeHandler);
      }
    };
    document.addEventListener("click", closeHandler);
  }, 0);
}

// ===== СОРТИРОВКА =====
function sortExpenses(type) {
  console.log(`🔀 Сортировка: ${type}`);
  let items = [...allExpenses];

  if (type === "date") {
    items.sort((a, b) => new Date(b.date) - new Date(a.date));
  } else if (type === "amount") {
    items.sort((a, b) => parseFloat(b.amount) - parseFloat(a.amount));
  } else if (type === "participants") {
    items.sort(
      (a, b) => (b.participants?.length || 0) - (a.participants?.length || 0),
    );
  } else if (type === "name") {
    items.sort((a, b) => a.name.localeCompare(b.name));
  }

  renderExpensesList(items);
  updateTotalAmount();

  const menu = document.getElementById("sortMenu");
  if (menu) menu.remove();
}

// ===== ОТРИСОВКА СПИСКА =====
function renderExpensesList(expenses) {
  const list = document.getElementById("expensesList");
  if (!list) return;

  list.innerHTML = "";

  if (expenses.length === 0) {
    list.innerHTML =
      '<div class="empty-state"><p>Расходов не найдено</p></div>';
    return;
  }

  expenses.forEach((expense, index) => {
    const div = document.createElement("div");
    div.className = "expense_item";
    div.dataset.expenseId = expense.id;

    const categoryBadge = expense.category
      ? `<span style="font-size:11px;padding:2px 6px;background:#e9ecef;border-radius:4px;margin-left:8px;">${expense.category}</span>`
      : "";

    div.innerHTML = `
      <div class="expense_item_main">
        <div class="expense_item_header">
          <span class="expenses_item_number">${index + 1}.</span>
          <span class="expense_item_name">${expense.name}${categoryBadge}</span>
        </div>
        <button class="expense_edit" onclick="showEditExpenseModal(${expense.id})">
          <svg xmlns="http://www.w3.org/2000/svg" height="20px" viewBox="0 -960 960 960" width="20px" fill="#000000"><path d="M216-216h51l375-375-51-51-375 375v51Zm-72 72v-153l498-498q11-11 23.84-16 12.83-5 27-5 14.16 0 27.16 5t24 16l51 51q11 11 16 24t5 26.54q0 14.45-5.02 27.54T795-642L297-144H144Zm600-549-51-51 51 51Zm-127.95 76.95L591-642l51 51-25.95-25.05Z"/></svg>
        </button>
      </div>
      <div class="expense_item_cost">
        <span class="expense_item_amount">${expense.amount} ${expense.currency}</span>
        <div class="expense_item_date">${expense.date}</div>
      </div>
    `;
    list.appendChild(div);
  });
}

// ===== СТИЛИ =====
const filterStyle = document.createElement("style");
filterStyle.textContent = `
  .filter_item {
    cursor: pointer;
    transition: all 0.2s;
    opacity: 0.6;
  }
  .filter_item:hover {
    opacity: 0.8;
    transform: scale(1.05);
  }
  .filter_item.active {
    opacity: 1;
    transform: scale(1.1);
  }
  .filter_item.active span {
    color: #3e9afc;
  }
  .filter_icon {
    cursor: pointer;
    transition: transform 0.2s;
  }
  .filter_icon:hover {
    transform: scale(1.1);
  }
`;
document.head.appendChild(filterStyle);

// ===== ОБНОВЛЕНИЕ ПРИ ИЗМЕНЕНИИ ДАННЫХ =====
window.addEventListener("expensesUpdated", function () {
  console.log("🔄 Данные расходов обновились");
  allExpenses = [...(window.travelData.expenses || [])];
  renderExpensesList(allExpenses);
  updateTotalAmount();
});
