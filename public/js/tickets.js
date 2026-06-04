// public/js/tickets.js

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

let currentPage = 1;
let totalPages = 1;
let lastSearchParams = null;

// === АВИАБИЛЕТЫ ===
// Парсинг даты из строки API без смещения часового пояса
function parseApiDate(dateString) {
  if (!dateString) return null;
  const match = dateString.match(
    /(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):\d{2}/,
  );
  if (!match) return new Date(dateString);
  const [, year, month, day, hour, minute] = match;
  return new Date(Date.UTC(year, month - 1, day, hour, minute));
}
// ========== АВИАБИЛЕТЫ ==========
async function searchFlights() {
  const origin = document.getElementById("originInput")?.value.trim();
  const destination = document.getElementById("destinationInput")?.value.trim();
  const departureDate = document.getElementById("departureDate")?.value;
  const returnDate = document.getElementById("returnDate")?.value;

  if (!origin || !destination) {
    alert("Введите города");
    return;
  }
  if (!departureDate) {
    alert("Выберите дату вылета");
    return;
  }

  const flightsList = document.getElementById("flightsList");
  const flightsCount = document.getElementById("flightsCount");
  if (flightsList)
    flightsList.innerHTML =
      '<div style="text-align:center; padding:20px;">Поиск билетов...</div>';

  try {
    let url = `/api/flights/search?from=${encodeURIComponent(origin)}&to=${encodeURIComponent(destination)}&departure_date=${departureDate}`;
    if (returnDate) {
      url += `&return_date=${returnDate}`;
    }

    console.log("Запрос авиа:", url);

    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const data = await response.json();

    console.log("Ответ сервера:", data);

    if (data.success && data.tickets && data.tickets.length > 0) {
      if (flightsCount) flightsCount.textContent = `найдено ${data.count}`;
      let html = "";
      data.tickets.forEach((ticket, idx) => {
        // Определяем тип поездки
        const isRoundTrip = returnDate !== null && returnDate !== "";
        const hasTransfers = ticket.transfers > 0;

        // Флаг: нужно ли показывать дату и время прибытия
        const showArrivalDetails = !(isRoundTrip && hasTransfers);

        // Парсим дату вылета
        let departureTime = "";
        let departureDateStr = "";
        let arrivalTime = "";
        let arrivalDateStr = "";

        if (ticket.departure_at) {
          const depDate = parseApiDate(ticket.departure_at);
          departureTime = depDate.toLocaleTimeString("ru-RU", {
            hour: "2-digit",
            minute: "2-digit",
            timeZone: "UTC",
          });
          departureDateStr = depDate.toLocaleDateString("ru-RU", {
            timeZone: "UTC",
          });

          if (showArrivalDetails) {
            // Логика расчёта времени прибытия
            let durationToUse = null;

            if (!isRoundTrip) {
              durationToUse = ticket.duration;
            } else if (isRoundTrip && !hasTransfers) {
              durationToUse = ticket.duration_to;
            }

            if (durationToUse) {
              const arrivalDate = new Date(
                depDate.getTime() + durationToUse * 60 * 1000,
              );
              arrivalTime = arrivalDate.toLocaleTimeString("ru-RU", {
                hour: "2-digit",
                minute: "2-digit",
                timeZone: "UTC",
              });
              arrivalDateStr = arrivalDate.toLocaleDateString("ru-RU", {
                timeZone: "UTC",
              });
            } else {
              arrivalTime = "—";
            }
          }
        }

        const ticketLink = ticket.link
          ? `https://www.aviasales.ru${ticket.link}`
          : "#";

        html += `<div class="ticket-card">
                    <div class="ticket-airline">
                        <span class="airline-name">${ticket.airline || ticket.airline_code || "Авиакомпания"}</span>
                        <span class="flight-site">Aviasales</span>
                    </div>
                    <div class="route-main">
                        <div class="city-block">
                            <div class="city-code">${ticket.from_code || "???"}</div>
                            <div class="city-name">${ticket.from_city || ""}</div>
                            <div class="time">${departureTime}</div>
                            <div class="date" style="font-size: 11px; color: #666;">${departureDateStr}</div>
                        </div>
                        <div class="flight-duration">
                            ${ticket.transfers === 0 ? "Прямой рейс" : `${ticket.transfers} пересадк${ticket.transfers === 1 ? "а" : "и"}`}
                            <div class="stops-badge">✈︎</div>
                        </div>
                        <div class="city-block">
                            <div class="city-code">${ticket.to_code || "???"}</div>
                            <div class="city-name">${ticket.to_city || ""}</div>
                            ${showArrivalDetails ? `<div class="time">${arrivalTime}</div>` : ""}
                            ${showArrivalDetails ? `<div class="date" style="font-size: 11px; color: #666;">${arrivalDateStr || departureDateStr}</div>` : ""}
                            ${!showArrivalDetails ? '<div class="time" style="color: #999;">-</div>' : ""}
                        </div>
                    </div>
                    <div class="ticket-info">
                        <div class="price-tag">${ticket.price_rub?.toLocaleString() || "?"} <small>₽</small></div>
                    </div>
                    <div class="ticket-expand-menu">
                        <div class="menu-buttons">
                            <button class="btn-website" onclick="window.open('${ticketLink}', '_blank')">Перейти на сайт</button>
                            <button class="btn-travel">Добавить в траты</button>
                        </div>
                    </div>
                </div>`;
      });
      if (flightsList) flightsList.innerHTML = html;
    } else {
      if (flightsCount) flightsCount.textContent = `найдено 0`;
      if (flightsList)
        flightsList.innerHTML = `<div style="text-align:center; padding:20px;">❌ ${data.message || "Билеты не найдены"}</div>`;
    }
  } catch (error) {
    console.error("Ошибка:", error);
    if (flightsCount) flightsCount.textContent = `ошибка`;
    if (flightsList)
      flightsList.innerHTML = `<div style="text-align:center; padding:20px;">❌ Ошибка: ${error.message}</div>`;
  }
}

