// public/js/travels.js

// 1. Загрузка путешествий с сервера
async function loadTravelsFromServer() {
  try {
    console.log("🚀 Загружаю путешествия с сервера...");

    const response = await fetch("/api/travels", {
      method: "GET",
      credentials: "include",
    });

    if (!response.ok) {
      console.error("❌ Ошибка сервера:", response.status);
      return null;
    }

    const data = await response.json();

    if (data.success) {
      console.log(`✅ Загружено ${data.travels?.length || 0} путешествий`);

      return data.travels || [];
    } else {
      console.error("❌ Ошибка в данных:", data.error);
      return null;
    }
  } catch (error) {
    console.error("❌ Ошибка загрузки путешествий:", error);
    return null;
  }
}

// 2. Отображение путешествий на странице
function displayTravels(travels) {
  const authContent = document.getElementById("authContent");

  if (!authContent) {
    console.error("❌ Контейнер authContent не найден");
    return;
  }

  // Создаем контейнер для списка путешествий
  let travelsContainer = document.createElement("div");
  travelsContainer.id = "travelsContainer";

  const title = authContent.querySelector("h1");
  if (title) {
    authContent.insertBefore(travelsContainer, title.nextElementSibling);
  }

  if (!travels || travels.length === 0) {
    travelsContainer.innerHTML = `
            <div class="no_travel_conteiner">
                <p class="no_travel_text">У вас еще нет путешествий</p>
                <p class="no_travel_textadd">Добавьте свое первое путешествие</p>
                <button class="hello_button" onclick="window.location.href='add'">+ Добавить путешествие</button>
            </div>
        `;
    return;
  }

  // Группируем по годам
  const groupedByYear = groupTravelsByYear(travels);

  // Генерируем HTML
  let html = generateTravelsHTML(groupedByYear);

  travelsContainer.innerHTML = html;

  // Добавляем обработчики событий
  addCardClickHandlers();
}

// 3. Группировка путешествий по году
function groupTravelsByYear(travels) {
  const grouped = {};

  travels.forEach((travel) => {
    const year = new Date(travel.start_date).getFullYear();
    if (!grouped[year]) grouped[year] = [];
    grouped[year].push(travel);
  });

  return grouped;
}

// 4. Генерация HTML для путешествий
function generateTravelsHTML(groupedByYear) {
  let html = "";

  // Сортируем годы по убыванию (от нового к старому)
  Object.keys(groupedByYear)
    .sort((a, b) => b - a)
    .forEach((year) => {
      html += `<span class="year">${year}</span>`;

      groupedByYear[year].forEach((travel) => {
        html += generateTravelCardHTML(travel);
      });
    });

  return html;
}

// 5. Генерация HTML для одной карточки
function generateTravelCardHTML(travel) {
  // Форматируем даты
  const startDate = formatDate(travel.start_date);
  const endDate = travel.end_date ? formatDate(travel.end_date) : null;

  // Обрезаем длинное название
  const shortTitle =
    travel.trip_name.length > 25
      ? travel.trip_name.substring(0, 22) + "..."
      : travel.trip_name;

  return `
        <div class="card" data-travel-id="${travel.id}">
            <div class="card_left">
                <div class="card_title">${shortTitle}</div>
            </div>
            <div class="card_dates">
                ${startDate}${endDate ? " - " + endDate : ""}
            </div>
        </div>
    `;
}

// 6. Форматирование даты
function formatDate(dateString) {
  if (!dateString) return "";
  const date = new Date(dateString);
  return date.toLocaleDateString("ru-RU", {
    day: "numeric",
    month: "numeric",
  });
}

// 7. Добавление обработчиков клика на карточки
function addCardClickHandlers() {
  const cards = document.querySelectorAll(".card[data-travel-id]");

  cards.forEach((card) => {
    const travelId = card.getAttribute("data-travel-id");

    card.addEventListener("click", () => {
      window.location.href = `/travel/${travelId}`;
    });

    // Добавляем hover эффект
    card.style.cursor = "pointer";
    card.style.transition = "transform 0.2s, box-shadow 0.2s";

    card.addEventListener("mouseenter", () => {
      card.style.transform = "translateY(-2px)";
      card.style.boxShadow = "0 4px 15px rgba(0,0,0,0.1)";
    });

    card.addEventListener("mouseleave", () => {
      card.style.transform = "translateY(0)";
      card.style.boxShadow = "";
    });
  });
}

// 8. Инициализация на главной странице
function initTravelsOnHomePage() {
  console.log("🏠 Загружаю путешествия для главной страницы...");

  // Загружаем и отображаем путешествия
  loadTravelsFromServer().then((travels) => {
    if (travels !== null) {
      displayTravels(travels);
    } else {
      const errorHTML = `
                <div style="text-align: center; padding: 40px; color: #e74c3c;">
                    <p>Ошибка загрузки путешествий</p>
                    <button onclick="location.reload()" style="
                        margin-top: 20px;
                        padding: 10px 20px;
                        background: #3498db;
                        color: white;
                        border: none;
                        border-radius: 5px;
                        cursor: pointer;
                    ">
                        Попробовать снова
                    </button>
                </div>
            `;

      const travelsContainer = document.getElementById("travelsContainer");
      if (travelsContainer) {
        travelsContainer.innerHTML = errorHTML;
      }
    }
  });
}

// 9. Ожидание авторизации пользователя
function waitForAuthAndInit() {
  console.log("👀 Ожидание авторизации для загрузки путешествий...");

  // Проверяем каждые 100ms
  const checkInterval = setInterval(() => {
    const authContent = document.getElementById("authContent");

    // Проверяем, что authContent существует и НЕ скрыт (не hidden)
    if (authContent && !authContent.hidden) {
      // Нашли! Останавливаем проверку и запускаем
      clearInterval(checkInterval);
      console.log("✅ Пользователь авторизован, загружаю путешествия");
      initTravelsOnHomePage();
    }
  }, 100);

  // Остановить через 5 секунд в любом случае
  setTimeout(() => {
    clearInterval(checkInterval);
    console.log("⏰ Таймаут проверки авторизации");
  }, 5000);
}

// ========== ЭКСПОРТ ФУНКЦИЙ ==========

// Для использования в других файлах
window.travels = {
  loadTravelsFromServer,
  displayTravels,
  initTravelsOnHomePage,
  waitForAuthAndInit,
  formatDate,
};

// Автоматическая инициализация если мы на главной
if (window.location.pathname === "/") {
  document.addEventListener("DOMContentLoaded", () => {
    // Ждем когда пользователь будет определен как авторизованный
    waitForAuthAndInit();
  });
}

console.log("✅ travels.js загружен");
