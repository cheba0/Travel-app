// services/ticketService.js
// Сервис для работы с API поиска билетов

// ========== КОНФИГУРАЦИЯ ==========
const AVIA_TOKEN = "8125ca987a70ab28d50a39184d62160c";
const AVIA_API_URL =
  "https://api.travelpayouts.com/aviasales/v3/prices_for_dates";
const YANDEX_RASP_API_KEY = process.env.YANDEX_RASP_API_KEY;
const YANDEX_API_URL = "https://api.rasp.yandex.net/v3.0";

// ========== АВИАКОМПАНИИ (код → название) ==========
const airlineNames = {
  // Россия и СНГ
  SU: "Аэрофлот",
  S7: "S7 Airlines",
  DP: "Победа",
  N4: "Nordwind Airlines",
  EO: "Pegas Fly",
  FV: "Россия (Rossiya)",
  U6: "Уральские авиалинии",
  UT: "Utair",
  "5N": "SmartAvia",
  WZ: "Red Wings",
  EO: "Икар (Pegas Fly)",
  HY: "Uzbekistan Airways",
  KC: "Air Astana",
  DV: "SCAT Airlines",

  // Европа
  TK: "Turkish Airlines",
  VF: "AJet (AnadoluJet)",
  PC: "Pegasus Airlines",
  LH: "Lufthansa",
  AF: "Air France",
  KL: "KLM",
  BA: "British Airways",
  EY: "Etihad Airways",
  EK: "Emirates",
  QR: "Qatar Airways",
  IB: "Iberia",
  AZ: "Alitalia",
  OS: "Austrian Airlines",
  LX: "Swiss Air",
  LO: "LOT Polish Airlines",

  // Азия
  CZ: "China Southern Airlines",
  MU: "China Eastern Airlines",
  CA: "Air China",
  NH: "ANA (All Nippon Airways)",
  JL: "Japan Airlines",
  KE: "Korean Air",
  OZ: "Asiana Airlines",
  TG: "Thai Airways",
  SQ: "Singapore Airlines",
  MH: "Malaysia Airlines",

  // Ближний Восток
  FZ: "Flydubai",
  G9: "Air Arabia",
  W6: "Wizz Air",

  // Америка
  AA: "American Airlines",
  DL: "Delta Air Lines",
  UA: "United Airlines",
  AC: "Air Canada",

  // Другие
  FR: "Ryanair",
  U2: "EasyJet",
  DY: "Norwegian Air",
  новосибирск: "OVB",
  томск: "TOF",
  кемерово: "KEJ",
  новокузнецк: "NOZ",
  барнаул: "BAX",
  бийск: "BIJ", // аэропорт Бийск есть
  "горно-алтайск": "RGK",
  красноярск: "KJA",
  норильск: "NSK",
  иркутск: "IKT",
  братск: "BTK",
  "улан-удэ": "UUD",
  чита: "HTA",
  абакан: "ABA",
  кызыл: "KYZ",
  "кемерово-междуреченск": "MRU", // Междуреченск
  прокопьевск: "PEE", // через Кемерово
  ленск: "LNN",
  мирный: "MJZ",
  нёрюнгри: "NER",
  якутск: "YKS",
  магадан: "GDX",
  "петропавловск-камчатский": "PKC",
  "южно-сахалинск": "UUS",
  хабаровск: "KHV",
  владивосток: "VVO",
  благовещенск: "BQS",
  читу: "HTA",
};

// Функция получения названия авиакомпании по коду
function getAirlineName(code) {
  return airlineNames[code] || code; //
}
// ========== ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ ==========