// === ЖД БИЛЕТЫ (Tutu.ru) ===
async function searchTrains() {
  const origin = document.getElementById("originInput")?.value.trim();
  const destination = document.getElementById("destinationInput")?.value.trim();
  const date = document.getElementById("departureDate")?.value;

  if (!origin || !destination) {
    alert("Введите города");
    return;
  }

  if (!date) {
    alert("Пожалуйста, выберите дату поездки");
    return;
  }

  const trainsList = document.getElementById("trainsList");
  const trainsCount = document.getElementById("trainsCount");
  if (trainsList)
    trainsList.innerHTML =
      '<div style="text-align:center; padding:20px;">Поиск поездов...</div>';

  try {
    let url = `/api/trains/search?from=${encodeURIComponent(origin)}&to=${encodeURIComponent(destination)}`;
    if (date) url += `&date=${date}`;

    console.log("Запрос ЖД:", url);

    const response = await fetch(url);
    const data = await response.json();

    console.log("Ответ ЖД:", data);

    if (data.success && data.trains && data.trains.length > 0) {
      if (trainsCount) trainsCount.textContent = `найдено ${data.count}`;
      let html = "";
      data.trains.forEach((train, idx) => {
        // Форматируем время отправления
        let departureTime = "";
        let departureDateStr = "";
        let arrivalTime = "";
        let arrivalDateStr = "";

        if (train.departure) {
          const depDate = new Date(train.departure);
          departureTime = depDate.toLocaleTimeString("ru-RU", {
            hour: "2-digit",
            minute: "2-digit",
          });
          departureDateStr = depDate.toLocaleDateString("ru-RU");
        }

        if (train.arrival) {
          const arrDate = new Date(train.arrival);
          arrivalTime = arrDate.toLocaleTimeString("ru-RU", {
            hour: "2-digit",
            minute: "2-digit",
          });
          arrivalDateStr = arrDate.toLocaleDateString("ru-RU");
        }

        // Формируем строку категорий с ценами
        const categoriesHtml =
          train.categories
            ?.map(
              (cat) =>
                `<div class="price-block"><span class="price-label">${cat.type}</span><span class="price-value">${cat.price.toLocaleString()} ₽</span></div>`,
            )
            .join("") ||
          '<div class="price-block"><span class="price-label">Цена</span><span class="price-value">уточняйте</span></div>';

        html += `
                    <div class="train-card">
                        <div class="train-header">
                            <span class="train-company">${train.carrier || "РЖД"} / ${train.train_number || "Поезд"}</span>
                            <span class="train-site">Tutu.ru</span>
                        </div>
                        <div class="train-route">
                            <div class="station-block">
                                <div class="station-code">${train.from_station?.split(" ")[0] || "???"}</div>
                                <div class="station-name">${train.from_station || ""}</div>
                                <div class="time">${departureTime}</div>
                                <div class="date" style="font-size: 11px; color: #666;">${departureDateStr}</div>
                            </div>
                            <div class="train-duration">
                                ${train.duration_formatted || ""}
                            </div>
                            <div class="station-block">
                                <div class="station-code">${train.to_station?.split(" ")[0] || "???"}</div>
                                <div class="station-name">${train.to_station || ""}</div>
                                <div class="time">${arrivalTime}</div>
                                <div class="date" style="font-size: 11px; color: #666;">${arrivalDateStr}</div>
                            </div>
                        </div>
                        <div class="train-prices-row">${categoriesHtml}</div>
                        <div class="train-expand-menu">
                            <div class="menu-buttons">
                                <button class="btn-website" onclick="window.open('${train.buy_link || train.schedule_link || "#"}', '_blank')">Перейти на сайт</button>
                                <button class="btn-travel">Добавить в траты</button>
                            </div>
                        </div>
                    </div>
                `;
      });
      if (trainsList) trainsList.innerHTML = html;
    } else {
      if (trainsCount) trainsCount.textContent = `найдено 0`;
      if (trainsList)
        trainsList.innerHTML = `<div style="text-align:center; padding:20px;">❌ ${data.message || "Поезда не найдены"}</div>`;
    }
  } catch (error) {
    console.error("Ошибка:", error);
    if (trainsCount) trainsCount.textContent = `ошибка`;
    if (trainsList)
      trainsList.innerHTML = `<div style="text-align:center; padding:20px;">❌ Ошибка: ${error.message}</div>`;
  }
}

