// services/tutuService.js
// API для ЖД билетов от Tutu.ru

const TUTU_API_URL = "https://suggest.travelpayouts.com/search";

// Коды станций для популярных городов
const stationCodes = {
  москва: "2000000",
  "санкт-петербург": "2004000",
  спб: "2004000",
  казань: "2064000",
  "нижний новгород": "2024000",
  екатеринбург: "2034000",
  новосибирск: "2044000",
  сочи: "2049080",
  владивосток: "2054000",
};

// Названия станций
const stationNames = {
  2004001: "Санкт-Петербург (Ладожский вокзал)",
  2004002: "Санкт-Петербург (Московский вокзал)",
  2004003: "Санкт-Петербург (Витебский вокзал)",
  2006004: "Москва (Курский вокзал)",
  2000003: "Москва (Ленинградский вокзал)",
  2000001: "Москва (Казанский вокзал)",
  2064130: "Казань",
};

// Названия категорий вагонов
const categoryNames = {
  coupe: "Купе",
  lux: "Люкс",
  soft: "Мягкий",
  plazcard: "Плацкарт",
  sedentary: "Сидячий",
};

function getStationCode(cityName) {
  const lowerName = cityName.toLowerCase().trim();
  return stationCodes[lowerName] || null;
}

async function searchTrains(originCity, destinationCity, date = null) {
  try {
    const fromCode = getStationCode(originCity);
    const toCode = getStationCode(destinationCity);

    if (!fromCode || !toCode) {
      return {
        success: false,
        message: `Не удалось найти коды для городов: ${originCity} → ${destinationCity}.`,
        trains: [],
      };
    }

    let url = `${TUTU_API_URL}?service=tutu_trains&term=${fromCode}&term2=${toCode}`;
    console.log("📤 Запрос:", url);

    const response = await fetch(url);
    const data = await response.json();

    console.log("📥 Получено поездов:", data.trips ? data.trips.length : 0);

    if (data && data.trips && data.trips.length > 0) {
      const formattedTrains = data.trips.map((train) => {
        // Форматируем дату для ссылки
        let formattedDate = "";
        if (date) {
          const dateObj = new Date(date);
          formattedDate = `${dateObj.getDate().toString().padStart(2, "0")}.${(dateObj.getMonth() + 1).toString().padStart(2, "0")}.${dateObj.getFullYear()}`;
        }

        // Формируем ссылку на покупку
        let buyLink = `https://www.tutu.ru/poezda/order/?dep_st=${train.departureStation}&arr_st=${train.arrivalStation}&tn=${encodeURIComponent(train.numberForUrl || "")}`;
        if (formattedDate) buyLink += `&date=${formattedDate}`;

        // Ссылка на расписание
        let scheduleLink = `https://www.tutu.ru/poezda/rasp_d.php?nnst1=${fromCode}&nnst2=${toCode}`;
        if (formattedDate) scheduleLink += `&date=${formattedDate}`;

        // Время в пути
        const travelTimeSeconds = parseInt(train.travelTimeInSeconds) || 0;
        const hours = Math.floor(travelTimeSeconds / 3600);
        const minutes = Math.floor((travelTimeSeconds % 3600) / 60);
        const durationFormatted =
          travelTimeSeconds > 0 ? `${hours}ч ${minutes}м` : "Время неизвестно";

        // Формируем список категорий с русскими названиями
        const categories = (train.categories || []).map((cat) => ({
          type: categoryNames[cat.type] || cat.type,
          price: cat.price,
        }));

        // Возвращаем объект с ВСЕМИ полями
        return {
          train_number: train.trainNumber || "Номер неизвестен",
          name: train.name || "",
          from_station:
            stationNames[train.departureStation] || train.departureStation,
          to_station:
            stationNames[train.arrivalStation] || train.arrivalStation,
          departure_time: train.departureTime || "Время неизвестно",
          arrival_time: train.arrivalTime || "Время неизвестно",
          duration_formatted: durationFormatted,
          carrier: "РЖД",
          categories: categories,
          cheapest_price:
            categories.length > 0
              ? Math.min(...categories.map((c) => c.price))
              : null,
          schedule_link: scheduleLink,
          buy_link: buyLink,
        };
      });

      console.log(
        "🔍 Первый отформатированный поезд:",
        JSON.stringify(formattedTrains[0], null, 2),
      );

      return {
        success: true,
        count: formattedTrains.length,
        trains: formattedTrains,
        from_city: originCity,
        to_city: destinationCity,
      };
    } else {
      return {
        success: false,
        message: "Поезда не найдены",
        trains: [],
      };
    }
  } catch (error) {
    console.error("❌ Ошибка:", error);
    return {
      success: false,
      message: `Ошибка: ${error.message}`,
      trains: [],
    };
  }
}

module.exports = { searchTrains };
