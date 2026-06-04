// public/js/debts.js
let debtsCurrentDebts = null;

// Открыть модальное окно долгов
// Открыть модальное окно долгов
async function openDebtsModal() {
  console.log("🔓 openDebtsModal вызвана");

  const tripId = window.travelData?.id;
  if (!tripId) {
    alert("❌ ID путешествия не найден");
    return;
  }

  const modal = document.getElementById("debtsModal");
  if (!modal) {
    console.error("❌ Модальное окно debtsModal не найдено");
    return;
  }

  modal.style.display = "block";

  // 🔹 Подключаемся к Socket.io для уведомлений
  setupDebtNotifications(tripId);

  // Загружаем данные
  await loadDebts(tripId);
}

// 🔹 НОВАЯ ФУНКЦИЯ: настройка уведомлений через Socket.io
function setupDebtNotifications(tripId) {
  // Проверяем что Socket.io доступен (из chat.js)
  if (typeof window.io === "undefined") {
    console.warn("⚠️ Socket.io не загружен");
    return;
  }

  // Подключаемся к socket (используем существующее соединение из чата)
  if (!window.debtSocket) {
    window.debtSocket = window.io();
    console.log("🔔 Подключено к Socket.io для уведомлений о долгах");

    // Слушаем уведомления
    window.debtSocket.on("notification", (data) => {
      console.log("📩 Получено уведомление:", data);

      if (
        data.type === "debt_paid" &&
        parseInt(data.tripId) === parseInt(tripId)
      ) {
        // Показываем уведомление через систему чата
        if (window.showChatNotification) {
          window.showChatNotification("💰 Оплата долга", data.message);
        }

        // Обновляем данные если модальное окно открыто
        const modal = document.getElementById("debtsModal");
        if (modal && modal.style.display === "block") {
          loadDebts(tripId);
        }
      }
    });
  }
}

// Закрыть модальное окно долгов
function closeDebtsModal() {
  const modal = document.getElementById("debtsModal");
  if (modal) modal.style.display = "none";
}

// Загрузить и отобразить долги
async function loadDebts(tripId) {
  try {
    console.log(`📡 Загрузка долгов для tripId: ${tripId}`);

    const response = await fetch(`/api/trips/${tripId}/debts`);
    const data = await response.json();

    if (!data.success) {
      throw new Error(data.error || "Ошибка загрузки");
    }

    debtsCurrentDebts = data;
    console.log("✅ Долги загружены:", data);

    // Отображаем общую информацию
    displayDebtsSummary(data);

    // Отображаем кто кому должен
    displaySettlements(data.settlements);

    // 🔹 МЕНЯЕМ ТЕКСТ КНОПКИ в зависимости от баланса пользователя
    updateMainButtonText(data);
  } catch (error) {
    console.error(" Ошибка загрузки долгов:", error);
    document.getElementById("debtsSummary").innerHTML =
      `<p style="color: #dc3545;">Ошибка: ${error.message}</p>`;
  }
}

// 🔹 НОВАЯ ФУНКЦИЯ: меняет текст кнопки "Я заплатил" / "Мне заплатили"
function updateMainButtonText(data) {
  const currentUserId = window.currentUserId;
  const myBalance = data.balances.find((b) => b.userId === currentUserId);
  const mainButton = document.getElementById("mainActionBtn"); // ID кнопки в главном окне

  if (!mainButton) {
    console.warn("⚠️ Кнопка mainActionBtn не найдена");
    return;
  }

  if (myBalance && myBalance.balance < -0.01) {
    // Я должен денег
    mainButton.innerHTML = "💵 Я заплатил";
    mainButton.dataset.mode = "pay";
    console.log(" Кнопка: Я заплатил");
  } else if (myBalance && myBalance.balance > 0.01) {
    // Мне должны денег
    mainButton.innerHTML = "💰 Мне заплатили";
    mainButton.dataset.mode = "receive";
    console.log("🟢 Кнопка: Мне заплатили");
  } else {
    mainButton.innerHTML = "✅ Всё оплачено";
    mainButton.disabled = true;
    console.log("⚪ Всё оплачено");
  }
}