// === АВТОБУСЫ (Яндекс.Расписания) ===
async function searchBuses() {
  const origin = document.getElementById("originInput")?.value.trim();
  const destination = document.getElementById("destinationInput")?.value.trim();
  const date = document.getElementById("departureDate")?.value;

  if (!origin || !destination) {
    alert("Введите города");
    return;
  }

  if (!date) {
    alert("Пожалуйста, выберите дату поездки");
    return;
  }

  const busesList = document.getElementById("busesList");
  const busesCount = document.getElementById("busesCount");
  if (busesList)
    busesList.innerHTML =
      '<div style="text-align:center; padding:20px;">Поиск автобусов...</div>';

  try {
    let url = `/api/buses/search?from=${encodeURIComponent(origin)}&to=${encodeURIComponent(destination)}`;
    if (date) url += `&date=${date}`;

    console.log("Запрос автобусов:", url);

    const response = await fetch(url);
    const data = await response.json();

    if (data.success && data.buses && data.buses.length > 0) {
      if (busesCount) busesCount.textContent = `найдено ${data.count}`;
      let html = "";
      data.buses.forEach((bus, idx) => {
        let departureTime = "";
        let departureDateStr = "";
        let arrivalTime = "";
        let arrivalDateStr = "";

        if (bus.departure) {
          const depDate = new Date(bus.departure);
          departureTime = depDate.toLocaleTimeString("ru-RU", {
            hour: "2-digit",
            minute: "2-digit",
          });
          departureDateStr = depDate.toLocaleDateString("ru-RU");
        }

        if (bus.arrival) {
          const arrDate = new Date(bus.arrival);
          arrivalTime = arrDate.toLocaleTimeString("ru-RU", {
            hour: "2-digit",
            minute: "2-digit",
          });
          arrivalDateStr = arrDate.toLocaleDateString("ru-RU");
        }

        html += `
                    <div class="bus-card">
                        <div class="bus-header">
                            <span class="bus-company">${bus.carrier || "Перевозчик"}</span>
                            <span class="bus-site">Яндекс</span>
                        </div>
                        <div class="bus-route">
                            <div class="bus-stop-block">
                                <div class="bus-stop-name">${bus.from_station?.split(",")[0] || origin}</div>
                                <div class="bus-stop-city">${bus.from_station || ""}</div>
                                <div class="time">${departureTime}</div>
                                <div class="date" style="font-size: 11px; color: #666;">${departureDateStr}</div>
                            </div>
                            <div class="bus-duration">
                                ${bus.duration_formatted || ""}
                                <div class="bus-stops"></div>
                            </div>
                            <div class="bus-stop-block">
                                <div class="bus-stop-name">${bus.to_station?.split(",")[0] || destination}</div>
                                <div class="bus-stop-city">${bus.to_station || ""}</div>
                                <div class="time">${arrivalTime}</div>
                                <div class="date" style="font-size: 11px; color: #666;">${arrivalDateStr}</div>
                            </div>
                        </div>
                        <div class="bus-expand-menu">
                            <div class="menu-buttons">
                                <button class="btn-website" onclick="window.open('${bus.search_link || "#"}', '_blank')">Перейти на сайт</button>
                                <button class="btn-travel">Добавить в траты</button>
                            </div>
                        </div>
                    </div>
                `;
      });
      if (busesList) busesList.innerHTML = html;
    } else {
      if (busesCount) busesCount.textContent = `найдено 0`;
      if (busesList)
        busesList.innerHTML = `<div style="text-align:center; padding:20px;">❌ ${data.message || "Автобусы не найдены"}</div>`;
    }
  } catch (error) {
    console.error("Ошибка:", error);
    if (busesCount) busesCount.textContent = `ошибка`;
    if (busesList)
      busesList.innerHTML = `<div style="text-align:center; padding:20px;">❌ Ошибка: ${error.message}</div>`;
  }
}