// Названия городов по кодам IATA (для авиа)
function getCityNameByIATA(iataCode) {
  const cities = {
    MOW: "Москва",
    LED: "Санкт-Петербург",
    AER: "Сочи",
    KZN: "Казань",
    SVX: "Екатеринбург",
    OVB: "Новосибирск",
    KRR: "Краснодар",
    ROV: "Ростов-на-Дону",
    KUF: "Самара",
    UFA: "Уфа",
    PEE: "Пермь",
    VOZ: "Воронеж",
    VOG: "Волгоград",
    CEK: "Челябинск",
    OMS: "Омск",
    TJM: "Тюмень",
    IKT: "Иркутск",
    KHV: "Хабаровск",
    VVO: "Владивосток",
    KGD: "Калининград",
    MMK: "Мурманск",
    ARH: "Архангельск",
    GOJ: "Нижний Новгород",
    RTW: "Саратов",
    MRV: "Минеральные Воды",
    MCX: "Махачкала",
    GRV: "Грозный",
    OGZ: "Владикавказ",
    NAL: "Нальчик",
    SIP: "Симферополь",
    AAQ: "Анапа",
    GDZ: "Геленджик",

    // Европа
    LON: "Лондон",
    PAR: "Париж",
    BER: "Берлин",
    ROM: "Рим",
    MIL: "Милан",
    VCE: "Венеция",
    FLR: "Флоренция",
    NAP: "Неаполь",
    BCN: "Барселона",
    MAD: "Мадрид",
    PRG: "Прага",
    WAW: "Варшава",
    BUD: "Будапешт",
    VIE: "Вена",
    AMS: "Амстердам",
    BRU: "Брюссель",
    ATH: "Афины",
    SOF: "София",
    OTP: "Бухарест",
    BEG: "Белград",
    TBS: "Тбилиси",
    BUS: "Батуми",
    KUT: "Кутаиси",
    EVN: "Ереван",
    GYD: "Баку",
    ALA: "Алматы",
    NQZ: "Астана",
    TAS: "Ташкент",
    FRU: "Бишкек",
    MSQ: "Минск",
    KIV: "Кишинёв",

    // Азия
    IST: "Стамбул",
    AYT: "Анталья",
    DXB: "Дубай",
    AUH: "Абу-Даби",
    DOH: "Доха",
    BAH: "Манама",
    RUH: "Эр-Рияд",
    JED: "Джидда",
    IKA: "Тегеран",
    AMM: "Амман",
    BEY: "Бейрут",
    DEL: "Дели",
    BOM: "Мумбай",
    GOI: "Гоа",
    CCU: "Колката",
    MAA: "Ченнай",
    BLR: "Бангалор",
    KTM: "Катманду",
    CMB: "Коломбо",
    MLE: "Мальдивы",
    BKK: "Бангкок",
    HKT: "Пхукет",
    KBV: "Краби",
    USM: "Самуи",
    UTP: "Паттайя",
    SGN: "Хошимин",
    HAN: "Ханой",
    PNH: "Пномпень",
    VTE: "Вьентьян",
    RGN: "Янгон",
    KUL: "Куала-Лумпур",
    SIN: "Сингапур",
    DPS: "Бали",
    MNL: "Манила",
    TYO: "Токио",
    OSA: "Осака",
    ICN: "Сеул",
    BJS: "Пекин",
    PVG: "Шанхай",
    HKG: "Гонконг",
    TPE: "Тайбэй",

    // Америка
    NYC: "Нью-Йорк",
    LAX: "Лос-Анджелес",
    MIA: "Майами",
    LAS: "Лас-Вегас",
    SFO: "Сан-Франциско",
    CHI: "Чикаго",
    SEA: "Сиэтл",
    BOS: "Бостон",
    WAS: "Вашингтон",
    DFW: "Даллас",
    DEN: "Денвер",
    ATL: "Атланта",
    YTO: "Торонто",
    YVR: "Ванкувер",
    MEX: "Мехико",
    CUN: "Канкун",
    LIM: "Лима",
    SCL: "Сантьяго",
    BUE: "Буэнос-Айрес",
    RIO: "Рио-де-Жанейро",
    SAO: "Сан-Паулу",

    // Африка
    CAI: "Каир",
    SSH: "Шарм-эль-Шейх",
    HRG: "Хургада",
    RMF: "Марса-эль-Алям",
    RAK: "Марракеш",
    CMN: "Касабланка",
    TUN: "Тунис",
    DJE: "Джерба",

    // Океания
    SYD: "Сидней",
    MEL: "Мельбурн",
    BNE: "Брисбен",
    AKL: "Окленд",

    OVB: "Новосибирск",
    TOF: "Томск",
    KEJ: "Кемерово",
    NOZ: "Новокузнецк",
    BAX: "Барнаул",
    BIJ: "Бийск",
    RGK: "Горно-Алтайск",
    KJA: "Красноярск",
    NSK: "Норильск",
    IKT: "Иркутск",
    BTK: "Братск",
    UUD: "Улан-Удэ",
    HTA: "Чита",
    ABA: "Абакан",
    KYZ: "Кызыл",
    MRU: "Междуреченск",
    LNN: "Ленск",
    MJZ: "Мирный",
    NER: "Нерюнгри",
    YKS: "Якутск",
    GDX: "Магадан",
    PKC: "Петропавловск-Камчатский",
    UUS: "Южно-Сахалинск",
    KHV: "Хабаровск",
    VVO: "Владивосток",
    BQS: "Благовещенск",
  };
  return cities[iataCode] || iataCode;
}