// Отобразить общую информацию
function displayDebtsSummary(data) {
  const container = document.getElementById("debtsSummary");

  const totalExpenses = data.totalExpenses || 0;
  const participantsCount = data.participantsCount || 0;

  const inPlus = data.balances.filter((b) => b.balance > 0).length;
  const inMinus = data.balances.filter((b) => b.balance < 0).length;
  const settled = data.balances.filter(
    (b) => Math.abs(b.balance) < 0.01,
  ).length;

  container.innerHTML = `
    <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 15px; text-align: center;">
      <div style="padding: 10px; background: white; border-radius: 6px;">
        <div style="font-size: 24px; font-weight: bold; color: #007bff;">${totalExpenses.toFixed(2)} ₽</div>
        <div style="font-size: 12px; color: #666;">Всего расходов</div>
      </div>
      <div style="padding: 10px; background: white; border-radius: 6px;">
        <div style="font-size: 24px; font-weight: bold; color: #28a745;">${participantsCount}</div>
        <div style="font-size: 12px; color: #666;">Участников</div>
      </div>
      <div style="padding: 10px; background: white; border-radius: 6px;">
        <div style="font-size: 24px; font-weight: bold; color: #ffc107;">${inMinus}</div>
        <div style="font-size: 12px; color: #666;">Должны</div>
      </div>
    </div>
  `;
}

// Отобразить кто кому должен
function displaySettlements(settlements) {
  const container = document.getElementById("settlementsContainer");

  if (!settlements || settlements.length === 0) {
    container.innerHTML = `
      <div style="padding: 20px; text-align: center; color: #28a745; background: #d4edda; border-radius: 6px;">
        <div style="font-size: 48px; margin-bottom: 10px;">✅</div>
        <div style="font-size: 16px; font-weight: 500;">Все долги урегулированы!</div>
        <div style="font-size: 14px; color: #666; margin-top: 5px;">Никто никому не должен</div>
      </div>
    `;
    return;
  }

  let html = "";

  settlements.forEach((settlement, index) => {
    const colors = ["#dc3545", "#28a745", "#007bff", "#ffc107", "#17a2b8"];
    const color = colors[index % colors.length];

    html += `
      <div style="display: flex; align-items: center; justify-content: space-between; padding: 15px; margin-bottom: 10px; background: white; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
        <div style="display: flex; align-items: center; gap: 10px; flex: 1;">
          <div style="width: 40px; height: 40px; border-radius: 50%; background: ${color}; color: white; display: flex; align-items: center; justify-content: center; font-weight: bold;">
            ${settlement.fromUsername.charAt(0).toUpperCase()}
          </div>
          <div style="font-weight: 500;">${settlement.fromUsername}</div>
          <div style="color: #666;">→</div>
          <div style="width: 40px; height: 40px; border-radius: 50%; background: ${color}; color: white; display: flex; align-items: center; justify-content: center; font-weight: bold;">
            ${settlement.toUsername.charAt(0).toUpperCase()}
          </div>
          <div style="font-weight: 500;">${settlement.toUsername}</div>
        </div>
        <div style="font-size: 20px; font-weight: bold; color: ${color}; margin-left: 15px;">
          ${settlement.amount.toFixed(2)} ₽
        </div>
      </div>
    `;
  });

  container.innerHTML = html;
}

// Показать историю транзакций
async function showDebtHistory() {
  const tripId = window.travelData?.id;
  if (!tripId) {
    alert("❌ ID путешествия не найден");
    return;
  }

  try {
    const response = await fetch(`/api/trips/${tripId}/debt-history`);
    const data = await response.json();

    if (!data.success) {
      throw new Error(data.error || "Ошибка загрузки");
    }

    const modal = document.getElementById("historyModal");
    const container = document.getElementById("historyContainer");

    if (!data.history || data.history.length === 0) {
      container.innerHTML = `
        <div style="padding: 20px; text-align: center; color: #666;">
          <div style="font-size: 48px; margin-bottom: 10px;"></div>
          <div>История пуста</div>
        </div>
      `;
    } else {
      let html = "";
      data.history.forEach((tx) => {
        html += `
          <div style="display: flex; align-items: center; justify-content: space-between; padding: 12px; margin-bottom: 8px; background: #f8f9fa; border-radius: 6px;">
            <div style="flex: 1;">
              <div style="font-weight: 500;">
                ${tx.from_username} → ${tx.to_username}
              </div>
              <div style="font-size: 12px; color: #666;">
                ${new Date(tx.created_at).toLocaleDateString("ru-RU")} ${new Date(tx.created_at).toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" })}
              </div>
              ${tx.note ? `<div style="font-size: 12px; color: #999; margin-top: 4px;">${tx.note}</div>` : ""}
            </div>
            <div style="font-size: 18px; font-weight: bold; color: #28a745;">
              ${parseFloat(tx.amount).toFixed(2)} ₽
            </div>
          </div>
        `;
      });
      container.innerHTML = html;
    }

    modal.style.display = "block";
  } catch (error) {
    console.error("❌ Ошибка загрузки истории:", error);
    alert("Ошибка: " + error.message);
  }
}

