// services/xoteloService.js
// API для поиска отелей через Xotelo (RapidAPI)

const XOTELO_RAPIDAPI_KEY =
  "21dc7e138bmsh411725671b8a689p105b2bjsn63ec81236d3d";
const XOTELO_RAPIDAPI_HOST = "xotelo-hotel-prices.p.rapidapi.com";
const XOTELO_API_URL = "https://xotelo-hotel-prices.p.rapidapi.com/api";

// Вспомогательная функция для форматирования дат
function formatDate(dateString) {
  if (!dateString) return "Не указана";
  return new Date(dateString).toLocaleDateString("ru-RU");
}

// 1. Поиск отелей по названию или городу
async function searchHotels(query) {
  try {
    const url = `${XOTELO_API_URL}/search?query=${encodeURIComponent(query)}`;

    console.log("🔍 Поиск отелей:", url);

    const response = await fetch(url, {
      method: "GET",
      headers: {
        "X-RapidAPI-Key": XOTELO_RAPIDAPI_KEY,
        "X-RapidAPI-Host": XOTELO_RAPIDAPI_HOST,
      },
    });

    const data = await response.json();

    console.log("📥 Ответ API:", JSON.stringify(data, null, 2));

    if (
      data &&
      data.result &&
      data.result.list &&
      data.result.list.length > 0
    ) {
      const hotels = data.result.list.map((hotel) => ({
        hotel_key: hotel.hotel_key,
        location_key: hotel.location_key,
        name: hotel.name,
        location_id: hotel.location_id,
        place_name: hotel.place_name,
        short_place_name: hotel.short_place_name,
        street_address: hotel.street_address || "Адрес не указан",
        url: hotel.url,
        image: hotel.image || null,
      }));

      return {
        success: true,
        count: hotels.length,
        hotels: hotels,
        query: query,
      };
    } else {
      return {
        success: false,
        message: `По запросу "${query}" ничего не найдено. Попробуйте другое название.`,
        hotels: [],
      };
    }
  } catch (error) {
    console.error("❌ Ошибка поиска отелей:", error);
    return {
      success: false,
      message: `Ошибка при поиске: ${error.message}`,
      hotels: [],
    };
  }
}

// 2. Получение списка отелей по локации (location_key)
async function getHotelsByLocation(
  locationKey,
  limit = 30,
  offset = 0,
  sort = "best_value",
) {
  try {
    const url = `${XOTELO_API_URL}/list?location_key=${locationKey}&limit=${limit}&offset=${offset}&sort=${sort}`;

    console.log("🏨 Получение отелей по локации:", url);

    const response = await fetch(url, {
      method: "GET",
      headers: {
        "X-RapidAPI-Key": XOTELO_RAPIDAPI_KEY,
        "X-RapidAPI-Host": XOTELO_RAPIDAPI_HOST,
      },
    });

    const data = await response.json();

    if (
      data &&
      data.result &&
      data.result.list &&
      data.result.list.length > 0
    ) {
      const hotels = data.result.list.map((hotel) => ({
        name: hotel.name,
        key: hotel.key,
        accommodation_type: hotel.accommodation_type,
        image: hotel.image,
        url: hotel.url,
        rating: hotel.review_summary?.rating || null,
        rating_count: hotel.review_summary?.count || 0,
        price_min: hotel.price_ranges?.minimum || null,
        price_max: hotel.price_ranges?.maximum || null,
        latitude: hotel.geo?.latitude,
        longitude: hotel.geo?.longitude,
        mentions: hotel.mentions || [],
      }));

      return {
        success: true,
        total_count: data.result.total_count,
        limit: data.result.limit,
        offset: data.result.offset,
        count: hotels.length,
        hotels: hotels,
      };
    } else {
      return {
        success: false,
        message: "Отели не найдены",
        hotels: [],
      };
    }
  } catch (error) {
    console.error("❌ Ошибка получения отелей по локации:", error);
    return {
      success: false,
      message: `Ошибка: ${error.message}`,
      hotels: [],
    };
  }
}