// Загрузка списка стран
async function loadHotelCountries() {
  try {
    const response = await fetch("/api/countries");
    const data = await response.json();
    if (data.success) {
      const select = document.getElementById("hotelCountrySelect");
      if (!select) return;
      select.innerHTML = '<option value="">-- Выберите страну --</option>';
      data.countries.forEach((country) => {
        const option = document.createElement("option");
        option.value = country.name_ru;
        option.textContent = country.name_ru;
        select.appendChild(option);
      });
    }
  } catch (error) {
    console.error("Ошибка загрузки стран:", error);
  }
}

// Загрузка городов при выборе страны
async function loadHotelCities(countryName) {
  const citySelect = document.getElementById("hotelCitySelect");
  if (!citySelect) return;
  citySelect.innerHTML = '<option value="">Загрузка...</option>';
  citySelect.disabled = true;
  try {
    const response = await fetch(
      `/api/cities?country=${encodeURIComponent(countryName)}`,
    );
    const data = await response.json();
    if (data.success && data.cities && data.cities.length > 0) {
      citySelect.innerHTML = '<option value="">-- Выберите город --</option>';
      data.cities.forEach((city) => {
        const option = document.createElement("option");
        option.value = city.name_ru;
        option.textContent = city.name_ru;
        option.dataset.cityEn = city.name_en;
        option.dataset.countryEn = city.country_en;
        citySelect.appendChild(option);
      });
      citySelect.disabled = false;
    } else {
      citySelect.innerHTML = '<option value="">Нет городов</option>';
      citySelect.disabled = true;
    }
  } catch (error) {
    console.error("Ошибка загрузки городов:", error);
    citySelect.innerHTML = '<option value="">Ошибка загрузки</option>';
    citySelect.disabled = true;
  }
}