// Закрыть историю
function closeHistoryModal() {
  const modal = document.getElementById("historyModal");
  if (modal) modal.style.display = "none";
}

// Показать форму оплаты (ИСПРАВЛЕННАЯ ЛОГИКА)
async function showSettleDebtForm() {
  const tripId = window.travelData?.id;
  const currentUserId = window.currentUserId;

  if (!tripId) {
    alert("❌ ID путешествия не найден");
    return;
  }

  const modal = document.getElementById("settleModal");
  const select = document.getElementById("toUserId");
  const modalTitle = modal.querySelector("h2");
  const submitBtn = modal.querySelector('button[type="submit"]');

  console.log(" Загрузка участников для формы оплаты...");

  // Очищаем select
  select.innerHTML = '<option value="">⏳ Загрузка...</option>';

  try {
    const response = await fetch(`/api/trips/${tripId}/debts`);
    const data = await response.json();

    console.log("📥 Ответ API:", data);

    if (data.success && data.balances) {
      const myBalance = data.balances.find((b) => b.userId === currentUserId);
      console.log("💰 Мой баланс:", myBalance);

      let availableUsers = [];
      let isPayer = false;

      if (myBalance && myBalance.balance < -0.01) {
        // 🔴 Я ДОЛЖНИК
        isPayer = true;
        availableUsers = data.balances.filter(
          (b) => b.userId !== currentUserId && b.balance > 0.01,
        );
        console.log("🔴 Я должен → Показываю кредиторов:", availableUsers);

        if (modalTitle) modalTitle.innerHTML = " Я заплатил";
        if (submitBtn) submitBtn.innerHTML = "✅ Записать перевод";
      } else if (myBalance && myBalance.balance > 0.01) {
        // 🟢 Я КРЕДИТОР
        isPayer = false;
        availableUsers = data.balances.filter(
          (b) => b.userId !== currentUserId && b.balance < -0.01,
        );
        console.log("🟢 Мне должны → Показываю должников:", availableUsers);

        if (modalTitle) modalTitle.innerHTML = "💰 Мне заплатили";
        if (submitBtn) submitBtn.innerHTML = "✅ Записать получение";
      } else {
        availableUsers = [];
        console.log(" Нет долгов");

        if (modalTitle) modalTitle.innerHTML = "✅ Все долги оплачены";
        if (submitBtn) submitBtn.style.display = "none";
      }

      if (availableUsers.length === 0) {
        select.innerHTML = '<option value="">Нет доступных участников</option>';
      } else {
        select.innerHTML = `<option value="">${isPayer ? "Выберите кому заплатили" : "Выберите кто заплатил"}</option>`;
        availableUsers.forEach((p) => {
          const balanceText = isPayer
            ? ` (ему должны: ${p.balance.toFixed(2)}₽)`
            : ` (он должен: ${Math.abs(p.balance).toFixed(2)}₽)`;

          select.innerHTML += `
            <option value="${p.userId}">${p.username}${balanceText}</option>
          `;
        });
      }

      // Сохраняем режим
      modal.dataset.mode = isPayer ? "pay" : "receive";
    } else {
      console.error("❌ API вернул ошибку:", data);
      select.innerHTML = '<option value="">Ошибка загрузки</option>';
    }
  } catch (error) {
    console.error("❌ Ошибка загрузки участников:", error);
    select.innerHTML = '<option value="">Ошибка сети</option>';
  }

  modal.style.display = "block";
}