// Конвертация города в IATA код (для авиа)
function getIATACode(cityName) {
  const cityCodes = {
    москва: "MOW",
    "санкт-петербург": "LED",
    спб: "LED",
    питер: "LED",
    сочи: "AER",
    казань: "KZN",
    екатеринбург: "SVX",
    новосибирск: "OVB",
    краснодар: "KRR",
    "ростов-на-дону": "ROV",
    ростов: "ROV",
    самара: "KUF",
    уфа: "UFA",
    пермь: "PEE",
    воронеж: "VOZ",
    волгоград: "VOG",
    челябинск: "CEK",
    омск: "OMS",
    тюмень: "TJM",
    иркутск: "IKT",
    хабаровск: "KHV",
    владивосток: "VVO",
    калининград: "KGD",
    мурманск: "MMK",
    архангельск: "ARH",
    "нижний новгород": "GOJ",
    саратов: "RTW",
    тольятти: "KUF",
    "набережные челны": "NBC",
    ярославль: "IAR",
    рязань: "RZN",
    липецк: "LPK",
    тула: "TYA",
    тверь: "KLD",
    владимир: "VMR",
    иваново: "IWA",
    кострома: "KMW",
    смоленск: "LNX",
    брянск: "BZK",
    курск: "URS",
    орёл: "OEL",
    белгород: "EGO",
    ставрополь: "STW",
    пятигорск: "MRV",
    "минеральные воды": "MRV",
    махачкала: "MCX",
    грозный: "GRV",
    владикавказ: "OGZ",
    нальчик: "NAL",
    симферополь: "SIP",
    севастополь: "UKS",
    анапа: "AAQ",
    геленджик: "GDZ",
    новороссийск: "NOZ",
    туапсе: "TAA",
    адлер: "AER",

    // Европа
    лондон: "LON",
    париж: "PAR",
    берлин: "BER",
    рим: "ROM",
    милан: "MIL",
    венеция: "VCE",
    флоренция: "FLR",
    неаполь: "NAP",
    барселона: "BCN",
    мадрид: "MAD",
    валенсия: "VLC",
    севилья: "SVQ",
    малага: "AGP",
    прага: "PRG",
    варшава: "WAW",
    краков: "KRK",
    венгрия: "BUD",
    будапешт: "BUD",
    вену: "VIE",
    зальцбург: "SZG",
    амстердам: "AMS",
    брюссель: "BRU",
    атланта: "ATL",
    афины: "ATH",
    тессалоники: "SKG",
    софия: "SOF",
    бухарест: "OTP",
    бельград: "BEG",
    загреб: "ZAG",
    любляна: "LJU",
    братислава: "BTS",
    тбилиси: "TBS",
    батуми: "BUS",
    кутаиси: "KUT",
    ереван: "EVN",
    баку: "GYD",
    алматы: "ALA",
    астана: "NQZ",
    ташкент: "TAS",
    бишкек: "FRU",
    душанбе: "DYU",
    ашхабад: "ASB",
    кишинев: "KIV",
    минск: "MSQ",
    львов: "LWO",
    одесса: "ODS",
    харьков: "HRK",
    киев: "IEV",
    днепр: "DNK",
    запорожье: "OZH",

    // Азия
    стамбул: "IST",
    анкара: "ESB",
    анкару: "ESB",
    измир: "ADB",
    анкалия: "AYT",
    анталью: "AYT",
    дубай: "DXB",
    "абу-даби": "AUH",
    доха: "DOH",
    манама: "BAH",
    "эр-рияд": "RUH",
    джидда: "JED",
    мекка: "JED",
    мадина: "MED",
    тегеран: "IKA",
    багдад: "BGW",
    амана: "AMM",
    бейрут: "BEY",
    дамаск: "DAM",
    тбилиси: "TBS",
    баку: "GYD",
    дели: "DEL",
    мумбай: "BOM",
    гоа: "GOI",
    колката: "CCU",
    ченнай: "MAA",
    бангалор: "BLR",
    катманду: "KTM",
    коломбо: "CMB",
    мальдивы: "MLE",
    бангкок: "BKK",
    пхукет: "HKT",
    краби: "KBV",
    самуи: "USM",
    паттайя: "UTP",
    "чианг-май": "CNX",
    хошимин: "SGN",
    ханой: "HAN",
    дананг: "DAD",
    ньячанг: "CXR",
    пномпень: "PNH",
    сиануквиль: "KOS",
    вьентьян: "VTE",
    янгон: "RGN",
    "куала-лумпур": "KUL",
    сингапур: "SIN",
    джакарта: "CGK",
    бали: "DPS",
    манила: "MNL",
    себу: "CEB",
    токио: "TYO",
    осака: "OSA",
    киото: "UKY",
    нагоя: "NGO",
    сеул: "ICN",
    пусан: "PUS",
    пекин: "BJS",
    шанхай: "PVG",
    гуанчжоу: "CAN",
    гонконг: "HKG",
    тайбэй: "TPE",
    макао: "MFM",

    // Америка
    "нью-йорк": "NYC",
    "лос-анджелес": "LAX",
    чикаго: "CHI",
    майами: "MIA",
    "лас-вегас": "LAS",
    "сан-франциско": "SFO",
    сиэтл: "SEA",
    бостон: "BOS",
    вашингтон: "WAS",
    даллас: "DFW",
    дэнвер: "DEN",
    финикс: "PHX",
    атланта: "ATL",
    орландо: "MCO",
    гавайи: "HNL",
    вашингтон: "WAS",
    торонто: "YTO",
    монреаль: "YMQ",
    ванкувер: "YVR",
    мехико: "MEX",
    канкун: "CUN",
    лима: "LIM",
    сантьяго: "SCL",
    "буэнос-айрес": "BUE",
    "рио-де-жанейро": "RIO",
    "сао-паулу": "SAO",

    // Африка
    каир: "CAI",
    "шарм-эль-шейх": "SSH",
    хургада: "HRG",
    "марса-эль-алям": "RMF",
    дахаб: "DDB",
    таба: "TCP",
    марракеш: "RAK",
    акадир: "AGA",
    касабланка: "CMN",
    тунис: "TUN",
    джерба: "DJE",
    кейптаун: "CPT",
    йоханнесбург: "JNB",

    // Океания
    сидней: "SYD",
    мельбурн: "MEL",
    брисбен: "BNE",
    перт: "PER",
    окленд: "AKL",
    веллингтон: "WLG",
  };
  return cityCodes[cityName.toLowerCase().trim()] || null;
}

