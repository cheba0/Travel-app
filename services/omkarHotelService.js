// services/omkarHotelService.js
const OMKAR_API_KEY = "ok_86c11865de4e2c45a01d348530c33f89";
const OMKAR_API_URL = "https://travel-data-api.omkar.cloud/travel";

// Универсальная функция запроса с API-ключом
async function makeRequest(url) {
  const response = await fetch(url, {
    method: "GET",
    headers: {
      "API-Key": OMKAR_API_KEY,
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`HTTP ${response.status}: ${errorText}`);
  }

  return response.json();
}

// Поиск ID города
async function findCityId(cityName, countryNameEn = null) {
  try {
    // Формируем поисковый запрос
    let searchQuery = cityName;
    if (countryNameEn) {
      searchQuery = `${cityName} ${countryNameEn}`;
    }

    const params = new URLSearchParams({
      query: searchQuery,
      locale: "ru-RU",
    });

    const url = `${OMKAR_API_URL}/hotels/search?${params.toString()}`;
    console.log(`🔍 Ищем город: ${url}`);

    const data = await makeRequest(url);

    if (!data.results || data.results.length === 0) return null;

    // Ищем CITY с совпадением по названию и стране
    let cityResult = null;

    if (countryNameEn) {
      // Сначала ищем точное совпадение: нужный город в нужной стране
      cityResult = data.results.find(
        (item) =>
          item.place_type === "CITY" &&
          item.name.toLowerCase() === cityName.toLowerCase() &&
          item.parent_location?.name?.toLowerCase() ===
            countryNameEn.toLowerCase(),
      );
    }

    // Если не нашли, ищем просто CITY с нужным названием
    if (!cityResult) {
      cityResult = data.results.find(
        (item) =>
          item.place_type === "CITY" &&
          item.name.toLowerCase() === cityName.toLowerCase(),
      );
    }

    // Если всё равно не нашли, берём первый CITY
    if (!cityResult) {
      cityResult = data.results.find((item) => item.place_type === "CITY");
    }

    if (cityResult) {
      console.log(
        `✅ Найден ID: ${cityResult.tripadvisor_entity_id} (${cityResult.name}, ${cityResult.parent_location?.name || "?"})`,
      );
      return cityResult.tripadvisor_entity_id;
    }

    return null;
  } catch (error) {
    console.error("❌ Ошибка поиска города:", error);
    return null;
  }
}

// Основная функция поиска отелей
async function searchHotels(
  city,
  checkInDate,
  checkOutDate,
  adults = 2,
  currency = "RUB",
  page = 1,
  countryNameEn = null,
) {
  try {
    const cityId = await findCityId(city, countryNameEn);

    if (!cityId) {
      return {
        success: false,
        message: `Город "${city}" не найден.`,
        hotels: [],
      };
    }

    const params = new URLSearchParams({
      query: cityId,
      check_in_date: checkInDate,
      check_out_date: checkOutDate,
      adults: adults,
      currency: currency,
      locale: "ru-RU",
      page: page,
    });

    const url = `${OMKAR_API_URL}/hotels/list?${params.toString()}`;
    console.log(`🏨 Запрос отелей (страница ${page}): ${url}`);

    const data = await makeRequest(url);

    if (data && data.results && data.results.length > 0) {
      const hotels = data.results.map((hotel) => ({
        name: hotel.name,
        price: hotel.price,
        priceFormatted: hotel.price
          ? `${hotel.price} ${currency}`
          : "Цена не указана",
        rating: hotel.rating,
        stars: hotel.hotel_class,
        imageUrl: hotel.featured_image,
        address: hotel.address,
        url: hotel.link,
      }));

      return {
        success: true,
        count: data.count,
        total_pages: data.total_pages,
        current_page: data.current_page,
        per_page: data.per_page || 30,
        hotels: hotels,
        city: city,
      };
    } else {
      return {
        success: false,
        message: "Отели не найдены.",
        hotels: [],
        total_pages: 0,
        current_page: 1,
      };
    }
  } catch (error) {
    console.error("❌ Ошибка:", error);
    return {
      success: false,
      message: `Ошибка: ${error.message}`,
      hotels: [],
    };
  }
}

module.exports = { searchHotels };