// Закрыть форму оплаты
function closeSettleModal() {
  const modal = document.getElementById("settleModal");
  if (modal) modal.style.display = "none";
  document.getElementById("settleDebtForm").reset();
}

// Отправить форму оплаты
async function submitSettleDebt(event) {
  event.preventDefault();

  const tripId = window.travelData?.id;
  const currentUserId = window.currentUserId;

  if (!tripId) {
    alert("❌ ID путешествия не найден");
    return;
  }

  const modal = document.getElementById("settleModal");
  const mode = modal.dataset.mode || "pay";

  const toUserId = document.getElementById("toUserId").value;
  const amount = parseFloat(document.getElementById("settleAmount").value);
  const note = document.getElementById("settleNote").value;

  if (!toUserId || !amount || amount <= 0) {
    alert("Заполните все обязательные поля");
    return;
  }

  // Определяем кто платит и кто получает
  let fromUserId, toUserIdFinal;

  if (mode === "pay") {
    fromUserId = currentUserId;
    toUserIdFinal = toUserId;
  } else {
    fromUserId = toUserId;
    toUserIdFinal = currentUserId;
  }

  console.log(" Отправка транзакции:", {
    from: fromUserId,
    to: toUserIdFinal,
    amount,
    mode,
  });

  const submitBtn = event.target.querySelector('button[type="submit"]');
  const originalText = submitBtn.textContent;
  submitBtn.textContent = "⏳ Запись...";
  submitBtn.disabled = true;

  try {
    const response = await fetch(`/api/trips/${tripId}/settle-debt`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        fromUserId: fromUserId,
        toUserId: toUserIdFinal,
        amount,
        note: note || (mode === "receive" ? "Получено" : "Перевод"),
      }),
    });

    const data = await response.json();
    console.log("📥 Ответ сервера:", data);

    if (data.success) {
      console.log("✅ Транзакция записана!");

      closeSettleModal();

      const message =
        mode === "pay"
          ? `✅ Вы заплатили ${amount.toFixed(2)}₽\nДолги пересчитаны.`
          : `✅ Получено ${amount.toFixed(2)}₽\nДолги пересчитаны.`;

      alert(message);

      console.log("🔄 Обновление данных о долгах...");
      await loadDebts(tripId);
    } else {
      alert("❌ Ошибка: " + (data.error || "Неизвестная ошибка"));
    }
  } catch (error) {
    console.error("❌ Ошибка записи транзакции:", error);
    alert("Ошибка: " + error.message);
  } finally {
    submitBtn.textContent = originalText;
    submitBtn.disabled = false;
  }
}

// ===== ИНИЦИАЛИЗАЦИЯ =====
document.addEventListener("DOMContentLoaded", function () {
  const debtsBtn = document.getElementById("openDebtsBtn");
  if (debtsBtn) {
    debtsBtn.addEventListener("click", openDebtsModal);
    console.log('✅ Кнопка "Долги" назначена');
  } else {
    console.warn("⚠️ Кнопка openDebtsBtn не найдена");
  }

  // Закрытие модалок по клику вне
  window.onclick = function (event) {
    if (event.target.classList.contains("modal")) {
      event.target.style.display = "none";
    }
  };
});
async function exportToExcel() {
  const tripId = window.travelData?.id;
  if (!tripId) {
    alert("❌ ID путешествия не найден");
    return;
  }

  try {
    console.log("📊 Экспорт долгов в CSV...");

    // Открываем ссылку для скачивания
    window.location.href = `/api/trips/${tripId}/debts/export`;

    console.log("✅ Экспорт начат");
  } catch (error) {
    console.error("❌ Ошибка экспорта:", error);
    alert("Ошибка при экспорте: " + error.message);
  }
}

async function exportToExcel() {
  const tripId = window.travelData?.id;
  if (!tripId) {
    alert("❌ ID путешествия не найден");
    return;
  }

  try {
    console.log("📊 Экспорт долгов в CSV...");

    // Открываем ссылку для скачивания
    window.location.href = `/api/trips/${tripId}/debts/export`;

    console.log("✅ Экспорт начат");
  } catch (error) {
    console.error("❌ Ошибка экспорта:", error);
    alert("Ошибка при экспорте: " + error.message);
  }
}
