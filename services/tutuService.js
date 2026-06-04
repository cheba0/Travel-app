// services/tutuService.js
// API для ЖД билетов от Tutu.ru

const TUTU_API_URL = "https://suggest.travelpayouts.com/search";

// Коды станций для популярных городов
const stationCodes = {
  // Россия
  москва: "2000000",
  "санкт-петербург": "2004000",
  спб: "2004000",
  питер: "2004000",
  казань: "2064000", // ← ИСПРАВЛЕНО
  "нижний новгород": "2024000",
  екатеринбург: "2034000",
  новосибирск: "2044000",
  сочи: "2049080",
  владивосток: "2054000",
  владимир: "2023100",
  рязань: "2027000",
  тверь: "2013500",
  ярославль: "2014000",
  калуга: "2028000",
  тула: "2029000",
  волгоград: "2046000",
  "ростов-на-дону": "2048000",
  краснодар: "2048050",
  пермь: "2032000",
  уфа: "2031000",
  самара: "2022000",
  воронеж: "2028500",
  иркутск: "2042000",
  хабаровск: "2052000",
  мурманск: "2015000",
  архангельск: "2018000",
  калининград: "2011000",

  // Ближнее зарубежье
  минск: "2100000",
  киев: "2200000",
  алматы: "2300000",
  ташкент: "2400000",
  баку: "2500000",
  тбилиси: "2600000",
  ереван: "2700000",
  кишинев: "2800000",

  // Популярные направления
  астана: "2301000",
  самарканд: "2401000",
  душанбе: "2402000",
  // Сибирь
  томск: "2043000",
  кемерово: "2044000",
  новосибирск: "2044000",
  барнаул: "2045000",
  омск: "2041000",
  тюмень: "2038000",
  "кемерово-пассажирская": "2044001",
  "томск-1": "2043001",
  "томск-2": "2043002",
};

// Названия станций (расширенные)
const stationNames = {
  // Москва
  2000000: "Москва (все вокзалы)",
  2000001: "Москва (Казанский вокзал)",
  2000002: "Москва (Павелецкий вокзал)",
  2000003: "Москва (Ленинградский вокзал)",
  2000004: "Москва (Белорусский вокзал)",
  2000005: "Москва (Курский вокзал)",
  2000006: "Москва (Киевский вокзал)",
  2000007: "Москва (Рижский вокзал)",
  2000008: "Москва (Савёловский вокзал)",

  // Санкт-Петербург
  2004000: "Санкт-Петербург (все вокзалы)",
  2004001: "Санкт-Петербург (Ладожский вокзал)",
  2004002: "Санкт-Петербург (Московский вокзал)",
  2004003: "Санкт-Петербург (Витебский вокзал)",
  2004004: "Санкт-Петербург (Финляндский вокзал)",
  2004005: "Санкт-Петербург (Балтийский вокзал)",

  // Казань
  2064000: "Казань (все вокзалы)",
  2064001: "Казань (Центральный вокзал)",

  // Другие города
  2024000: "Нижний Новгород (Московский вокзал)",
  2034000: "Екатеринбург (все вокзалы)",
  2049080: "Сочи (все вокзалы)",
  2054000: "Владивосток",
  2023100: "Владимир",
  2027000: "Рязань",
  2013500: "Тверь",
  2014000: "Ярославль",
  2028000: "Калуга",
  2029000: "Тула",
  2046000: "Волгоград",
  2048000: "Ростов-на-Дону",
  2048050: "Краснодар",
  2032000: "Пермь",
  2031000: "Уфа",
  2022000: "Самара",
  2028500: "Воронеж",
  2042000: "Иркутск",
  2052000: "Хабаровск",
  2015000: "Мурманск",
  2018000: "Архангельск",
  2011000: "Калининград",

  // Ближнее зарубежье
  2100000: "Минск",
  2200000: "Киев",
  2300000: "Алматы",
  2400000: "Ташкент",
  2500000: "Баку",
  2600000: "Тбилиси",
  2700000: "Ереван",
  2800000: "Кишинев",
  // Новосибирск
  2044000: "Новосибирск (Главный вокзал)",
  2044001: "Новосибирск (Западный вокзал)",

  // Кемерово
  2044001: "Кемерово (Пассажирская)",

  // Томск
  2043000: "Томск (все вокзалы)",
  2043001: "Томск-1 (Центральный вокзал)",
  2043002: "Томск-2 (Товарная станция)",

  // Дополнительно
  2045000: "Барнаул",
  2041000: "Омск",
  2038000: "Тюмень",
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