// 3. Получение цен на отель по датам
async function getHotelRates(
  hotelKey,
  checkIn,
  checkOut,
  currency = "RUB",
  rooms = 1,
  adults = 2,
  childrenAges = "",
) {
  try {
    let url = `${XOTELO_API_URL}/rates?hotel_key=${hotelKey}&chk_in=${checkIn}&chk_out=${checkOut}&currency=${currency}&rooms=${rooms}&adults=${adults}`;

    if (childrenAges) {
      url += `&age_of_children=${childrenAges}`;
    }

    console.log("💰 Получение цен на отель:", url);

    const response = await fetch(url, {
      method: "GET",
      headers: {
        "X-RapidAPI-Key": XOTELO_RAPIDAPI_KEY,
        "X-RapidAPI-Host": XOTELO_RAPIDAPI_HOST,
      },
    });

    const data = await response.json();

    if (
      data &&
      data.result &&
      data.result.rates &&
      data.result.rates.length > 0
    ) {
      // Сортируем по цене (от дешёвых к дорогим)
      const sortedRates = [...data.result.rates].sort(
        (a, b) => a.rate - b.rate,
      );

      const rates = sortedRates.map((rate) => ({
        code: rate.code,
        name: rate.name,
        rate: rate.rate,
        rateFormatted: `${rate.rate.toLocaleString()} ${currency}`,
      }));

      return {
        success: true,
        checkIn: data.result.chk_in,
        checkOut: data.result.chk_out,
        currency: currency,
        bestRate: rates[0] || null,
        rates: rates,
      };
    } else {
      return {
        success: false,
        message: "Цены не найдены для указанных дат",
        rates: [],
      };
    }
  } catch (error) {
    console.error("❌ Ошибка получения цен:", error);
    return {
      success: false,
      message: `Ошибка при получении цен: ${error.message}`,
      rates: [],
    };
  }
}

// 4. Получение тепловой карты цен (средние/дешёвые/дорогие дни)
async function getHotelHeatmap(hotelKey, checkOut) {
  try {
    const url = `${XOTELO_API_URL}/heatmap?hotel_key=${hotelKey}&chk_out=${checkOut}`;

    console.log("📊 Получение тепловой карты цен:", url);

    const response = await fetch(url, {
      method: "GET",
      headers: {
        "X-RapidAPI-Key": XOTELO_RAPIDAPI_KEY,
        "X-RapidAPI-Host": XOTELO_RAPIDAPI_HOST,
      },
    });

    const data = await response.json();

    if (data && data.result && data.result.heatmap) {
      return {
        success: true,
        checkOut: data.result.chk_out,
        averagePriceDays: data.result.heatmap.average_price_days || [],
        cheapPriceDays: data.result.heatmap.cheap_price_days || [],
        highPriceDays: data.result.heatmap.high_price_days || [],
      };
    } else {
      return {
        success: false,
        message: "Данные тепловой карты не найдены",
      };
    }
  } catch (error) {
    console.error("❌ Ошибка получения тепловой карты:", error);
    return {
      success: false,
      message: `Ошибка: ${error.message}`,
    };
  }
}

// 5. Полный поиск: поиск отеля + получение цен
async function searchHotelWithRates(query, checkIn, checkOut, adults = 2) {
  try {
    // Сначала ищем отель
    const searchResult = await searchHotels(query);

    if (!searchResult.success || searchResult.hotels.length === 0) {
      return {
        success: false,
        message: `Отель "${query}" не найден`,
        hotel: null,
        rates: null,
      };
    }

    // Берём первый найденный отель
    const hotel = searchResult.hotels[0];

    // Получаем цены для этого отеля
    const ratesResult = await getHotelRates(
      hotel.hotel_key,
      checkIn,
      checkOut,
      "RUB",
      1,
      adults,
    );

    return {
      success: ratesResult.success,
      hotel: {
        key: hotel.hotel_key,
        name: hotel.name,
        address: hotel.street_address,
        place: hotel.short_place_name,
        url: hotel.url,
        image: hotel.image,
      },
      rates: ratesResult.success ? ratesResult : null,
      message: ratesResult.success ? null : ratesResult.message,
    };
  } catch (error) {
    console.error("❌ Ошибка:", error);
    return {
      success: false,
      message: error.message,
      hotel: null,
      rates: null,
    };
  }
}

module.exports = {
  searchHotels,
  getHotelsByLocation,
  getHotelRates,
  getHotelHeatmap,
  searchHotelWithRates,
};
