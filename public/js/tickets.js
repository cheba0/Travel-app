// public/js/tickets.js

// Переключение между подразделами
function showSubsection(subsection) {
  document.getElementById("flightsSubsection").classList.add("hidden");
  document.getElementById("trainsSubsection").classList.add("hidden");
  document.getElementById("busesSubsection").classList.add("hidden");

  document.getElementById(subsection + "Subsection").classList.remove("hidden");
}

// Показать/скрыть поле для даты возвращения (для авиа)
function toggleReturnDate() {
  const roundTripCheckbox = document.getElementById("roundTrip");
  const returnDateDiv = document.getElementById("returnDateDiv");

  if (roundTripCheckbox && returnDateDiv) {
    if (roundTripCheckbox.checked) {
      returnDateDiv.style.display = "block";
    } else {
      returnDateDiv.style.display = "none";
    }
  }
}

// === АВИАБИЛЕТЫ ===
async function searchFlights() {
  const from = document.getElementById("flightFrom").value.trim();
  const to = document.getElementById("flightTo").value.trim();
  const flightDate = document.getElementById("flightDate").value;
  const isRoundTrip = document.getElementById("roundTrip")?.checked || false;

  if (!from || !to) {
    alert("Введите города");
    return;
  }

  if (!flightDate) {
    alert("Выберите дату вылета");
    return;
  }

  const listDiv = document.getElementById("flightsList");
  listDiv.innerHTML = "<p>🔍 Поиск билетов...</p>";

  try {
    let url = `/api/flights/search?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}&departure_date=${flightDate}`;

    if (isRoundTrip) {
      const returnDate = document.getElementById("returnDate")?.value;
      if (returnDate) {
        url += `&return_date=${returnDate}`;
      } else {
        alert("Пожалуйста, выберите дату возвращения");
        return;
      }
    }

    const response = await fetch(url);
    const data = await response.json();

    if (data.success && data.tickets && data.tickets.length > 0) {
      let html = `<p class="success">✅ Найдено ${data.count} билетов</p>`;

      data.tickets.forEach((ticket, index) => {
        html += `
                    <div class="result-item" style="border-bottom: 1px solid #ccc; padding: 10px; margin: 5px 0;">
                        <strong>${index + 1}. ${ticket.from_city} → ${ticket.to_city}</strong><br>
                        📅 Вылет: ${ticket.departure_formatted}<br>
                        ${ticket.return_formatted ? `📅 Возврат: ${ticket.return_formatted}<br>` : ""}
                        💰 Цена: ${ticket.price_rub.toLocaleString()} ₽<br>
                        ✈️ Авиакомпания: ${ticket.airline}<br>
                        🔄 Пересадки: ${ticket.transfers}<br>
                        🔗 <a href="https://www.aviasales.ru${ticket.link}" target="_blank" style="color: blue;">Купить билет на Aviasales →</a>
                    </div>
                `;
      });

      listDiv.innerHTML = html;
    } else {
      listDiv.innerHTML = `<p class="error">❌ ${data.message || "Билеты не найдены"}</p>`;
    }
  } catch (error) {
    console.error("Ошибка:", error);
    listDiv.innerHTML = `<p class="error">❌ Ошибка: ${error.message}</p>`;
  }
}

