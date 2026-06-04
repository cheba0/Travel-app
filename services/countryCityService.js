// services/countryCityService.js
// Справочник стран и городов (русские названия → английские)

const countries = {
  россия: {
    name_en: "Russia",
    cities: {
      москва: "Moscow",
      казань: "Kazan",
      новосибирск: "Novosibirsk",
      владивосток: "Vladivostok",
    },
  },
  турция: {
    name_en: "Turkey",
    cities: {
      станбул: "Istanbul",
      анкара: "Ankara",
      измир: "Izmir",
      бодрум: "Bodrum",
      мармарис: "Marmaris",
    },
  },
  египет: {
    name_en: "Egypt",
    cities: {
      каир: "Cairo",
      луксор: "Luxor",
      александрия: "Alexandria",
    },
  },
  италия: {
    name_en: "Italy",
    cities: {
      рим: "Rome",
      милан: "Milan",
      венеция: "Venice",
    },
  },
  франция: {
    name_en: "France",
    cities: {
      париж: "Paris",
      марсель: "Marseille",
      лион: "Lyon",
      ницца: "Nice",
    },
  },
  испания: {
    name_en: "Spain",
    cities: {
      мадрид: "Madrid",
      барселона: "Barcelona",
      валенсия: "Valencia",
      севилья: "Seville",
      малага: "Malaga",
    },
  },
  германия: {
    name_en: "Germany",
    cities: {
      берлин: "Berlin",
      мюнхен: "Munich",
      франкфурт: "Frankfurt",
      гамбург: "Hamburg",
      кёльн: "Cologne",
    },
  },
  греция: {
    name_en: "Greece",
    cities: {
      ираклион: "Heraklion",
      родос: "Rhodes",
    },
  },
  оаэ: {
    name_en: "UAE",
    cities: {
      "абу-даби": "Abu Dhabi",
      шарджа: "Sharjah",
    },
  },
  таиланд: {
    name_en: "Thailand",
    cities: {
      бангкок: "Bangkok",
    },
  },
  китай: {
    name_en: "China",
    cities: {
      пекин: "Beijing",
      шанхай: "Shanghai",
    },
  },
};

// Получить список всех стран (русские названия)
function getCountriesList() {
  return Object.keys(countries).map((key) => ({
    name_ru: key.charAt(0).toUpperCase() + key.slice(1),
    name_en: countries[key].name_en,
  }));
}

// Получить список городов по стране (русские названия)
function getCitiesByCountry(countryNameRu) {
  const countryKey = countryNameRu.toLowerCase();
  const country = countries[countryKey];

  if (!country) return [];

  return Object.keys(country.cities).map((cityKey) => ({
    name_ru: cityKey.charAt(0).toUpperCase() + cityKey.slice(1),
    name_en: country.cities[cityKey],
    country_en: country.name_en, // ← добавляем страну
  }));
}

// Получить английское название города
function getCityEn(countryNameRu, cityNameRu) {
  const country = countries[countryNameRu.toLowerCase()];
  if (!country) return null;

  return country.cities[cityNameRu.toLowerCase()] || null;
}

// Получить английское название страны
function getCountryEn(countryNameRu) {
  const country = countries[countryNameRu.toLowerCase()];
  return country ? country.name_en : null;
}

// Поиск города без привязке к стране (для автодополнения)
function searchCities(queryRu) {
  const query = queryRu.toLowerCase();
  const results = [];

  for (const [countryKey, country] of Object.entries(countries)) {
    for (const [cityRu, cityEn] of Object.entries(country.cities)) {
      if (cityRu.includes(query)) {
        results.push({
          country_ru: countryKey.charAt(0).toUpperCase() + countryKey.slice(1),
          country_en: country.name_en,
          city_ru: cityRu.charAt(0).toUpperCase() + cityRu.slice(1),
          city_en: cityEn,
        });
      }
    }
  }

  return results;
}

module.exports = {
  countries,
  getCountriesList,
  getCitiesByCountry,
  getCityEn,
  getCountryEn,
  searchCities,
};
