// public/js/tickets.js

// Переключение между подразделами
function showSubsection(subsection) {
  document.getElementById("flightsSubsection").classList.add("hidden");
  document.getElementById("trainsSubsection").classList.add("hidden");
  document.getElementById("busesSubsection").classList.add("hidden");
  document.getElementById("hotelsSubsection").classList.add("hidden");

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

let currentPage = 1;
let totalPages = 1;
let lastSearchParams = null;

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

// Загрузка списка стран
async function loadCountries() {
  try {
    const response = await fetch("/api/countries");
    const data = await response.json();

    if (data.success) {
      const select = document.getElementById("hotelCountry");
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
async function loadCities(countryNameRu) {
  const citySelect = document.getElementById("hotelCity");
  citySelect.innerHTML = '<option value="">Загрузка...</option>';
  citySelect.disabled = true;

  try {
    const response = await fetch(
      `/api/cities?country=${encodeURIComponent(countryNameRu)}`,
    );
    const data = await response.json();

    if (data.success && data.cities.length > 0) {
      citySelect.innerHTML = '<option value="">-- Выберите город --</option>';

      data.cities.forEach((city) => {
        const option = document.createElement("option");
        option.value = city.name_ru;
        option.textContent = city.name_ru;
        option.dataset.cityEn = city.name_en;
        option.dataset.countryEn = city.country_en; // ← добавляем страну
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
  const countrySelect = document.getElementById("hotelCountry");
  const citySelect = document.getElementById("hotelCity");
  const checkInInput = document.getElementById("hotelCheckIn");
  const checkOutInput = document.getElementById("hotelCheckOut");
  const adultsInput = document.getElementById("hotelAdults");
  const currencySelect = document.getElementById("hotelCurrency");

  // Проверка наличия элементов
  if (!countrySelect || !citySelect || !checkInInput || !checkOutInput) {
    console.error("Ошибка: не найдены элементы формы");
    alert("Ошибка загрузки формы");
    return;
  }

  // Получаем выбранные значения
  const selectedCountry =
    countrySelect.options[countrySelect.selectedIndex]?.textContent;
  const cityRu = citySelect.value;
  const cityEn = citySelect.options[citySelect.selectedIndex]?.dataset?.cityEn;
  const countryEn =
    citySelect.options[citySelect.selectedIndex]?.dataset?.countryEn;
  const checkIn = checkInInput.value;
  const checkOut = checkOutInput.value;
  const adults = adultsInput?.value || 2;
  const currency = currencySelect?.value || "RUB";

  // Валидация
  if (!selectedCountry || !cityRu || !cityEn) {
    alert("Выберите страну и город");
    return;
  }

  if (!checkIn || !checkOut) {
    alert("Выберите даты заезда и выезда");
    return;
  }

  // Сохраняем параметры для пагинации
  lastSearchParams = {
    cityEn,
    checkIn,
    checkOut,
    adults,
    currency,
    cityRu,
    countryEn,
  };
  currentPage = page;

  const listDiv = document.getElementById("hotelsList");
  if (!listDiv) return;
  listDiv.innerHTML = "<p>🔍 Поиск отелей...</p>";

  try {
    let url = `/api/hotels/search?city=${encodeURIComponent(cityEn)}&checkIn=${checkIn}&checkOut=${checkOut}&adults=${adults}&currency=${currency}&page=${page}`;
    if (countryEn) {
      url += `&country=${encodeURIComponent(countryEn)}`;
    }

    console.log("Запрос:", url);

    const response = await fetch(url);
    const data = await response.json();

    console.log("Ответ:", data);

    if (data.success && data.hotels && data.hotels.length > 0) {
      totalPages = data.total_pages || Math.ceil(data.count / 30);

      let html = `<p class="success">✅ Найдено ${data.count} отелей в городе ${cityRu}</p>`;
      html += `<p>📅 Заезд: ${checkIn} | Выезд: ${checkOut} | Гостей: ${adults} | Валюта: ${currency}</p>`;
      html += `<p>📄 Страница ${currentPage} из ${totalPages}</p>`;

      data.hotels.forEach((hotel, index) => {
        const stars = "⭐".repeat(Math.floor(hotel.stars || 0));
        const globalIndex = (currentPage - 1) * 30 + index + 1;

        html += `
                    <div class="hotel-card" style="border: 1px solid #ddd; border-radius: 8px; padding: 15px; margin: 15px 0; display: flex; gap: 15px;">
                        <div class="hotel-image" style="flex-shrink: 0;">
                            ${
                              hotel.imageUrl
                                ? `<img src="${hotel.imageUrl}" alt="${hotel.name}" style="width: 150px; height: 150px; object-fit: cover; border-radius: 8px;">`
                                : `<div style="width: 150px; height: 150px; background: #f0f0f0; display: flex; align-items: center; justify-content: center; border-radius: 8px;">📷 Нет фото</div>`
                            }
                        </div>
                        <div class="hotel-info" style="flex-grow: 1;">
                            <strong style="font-size: 18px;">${globalIndex}. ${hotel.name}</strong> ${stars}<br>
                            📍 Адрес: ${hotel.address || "Не указан"}<br>
                            ⭐ Рейтинг: ${hotel.rating || "Нет"}/5<br>
                            💰 Цена за ночь: <strong style="color: #e74c3c;">${hotel.priceFormatted}</strong><br>
                            🔗 <a href="${hotel.url}" target="_blank" style="color: blue;">Подробнее об отеле →</a>
                        </div>
                    </div>
                `;
      });

      // Пагинация
      if (totalPages > 1) {
        html +=
          '<div class="pagination" style="display: flex; justify-content: center; gap: 10px; margin-top: 20px;">';
        if (currentPage > 1) {
          html += `<button onclick="searchHotels(${currentPage - 1})" style="padding: 8px 12px;">◀ Предыдущая</button>`;
        }
        html += `<span style="padding: 8px 12px;">Страница ${currentPage} из ${totalPages}</span>`;
        if (currentPage < totalPages) {
          html += `<button onclick="searchHotels(${currentPage + 1})" style="padding: 8px 12px;">Следующая ▶</button>`;
        }
        html += "</div>";
      }

      listDiv.innerHTML = html;
    } else {
      listDiv.innerHTML = `<p class="error">❌ ${data.message || "Отели не найдены"}</p>`;
    }
  } catch (error) {
    console.error("Ошибка:", error);
    listDiv.innerHTML = `<p class="error">❌ Ошибка: ${error.message}</p>`;
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

// Назначаем обработчики событий после загрузки DOM
document.addEventListener("DOMContentLoaded", () => {
  loadCountries();
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
  const hotelForm = document.getElementById("hotelSearchForm");
  if (hotelForm) {
    hotelForm.addEventListener("submit", (e) => {
      e.preventDefault();
      console.log("Форма отправлена, запускаем поиск...");
      searchHotels(1);
    });
  } else {
    console.error('Форма с id="hotelSearchForm" не найдена!');
  }

  // Показываем авиабилеты по умолчанию
  showSubsection("flights");
});