// === ПОИСК ОТЕЛЕЙ (с выбором страны/города) ===
// Поиск отелей
async function searchHotels(page = 1) {
  const countrySelect = document.getElementById("hotelCountrySelect");
  const citySelect = document.getElementById("hotelCitySelect");
  const checkIn = document.getElementById("hotelCheckIn")?.value;
  const checkOut = document.getElementById("hotelCheckOut")?.value;
  const adults = document.getElementById("hotelAdults")?.value || 2;
  const currency = document.getElementById("hotelCurrency")?.value || "RUB";

  const cityRu = citySelect?.value;
  const cityEn = citySelect?.options[citySelect.selectedIndex]?.dataset?.cityEn;
  const countryEn =
    citySelect?.options[citySelect.selectedIndex]?.dataset?.countryEn;

  if (!cityRu || !cityEn) {
    alert("Выберите страну и город");
    return;
  }
  if (!checkIn || !checkOut) {
    alert("Выберите даты заезда и выезда");
    return;
  }

  const hotelsList = document.getElementById("hotelsList");
  const hotelsCount = document.getElementById("hotelsCount");
  if (hotelsList)
    hotelsList.innerHTML =
      '<div style="text-align:center; padding:20px;">🔍 Поиск отелей...</div>';

  try {
    let url = `/api/hotels/search?city=${encodeURIComponent(cityEn)}&checkIn=${checkIn}&checkOut=${checkOut}&adults=${adults}&currency=${currency}&page=${page}`;
    if (countryEn) url += `&country=${encodeURIComponent(countryEn)}`;

    const response = await fetch(url);
    const data = await response.json();

    if (data.success && data.hotels && data.hotels.length > 0) {
      if (hotelsCount) hotelsCount.textContent = `найдено ${data.count}`;
      let html = "";
      data.hotels.forEach((hotel, idx) => {
        const starsFull = Math.floor(hotel.stars || 0);
        let starsHtml = "";
        for (let i = 0; i < starsFull; i++)
          starsHtml += '<span class="star-filled">★</span>';
        for (let i = starsFull; i < 5; i++)
          starsHtml += '<span class="star-empty">☆</span>';

        html += `
                    <div class="hotel-card">
                        <div class="hotel-image">${hotel.imageUrl ? `<img src="${hotel.imageUrl}" style="width:100%; height:100%; object-fit:cover; border-radius:8px;">` : "🏨"}</div>
                        <div class="hotel-info">
                            <div class="hotel-title">${hotel.name}</div>
                            <div class="hotel-location">⚲ ${hotel.address?.split(",")[0] || cityRu}</div>
                            <div class="hotel-rating">
                                <div class="stars">${starsHtml}</div>
                                <span class="rating-text">${hotel.rating || "Нет"} • отель</span>
                            </div>
                            <div class="hotel-price-row">
                                <span class="hotel-price">${hotel.priceFormatted} <small>/ночь</small></span>
                            </div>
                            <div class="hotel-expand-menu">
                                <div class="menu-buttons">
                                    <button class="btn-website" onclick="window.open('${hotel.url}', '_blank')">Перейти на сайт</button>
                                    <button class="btn-travel">Добавить в траты</button>
                                </div>
                            </div>
                        </div>
                    </div>`;
      });
      if (hotelsList) hotelsList.innerHTML = html;
    } else {
      if (hotelsCount) hotelsCount.textContent = `найдено 0`;
      if (hotelsList)
        hotelsList.innerHTML = `<div style="text-align:center; padding:20px;">❌ ${data.message || "Отели не найдены"}</div>`;
    }
  } catch (error) {
    console.error("Ошибка:", error);
    if (hotelsList)
      hotelsList.innerHTML = `<div style="text-align:center; padding:20px;">❌ Ошибка: ${error.message}</div>`;
  }
}