// Поиск кода станции для ЖД и автобусов
async function findStationCode(cityName, transportType = "train") {
  try {
    // Популярные города для быстрого поиска
    const popular = {
      москва: "c213",
      "санкт-петербург": "c2",
      спб: "c2",
      питер: "c2",
      казань: "c2064000",
      "нижний новгород": "c2024000",
      екатеринбург: "c2034000",
      новосибирск: "c2044000",
      сочи: "c2049080",
      владивосток: "c2054000",
      владимир: "c2023100",
      рязань: "c2027000",
      тверь: "c2013500",
      ярославль: "c2014000",
      калуга: "c2028000",
      тула: "c2029000",
      волгоград: "c2046000",
      "ростов-на-дону": "c2048000",
      краснодар: "c2048050",
      пермь: "c2032000",
      уфа: "c2031000",
      самара: "c2022000",
      воронеж: "c2028500",
      иркутск: "c2042000",
      хабаровск: "c2052000",
      мурманск: "c2015000",
      архангельск: "c2018000",
      калининград: "c2011000",

      // Ближнее зарубежье
      минск: "c14730",
      киев: "c29528",
      алматы: "c47559",
      ташкент: "c60636",
      баку: "c29311",
      тбилиси: "c42686",
      ереван: "c34522",
      кишинев: "c45341",

      // Сибирь
      томск: "c47325",
      кемерово: "c47462",
      новосибирск: "c47559",
      барнаул: "c46789",
      омск: "c47340",
      тюмень: "c47555",
      новокузнецк: "c47558",
    };

    const lowerName = cityName.toLowerCase().trim();
    if (popular[lowerName]) {
      return popular[lowerName];
    }

    // Если не нашли, пробуем через API Яндекс.Расписаний
    if (!YANDEX_RASP_API_KEY) return null;

    const url = `${YANDEX_API_URL}/stations_list/?apikey=${YANDEX_RASP_API_KEY}&lang=ru_RU`;
    const response = await fetch(url);
    const data = await response.json();

    if (data && data.countries) {
      for (const country of data.countries) {
        for (const settlement of country.settlements || []) {
          if (settlement.title?.toLowerCase().includes(lowerName)) {
            return settlement.code;
          }
        }
      }
    }

    return null;
  } catch (error) {
    console.error("Ошибка поиска кода станции:", error);
    return null;
  }
}