// === ЖД БИЛЕТЫ (Tutu.ru) ===
async function searchTrains() {
  const from = document.getElementById("trainFrom").value.trim();
  const to = document.getElementById("trainTo").value.trim();
  const date = document.getElementById("trainDate").value;

  if (!from || !to) {
    alert("Введите города");
    return;
  }

  const listDiv = document.getElementById("trainsList");
  listDiv.innerHTML = "<p>🔍 Поиск поездов...</p>";

  try {
    let url = `/api/trains/search?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`;
    if (date) url += `&date=${date}`;

    const response = await fetch(url);
    const data = await response.json();

    console.log("Ответ от сервера:", data);

    if (data.success && data.trains && data.trains.length > 0) {
      let html = `<p class="success">✅ Найдено ${data.count} поездов</p>`;

      data.trains.forEach((train, index) => {
        html += `
                    <div class="result-item" style="border-bottom: 1px solid #ccc; padding: 10px; margin: 5px 0;">
                        <strong>${index + 1}. Поезд №${train.train_number}</strong>
                        ${train.name ? ` <strong>«${train.name}»</strong>` : ""}<br>
                        🚉 Отправление: ${train.from_station}<br>
                        🚉 Прибытие: ${train.to_station}<br>
                        🕐 Отправление: ${train.departure_time}<br>
                        🏁 Прибытие: ${train.arrival_time}<br>
                        ⏱️ В пути: ${train.duration_formatted}<br>
                        🏢 Перевозчик: ${train.carrier}<br>
                `;

        // Отображаем цены на все категории
        if (train.categories && train.categories.length > 0) {
          html += `<br>📊 <strong>Цены на билеты:</strong><br>`;
          train.categories.forEach((cat) => {
            html += `   🎫 ${cat.type}: ${cat.price.toLocaleString()} ₽<br>`;
          });
        } else {
          html += `<br>💰 Цена: уточняйте на сайте<br>`;
        }

        html += `
                        <br>
                        🔗 <a href="${train.buy_link}" target="_blank" style="color: blue;">Купить билет на Tutu.ru →</a><br>
                        📋 <a href="${train.schedule_link}" target="_blank" style="color: green;">Подробное расписание →</a>
                    </div>
                `;
      });

      listDiv.innerHTML = html;
    } else {
      listDiv.innerHTML = `<p class="error">❌ ${data.message || "Поезда не найдены"}</p>`;
    }
  } catch (error) {
    console.error("Ошибка:", error);
    listDiv.innerHTML = `<p class="error">❌ Ошибка: ${error.message}</p>`;
  }
}

// === АВТОБУСЫ (Яндекс.Расписания) ===
async function searchBuses() {
  const from = document.getElementById("busFrom").value.trim();
  const to = document.getElementById("busTo").value.trim();
  const date = document.getElementById("busDate").value;

  if (!from || !to) {
    alert("Введите города");
    return;
  }

  const listDiv = document.getElementById("busesList");
  listDiv.innerHTML = "<p>🔍 Поиск автобусов...</p>";

  try {
    let url = `/api/buses/search?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`;
    if (date) url += `&date=${date}`;

    const response = await fetch(url);
    const data = await response.json();

    console.log("Ответ автобусов:", data);

    if (data.success && data.buses && data.buses.length > 0) {
      let html = `<p class="success">✅ Найдено ${data.count} автобусов</p>`;

      data.buses.forEach((bus, index) => {
        html += `
                    <div class="result-item" style="border-bottom: 1px solid #ccc; padding: 10px; margin: 5px 0;">
                        <strong>${index + 1}. ${bus.transport_type}</strong>
                        ${bus.bus_number !== "Нет номера" ? ` №${bus.bus_number}` : ""}<br>
                        🚏 Отправление: ${bus.from_station}<br>
                        🚏 Прибытие: ${bus.to_station}<br>
                        🕐 Отправление: ${bus.departure_formatted}<br>
                        🏁 Прибытие: ${bus.arrival_formatted}<br>
                        ⏱️ В пути: ${bus.duration_formatted}<br>
                        🏢 Перевозчик: ${bus.carrier}<br>
                        🔗 <a href="${bus.search_link}" target="_blank" style="color: blue;">Посмотреть на Яндекс.Расписаниях →</a>
                    </div>
                `;
      });

      listDiv.innerHTML = html;
    } else {
      listDiv.innerHTML = `<p class="error">❌ ${data.message || "Автобусы не найдены"}</p>`;
    }
  } catch (error) {
    console.error("Ошибка:", error);
    listDiv.innerHTML = `<p class="error">❌ Ошибка: ${error.message}</p>`;
  }
}

// Назначаем обработчики событий после загрузки DOM
document.addEventListener("DOMContentLoaded", () => {
  // Авиабилеты
  const flightForm = document.getElementById("flightForm");
  if (flightForm) {
    flightForm.addEventListener("submit", (e) => {
      e.preventDefault();
      searchFlights();
    });
  }

  // Чекбокс туда-обратно
  const roundTripCheckbox = document.getElementById("roundTrip");
  if (roundTripCheckbox) {
    roundTripCheckbox.addEventListener("change", toggleReturnDate);
  }

  // ЖД билеты
  const trainForm = document.getElementById("trainForm");
  if (trainForm) {
    trainForm.addEventListener("submit", (e) => {
      e.preventDefault();
      searchTrains();
    });
  }

  // Автобусы
  const busForm = document.getElementById("busForm");
  if (busForm) {
    busForm.addEventListener("submit", (e) => {
      e.preventDefault();
      searchBuses();
    });
  }

  // Показываем авиабилеты по умолчанию
  showSubsection("flights");
});