function renderPagination() {
  if (totalPages <= 1) return "";

  let html =
    '<div class="pagination" style="display: flex; justify-content: center; gap: 10px; margin-top: 20px; flex-wrap: wrap;">';

  // Кнопка "Первая"
  if (currentPage > 1) {
    html += `<button onclick="goToPage(1)" style="padding: 8px 12px; cursor: pointer;">⏮️ Первая</button>`;
    html += `<button onclick="goToPage(${currentPage - 1})" style="padding: 8px 12px; cursor: pointer;">◀ Предыдущая</button>`;
  }

  // Номера страниц (показываем 5 страниц вокруг текущей)
  let startPage = Math.max(1, currentPage - 2);
  let endPage = Math.min(totalPages, currentPage + 2);

  if (startPage > 1) {
    html += `<button onclick="goToPage(1)" style="padding: 8px 12px; cursor: pointer;">1</button>`;
    if (startPage > 2) html += `<span style="padding: 8px 4px;">...</span>`;
  }

  for (let i = startPage; i <= endPage; i++) {
    if (i === currentPage) {
      html += `<button disabled style="padding: 8px 12px; background: #3498db; color: white; border: none;">${i}</button>`;
    } else {
      html += `<button onclick="goToPage(${i})" style="padding: 8px 12px; cursor: pointer;">${i}</button>`;
    }
  }

  if (endPage < totalPages) {
    if (endPage < totalPages - 1)
      html += `<span style="padding: 8px 4px;">...</span>`;
    html += `<button onclick="goToPage(${totalPages})" style="padding: 8px 12px; cursor: pointer;">${totalPages}</button>`;
  }

  // Кнопка "Последняя"
  if (currentPage < totalPages) {
    html += `<button onclick="goToPage(${currentPage + 1})" style="padding: 8px 12px; cursor: pointer;">Следующая ▶</button>`;
    html += `<button onclick="goToPage(${totalPages})" style="padding: 8px 12px; cursor: pointer;">Последняя ⏭️</button>`;
  }

  html += "</div>";
  return html;
}

function goToPage(page) {
  if (page < 1 || page > totalPages || page === currentPage) return;
  searchHotels(page);
}

// Назначение обработчиков для кнопок пагинации
function attachPaginationHandlers() {
  // Обработчики уже назначены через onclick в кнопках
  // Эта функция может быть расширена для дополнительной логики
}

// Форматирование даты для отображения
function formatDate(dateString) {
  if (!dateString) return "";
  const date = new Date(dateString);
  return date.toLocaleDateString("ru-RU");
}

window.searchFlights = searchFlights;
window.searchTrains = searchTrains;
window.searchBuses = searchBuses;
window.searchHotels = searchHotels;
window.loadHotelCountries = loadHotelCountries;
window.loadHotelCities = loadHotelCities;

// Назначаем обработчики событий после загрузки DOM
document.addEventListener("DOMContentLoaded", () => {
  loadHotelCountries();
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

  // Отели
  const countrySelect = document.getElementById("hotelCountry");
  if (countrySelect) {
    countrySelect.addEventListener("change", (e) => {
      if (e.target.value) {
        loadCities(e.target.value);
      } else {
        const citySelect = document.getElementById("hotelCity");
        if (citySelect) {
          citySelect.innerHTML =
            '<option value="">-- Сначала выберите страну --</option>';
          citySelect.disabled = true;
        }
      }
    });
  }

  // Обработчик формы
  const hotelForm = document.getElementById("hotelsSearchBlock");
  if (hotelForm) {
    hotelForm.addEventListener("submit", (e) => {
      e.preventDefault();
      console.log("Форма отправлена, запускаем поиск...");
      searchHotels(1);
    });
  } else {
    console.error('Форма с id="hotelsSearchBlock" не найдена!');
  }
});
