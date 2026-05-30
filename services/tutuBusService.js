// services/tutuBusService.js
// API для автобусных билетов от Tutu.ru (через Travelpayouts)

const TUTU_BUS_API_URL = "https://suggest.travelpayouts.com/search"; // возможно другой endpoint

// Поиск автобусов (ожидаемая структура)
async function searchBuses(originCity, destinationCity, date = null) {
  try {
    // Здесь нужны коды остановок/городов для автобусов
    // Формат запроса может отличаться от ЖД

    let url = `${TUTU_BUS_API_URL}?service=tutu_buses&from=${encodeURIComponent(originCity)}&to=${encodeURIComponent(destinationCity)}`;
    if (date) url += `&date=${date}`;

    const response = await fetch(url);
    const data = await response.json();

    if (data && data.trips && data.trips.length > 0) {
      const formattedBuses = data.trips.map((bus) => ({
        bus_number: bus.busNumber || bus.number,
        from_station: bus.departureStation,
        to_station: bus.arrivalStation,
        departure_time: bus.departureTime,
        arrival_time: bus.arrivalTime,
        duration_formatted: bus.duration,
        carrier: bus.carrier || "Автобусный перевозчик",
        price: bus.price,
        buy_link:
          bus.booking_url ||
          `https://www.tutu.ru/bus/order/?from=${originCity}&to=${destinationCity}&date=${date}`,
        schedule_link: `https://www.tutu.ru/bus/rasp.php?from=${originCity}&to=${destinationCity}${date ? `&date=${date}` : ""}`,
      }));

      return {
        success: true,
        count: formattedBuses.length,
        buses: formattedBuses,
        from_city: originCity,
        to_city: destinationCity,
      };
    }

    return { success: false, message: "Автобусы не найдены", buses: [] };
  } catch (error) {
    console.error("❌ Ошибка поиска автобусов:", error);
    return { success: false, message: error.message, buses: [] };
  }
}

module.exports = { searchBuses };