// Форматирование времени
function formatDate(dateString) {
  if (!dateString) return "Не указано";
  return new Date(dateString).toLocaleString("ru-RU");
}

function formatDuration(seconds) {
  if (!seconds) return "Неизвестно";
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  return `${hours}ч ${minutes}м`;
}

// ========== ОСНОВНЫЕ ФУНКЦИИ ПОИСКА ==========

// 1. Поиск авиабилетов
async function searchFlights(
  originCity,
  destinationCity,
  departureDate,
  returnDate = null,
) {
  try {
    const originCode = getIATACode(originCity);
    const destCode = getIATACode(destinationCity);

    if (!originCode || !destCode) {
      return {
        success: false,
        message: `Не удалось найти коды для городов: ${originCity} → ${destinationCity}. Доступные города: Москва, СПб, Сочи, Барселона, Лондон, Париж, Стамбул, Дубай, Бангкок, Рим, Нью-Йорк`,
        tickets: [],
      };
    }

    // departureDate уже в формате YYYY-MM-DD из календаря
    const isRoundTrip = returnDate !== null;
    const oneWayValue = isRoundTrip ? "false" : "true";

    let params = new URLSearchParams({
      origin: originCode,
      destination: destCode,
      departure_at: departureDate, // ← теперь передаём полную дату
      unique: "false",
      sorting: "price",
      direct: "false",
      one_way: isRoundTrip ? "false" : "true",
      token: AVIA_TOKEN,
    });

    // Если есть дата возвращения, добавляем её
    if (isRoundTrip) {
      params.append("return_at", returnDate); // ← тоже в формате YYYY-MM-DD
    }

    const url = `${AVIA_API_URL}?${params.toString()}`;
    console.log("📤 Aviasales запрос:", url);

    const response = await fetch(url);
    const data = await response.json();

    if (data && data.success && data.data && data.data.length > 0) {
      const formattedTickets = data.data.map((ticket) => ({
        id: `${ticket.origin}-${ticket.destination}-${ticket.departure_at}`,
        from_city: getCityNameByIATA(ticket.origin),
        to_city: getCityNameByIATA(ticket.destination),
        from_code: ticket.origin,
        to_code: ticket.destination,
        price: ticket.price,
        price_rub: ticket.price,
        airline: getAirlineName(ticket.airline),
        airline_code: ticket.airline,
        departure_at: ticket.departure_at,
        departure_formatted: formatDate(ticket.departure_at),
        return_at: ticket.return_at || null,
        return_formatted: ticket.return_at
          ? formatDate(ticket.return_at)
          : null,
        transfers: ticket.transfers || 0,
        duration_to: ticket.duration_to || null,
        duration: ticket.duration || null,
        link: ticket.link,
        origin_airport: ticket.origin_airport,
        destination_airport: ticket.destination_airport,
      }));

      return {
        success: true,
        count: formattedTickets.length,
        tickets: formattedTickets,
        from_city: originCity,
        to_city: destinationCity,
        trip_type: isRoundTrip ? "round_trip" : "one_way",
      };
    } else {
      return {
        success: false,
        message: isRoundTrip
          ? "Авиабилеты туда-обратно не найдены. Попробуйте другие даты."
          : "Авиабилеты не найдены. Попробуйте другие даты или направления.",
        tickets: [],
      };
    }
  } catch (error) {
    console.error("❌ Ошибка поиска авиабилетов:", error);
    return {
      success: false,
      message: `Ошибка при поиске авиабилетов: ${error.message}`,
      tickets: [],
    };
  }
}
// 2. Поиск ЖД билетов
async function searchTrains(origin, destination, date = null) {
  try {
    // Формируем параметры запроса
    const params = new URLSearchParams({
      origin: origin,
      destination: destination,
      adults: "1",
      locale: "ru",
    });

    if (date) {
      params.append("departure_date", date);
    }

    // Эндпоинт для поиска ЖД билетов (после получения доступа)
    const url = `https://api.travelpayouts.com/train/search?${params.toString()}`;

    const response = await fetch(url, {
      headers: {
        "X-Access-Token": AVIA_TOKEN,
      },
    });

    const data = await response.json();

    if (data && data.results && data.results.length > 0) {
      const formattedTrains = data.results.map((train) => ({
        id: train.id,
        from_city: origin,
        to_city: destination,
        from_station: train.departure_station,
        to_station: train.arrival_station,
        departure: train.departure_datetime,
        departure_formatted: formatDate(train.departure_datetime),
        arrival: train.arrival_datetime,
        arrival_formatted: formatDate(train.arrival_datetime),
        duration: train.duration,
        duration_formatted: formatDuration(train.duration),
        train_number: train.train_number,
        carrier: train.carrier_name,
        price: train.price,
        price_formatted: `${train.price} ₽`,
        // Партнёрская ссылка для покупки
        buy_link: `https://www.tutu.ru/poezda/order/?dep_st=${train.departure_station_code}&arr_st=${train.arrival_station_code}&tn=${train.train_number}&date=${date}`,
      }));

      return {
        success: true,
        count: formattedTrains.length,
        trains: formattedTrains,
        from_city: origin,
        to_city: destination,
      };
    } else {
      return {
        success: false,
        message: "Поезда не найдены. Попробуйте другие даты.",
        trains: [],
      };
    }
  } catch (error) {
    console.error("❌ Ошибка поиска ЖД:", error);
    return {
      success: false,
      message: `Ошибка при поиске поездов: ${error.message}`,
      trains: [],
    };
  }
}
// 3. Поиск автобусов
async function searchBuses(originCity, destinationCity, date = null) {
  try {
    // Получаем коды станций через findStationCode
    const fromCode = await findStationCode(originCity, "bus");
    const toCode = await findStationCode(destinationCity, "bus");

    if (!fromCode || !toCode) {
      return {
        success: false,
        message: `Не удалось найти коды для городов: ${originCity} → ${destinationCity}. Попробуйте написать полное название города.`,
        buses: [],
      };
    }

    if (!YANDEX_RASP_API_KEY) {
      return {
        success: false,
        message: "API ключ Яндекс.Расписаний не настроен",
        buses: [],
      };
    }

    let url = `${YANDEX_API_URL}/search/?apikey=${YANDEX_RASP_API_KEY}&from=${fromCode}&to=${toCode}&transport_types=bus&transfers=false&lang=ru_RU`;

    if (date) {
      url += `&date=${date}`;
    }

    console.log("🚌 Запрос к Яндекс.Расписаниям:", url);

    const response = await fetch(url);
    const data = await response.json();

    if (data && data.segments && data.segments.length > 0) {
      const formattedBuses = data.segments.map((segment) => ({
        from_station: segment.from?.title || originCity,
        to_station: segment.to?.title || destinationCity,
        departure: segment.departure,
        departure_formatted: formatDate(segment.departure),
        arrival: segment.arrival,
        arrival_formatted: formatDate(segment.arrival),
        duration: segment.duration,
        duration_formatted: formatDuration(segment.duration),
        bus_number: segment.thread?.number || "Нет номера",
        carrier: segment.thread?.carrier?.title || "Неизвестно",
        transport_type: "Автобус",
        // Ссылка на Яндекс.Расписания с результатами поиска
        search_link: `https://rasp.yandex.ru/search/?from=${encodeURIComponent(originCity)}&to=${encodeURIComponent(destinationCity)}${date ? `&when=${date}` : ""}`,
      }));

      return {
        success: true,
        count: formattedBuses.length,
        buses: formattedBuses,
        from_city: originCity,
        to_city: destinationCity,
      };
    } else {
      return {
        success: false,
        message: "Автобусы не найдены. Попробуйте другие даты или направления.",
        buses: [],
      };
    }
  } catch (error) {
    console.error("❌ Ошибка поиска автобусов:", error);
    return {
      success: false,
      message: `Ошибка при поиске автобусов: ${error.message}`,
      buses: [],
    };
  }
}

module.exports = {
  searchFlights,
  searchTrains,
  searchBuses,
  formatDate,
  formatDuration,
  getAirlineName,
};
