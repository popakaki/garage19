/**
 * Справочник автомобилей для конфигуратора: марка → модель → поколение → модификация.
 *
 * Правила наполнения:
 *  * слаг модели уникален внутри марки, слаг поколения — внутри модели;
 *  * годы и кузова соответствуют реальным поколениям, продававшимся в РФ;
 *  * у популярных моделей 2–4 модификации (двигатель, объём, мощность, привод, КПП).
 *
 * ВАЖНО: слаг'и используются как ключи совместимости (Fitment) в data/products*.ts,
 * поэтому менять их без обновления товаров нельзя.
 */

import type { CarBrandSeed } from "./types";

export const CAR_BRANDS: CarBrandSeed[] = [
  // ───────────────────────────────────────────────────────────────────────────
  // Toyota
  // ───────────────────────────────────────────────────────────────────────────
  {
    name: "Toyota",
    slug: "toyota",
    country: "Япония",
    popular: true,
    sortOrder: 10,
    models: [
      {
        name: "Camry",
        slug: "camry",
        bodyType: "седан",
        yearFrom: 2011,
        generations: [
          {
            name: "XV50",
            slug: "xv50",
            yearFrom: 2011,
            yearTo: 2018,
            bodyType: "седан",
            modifications: [
              { name: "2.0 AT", engine: "2AR-FE", volume: 2.5, power: 181, fuel: "бензин", drive: "передний", transmission: "АКПП", yearFrom: 2011, yearTo: 2018 },
              { name: "2.5 AT", engine: "2AR-FE", volume: 2.5, power: 181, fuel: "бензин", drive: "передний", transmission: "АКПП", yearFrom: 2011, yearTo: 2018 },
              { name: "3.5 V6 AT", engine: "2GR-FE", volume: 3.5, power: 249, fuel: "бензин", drive: "передний", transmission: "АКПП", yearFrom: 2011, yearTo: 2018 },
            ],
          },
          {
            name: "XV70",
            slug: "xv70",
            yearFrom: 2018,
            yearTo: 2021,
            bodyType: "седан",
            modifications: [
              { name: "2.0 CVT", engine: "6AR-FSE", volume: 2, power: 150, fuel: "бензин", drive: "передний", transmission: "вариатор", yearFrom: 2018, yearTo: 2021 },
              { name: "2.5 AT", engine: "A25A-FKS", volume: 2.5, power: 181, fuel: "бензин", drive: "передний", transmission: "АКПП", yearFrom: 2018, yearTo: 2021 },
              { name: "2.5 AWD AT", engine: "A25A-FKS", volume: 2.5, power: 200, fuel: "бензин", drive: "полный", transmission: "АКПП", yearFrom: 2018, yearTo: 2021 },
              { name: "3.5 V6 AT", engine: "2GR-FKS", volume: 3.5, power: 249, fuel: "бензин", drive: "передний", transmission: "АКПП", yearFrom: 2018, yearTo: 2021 },
            ],
          },
          {
            name: "XV80",
            slug: "xv80",
            yearFrom: 2021,
            bodyType: "седан",
            modifications: [
              { name: "2.0 CVT", engine: "M20A-FKS", volume: 2, power: 150, fuel: "бензин", drive: "передний", transmission: "вариатор", yearFrom: 2021 },
              { name: "2.5 AT", engine: "A25A-FKS", volume: 2.5, power: 200, fuel: "бензин", drive: "передний", transmission: "АКПП", yearFrom: 2021 },
              { name: "2.5 AWD AT", engine: "A25A-FKS", volume: 2.5, power: 200, fuel: "бензин", drive: "полный", transmission: "АКПП", yearFrom: 2021 },
              { name: "3.5 V6 AT", engine: "2GR-FKS", volume: 3.5, power: 249, fuel: "бензин", drive: "передний", transmission: "АКПП", yearFrom: 2021 },
            ],
          },
        ],
      },
      {
        name: "RAV4",
        slug: "rav4",
        bodyType: "кроссовер",
        yearFrom: 2013,
        generations: [
          {
            name: "XA40",
            slug: "xa40",
            yearFrom: 2013,
            yearTo: 2018,
            bodyType: "кроссовер",
            modifications: [
              { name: "2.0 CVT 2WD", engine: "3ZR-FE", volume: 2, power: 146, fuel: "бензин", drive: "передний", transmission: "вариатор", yearFrom: 2013, yearTo: 2018 },
              { name: "2.0 CVT 4WD", engine: "3ZR-FAE", volume: 2, power: 146, fuel: "бензин", drive: "полный", transmission: "вариатор", yearFrom: 2013, yearTo: 2018 },
              { name: "2.2 D AT 4WD", engine: "2AD-FTV", volume: 2.2, power: 150, fuel: "дизель", drive: "полный", transmission: "АКПП", yearFrom: 2013, yearTo: 2018 },
            ],
          },
          {
            name: "XA50",
            slug: "xa50",
            yearFrom: 2018,
            bodyType: "кроссовер",
            modifications: [
              { name: "2.0 CVT 2WD", engine: "M20A-FKS", volume: 2, power: 149, fuel: "бензин", drive: "передний", transmission: "вариатор", yearFrom: 2018 },
              { name: "2.0 CVT 4WD", engine: "M20A-FKS", volume: 2, power: 149, fuel: "бензин", drive: "полный", transmission: "вариатор", yearFrom: 2018 },
              { name: "2.5 AT 4WD", engine: "A25A-FKS", volume: 2.5, power: 199, fuel: "бензин", drive: "полный", transmission: "АКПП", yearFrom: 2018 },
              { name: "2.5 Hybrid CVT 4WD", engine: "A25A-FXS", volume: 2.5, power: 222, fuel: "гибрид", drive: "полный", transmission: "вариатор", yearFrom: 2019 },
            ],
          },
        ],
      },
      {
        name: "Land Cruiser Prado",
        slug: "land-cruiser-prado",
        bodyType: "внедорожник",
        yearFrom: 2009,
        generations: [
          {
            name: "150",
            slug: "150",
            yearFrom: 2009,
            yearTo: 2024,
            bodyType: "внедорожник",
            modifications: [
              { name: "2.7 AT", engine: "2TR-FE", volume: 2.7, power: 163, fuel: "бензин", drive: "полный", transmission: "АКПП", yearFrom: 2009, yearTo: 2024 },
              { name: "3.0 D AT", engine: "1KD-FTV", volume: 3, power: 173, fuel: "дизель", drive: "полный", transmission: "АКПП", yearFrom: 2009, yearTo: 2015 },
              { name: "4.0 V6 AT", engine: "1GR-FE", volume: 4, power: 282, fuel: "бензин", drive: "полный", transmission: "АКПП", yearFrom: 2009, yearTo: 2024 },
            ],
          },
          {
            name: "250",
            slug: "250",
            yearFrom: 2024,
            bodyType: "внедорожник",
            modifications: [
              { name: "2.4 Turbo AT", engine: "T24A-FTS", volume: 2.4, power: 282, fuel: "бензин", drive: "полный", transmission: "АКПП", yearFrom: 2024 },
              { name: "2.8 D AT", engine: "1GD-FTV", volume: 2.8, power: 204, fuel: "дизель", drive: "полный", transmission: "АКПП", yearFrom: 2024 },
            ],
          },
        ],
      },
      {
        name: "Corolla",
        slug: "corolla",
        bodyType: "седан",
        yearFrom: 2013,
        generations: [
          {
            name: "E170",
            slug: "e170",
            yearFrom: 2013,
            yearTo: 2019,
            bodyType: "седан",
            modifications: [
              { name: "1.6 MT", engine: "1ZR-FE", volume: 1.6, power: 122, fuel: "бензин", drive: "передний", transmission: "МКПП", yearFrom: 2013, yearTo: 2019 },
              { name: "1.6 CVT", engine: "1ZR-FE", volume: 1.6, power: 122, fuel: "бензин", drive: "передний", transmission: "вариатор", yearFrom: 2013, yearTo: 2019 },
              { name: "1.8 CVT", engine: "2ZR-FE", volume: 1.8, power: 140, fuel: "бензин", drive: "передний", transmission: "вариатор", yearFrom: 2013, yearTo: 2019 },
            ],
          },
          {
            name: "E210",
            slug: "e210",
            yearFrom: 2019,
            bodyType: "седан",
            modifications: [
              { name: "1.6 MT", engine: "1ZR-FE", volume: 1.6, power: 122, fuel: "бензин", drive: "передний", transmission: "МКПП", yearFrom: 2019 },
              { name: "1.6 CVT", engine: "1ZR-FE", volume: 1.6, power: 122, fuel: "бензин", drive: "передний", transmission: "вариатор", yearFrom: 2019 },
              { name: "1.8 Hybrid CVT", engine: "2ZR-FXE", volume: 1.8, power: 122, fuel: "гибрид", drive: "передний", transmission: "вариатор", yearFrom: 2019 },
            ],
          },
        ],
      },
      {
        name: "Highlander",
        slug: "highlander",
        bodyType: "кроссовер",
        yearFrom: 2014,
        generations: [
          {
            name: "XU50",
            slug: "xu50",
            yearFrom: 2014,
            yearTo: 2019,
            bodyType: "кроссовер",
            modifications: [
              { name: "2.7 AT 2WD", engine: "1AR-FE", volume: 2.7, power: 188, fuel: "бензин", drive: "передний", transmission: "АКПП", yearFrom: 2014, yearTo: 2019 },
              { name: "3.5 V6 AT 4WD", engine: "2GR-FE", volume: 3.5, power: 249, fuel: "бензин", drive: "полный", transmission: "АКПП", yearFrom: 2014, yearTo: 2019 },
            ],
          },
          {
            name: "XU70",
            slug: "xu70",
            yearFrom: 2019,
            bodyType: "кроссовер",
            modifications: [
              { name: "2.5 Hybrid CVT 4WD", engine: "A25A-FXS", volume: 2.5, power: 243, fuel: "гибрид", drive: "полный", transmission: "вариатор", yearFrom: 2019 },
              { name: "3.5 V6 AT 4WD", engine: "2GR-FKS", volume: 3.5, power: 249, fuel: "бензин", drive: "полный", transmission: "АКПП", yearFrom: 2019 },
            ],
          },
        ],
      },
      {
        name: "C-HR",
        slug: "c-hr",
        bodyType: "кроссовер",
        yearFrom: 2016,
        generations: [
          {
            name: "AX10",
            slug: "ax10",
            yearFrom: 2016,
            yearTo: 2023,
            bodyType: "кроссовер",
            modifications: [
              { name: "1.2 Turbo CVT", engine: "8NR-FTS", volume: 1.2, power: 116, fuel: "бензин", drive: "передний", transmission: "вариатор", yearFrom: 2016, yearTo: 2023 },
              { name: "1.8 Hybrid CVT", engine: "2ZR-FXE", volume: 1.8, power: 122, fuel: "гибрид", drive: "передний", transmission: "вариатор", yearFrom: 2017, yearTo: 2023 },
            ],
          },
        ],
      },
    ],
  },

  // ───────────────────────────────────────────────────────────────────────────
  // Kia
  // ───────────────────────────────────────────────────────────────────────────
  {
    name: "Kia",
    slug: "kia",
    country: "Южная Корея",
    popular: true,
    sortOrder: 20,
    models: [
      {
        name: "Sportage",
        slug: "sportage",
        bodyType: "кроссовер",
        yearFrom: 2010,
        generations: [
          {
            name: "SL",
            slug: "sl",
            yearFrom: 2010,
            yearTo: 2015,
            bodyType: "кроссовер",
            modifications: [
              { name: "2.0 MT 2WD", engine: "G4KD", volume: 2, power: 150, fuel: "бензин", drive: "передний", transmission: "МКПП", yearFrom: 2010, yearTo: 2015 },
              { name: "2.0 AT 4WD", engine: "G4KD", volume: 2, power: 150, fuel: "бензин", drive: "полный", transmission: "АКПП", yearFrom: 2010, yearTo: 2015 },
              { name: "2.0 D AT 4WD", engine: "D4HA", volume: 2, power: 184, fuel: "дизель", drive: "полный", transmission: "АКПП", yearFrom: 2010, yearTo: 2015 },
            ],
          },
          {
            name: "QL",
            slug: "ql",
            yearFrom: 2015,
            yearTo: 2021,
            bodyType: "кроссовер",
            modifications: [
              { name: "1.6 MT 2WD", engine: "G4FD", volume: 1.6, power: 132, fuel: "бензин", drive: "передний", transmission: "МКПП", yearFrom: 2015, yearTo: 2021 },
              { name: "2.0 AT 2WD", engine: "G4NA", volume: 2, power: 150, fuel: "бензин", drive: "передний", transmission: "АКПП", yearFrom: 2015, yearTo: 2021 },
              { name: "2.0 AT 4WD", engine: "G4NA", volume: 2, power: 150, fuel: "бензин", drive: "полный", transmission: "АКПП", yearFrom: 2015, yearTo: 2021 },
              { name: "2.0 D AT 4WD", engine: "D4HA", volume: 2, power: 185, fuel: "дизель", drive: "полный", transmission: "АКПП", yearFrom: 2015, yearTo: 2021 },
            ],
          },
          {
            name: "NQ5",
            slug: "nq5",
            yearFrom: 2021,
            bodyType: "кроссовер",
            modifications: [
              { name: "1.6 Turbo AT 4WD", engine: "G4FP", volume: 1.6, power: 180, fuel: "бензин", drive: "полный", transmission: "АКПП", yearFrom: 2021 },
              { name: "2.0 AT 2WD", engine: "G4NL", volume: 2, power: 150, fuel: "бензин", drive: "передний", transmission: "АКПП", yearFrom: 2021 },
              { name: "2.0 AT 4WD", engine: "G4NL", volume: 2, power: 150, fuel: "бензин", drive: "полный", transmission: "АКПП", yearFrom: 2021 },
            ],
          },
        ],
      },
      {
        name: "Rio",
        slug: "rio",
        bodyType: "седан",
        yearFrom: 2011,
        generations: [
          {
            name: "QB",
            slug: "qb",
            yearFrom: 2011,
            yearTo: 2017,
            bodyType: "седан",
            modifications: [
              { name: "1.4 MT", engine: "G4FA", volume: 1.4, power: 107, fuel: "бензин", drive: "передний", transmission: "МКПП", yearFrom: 2011, yearTo: 2017 },
              { name: "1.6 AT", engine: "G4FC", volume: 1.6, power: 123, fuel: "бензин", drive: "передний", transmission: "АКПП", yearFrom: 2011, yearTo: 2017 },
            ],
          },
          {
            name: "FB",
            slug: "fb",
            yearFrom: 2017,
            yearTo: 2022,
            bodyType: "седан",
            modifications: [
              { name: "1.4 MT", engine: "G4LC", volume: 1.4, power: 100, fuel: "бензин", drive: "передний", transmission: "МКПП", yearFrom: 2017, yearTo: 2022 },
              { name: "1.6 AT", engine: "G4FG", volume: 1.6, power: 123, fuel: "бензин", drive: "передний", transmission: "АКПП", yearFrom: 2017, yearTo: 2022 },
            ],
          },
          {
            name: "FB (рестайлинг)",
            slug: "fb-restyling",
            yearFrom: 2022,
            bodyType: "седан",
            modifications: [
              { name: "1.6 CVT", engine: "G4FG", volume: 1.6, power: 123, fuel: "бензин", drive: "передний", transmission: "вариатор", yearFrom: 2022 },
              { name: "1.6 AT", engine: "G4FG", volume: 1.6, power: 123, fuel: "бензин", drive: "передний", transmission: "АКПП", yearFrom: 2022 },
            ],
          },
        ],
      },
      {
        name: "Sorento",
        slug: "sorento",
        bodyType: "кроссовер",
        yearFrom: 2009,
        generations: [
          {
            name: "XM",
            slug: "xm",
            yearFrom: 2009,
            yearTo: 2015,
            bodyType: "кроссовер",
            modifications: [
              { name: "2.4 AT 4WD", engine: "G4KE", volume: 2.4, power: 175, fuel: "бензин", drive: "полный", transmission: "АКПП", yearFrom: 2009, yearTo: 2015 },
              { name: "2.2 D AT 4WD", engine: "D4HB", volume: 2.2, power: 197, fuel: "дизель", drive: "полный", transmission: "АКПП", yearFrom: 2009, yearTo: 2015 },
            ],
          },
          {
            name: "UM",
            slug: "um",
            yearFrom: 2015,
            yearTo: 2020,
            bodyType: "кроссовер",
            modifications: [
              { name: "2.4 AT 4WD", engine: "G4KJ", volume: 2.4, power: 188, fuel: "бензин", drive: "полный", transmission: "АКПП", yearFrom: 2015, yearTo: 2020 },
              { name: "2.2 D AT 4WD", engine: "D4HB", volume: 2.2, power: 200, fuel: "дизель", drive: "полный", transmission: "АКПП", yearFrom: 2015, yearTo: 2020 },
              { name: "3.5 V6 AT 4WD", engine: "G6DC", volume: 3.5, power: 249, fuel: "бензин", drive: "полный", transmission: "АКПП", yearFrom: 2015, yearTo: 2020 },
            ],
          },
          {
            name: "MQ4",
            slug: "mq4",
            yearFrom: 2020,
            bodyType: "кроссовер",
            modifications: [
              { name: "2.5 AT 4WD", engine: "G4KN", volume: 2.5, power: 180, fuel: "бензин", drive: "полный", transmission: "АКПП", yearFrom: 2020 },
              { name: "2.2 D AT 4WD", engine: "D4HE", volume: 2.2, power: 202, fuel: "дизель", drive: "полный", transmission: "АКПП", yearFrom: 2020 },
              { name: "1.6 Turbo Hybrid AT 4WD", engine: "G4FT", volume: 1.6, power: 230, fuel: "гибрид", drive: "полный", transmission: "АКПП", yearFrom: 2021 },
            ],
          },
        ],
      },
      {
        name: "Ceed",
        slug: "ceed",
        bodyType: "хэтчбек",
        yearFrom: 2012,
        generations: [
          {
            name: "JD",
            slug: "jd",
            yearFrom: 2012,
            yearTo: 2018,
            bodyType: "хэтчбек",
            modifications: [
              { name: "1.4 MT", engine: "G4FA", volume: 1.4, power: 100, fuel: "бензин", drive: "передний", transmission: "МКПП", yearFrom: 2012, yearTo: 2018 },
              { name: "1.6 AT", engine: "G4FC", volume: 1.6, power: 129, fuel: "бензин", drive: "передний", transmission: "АКПП", yearFrom: 2012, yearTo: 2018 },
            ],
          },
          {
            name: "CD",
            slug: "cd",
            yearFrom: 2018,
            bodyType: "хэтчбек",
            modifications: [
              { name: "1.4 Turbo DCT", engine: "G4LD", volume: 1.4, power: 140, fuel: "бензин", drive: "передний", transmission: "робот", yearFrom: 2018 },
              { name: "1.6 AT", engine: "G4FG", volume: 1.6, power: 128, fuel: "бензин", drive: "передний", transmission: "АКПП", yearFrom: 2018 },
            ],
          },
        ],
      },
      {
        name: "Seltos",
        slug: "seltos",
        bodyType: "кроссовер",
        yearFrom: 2019,
        generations: [
          {
            name: "SP2",
            slug: "sp2",
            yearFrom: 2019,
            bodyType: "кроссовер",
            modifications: [
              { name: "1.6 AT 2WD", engine: "G4FG", volume: 1.6, power: 121, fuel: "бензин", drive: "передний", transmission: "вариатор", yearFrom: 2019 },
              { name: "1.6 Turbo DCT 4WD", engine: "G4FJ", volume: 1.6, power: 177, fuel: "бензин", drive: "полный", transmission: "робот", yearFrom: 2019 },
              { name: "2.0 AT 4WD", engine: "G4NA", volume: 2, power: 149, fuel: "бензин", drive: "полный", transmission: "вариатор", yearFrom: 2019 },
            ],
          },
        ],
      },
      {
        name: "K5",
        slug: "k5",
        bodyType: "седан",
        yearFrom: 2010,
        generations: [
          {
            name: "TF",
            slug: "tf",
            yearFrom: 2010,
            yearTo: 2015,
            bodyType: "седан",
            modifications: [
              { name: "2.0 AT", engine: "G4KD", volume: 2, power: 150, fuel: "бензин", drive: "передний", transmission: "АКПП", yearFrom: 2010, yearTo: 2015 },
              { name: "2.4 AT", engine: "G4KE", volume: 2.4, power: 180, fuel: "бензин", drive: "передний", transmission: "АКПП", yearFrom: 2010, yearTo: 2015 },
            ],
          },
          {
            name: "DL3",
            slug: "dl3",
            yearFrom: 2019,
            bodyType: "седан",
            modifications: [
              { name: "2.0 AT", engine: "G4NN", volume: 2, power: 150, fuel: "бензин", drive: "передний", transmission: "АКПП", yearFrom: 2019 },
              { name: "2.5 AT", engine: "G4KN", volume: 2.5, power: 194, fuel: "бензин", drive: "передний", transmission: "АКПП", yearFrom: 2019 },
            ],
          },
        ],
      },
    ],
  },

  // ───────────────────────────────────────────────────────────────────────────
  // Hyundai
  // ───────────────────────────────────────────────────────────────────────────
  {
    name: "Hyundai",
    slug: "hyundai",
    country: "Южная Корея",
    popular: true,
    sortOrder: 30,
    models: [
      {
        name: "Tucson",
        slug: "tucson",
        bodyType: "кроссовер",
        yearFrom: 2010,
        generations: [
          {
            name: "ix35 (LM)",
            slug: "ix35-lm",
            yearFrom: 2010,
            yearTo: 2015,
            bodyType: "кроссовер",
            modifications: [
              { name: "2.0 MT 2WD", engine: "G4KD", volume: 2, power: 150, fuel: "бензин", drive: "передний", transmission: "МКПП", yearFrom: 2010, yearTo: 2015 },
              { name: "2.0 AT 4WD", engine: "G4KD", volume: 2, power: 150, fuel: "бензин", drive: "полный", transmission: "АКПП", yearFrom: 2010, yearTo: 2015 },
            ],
          },
          {
            name: "TL",
            slug: "tl",
            yearFrom: 2015,
            yearTo: 2020,
            bodyType: "кроссовер",
            modifications: [
              { name: "1.6 Turbo DCT 4WD", engine: "G4FJ", volume: 1.6, power: 177, fuel: "бензин", drive: "полный", transmission: "робот", yearFrom: 2015, yearTo: 2020 },
              { name: "2.0 AT 2WD", engine: "G4NA", volume: 2, power: 150, fuel: "бензин", drive: "передний", transmission: "АКПП", yearFrom: 2015, yearTo: 2020 },
              { name: "2.0 D AT 4WD", engine: "D4HA", volume: 2, power: 185, fuel: "дизель", drive: "полный", transmission: "АКПП", yearFrom: 2015, yearTo: 2020 },
            ],
          },
          {
            name: "NX4",
            slug: "nx4",
            yearFrom: 2020,
            bodyType: "кроссовер",
            modifications: [
              { name: "2.0 AT 2WD", engine: "G4NL", volume: 2, power: 150, fuel: "бензин", drive: "передний", transmission: "АКПП", yearFrom: 2020 },
              { name: "2.5 AT 4WD", engine: "G4KN", volume: 2.5, power: 180, fuel: "бензин", drive: "полный", transmission: "АКПП", yearFrom: 2020 },
              { name: "1.6 Turbo Hybrid AT 4WD", engine: "G4FT", volume: 1.6, power: 230, fuel: "гибрид", drive: "полный", transmission: "АКПП", yearFrom: 2021 },
            ],
          },
        ],
      },
      {
        name: "Solaris",
        slug: "solaris",
        bodyType: "седан",
        yearFrom: 2010,
        generations: [
          {
            name: "RB",
            slug: "rb",
            yearFrom: 2010,
            yearTo: 2017,
            bodyType: "седан",
            modifications: [
              { name: "1.4 MT", engine: "G4FA", volume: 1.4, power: 107, fuel: "бензин", drive: "передний", transmission: "МКПП", yearFrom: 2010, yearTo: 2017 },
              { name: "1.6 AT", engine: "G4FC", volume: 1.6, power: 123, fuel: "бензин", drive: "передний", transmission: "АКПП", yearFrom: 2010, yearTo: 2017 },
            ],
          },
          {
            name: "HC",
            slug: "hc",
            yearFrom: 2017,
            yearTo: 2023,
            bodyType: "седан",
            modifications: [
              { name: "1.4 MT", engine: "G4LC", volume: 1.4, power: 100, fuel: "бензин", drive: "передний", transmission: "МКПП", yearFrom: 2017, yearTo: 2023 },
              { name: "1.6 AT", engine: "G4FG", volume: 1.6, power: 123, fuel: "бензин", drive: "передний", transmission: "АКПП", yearFrom: 2017, yearTo: 2023 },
            ],
          },
          {
            name: "HC (рестайлинг)",
            slug: "hc-restyling",
            yearFrom: 2023,
            bodyType: "седан",
            modifications: [
              { name: "1.6 CVT", engine: "G4FG", volume: 1.6, power: 123, fuel: "бензин", drive: "передний", transmission: "вариатор", yearFrom: 2023 },
              { name: "1.4 AT", engine: "G4LC", volume: 1.4, power: 100, fuel: "бензин", drive: "передний", transmission: "АКПП", yearFrom: 2023 },
            ],
          },
        ],
      },
      {
        name: "Santa Fe",
        slug: "santa-fe",
        bodyType: "кроссовер",
        yearFrom: 2012,
        generations: [
          {
            name: "DM",
            slug: "dm",
            yearFrom: 2012,
            yearTo: 2018,
            bodyType: "кроссовер",
            modifications: [
              { name: "2.2 D AT 4WD", engine: "D4HB", volume: 2.2, power: 197, fuel: "дизель", drive: "полный", transmission: "АКПП", yearFrom: 2012, yearTo: 2018 },
              { name: "2.4 AT 4WD", engine: "G4KE", volume: 2.4, power: 175, fuel: "бензин", drive: "полный", transmission: "АКПП", yearFrom: 2012, yearTo: 2018 },
            ],
          },
          {
            name: "TM",
            slug: "tm",
            yearFrom: 2018,
            yearTo: 2020,
            bodyType: "кроссовер",
            modifications: [
              { name: "2.2 D AT 4WD", engine: "D4HB", volume: 2.2, power: 200, fuel: "дизель", drive: "полный", transmission: "АКПП", yearFrom: 2018, yearTo: 2020 },
              { name: "2.4 AT 4WD", engine: "G4KJ", volume: 2.4, power: 188, fuel: "бензин", drive: "полный", transmission: "АКПП", yearFrom: 2018, yearTo: 2020 },
            ],
          },
          {
            name: "MX5",
            slug: "mx5",
            yearFrom: 2020,
            bodyType: "кроссовер",
            modifications: [
              { name: "1.6 Turbo Hybrid AT 4WD", engine: "G4FT", volume: 1.6, power: 230, fuel: "гибрид", drive: "полный", transmission: "АКПП", yearFrom: 2020 },
              { name: "2.5 AT 4WD", engine: "G4KN", volume: 2.5, power: 180, fuel: "бензин", drive: "полный", transmission: "АКПП", yearFrom: 2020 },
              { name: "2.2 D AT 4WD", engine: "D4HE", volume: 2.2, power: 202, fuel: "дизель", drive: "полный", transmission: "АКПП", yearFrom: 2020 },
            ],
          },
        ],
      },
      {
        name: "Creta",
        slug: "creta",
        bodyType: "кроссовер",
        yearFrom: 2016,
        generations: [
          {
            name: "I",
            slug: "i",
            yearFrom: 2016,
            yearTo: 2021,
            bodyType: "кроссовер",
            modifications: [
              { name: "1.6 MT 2WD", engine: "G4FG", volume: 1.6, power: 123, fuel: "бензин", drive: "передний", transmission: "МКПП", yearFrom: 2016, yearTo: 2021 },
              { name: "1.6 AT 2WD", engine: "G4FG", volume: 1.6, power: 123, fuel: "бензин", drive: "передний", transmission: "АКПП", yearFrom: 2016, yearTo: 2021 },
              { name: "2.0 AT 4WD", engine: "G4NA", volume: 2, power: 149, fuel: "бензин", drive: "полный", transmission: "АКПП", yearFrom: 2016, yearTo: 2021 },
            ],
          },
          {
            name: "II",
            slug: "ii",
            yearFrom: 2021,
            bodyType: "кроссовер",
            modifications: [
              { name: "1.6 CVT 2WD", engine: "G4FG", volume: 1.6, power: 123, fuel: "бензин", drive: "передний", transmission: "вариатор", yearFrom: 2021 },
              { name: "2.0 CVT 4WD", engine: "G4NL", volume: 2, power: 149, fuel: "бензин", drive: "полный", transmission: "вариатор", yearFrom: 2021 },
            ],
          },
        ],
      },
      {
        name: "Palisade",
        slug: "palisade",
        bodyType: "кроссовер",
        yearFrom: 2019,
        generations: [
          {
            name: "LX2",
            slug: "lx2",
            yearFrom: 2019,
            bodyType: "кроссовер",
            modifications: [
              { name: "2.2 D AT 4WD", engine: "D4HB", volume: 2.2, power: 200, fuel: "дизель", drive: "полный", transmission: "АКПП", yearFrom: 2019 },
              { name: "3.5 V6 AT 4WD", engine: "G6DT", volume: 3.5, power: 249, fuel: "бензин", drive: "полный", transmission: "АКПП", yearFrom: 2019 },
            ],
          },
        ],
      },
    ],
  },

  // ───────────────────────────────────────────────────────────────────────────
  // Lada
  // ───────────────────────────────────────────────────────────────────────────
  {
    name: "Lada",
    slug: "lada",
    country: "Россия",
    popular: true,
    sortOrder: 40,
    models: [
      {
        name: "Vesta",
        slug: "vesta",
        bodyType: "седан",
        yearFrom: 2015,
        generations: [
          {
            name: "I",
            slug: "i",
            yearFrom: 2015,
            yearTo: 2022,
            bodyType: "седан",
            modifications: [
              { name: "1.6 MT", engine: "21129", volume: 1.6, power: 106, fuel: "бензин", drive: "передний", transmission: "МКПП", yearFrom: 2015, yearTo: 2022 },
              { name: "1.6 AMT", engine: "21129", volume: 1.6, power: 106, fuel: "бензин", drive: "передний", transmission: "робот", yearFrom: 2015, yearTo: 2022 },
              { name: "1.8 MT", engine: "21179", volume: 1.8, power: 122, fuel: "бензин", drive: "передний", transmission: "МКПП", yearFrom: 2015, yearTo: 2022 },
            ],
          },
          {
            name: "NG",
            slug: "ng",
            yearFrom: 2022,
            bodyType: "седан",
            modifications: [
              { name: "1.6 MT", engine: "21129", volume: 1.6, power: 90, fuel: "бензин", drive: "передний", transmission: "МКПП", yearFrom: 2022 },
              { name: "1.6 CVT", engine: "21129", volume: 1.6, power: 106, fuel: "бензин", drive: "передний", transmission: "вариатор", yearFrom: 2022 },
              { name: "1.8 CVT", engine: "21179", volume: 1.8, power: 122, fuel: "бензин", drive: "передний", transmission: "вариатор", yearFrom: 2022 },
            ],
          },
        ],
      },
      {
        name: "Granta",
        slug: "granta",
        bodyType: "седан",
        yearFrom: 2011,
        generations: [
          {
            name: "I",
            slug: "i",
            yearFrom: 2011,
            yearTo: 2018,
            bodyType: "седан",
            modifications: [
              { name: "1.6 MT", engine: "11186", volume: 1.6, power: 87, fuel: "бензин", drive: "передний", transmission: "МКПП", yearFrom: 2011, yearTo: 2018 },
              { name: "1.6 AT", engine: "21126", volume: 1.6, power: 98, fuel: "бензин", drive: "передний", transmission: "АКПП", yearFrom: 2012, yearTo: 2018 },
            ],
          },
          {
            name: "II (FL)",
            slug: "ii-fl",
            yearFrom: 2018,
            bodyType: "седан",
            modifications: [
              { name: "1.6 MT", engine: "11182", volume: 1.6, power: 90, fuel: "бензин", drive: "передний", transmission: "МКПП", yearFrom: 2018 },
              { name: "1.6 CVT", engine: "21129", volume: 1.6, power: 106, fuel: "бензин", drive: "передний", transmission: "вариатор", yearFrom: 2023 },
            ],
          },
        ],
      },
      {
        name: "Niva Legend",
        slug: "niva-legend",
        bodyType: "внедорожник",
        yearFrom: 1977,
        generations: [
          {
            name: "2121 / Legend",
            slug: "2121",
            yearFrom: 1977,
            bodyType: "внедорожник",
            modifications: [
              { name: "1.7 MT", engine: "21214", volume: 1.7, power: 83, fuel: "бензин", drive: "полный", transmission: "МКПП", yearFrom: 1977 },
            ],
          },
          {
            name: "Travel",
            slug: "travel",
            yearFrom: 2020,
            bodyType: "внедорожник",
            modifications: [
              { name: "1.7 MT", engine: "21214", volume: 1.7, power: 80, fuel: "бензин", drive: "полный", transmission: "МКПП", yearFrom: 2020 },
            ],
          },
        ],
      },
      {
        name: "Largus",
        slug: "largus",
        bodyType: "универсал",
        yearFrom: 2012,
        generations: [
          {
            name: "I",
            slug: "i",
            yearFrom: 2012,
            yearTo: 2021,
            bodyType: "универсал",
            modifications: [
              { name: "1.6 MT 5 мест", engine: "K4M", volume: 1.6, power: 105, fuel: "бензин", drive: "передний", transmission: "МКПП", yearFrom: 2012, yearTo: 2021 },
              { name: "1.6 MT 7 мест", engine: "K4M", volume: 1.6, power: 105, fuel: "бензин", drive: "передний", transmission: "МКПП", yearFrom: 2012, yearTo: 2021 },
            ],
          },
          {
            name: "FL",
            slug: "fl",
            yearFrom: 2021,
            bodyType: "универсал",
            modifications: [
              { name: "1.6 MT", engine: "K4M", volume: 1.6, power: 106, fuel: "бензин", drive: "передний", transmission: "МКПП", yearFrom: 2021 },
            ],
          },
        ],
      },
    ],
  },

  // ───────────────────────────────────────────────────────────────────────────
  // Volkswagen
  // ───────────────────────────────────────────────────────────────────────────
  {
    name: "Volkswagen",
    slug: "volkswagen",
    country: "Германия",
    popular: true,
    sortOrder: 50,
    models: [
      {
        name: "Tiguan",
        slug: "tiguan",
        bodyType: "кроссовер",
        yearFrom: 2011,
        generations: [
          {
            name: "I (5N)",
            slug: "i-5n",
            yearFrom: 2011,
            yearTo: 2016,
            bodyType: "кроссовер",
            modifications: [
              { name: "1.4 TSI MT 2WD", engine: "CAXA", volume: 1.4, power: 122, fuel: "бензин", drive: "передний", transmission: "МКПП", yearFrom: 2011, yearTo: 2016 },
              { name: "2.0 TSI AT 4WD", engine: "CCZD", volume: 2, power: 180, fuel: "бензин", drive: "полный", transmission: "АКПП", yearFrom: 2011, yearTo: 2016 },
              { name: "2.0 TDI DSG 4WD", engine: "CFFB", volume: 2, power: 140, fuel: "дизель", drive: "полный", transmission: "DSG", yearFrom: 2011, yearTo: 2016 },
            ],
          },
          {
            name: "II (AD1)",
            slug: "ii-ad1",
            yearFrom: 2016,
            yearTo: 2020,
            bodyType: "кроссовер",
            modifications: [
              { name: "1.4 TSI DSG 2WD", engine: "CZDA", volume: 1.4, power: 150, fuel: "бензин", drive: "передний", transmission: "DSG", yearFrom: 2016, yearTo: 2020 },
              { name: "2.0 TSI DSG 4WD", engine: "CZPB", volume: 2, power: 180, fuel: "бензин", drive: "полный", transmission: "DSG", yearFrom: 2016, yearTo: 2020 },
              { name: "2.0 TDI DSG 4WD", engine: "DFGA", volume: 2, power: 150, fuel: "дизель", drive: "полный", transmission: "DSG", yearFrom: 2016, yearTo: 2020 },
            ],
          },
          {
            name: "II (рестайлинг)",
            slug: "ii-restyling",
            yearFrom: 2020,
            bodyType: "кроссовер",
            modifications: [
              { name: "1.4 TSI DSG 2WD", engine: "DJKA", volume: 1.4, power: 150, fuel: "бензин", drive: "передний", transmission: "DSG", yearFrom: 2020 },
              { name: "2.0 TSI DSG 4WD", engine: "DKTA", volume: 2, power: 180, fuel: "бензин", drive: "полный", transmission: "DSG", yearFrom: 2020 },
            ],
          },
        ],
      },
      {
        name: "Polo",
        slug: "polo",
        bodyType: "седан",
        yearFrom: 2010,
        generations: [
          {
            name: "V (седан)",
            slug: "v-sedan",
            yearFrom: 2010,
            yearTo: 2020,
            bodyType: "седан",
            modifications: [
              { name: "1.6 MT", engine: "CFNA", volume: 1.6, power: 105, fuel: "бензин", drive: "передний", transmission: "МКПП", yearFrom: 2010, yearTo: 2020 },
              { name: "1.6 AT", engine: "CFNA", volume: 1.6, power: 105, fuel: "бензин", drive: "передний", transmission: "АКПП", yearFrom: 2010, yearTo: 2020 },
              { name: "1.4 TSI DSG", engine: "CBZB", volume: 1.4, power: 125, fuel: "бензин", drive: "передний", transmission: "DSG", yearFrom: 2013, yearTo: 2020 },
            ],
          },
          {
            name: "VI (седан)",
            slug: "vi-sedan",
            yearFrom: 2020,
            bodyType: "седан",
            modifications: [
              { name: "1.6 MT", engine: "CWVA", volume: 1.6, power: 90, fuel: "бензин", drive: "передний", transmission: "МКПП", yearFrom: 2020 },
              { name: "1.6 AT", engine: "CWVA", volume: 1.6, power: 110, fuel: "бензин", drive: "передний", transmission: "АКПП", yearFrom: 2020 },
              { name: "1.4 TSI DSG", engine: "DJKA", volume: 1.4, power: 125, fuel: "бензин", drive: "передний", transmission: "DSG", yearFrom: 2020 },
            ],
          },
        ],
      },
      {
        name: "Passat",
        slug: "passat",
        bodyType: "седан",
        yearFrom: 2011,
        generations: [
          {
            name: "B7",
            slug: "b7",
            yearFrom: 2011,
            yearTo: 2015,
            bodyType: "седан",
            modifications: [
              { name: "1.8 TSI DSG", engine: "CDAB", volume: 1.8, power: 152, fuel: "бензин", drive: "передний", transmission: "DSG", yearFrom: 2011, yearTo: 2015 },
              { name: "2.0 TDI DSG", engine: "CFFB", volume: 2, power: 140, fuel: "дизель", drive: "передний", transmission: "DSG", yearFrom: 2011, yearTo: 2015 },
            ],
          },
          {
            name: "B8",
            slug: "b8",
            yearFrom: 2015,
            bodyType: "седан",
            modifications: [
              { name: "1.4 TSI DSG", engine: "CZDA", volume: 1.4, power: 150, fuel: "бензин", drive: "передний", transmission: "DSG", yearFrom: 2015 },
              { name: "2.0 TSI DSG 4Motion", engine: "CZPB", volume: 2, power: 180, fuel: "бензин", drive: "полный", transmission: "DSG", yearFrom: 2015 },
              { name: "2.0 TDI DSG", engine: "DFGA", volume: 2, power: 150, fuel: "дизель", drive: "передний", transmission: "DSG", yearFrom: 2015 },
            ],
          },
        ],
      },
      {
        name: "Touareg",
        slug: "touareg",
        bodyType: "внедорожник",
        yearFrom: 2010,
        generations: [
          {
            name: "II (7P)",
            slug: "ii-7p",
            yearFrom: 2010,
            yearTo: 2018,
            bodyType: "внедорожник",
            modifications: [
              { name: "3.0 TDI AT 4WD", engine: "CRCA", volume: 3, power: 245, fuel: "дизель", drive: "полный", transmission: "АКПП", yearFrom: 2010, yearTo: 2018 },
              { name: "3.6 V6 AT 4WD", engine: "CGRA", volume: 3.6, power: 249, fuel: "бензин", drive: "полный", transmission: "АКПП", yearFrom: 2010, yearTo: 2018 },
            ],
          },
          {
            name: "III (CR)",
            slug: "iii-cr",
            yearFrom: 2018,
            bodyType: "внедорожник",
            modifications: [
              { name: "3.0 TDI AT 4WD", engine: "DDVB", volume: 3, power: 249, fuel: "дизель", drive: "полный", transmission: "АКПП", yearFrom: 2018 },
              { name: "3.0 TSI AT 4WD", engine: "DCBD", volume: 3, power: 340, fuel: "бензин", drive: "полный", transmission: "АКПП", yearFrom: 2018 },
            ],
          },
        ],
      },
    ],
  },

  // ───────────────────────────────────────────────────────────────────────────
  // Skoda
  // ───────────────────────────────────────────────────────────────────────────
  {
    name: "Skoda",
    slug: "skoda",
    country: "Чехия",
    popular: true,
    sortOrder: 60,
    models: [
      {
        name: "Octavia",
        slug: "octavia",
        bodyType: "лифтбек",
        yearFrom: 2013,
        generations: [
          {
            name: "A7",
            slug: "a7",
            yearFrom: 2013,
            yearTo: 2020,
            bodyType: "лифтбек",
            modifications: [
              { name: "1.4 TSI DSG", engine: "CZDA", volume: 1.4, power: 150, fuel: "бензин", drive: "передний", transmission: "DSG", yearFrom: 2013, yearTo: 2020 },
              { name: "1.6 MPI AT", engine: "CWVA", volume: 1.6, power: 110, fuel: "бензин", drive: "передний", transmission: "АКПП", yearFrom: 2013, yearTo: 2020 },
              { name: "1.8 TSI DSG 4x4", engine: "CJSA", volume: 1.8, power: 180, fuel: "бензин", drive: "полный", transmission: "DSG", yearFrom: 2013, yearTo: 2020 },
            ],
          },
          {
            name: "A8",
            slug: "a8",
            yearFrom: 2020,
            bodyType: "лифтбек",
            modifications: [
              { name: "1.4 TSI DSG", engine: "DJKA", volume: 1.4, power: 150, fuel: "бензин", drive: "передний", transmission: "DSG", yearFrom: 2020 },
              { name: "2.0 TSI DSG 4x4", engine: "DKTA", volume: 2, power: 190, fuel: "бензин", drive: "полный", transmission: "DSG", yearFrom: 2020 },
            ],
          },
        ],
      },
      {
        name: "Kodiaq",
        slug: "kodiaq",
        bodyType: "кроссовер",
        yearFrom: 2017,
        generations: [
          {
            name: "I (NS7)",
            slug: "i-ns7",
            yearFrom: 2017,
            bodyType: "кроссовер",
            modifications: [
              { name: "1.4 TSI DSG 2WD", engine: "CZDA", volume: 1.4, power: 150, fuel: "бензин", drive: "передний", transmission: "DSG", yearFrom: 2017 },
              { name: "2.0 TSI DSG 4x4", engine: "CZPB", volume: 2, power: 180, fuel: "бензин", drive: "полный", transmission: "DSG", yearFrom: 2017 },
              { name: "2.0 TDI DSG 4x4", engine: "DFGA", volume: 2, power: 150, fuel: "дизель", drive: "полный", transmission: "DSG", yearFrom: 2017 },
            ],
          },
        ],
      },
      {
        name: "Rapid",
        slug: "rapid",
        bodyType: "лифтбек",
        yearFrom: 2012,
        generations: [
          {
            name: "I (NH3)",
            slug: "i-nh3",
            yearFrom: 2012,
            yearTo: 2020,
            bodyType: "лифтбек",
            modifications: [
              { name: "1.6 MPI MT", engine: "CWVA", volume: 1.6, power: 90, fuel: "бензин", drive: "передний", transmission: "МКПП", yearFrom: 2012, yearTo: 2020 },
              { name: "1.6 MPI AT", engine: "CWVA", volume: 1.6, power: 110, fuel: "бензин", drive: "передний", transmission: "АКПП", yearFrom: 2012, yearTo: 2020 },
              { name: "1.4 TSI DSG", engine: "CZDA", volume: 1.4, power: 125, fuel: "бензин", drive: "передний", transmission: "DSG", yearFrom: 2015, yearTo: 2020 },
            ],
          },
        ],
      },
      {
        name: "Karoq",
        slug: "karoq",
        bodyType: "кроссовер",
        yearFrom: 2018,
        generations: [
          {
            name: "I (NU7)",
            slug: "i-nu7",
            yearFrom: 2018,
            bodyType: "кроссовер",
            modifications: [
              { name: "1.4 TSI DSG 2WD", engine: "CZDA", volume: 1.4, power: 150, fuel: "бензин", drive: "передний", transmission: "DSG", yearFrom: 2018 },
              { name: "2.0 TSI DSG 4x4", engine: "CZPB", volume: 2, power: 180, fuel: "бензин", drive: "полный", transmission: "DSG", yearFrom: 2018 },
            ],
          },
        ],
      },
    ],
  },

  // ───────────────────────────────────────────────────────────────────────────
  // Renault
  // ───────────────────────────────────────────────────────────────────────────
  {
    name: "Renault",
    slug: "renault",
    country: "Франция",
    popular: true,
    sortOrder: 70,
    models: [
      {
        name: "Duster",
        slug: "duster",
        bodyType: "кроссовер",
        yearFrom: 2011,
        generations: [
          {
            name: "I",
            slug: "i",
            yearFrom: 2011,
            yearTo: 2015,
            bodyType: "кроссовер",
            modifications: [
              { name: "1.6 MT 4x2", engine: "K4M", volume: 1.6, power: 102, fuel: "бензин", drive: "передний", transmission: "МКПП", yearFrom: 2011, yearTo: 2015 },
              { name: "2.0 MT 4x4", engine: "F4R", volume: 2, power: 135, fuel: "бензин", drive: "полный", transmission: "МКПП", yearFrom: 2011, yearTo: 2015 },
            ],
          },
          {
            name: "I (рестайлинг)",
            slug: "i-restyling",
            yearFrom: 2015,
            yearTo: 2021,
            bodyType: "кроссовер",
            modifications: [
              { name: "1.6 MT 4x2", engine: "H4M", volume: 1.6, power: 114, fuel: "бензин", drive: "передний", transmission: "МКПП", yearFrom: 2015, yearTo: 2021 },
              { name: "1.6 CVT 4x2", engine: "H4M", volume: 1.6, power: 114, fuel: "бензин", drive: "передний", transmission: "вариатор", yearFrom: 2015, yearTo: 2021 },
              { name: "2.0 MT 4x4", engine: "F4R", volume: 2, power: 143, fuel: "бензин", drive: "полный", transmission: "МКПП", yearFrom: 2015, yearTo: 2021 },
            ],
          },
          {
            name: "II",
            slug: "ii",
            yearFrom: 2021,
            bodyType: "кроссовер",
            modifications: [
              { name: "1.6 MT 4x2", engine: "H4M", volume: 1.6, power: 114, fuel: "бензин", drive: "передний", transmission: "МКПП", yearFrom: 2021 },
              { name: "1.3 Turbo CVT 4x2", engine: "H5Ht", volume: 1.3, power: 150, fuel: "бензин", drive: "передний", transmission: "вариатор", yearFrom: 2021 },
              { name: "1.3 Turbo CVT 4x4", engine: "H5Ht", volume: 1.3, power: 150, fuel: "бензин", drive: "полный", transmission: "вариатор", yearFrom: 2021 },
            ],
          },
        ],
      },
      {
        name: "Logan",
        slug: "logan",
        bodyType: "седан",
        yearFrom: 2010,
        generations: [
          {
            name: "I",
            slug: "i",
            yearFrom: 2010,
            yearTo: 2014,
            bodyType: "седан",
            modifications: [
              { name: "1.4 MT", engine: "K7M", volume: 1.4, power: 75, fuel: "бензин", drive: "передний", transmission: "МКПП", yearFrom: 2010, yearTo: 2014 },
              { name: "1.6 MT", engine: "K7M", volume: 1.6, power: 84, fuel: "бензин", drive: "передний", transmission: "МКПП", yearFrom: 2010, yearTo: 2014 },
            ],
          },
          {
            name: "II",
            slug: "ii",
            yearFrom: 2014,
            yearTo: 2022,
            bodyType: "седан",
            modifications: [
              { name: "1.6 MT", engine: "K7M", volume: 1.6, power: 82, fuel: "бензин", drive: "передний", transmission: "МКПП", yearFrom: 2014, yearTo: 2022 },
              { name: "1.6 CVT", engine: "H4M", volume: 1.6, power: 113, fuel: "бензин", drive: "передний", transmission: "вариатор", yearFrom: 2014, yearTo: 2022 },
            ],
          },
        ],
      },
      {
        name: "Kaptur",
        slug: "kaptur",
        bodyType: "кроссовер",
        yearFrom: 2016,
        generations: [
          {
            name: "I",
            slug: "i",
            yearFrom: 2016,
            bodyType: "кроссовер",
            modifications: [
              { name: "1.6 MT 4x2", engine: "H4M", volume: 1.6, power: 114, fuel: "бензин", drive: "передний", transmission: "МКПП", yearFrom: 2016 },
              { name: "1.6 CVT 4x2", engine: "H4M", volume: 1.6, power: 114, fuel: "бензин", drive: "передний", transmission: "вариатор", yearFrom: 2016 },
              { name: "2.0 AT 4x4", engine: "F4R", volume: 2, power: 143, fuel: "бензин", drive: "полный", transmission: "АКПП", yearFrom: 2016 },
            ],
          },
        ],
      },
      {
        name: "Arkana",
        slug: "arkana",
        bodyType: "кроссовер",
        yearFrom: 2019,
        generations: [
          {
            name: "I",
            slug: "i",
            yearFrom: 2019,
            bodyType: "кроссовер",
            modifications: [
              { name: "1.6 CVT 4x2", engine: "H4M", volume: 1.6, power: 114, fuel: "бензин", drive: "передний", transmission: "вариатор", yearFrom: 2019 },
              { name: "1.3 Turbo CVT 4x4", engine: "H5Ht", volume: 1.3, power: 150, fuel: "бензин", drive: "полный", transmission: "вариатор", yearFrom: 2019 },
            ],
          },
        ],
      },
    ],
  },

  // ───────────────────────────────────────────────────────────────────────────
  // Nissan
  // ───────────────────────────────────────────────────────────────────────────
  {
    name: "Nissan",
    slug: "nissan",
    country: "Япония",
    popular: true,
    sortOrder: 80,
    models: [
      {
        name: "Qashqai",
        slug: "qashqai",
        bodyType: "кроссовер",
        yearFrom: 2010,
        generations: [
          {
            name: "J10",
            slug: "j10",
            yearFrom: 2010,
            yearTo: 2013,
            bodyType: "кроссовер",
            modifications: [
              { name: "1.6 MT 2WD", engine: "HR16DE", volume: 1.6, power: 114, fuel: "бензин", drive: "передний", transmission: "МКПП", yearFrom: 2010, yearTo: 2013 },
              { name: "2.0 CVT 4WD", engine: "MR20DE", volume: 2, power: 141, fuel: "бензин", drive: "полный", transmission: "вариатор", yearFrom: 2010, yearTo: 2013 },
            ],
          },
          {
            name: "J11",
            slug: "j11",
            yearFrom: 2013,
            yearTo: 2021,
            bodyType: "кроссовер",
            modifications: [
              { name: "1.2 Turbo CVT 2WD", engine: "HRA2DDT", volume: 1.2, power: 115, fuel: "бензин", drive: "передний", transmission: "вариатор", yearFrom: 2013, yearTo: 2021 },
              { name: "2.0 CVT 2WD", engine: "MR20DD", volume: 2, power: 144, fuel: "бензин", drive: "передний", transmission: "вариатор", yearFrom: 2013, yearTo: 2021 },
              { name: "2.0 CVT 4WD", engine: "MR20DD", volume: 2, power: 144, fuel: "бензин", drive: "полный", transmission: "вариатор", yearFrom: 2013, yearTo: 2021 },
            ],
          },
          {
            name: "J12",
            slug: "j12",
            yearFrom: 2021,
            bodyType: "кроссовер",
            modifications: [
              { name: "1.3 Turbo CVT 2WD", engine: "HR13DDT", volume: 1.3, power: 158, fuel: "бензин", drive: "передний", transmission: "вариатор", yearFrom: 2021 },
              { name: "1.3 Turbo CVT 4WD", engine: "HR13DDT", volume: 1.3, power: 158, fuel: "бензин", drive: "полный", transmission: "вариатор", yearFrom: 2021 },
            ],
          },
        ],
      },
      {
        name: "X-Trail",
        slug: "x-trail",
        bodyType: "кроссовер",
        yearFrom: 2011,
        generations: [
          {
            name: "T31",
            slug: "t31",
            yearFrom: 2011,
            yearTo: 2014,
            bodyType: "кроссовер",
            modifications: [
              { name: "2.0 CVT 4WD", engine: "MR20DE", volume: 2, power: 141, fuel: "бензин", drive: "полный", transmission: "вариатор", yearFrom: 2011, yearTo: 2014 },
              { name: "2.5 CVT 4WD", engine: "QR25DE", volume: 2.5, power: 169, fuel: "бензин", drive: "полный", transmission: "вариатор", yearFrom: 2011, yearTo: 2014 },
            ],
          },
          {
            name: "T32",
            slug: "t32",
            yearFrom: 2014,
            yearTo: 2021,
            bodyType: "кроссовер",
            modifications: [
              { name: "2.0 CVT 2WD", engine: "MR20DD", volume: 2, power: 144, fuel: "бензин", drive: "передний", transmission: "вариатор", yearFrom: 2014, yearTo: 2021 },
              { name: "2.0 CVT 4WD", engine: "MR20DD", volume: 2, power: 144, fuel: "бензин", drive: "полный", transmission: "вариатор", yearFrom: 2014, yearTo: 2021 },
              { name: "2.5 CVT 4WD", engine: "QR25DE", volume: 2.5, power: 171, fuel: "бензин", drive: "полный", transmission: "вариатор", yearFrom: 2014, yearTo: 2021 },
            ],
          },
          {
            name: "T33",
            slug: "t33",
            yearFrom: 2021,
            bodyType: "кроссовер",
            modifications: [
              { name: "1.5 Turbo CVT 4WD", engine: "KR15DDT", volume: 1.5, power: 163, fuel: "бензин", drive: "полный", transmission: "вариатор", yearFrom: 2021 },
              { name: "2.5 CVT 4WD", engine: "PR25DD", volume: 2.5, power: 184, fuel: "бензин", drive: "полный", transmission: "вариатор", yearFrom: 2021 },
            ],
          },
        ],
      },
      {
        name: "Terrano",
        slug: "terrano",
        bodyType: "кроссовер",
        yearFrom: 2014,
        generations: [
          {
            name: "I",
            slug: "i",
            yearFrom: 2014,
            yearTo: 2022,
            bodyType: "кроссовер",
            modifications: [
              { name: "1.6 MT 4x2", engine: "H4M", volume: 1.6, power: 114, fuel: "бензин", drive: "передний", transmission: "МКПП", yearFrom: 2014, yearTo: 2022 },
              { name: "2.0 AT 4x4", engine: "F4R", volume: 2, power: 143, fuel: "бензин", drive: "полный", transmission: "АКПП", yearFrom: 2014, yearTo: 2022 },
            ],
          },
        ],
      },
      {
        name: "Murano",
        slug: "murano",
        bodyType: "кроссовер",
        yearFrom: 2015,
        generations: [
          {
            name: "Z52",
            slug: "z52",
            yearFrom: 2015,
            bodyType: "кроссовер",
            modifications: [
              { name: "2.5 CVT 4WD", engine: "QR25DE", volume: 2.5, power: 173, fuel: "бензин", drive: "полный", transmission: "вариатор", yearFrom: 2015 },
              { name: "3.5 V6 CVT 4WD", engine: "VQ35DE", volume: 3.5, power: 249, fuel: "бензин", drive: "полный", transmission: "вариатор", yearFrom: 2015 },
            ],
          },
        ],
      },
    ],
  },

  // ───────────────────────────────────────────────────────────────────────────
  // Mazda
  // ───────────────────────────────────────────────────────────────────────────
  {
    name: "Mazda",
    slug: "mazda",
    country: "Япония",
    popular: true,
    sortOrder: 90,
    models: [
      {
        name: "CX-5",
        slug: "cx-5",
        bodyType: "кроссовер",
        yearFrom: 2012,
        generations: [
          {
            name: "KE",
            slug: "ke",
            yearFrom: 2012,
            yearTo: 2017,
            bodyType: "кроссовер",
            modifications: [
              { name: "2.0 MT 2WD", engine: "PE-VPS", volume: 2, power: 150, fuel: "бензин", drive: "передний", transmission: "МКПП", yearFrom: 2012, yearTo: 2017 },
              { name: "2.0 AT 4WD", engine: "PE-VPS", volume: 2, power: 150, fuel: "бензин", drive: "полный", transmission: "АКПП", yearFrom: 2012, yearTo: 2017 },
              { name: "2.2 D AT 4WD", engine: "SH-VPTS", volume: 2.2, power: 175, fuel: "дизель", drive: "полный", transmission: "АКПП", yearFrom: 2012, yearTo: 2017 },
            ],
          },
          {
            name: "KF",
            slug: "kf",
            yearFrom: 2017,
            bodyType: "кроссовер",
            modifications: [
              { name: "2.0 AT 2WD", engine: "PE-VPS", volume: 2, power: 150, fuel: "бензин", drive: "передний", transmission: "АКПП", yearFrom: 2017 },
              { name: "2.5 AT 4WD", engine: "PY-VPS", volume: 2.5, power: 194, fuel: "бензин", drive: "полный", transmission: "АКПП", yearFrom: 2017 },
              { name: "2.2 D AT 4WD", engine: "SH-VPTS", volume: 2.2, power: 188, fuel: "дизель", drive: "полный", transmission: "АКПП", yearFrom: 2017 },
            ],
          },
        ],
      },
      {
        name: "Mazda6",
        slug: "mazda6",
        bodyType: "седан",
        yearFrom: 2012,
        generations: [
          {
            name: "GJ",
            slug: "gj",
            yearFrom: 2012,
            yearTo: 2018,
            bodyType: "седан",
            modifications: [
              { name: "2.0 MT", engine: "PE-VPS", volume: 2, power: 150, fuel: "бензин", drive: "передний", transmission: "МКПП", yearFrom: 2012, yearTo: 2018 },
              { name: "2.5 AT", engine: "PY-VPS", volume: 2.5, power: 192, fuel: "бензин", drive: "передний", transmission: "АКПП", yearFrom: 2012, yearTo: 2018 },
            ],
          },
          {
            name: "GL",
            slug: "gl",
            yearFrom: 2018,
            bodyType: "седан",
            modifications: [
              { name: "2.0 AT", engine: "PE-VPS", volume: 2, power: 150, fuel: "бензин", drive: "передний", transmission: "АКПП", yearFrom: 2018 },
              { name: "2.5 AT", engine: "PY-VPTS", volume: 2.5, power: 194, fuel: "бензин", drive: "передний", transmission: "АКПП", yearFrom: 2018 },
            ],
          },
        ],
      },
      {
        name: "CX-9",
        slug: "cx-9",
        bodyType: "кроссовер",
        yearFrom: 2016,
        generations: [
          {
            name: "TC",
            slug: "tc",
            yearFrom: 2016,
            bodyType: "кроссовер",
            modifications: [
              { name: "2.5 Turbo AT 4WD", engine: "PY-VPTS", volume: 2.5, power: 231, fuel: "бензин", drive: "полный", transmission: "АКПП", yearFrom: 2016 },
            ],
          },
        ],
      },
    ],
  },

  // ───────────────────────────────────────────────────────────────────────────
  // Mitsubishi
  // ───────────────────────────────────────────────────────────────────────────
  {
    name: "Mitsubishi",
    slug: "mitsubishi",
    country: "Япония",
    popular: true,
    sortOrder: 100,
    models: [
      {
        name: "Outlander",
        slug: "outlander",
        bodyType: "кроссовер",
        yearFrom: 2012,
        generations: [
          {
            name: "III (GF)",
            slug: "iii-gf",
            yearFrom: 2012,
            yearTo: 2021,
            bodyType: "кроссовер",
            modifications: [
              { name: "2.0 CVT 2WD", engine: "4J11", volume: 2, power: 146, fuel: "бензин", drive: "передний", transmission: "вариатор", yearFrom: 2012, yearTo: 2021 },
              { name: "2.4 CVT 4WD", engine: "4J12", volume: 2.4, power: 167, fuel: "бензин", drive: "полный", transmission: "вариатор", yearFrom: 2012, yearTo: 2021 },
              { name: "2.0 D CVT 4WD", engine: "4N14", volume: 2.2, power: 150, fuel: "дизель", drive: "полный", transmission: "вариатор", yearFrom: 2013, yearTo: 2021 },
            ],
          },
          {
            name: "IV (GN)",
            slug: "iv-gn",
            yearFrom: 2021,
            bodyType: "кроссовер",
            modifications: [
              { name: "2.5 CVT 4WD", engine: "4J12", volume: 2.5, power: 184, fuel: "бензин", drive: "полный", transmission: "вариатор", yearFrom: 2021 },
              { name: "2.4 Hybrid CVT 4WD", engine: "4B12", volume: 2.4, power: 306, fuel: "гибрид", drive: "полный", transmission: "вариатор", yearFrom: 2022 },
            ],
          },
        ],
      },
      {
        name: "ASX",
        slug: "asx",
        bodyType: "кроссовер",
        yearFrom: 2010,
        generations: [
          {
            name: "I (GA)",
            slug: "i-ga",
            yearFrom: 2010,
            yearTo: 2023,
            bodyType: "кроссовер",
            modifications: [
              { name: "1.6 MT 2WD", engine: "4A92", volume: 1.6, power: 117, fuel: "бензин", drive: "передний", transmission: "МКПП", yearFrom: 2010, yearTo: 2023 },
              { name: "1.8 CVT 2WD", engine: "4B10", volume: 1.8, power: 140, fuel: "бензин", drive: "передний", transmission: "вариатор", yearFrom: 2010, yearTo: 2023 },
              { name: "2.0 CVT 4WD", engine: "4B11", volume: 2, power: 150, fuel: "бензин", drive: "полный", transmission: "вариатор", yearFrom: 2010, yearTo: 2023 },
            ],
          },
        ],
      },
      {
        name: "Pajero Sport",
        slug: "pajero-sport",
        bodyType: "внедорожник",
        yearFrom: 2016,
        generations: [
          {
            name: "III (QE)",
            slug: "iii-qe",
            yearFrom: 2016,
            bodyType: "внедорожник",
            modifications: [
              { name: "2.4 D AT 4WD", engine: "4N15", volume: 2.4, power: 181, fuel: "дизель", drive: "полный", transmission: "АКПП", yearFrom: 2016 },
              { name: "3.0 V6 AT 4WD", engine: "6B31", volume: 3, power: 209, fuel: "бензин", drive: "полный", transmission: "АКПП", yearFrom: 2016 },
            ],
          },
        ],
      },
      {
        name: "L200",
        slug: "l200",
        bodyType: "пикап",
        yearFrom: 2015,
        generations: [
          {
            name: "V (KJ)",
            slug: "v-kj",
            yearFrom: 2015,
            bodyType: "пикап",
            modifications: [
              { name: "2.4 D MT 4WD", engine: "4N15", volume: 2.4, power: 154, fuel: "дизель", drive: "полный", transmission: "МКПП", yearFrom: 2015 },
              { name: "2.4 D AT 4WD", engine: "4N15", volume: 2.4, power: 181, fuel: "дизель", drive: "полный", transmission: "АКПП", yearFrom: 2015 },
            ],
          },
        ],
      },
    ],
  },

  // ───────────────────────────────────────────────────────────────────────────
  // Ford
  // ───────────────────────────────────────────────────────────────────────────
  {
    name: "Ford",
    slug: "ford",
    country: "США",
    popular: true,
    sortOrder: 110,
    models: [
      {
        name: "Focus",
        slug: "focus",
        bodyType: "хэтчбек",
        yearFrom: 2011,
        generations: [
          {
            name: "III",
            slug: "iii",
            yearFrom: 2011,
            yearTo: 2018,
            bodyType: "хэтчбек",
            modifications: [
              { name: "1.6 MT", engine: "IQDB", volume: 1.6, power: 105, fuel: "бензин", drive: "передний", transmission: "МКПП", yearFrom: 2011, yearTo: 2018 },
              { name: "1.6 AT", engine: "IQDB", volume: 1.6, power: 125, fuel: "бензин", drive: "передний", transmission: "АКПП", yearFrom: 2011, yearTo: 2018 },
              { name: "2.0 AT", engine: "GDI", volume: 2, power: 150, fuel: "бензин", drive: "передний", transmission: "АКПП", yearFrom: 2011, yearTo: 2018 },
            ],
          },
          {
            name: "IV",
            slug: "iv",
            yearFrom: 2018,
            bodyType: "хэтчбек",
            modifications: [
              { name: "1.5 AT", engine: "Dragon", volume: 1.5, power: 123, fuel: "бензин", drive: "передний", transmission: "АКПП", yearFrom: 2018 },
              { name: "1.5 MT", engine: "Dragon", volume: 1.5, power: 105, fuel: "бензин", drive: "передний", transmission: "МКПП", yearFrom: 2018 },
            ],
          },
        ],
      },
      {
        name: "Kuga",
        slug: "kuga",
        bodyType: "кроссовер",
        yearFrom: 2013,
        generations: [
          {
            name: "II",
            slug: "ii",
            yearFrom: 2013,
            yearTo: 2019,
            bodyType: "кроссовер",
            modifications: [
              { name: "1.6 AT 2WD", engine: "JQDA", volume: 1.6, power: 150, fuel: "бензин", drive: "передний", transmission: "АКПП", yearFrom: 2013, yearTo: 2019 },
              { name: "2.0 D AT 4WD", engine: "T8MA", volume: 2, power: 180, fuel: "дизель", drive: "полный", transmission: "АКПП", yearFrom: 2013, yearTo: 2019 },
            ],
          },
          {
            name: "III",
            slug: "iii",
            yearFrom: 2019,
            bodyType: "кроссовер",
            modifications: [
              { name: "1.5 AT 2WD", engine: "Dragon", volume: 1.5, power: 150, fuel: "бензин", drive: "передний", transmission: "АКПП", yearFrom: 2019 },
              { name: "2.0 D AT 4WD", engine: "T8MA", volume: 2, power: 190, fuel: "дизель", drive: "полный", transmission: "АКПП", yearFrom: 2019 },
              { name: "2.5 Hybrid CVT 2WD", engine: "Duratorq", volume: 2.5, power: 225, fuel: "гибрид", drive: "передний", transmission: "вариатор", yearFrom: 2020 },
            ],
          },
        ],
      },
      {
        name: "Mondeo",
        slug: "mondeo",
        bodyType: "седан",
        yearFrom: 2014,
        generations: [
          {
            name: "V",
            slug: "v",
            yearFrom: 2014,
            yearTo: 2022,
            bodyType: "седан",
            modifications: [
              { name: "2.0 AT", engine: "R9CB", volume: 2, power: 199, fuel: "бензин", drive: "передний", transmission: "АКПП", yearFrom: 2014, yearTo: 2022 },
              { name: "2.0 D AT", engine: "T8CA", volume: 2, power: 150, fuel: "дизель", drive: "передний", transmission: "АКПП", yearFrom: 2014, yearTo: 2022 },
            ],
          },
        ],
      },
      {
        name: "Explorer",
        slug: "explorer",
        bodyType: "внедорожник",
        yearFrom: 2011,
        generations: [
          {
            name: "V",
            slug: "v",
            yearFrom: 2011,
            yearTo: 2019,
            bodyType: "внедорожник",
            modifications: [
              { name: "3.5 V6 AT 4WD", engine: "Cyclone", volume: 3.5, power: 249, fuel: "бензин", drive: "полный", transmission: "АКПП", yearFrom: 2011, yearTo: 2019 },
            ],
          },
          {
            name: "VI",
            slug: "vi",
            yearFrom: 2019,
            bodyType: "внедорожник",
            modifications: [
              { name: "2.3 Turbo AT 4WD", engine: "EcoBoost", volume: 2.3, power: 279, fuel: "бензин", drive: "полный", transmission: "АКПП", yearFrom: 2019 },
              { name: "3.0 V6 AT 4WD", engine: "EcoBoost", volume: 3, power: 370, fuel: "бензин", drive: "полный", transmission: "АКПП", yearFrom: 2019 },
            ],
          },
        ],
      },
    ],
  },

  // ───────────────────────────────────────────────────────────────────────────
  // BMW
  // ───────────────────────────────────────────────────────────────────────────
  {
    name: "BMW",
    slug: "bmw",
    country: "Германия",
    popular: false,
    sortOrder: 120,
    models: [
      {
        name: "3 серия",
        slug: "3-series",
        bodyType: "седан",
        yearFrom: 2011,
        generations: [
          {
            name: "F30",
            slug: "f30",
            yearFrom: 2011,
            yearTo: 2019,
            bodyType: "седан",
            modifications: [
              { name: "320i AT", engine: "N20B20", volume: 2, power: 184, fuel: "бензин", drive: "задний", transmission: "АКПП", yearFrom: 2011, yearTo: 2019 },
              { name: "320d AT", engine: "N47D20", volume: 2, power: 184, fuel: "дизель", drive: "задний", transmission: "АКПП", yearFrom: 2011, yearTo: 2019 },
              { name: "328i xDrive AT", engine: "N20B20", volume: 2, power: 245, fuel: "бензин", drive: "полный", transmission: "АКПП", yearFrom: 2011, yearTo: 2019 },
            ],
          },
          {
            name: "G20",
            slug: "g20",
            yearFrom: 2019,
            bodyType: "седан",
            modifications: [
              { name: "320i AT", engine: "B48B20", volume: 2, power: 184, fuel: "бензин", drive: "задний", transmission: "АКПП", yearFrom: 2019 },
              { name: "330i xDrive AT", engine: "B48B20", volume: 2, power: 249, fuel: "бензин", drive: "полный", transmission: "АКПП", yearFrom: 2019 },
            ],
          },
        ],
      },
      {
        name: "X3",
        slug: "x3",
        bodyType: "кроссовер",
        yearFrom: 2011,
        generations: [
          {
            name: "F25",
            slug: "f25",
            yearFrom: 2011,
            yearTo: 2017,
            bodyType: "кроссовер",
            modifications: [
              { name: "xDrive20i AT", engine: "N20B20", volume: 2, power: 184, fuel: "бензин", drive: "полный", transmission: "АКПП", yearFrom: 2011, yearTo: 2017 },
              { name: "xDrive20d AT", engine: "N47D20", volume: 2, power: 190, fuel: "дизель", drive: "полный", transmission: "АКПП", yearFrom: 2011, yearTo: 2017 },
            ],
          },
          {
            name: "G01",
            slug: "g01",
            yearFrom: 2017,
            bodyType: "кроссовер",
            modifications: [
              { name: "xDrive20i AT", engine: "B48B20", volume: 2, power: 184, fuel: "бензин", drive: "полный", transmission: "АКПП", yearFrom: 2017 },
              { name: "xDrive30i AT", engine: "B48B20", volume: 2, power: 249, fuel: "бензин", drive: "полный", transmission: "АКПП", yearFrom: 2017 },
              { name: "xDrive30d AT", engine: "B57D30", volume: 3, power: 265, fuel: "дизель", drive: "полный", transmission: "АКПП", yearFrom: 2017 },
            ],
          },
        ],
      },
      {
        name: "X5",
        slug: "x5",
        bodyType: "внедорожник",
        yearFrom: 2013,
        generations: [
          {
            name: "F15",
            slug: "f15",
            yearFrom: 2013,
            yearTo: 2018,
            bodyType: "внедорожник",
            modifications: [
              { name: "xDrive35i AT", engine: "N55B30", volume: 3, power: 306, fuel: "бензин", drive: "полный", transmission: "АКПП", yearFrom: 2013, yearTo: 2018 },
              { name: "xDrive30d AT", engine: "N57D30", volume: 3, power: 258, fuel: "дизель", drive: "полный", transmission: "АКПП", yearFrom: 2013, yearTo: 2018 },
            ],
          },
          {
            name: "G05",
            slug: "g05",
            yearFrom: 2018,
            bodyType: "внедорожник",
            modifications: [
              { name: "xDrive40i AT", engine: "B58B30", volume: 3, power: 340, fuel: "бензин", drive: "полный", transmission: "АКПП", yearFrom: 2018 },
              { name: "xDrive30d AT", engine: "B57D30", volume: 3, power: 249, fuel: "дизель", drive: "полный", transmission: "АКПП", yearFrom: 2018 },
            ],
          },
        ],
      },
    ],
  },

  // ───────────────────────────────────────────────────────────────────────────
  // Mercedes-Benz
  // ───────────────────────────────────────────────────────────────────────────
  {
    name: "Mercedes-Benz",
    slug: "mercedes-benz",
    country: "Германия",
    popular: false,
    sortOrder: 130,
    models: [
      {
        name: "E-класс",
        slug: "e-class",
        bodyType: "седан",
        yearFrom: 2013,
        generations: [
          {
            name: "W212",
            slug: "w212",
            yearFrom: 2013,
            yearTo: 2016,
            bodyType: "седан",
            modifications: [
              { name: "E200 AT", engine: "M274", volume: 2, power: 184, fuel: "бензин", drive: "задний", transmission: "АКПП", yearFrom: 2013, yearTo: 2016 },
              { name: "E250 D AT", engine: "OM651", volume: 2.1, power: 204, fuel: "дизель", drive: "задний", transmission: "АКПП", yearFrom: 2013, yearTo: 2016 },
            ],
          },
          {
            name: "W213",
            slug: "w213",
            yearFrom: 2016,
            bodyType: "седан",
            modifications: [
              { name: "E200 AT", engine: "M274", volume: 2, power: 184, fuel: "бензин", drive: "задний", transmission: "АКПП", yearFrom: 2016 },
              { name: "E220 D AT 4MATIC", engine: "OM654", volume: 2, power: 194, fuel: "дизель", drive: "полный", transmission: "АКПП", yearFrom: 2016 },
              { name: "E300 AT 4MATIC", engine: "M264", volume: 2, power: 249, fuel: "бензин", drive: "полный", transmission: "АКПП", yearFrom: 2016 },
            ],
          },
        ],
      },
      {
        name: "GLC",
        slug: "glc",
        bodyType: "кроссовер",
        yearFrom: 2015,
        generations: [
          {
            name: "X253",
            slug: "x253",
            yearFrom: 2015,
            yearTo: 2022,
            bodyType: "кроссовер",
            modifications: [
              { name: "GLC 250 4MATIC AT", engine: "M274", volume: 2, power: 211, fuel: "бензин", drive: "полный", transmission: "АКПП", yearFrom: 2015, yearTo: 2022 },
              { name: "GLC 220 d 4MATIC AT", engine: "OM651", volume: 2.1, power: 170, fuel: "дизель", drive: "полный", transmission: "АКПП", yearFrom: 2015, yearTo: 2022 },
            ],
          },
          {
            name: "X254",
            slug: "x254",
            yearFrom: 2022,
            bodyType: "кроссовер",
            modifications: [
              { name: "GLC 300 4MATIC AT", engine: "M254", volume: 2, power: 258, fuel: "бензин", drive: "полный", transmission: "АКПП", yearFrom: 2022 },
              { name: "GLC 220 d 4MATIC AT", engine: "OM654", volume: 2, power: 197, fuel: "дизель", drive: "полный", transmission: "АКПП", yearFrom: 2022 },
            ],
          },
        ],
      },
      {
        name: "GLE",
        slug: "gle",
        bodyType: "внедорожник",
        yearFrom: 2015,
        generations: [
          {
            name: "W166",
            slug: "w166",
            yearFrom: 2015,
            yearTo: 2019,
            bodyType: "внедорожник",
            modifications: [
              { name: "GLE 400 4MATIC AT", engine: "M276", volume: 3, power: 333, fuel: "бензин", drive: "полный", transmission: "АКПП", yearFrom: 2015, yearTo: 2019 },
              { name: "GLE 350 d 4MATIC AT", engine: "OM642", volume: 3, power: 258, fuel: "дизель", drive: "полный", transmission: "АКПП", yearFrom: 2015, yearTo: 2019 },
            ],
          },
          {
            name: "W167",
            slug: "w167",
            yearFrom: 2019,
            bodyType: "внедорожник",
            modifications: [
              { name: "GLE 450 4MATIC AT", engine: "M256", volume: 3, power: 367, fuel: "бензин", drive: "полный", transmission: "АКПП", yearFrom: 2019 },
              { name: "GLE 300 d 4MATIC AT", engine: "OM654", volume: 2, power: 245, fuel: "дизель", drive: "полный", transmission: "АКПП", yearFrom: 2019 },
            ],
          },
        ],
      },
    ],
  },

  // ───────────────────────────────────────────────────────────────────────────
  // Audi
  // ───────────────────────────────────────────────────────────────────────────
  {
    name: "Audi",
    slug: "audi",
    country: "Германия",
    popular: false,
    sortOrder: 140,
    models: [
      {
        name: "A4",
        slug: "a4",
        bodyType: "седан",
        yearFrom: 2012,
        generations: [
          {
            name: "B8",
            slug: "b8",
            yearFrom: 2012,
            yearTo: 2015,
            bodyType: "седан",
            modifications: [
              { name: "1.8 TFSI CVT", engine: "CDAB", volume: 1.8, power: 170, fuel: "бензин", drive: "передний", transmission: "вариатор", yearFrom: 2012, yearTo: 2015 },
              { name: "2.0 TFSI quattro AT", engine: "CDNC", volume: 2, power: 225, fuel: "бензин", drive: "полный", transmission: "АКПП", yearFrom: 2012, yearTo: 2015 },
            ],
          },
          {
            name: "B9",
            slug: "b9",
            yearFrom: 2015,
            bodyType: "седан",
            modifications: [
              { name: "1.4 TFSI S tronic", engine: "CVNA", volume: 1.4, power: 150, fuel: "бензин", drive: "передний", transmission: "робот", yearFrom: 2015 },
              { name: "2.0 TFSI quattro S tronic", engine: "CYRB", volume: 2, power: 249, fuel: "бензин", drive: "полный", transmission: "робот", yearFrom: 2015 },
            ],
          },
        ],
      },
      {
        name: "Q5",
        slug: "q5",
        bodyType: "кроссовер",
        yearFrom: 2012,
        generations: [
          {
            name: "8R",
            slug: "8r",
            yearFrom: 2012,
            yearTo: 2017,
            bodyType: "кроссовер",
            modifications: [
              { name: "2.0 TFSI quattro AT", engine: "CDNC", volume: 2, power: 225, fuel: "бензин", drive: "полный", transmission: "АКПП", yearFrom: 2012, yearTo: 2017 },
              { name: "2.0 TDI quattro S tronic", engine: "CGLB", volume: 2, power: 177, fuel: "дизель", drive: "полный", transmission: "робот", yearFrom: 2012, yearTo: 2017 },
            ],
          },
          {
            name: "FY",
            slug: "fy",
            yearFrom: 2017,
            bodyType: "кроссовер",
            modifications: [
              { name: "2.0 TFSI quattro S tronic", engine: "CYRB", volume: 2, power: 249, fuel: "бензин", drive: "полный", transmission: "робот", yearFrom: 2017 },
              { name: "2.0 TDI quattro S tronic", engine: "DETA", volume: 2, power: 190, fuel: "дизель", drive: "полный", transmission: "робот", yearFrom: 2017 },
            ],
          },
        ],
      },
      {
        name: "Q7",
        slug: "q7",
        bodyType: "внедорожник",
        yearFrom: 2015,
        generations: [
          {
            name: "4M",
            slug: "4m",
            yearFrom: 2015,
            bodyType: "внедорожник",
            modifications: [
              { name: "3.0 TFSI quattro AT", engine: "CREC", volume: 3, power: 333, fuel: "бензин", drive: "полный", transmission: "АКПП", yearFrom: 2015 },
              { name: "3.0 TDI quattro AT", engine: "CRTC", volume: 3, power: 249, fuel: "дизель", drive: "полный", transmission: "АКПП", yearFrom: 2015 },
            ],
          },
        ],
      },
    ],
  },

  // ───────────────────────────────────────────────────────────────────────────
  // Haval
  // ───────────────────────────────────────────────────────────────────────────
  {
    name: "Haval",
    slug: "haval",
    country: "Китай",
    popular: true,
    sortOrder: 150,
    models: [
      {
        name: "Jolion",
        slug: "jolion",
        bodyType: "кроссовер",
        yearFrom: 2021,
        generations: [
          {
            name: "I",
            slug: "i",
            yearFrom: 2021,
            bodyType: "кроссовер",
            modifications: [
              { name: "1.5 Turbo MT 2WD", engine: "GW4G15F", volume: 1.5, power: 143, fuel: "бензин", drive: "передний", transmission: "МКПП", yearFrom: 2021 },
              { name: "1.5 Turbo DCT 2WD", engine: "GW4G15F", volume: 1.5, power: 143, fuel: "бензин", drive: "передний", transmission: "робот", yearFrom: 2021 },
              { name: "1.5 Turbo DCT 4WD", engine: "GW4G15F", volume: 1.5, power: 143, fuel: "бензин", drive: "полный", transmission: "робот", yearFrom: 2021 },
            ],
          },
        ],
      },
      {
        name: "F7",
        slug: "f7",
        bodyType: "кроссовер",
        yearFrom: 2019,
        generations: [
          {
            name: "I",
            slug: "i",
            yearFrom: 2019,
            yearTo: 2024,
            bodyType: "кроссовер",
            modifications: [
              { name: "1.5 Turbo DCT 2WD", engine: "GW4B15", volume: 1.5, power: 150, fuel: "бензин", drive: "передний", transmission: "робот", yearFrom: 2019, yearTo: 2024 },
              { name: "2.0 Turbo DCT 4WD", engine: "GW4C20", volume: 2, power: 190, fuel: "бензин", drive: "полный", transmission: "робот", yearFrom: 2019, yearTo: 2024 },
            ],
          },
        ],
      },
      {
        name: "Dargo",
        slug: "dargo",
        bodyType: "кроссовер",
        yearFrom: 2021,
        generations: [
          {
            name: "I",
            slug: "i",
            yearFrom: 2021,
            bodyType: "кроссовер",
            modifications: [
              { name: "1.5 Turbo DCT 2WD", engine: "GW4B15", volume: 1.5, power: 143, fuel: "бензин", drive: "передний", transmission: "робот", yearFrom: 2021 },
              { name: "2.0 Turbo DCT 4WD", engine: "GW4C20", volume: 2, power: 190, fuel: "бензин", drive: "полный", transmission: "робот", yearFrom: 2021 },
            ],
          },
        ],
      },
      {
        name: "H9",
        slug: "h9",
        bodyType: "внедорожник",
        yearFrom: 2015,
        generations: [
          {
            name: "I",
            slug: "i",
            yearFrom: 2015,
            bodyType: "внедорожник",
            modifications: [
              { name: "2.0 Turbo AT 4WD", engine: "GW4C20", volume: 2, power: 218, fuel: "бензин", drive: "полный", transmission: "АКПП", yearFrom: 2015 },
            ],
          },
        ],
      },
    ],
  },

  // ───────────────────────────────────────────────────────────────────────────
  // Chery
  // ───────────────────────────────────────────────────────────────────────────
  {
    name: "Chery",
    slug: "chery",
    country: "Китай",
    popular: true,
    sortOrder: 160,
    models: [
      {
        name: "Tiggo 4",
        slug: "tiggo-4",
        bodyType: "кроссовер",
        yearFrom: 2019,
        generations: [
          {
            name: "I",
            slug: "i",
            yearFrom: 2019,
            yearTo: 2021,
            bodyType: "кроссовер",
            modifications: [
              { name: "1.5 MT 2WD", engine: "SQRE4G15B", volume: 1.5, power: 113, fuel: "бензин", drive: "передний", transmission: "МКПП", yearFrom: 2019, yearTo: 2021 },
              { name: "1.5 CVT 2WD", engine: "SQRE4G15B", volume: 1.5, power: 113, fuel: "бензин", drive: "передний", transmission: "вариатор", yearFrom: 2019, yearTo: 2021 },
            ],
          },
          {
            name: "I (рестайлинг)",
            slug: "i-restyling",
            yearFrom: 2021,
            bodyType: "кроссовер",
            modifications: [
              { name: "1.5 CVT 2WD", engine: "SQRE4G15C", volume: 1.5, power: 147, fuel: "бензин", drive: "передний", transmission: "вариатор", yearFrom: 2021 },
              { name: "1.5 Turbo CVT 2WD", engine: "SQRE4T15C", volume: 1.5, power: 147, fuel: "бензин", drive: "передний", transmission: "вариатор", yearFrom: 2021 },
            ],
          },
        ],
      },
      {
        name: "Tiggo 7 Pro",
        slug: "tiggo-7-pro",
        bodyType: "кроссовер",
        yearFrom: 2020,
        generations: [
          {
            name: "I",
            slug: "i",
            yearFrom: 2020,
            bodyType: "кроссовер",
            modifications: [
              { name: "1.5 Turbo CVT 2WD", engine: "SQRE4T15C", volume: 1.5, power: 147, fuel: "бензин", drive: "передний", transmission: "вариатор", yearFrom: 2020 },
              { name: "1.6 Turbo DCT 2WD", engine: "SQRF4J16", volume: 1.6, power: 186, fuel: "бензин", drive: "передний", transmission: "робот", yearFrom: 2020 },
            ],
          },
          {
            name: "I (Max)",
            slug: "i-max",
            yearFrom: 2022,
            bodyType: "кроссовер",
            modifications: [
              { name: "1.5 Turbo CVT 2WD", engine: "SQRE4T15C", volume: 1.5, power: 147, fuel: "бензин", drive: "передний", transmission: "вариатор", yearFrom: 2022 },
              { name: "1.6 Turbo DCT 4WD", engine: "SQRF4J16", volume: 1.6, power: 186, fuel: "бензин", drive: "полный", transmission: "робот", yearFrom: 2022 },
            ],
          },
        ],
      },
      {
        name: "Tiggo 8 Pro",
        slug: "tiggo-8-pro",
        bodyType: "кроссовер",
        yearFrom: 2020,
        generations: [
          {
            name: "I",
            slug: "i",
            yearFrom: 2020,
            bodyType: "кроссовер",
            modifications: [
              { name: "1.6 Turbo DCT 2WD", engine: "SQRF4J16", volume: 1.6, power: 186, fuel: "бензин", drive: "передний", transmission: "робот", yearFrom: 2020 },
              { name: "2.0 Turbo DCT 4WD", engine: "SQRF4J20", volume: 2, power: 249, fuel: "бензин", drive: "полный", transmission: "робот", yearFrom: 2020 },
            ],
          },
        ],
      },
      {
        name: "Tiggo 9",
        slug: "tiggo-9",
        bodyType: "кроссовер",
        yearFrom: 2023,
        generations: [
          {
            name: "I",
            slug: "i",
            yearFrom: 2023,
            bodyType: "кроссовер",
            modifications: [
              { name: "2.0 Turbo AT 4WD", engine: "SQRF4J20", volume: 2, power: 249, fuel: "бензин", drive: "полный", transmission: "АКПП", yearFrom: 2023 },
            ],
          },
        ],
      },
    ],
  },

  // ───────────────────────────────────────────────────────────────────────────
  // Geely
  // ───────────────────────────────────────────────────────────────────────────
  {
    name: "Geely",
    slug: "geely",
    country: "Китай",
    popular: true,
    sortOrder: 170,
    models: [
      {
        name: "Coolray",
        slug: "coolray",
        bodyType: "кроссовер",
        yearFrom: 2019,
        generations: [
          {
            name: "I (SX11)",
            slug: "i-sx11",
            yearFrom: 2019,
            bodyType: "кроссовер",
            modifications: [
              { name: "1.5 Turbo DCT 2WD", engine: "JLH-3G15TD", volume: 1.5, power: 177, fuel: "бензин", drive: "передний", transmission: "робот", yearFrom: 2019 },
              { name: "1.5 Turbo AT 2WD", engine: "JLH-3G15TD", volume: 1.5, power: 150, fuel: "бензин", drive: "передний", transmission: "АКПП", yearFrom: 2019 },
            ],
          },
        ],
      },
      {
        name: "Atlas Pro",
        slug: "atlas-pro",
        bodyType: "кроссовер",
        yearFrom: 2019,
        generations: [
          {
            name: "I",
            slug: "i",
            yearFrom: 2019,
            bodyType: "кроссовер",
            modifications: [
              { name: "2.0 AT 2WD", engine: "JLD-4G20", volume: 2, power: 150, fuel: "бензин", drive: "передний", transmission: "АКПП", yearFrom: 2019 },
              { name: "2.4 AT 4WD", engine: "JLD-4G24", volume: 2.4, power: 170, fuel: "бензин", drive: "полный", transmission: "АКПП", yearFrom: 2019 },
            ],
          },
        ],
      },
      {
        name: "Tugella",
        slug: "tugella",
        bodyType: "кроссовер",
        yearFrom: 2020,
        generations: [
          {
            name: "I (FY11)",
            slug: "i-fy11",
            yearFrom: 2020,
            bodyType: "кроссовер",
            modifications: [
              { name: "2.0 Turbo AT 4WD", engine: "JLH-4G20TD", volume: 2, power: 238, fuel: "бензин", drive: "полный", transmission: "АКПП", yearFrom: 2020 },
            ],
          },
        ],
      },
      {
        name: "Monjaro",
        slug: "monjaro",
        bodyType: "кроссовер",
        yearFrom: 2022,
        generations: [
          {
            name: "I (KX11)",
            slug: "i-kx11",
            yearFrom: 2022,
            bodyType: "кроссовер",
            modifications: [
              { name: "2.0 Turbo AT 4WD", engine: "JLH-4G20TDB", volume: 2, power: 238, fuel: "бензин", drive: "полный", transmission: "АКПП", yearFrom: 2022 },
              { name: "2.0 Turbo AT 2WD", engine: "JLH-4G20TDB", volume: 2, power: 218, fuel: "бензин", drive: "передний", transmission: "АКПП", yearFrom: 2022 },
            ],
          },
        ],
      },
    ],
  },

  // ───────────────────────────────────────────────────────────────────────────
  // Exeed
  // ───────────────────────────────────────────────────────────────────────────
  {
    name: "Exeed",
    slug: "exeed",
    country: "Китай",
    popular: false,
    sortOrder: 180,
    models: [
      {
        name: "TXL",
        slug: "txl",
        bodyType: "кроссовер",
        yearFrom: 2020,
        generations: [
          {
            name: "I",
            slug: "i",
            yearFrom: 2020,
            bodyType: "кроссовер",
            modifications: [
              { name: "1.6 Turbo DCT 4WD", engine: "SQRF4J16", volume: 1.6, power: 186, fuel: "бензин", drive: "полный", transmission: "робот", yearFrom: 2020 },
              { name: "2.0 Turbo DCT 4WD", engine: "SQRF4J20", volume: 2, power: 249, fuel: "бензин", drive: "полный", transmission: "робот", yearFrom: 2021 },
            ],
          },
        ],
      },
      {
        name: "VX",
        slug: "vx",
        bodyType: "кроссовер",
        yearFrom: 2020,
        generations: [
          {
            name: "I",
            slug: "i",
            yearFrom: 2020,
            bodyType: "кроссовер",
            modifications: [
              { name: "2.0 Turbo DCT 4WD", engine: "SQRF4J20", volume: 2, power: 249, fuel: "бензин", drive: "полный", transmission: "робот", yearFrom: 2020 },
              { name: "1.6 Turbo DCT 2WD", engine: "SQRF4J16", volume: 1.6, power: 186, fuel: "бензин", drive: "передний", transmission: "робот", yearFrom: 2020 },
            ],
          },
        ],
      },
      {
        name: "LX",
        slug: "lx",
        bodyType: "кроссовер",
        yearFrom: 2019,
        generations: [
          {
            name: "I",
            slug: "i",
            yearFrom: 2019,
            bodyType: "кроссовер",
            modifications: [
              { name: "1.6 Turbo DCT 2WD", engine: "SQRF4J16", volume: 1.6, power: 186, fuel: "бензин", drive: "передний", transmission: "робот", yearFrom: 2019 },
            ],
          },
        ],
      },
    ],
  },

  // ───────────────────────────────────────────────────────────────────────────
  // Jetour
  // ───────────────────────────────────────────────────────────────────────────
  {
    name: "Jetour",
    slug: "jetour",
    country: "Китай",
    popular: true,
    sortOrder: 190,
    models: [
      {
        name: "X70",
        slug: "x70",
        bodyType: "кроссовер",
        yearFrom: 2019,
        generations: [
          {
            name: "I",
            slug: "i",
            yearFrom: 2019,
            yearTo: 2023,
            bodyType: "кроссовер",
            modifications: [
              { name: "1.5 Turbo DCT 2WD", engine: "SQRE4T15C", volume: 1.5, power: 147, fuel: "бензин", drive: "передний", transmission: "робот", yearFrom: 2019, yearTo: 2023 },
              { name: "1.6 Turbo DCT 2WD", engine: "SQRF4J16", volume: 1.6, power: 186, fuel: "бензин", drive: "передний", transmission: "робот", yearFrom: 2019, yearTo: 2023 },
            ],
          },
          {
            name: "Plus",
            slug: "plus",
            yearFrom: 2023,
            bodyType: "кроссовер",
            modifications: [
              { name: "1.5 Turbo DCT 2WD", engine: "SQRE4T15C", volume: 1.5, power: 147, fuel: "бензин", drive: "передний", transmission: "робот", yearFrom: 2023 },
              { name: "2.0 Turbo DCT 4WD", engine: "SQRF4J20", volume: 2, power: 249, fuel: "бензин", drive: "полный", transmission: "робот", yearFrom: 2023 },
            ],
          },
        ],
      },
      {
        name: "X90 Plus",
        slug: "x90-plus",
        bodyType: "кроссовер",
        yearFrom: 2021,
        generations: [
          {
            name: "I",
            slug: "i",
            yearFrom: 2021,
            bodyType: "кроссовер",
            modifications: [
              { name: "1.6 Turbo DCT 2WD", engine: "SQRF4J16", volume: 1.6, power: 186, fuel: "бензин", drive: "передний", transmission: "робот", yearFrom: 2021 },
              { name: "2.0 Turbo DCT 4WD", engine: "SQRF4J20", volume: 2, power: 249, fuel: "бензин", drive: "полный", transmission: "робот", yearFrom: 2021 },
            ],
          },
        ],
      },
      {
        name: "T2",
        slug: "t2",
        bodyType: "внедорожник",
        yearFrom: 2023,
        generations: [
          {
            name: "I",
            slug: "i",
            yearFrom: 2023,
            bodyType: "внедорожник",
            modifications: [
              { name: "1.5 Turbo DCT 2WD", engine: "SQRE4T15C", volume: 1.5, power: 147, fuel: "бензин", drive: "передний", transmission: "робот", yearFrom: 2023 },
              { name: "2.0 Turbo DCT 4WD", engine: "SQRF4J20", volume: 2, power: 249, fuel: "бензин", drive: "полный", transmission: "робот", yearFrom: 2023 },
            ],
          },
        ],
      },
    ],
  },

  // ───────────────────────────────────────────────────────────────────────────
  // Omoda
  // ───────────────────────────────────────────────────────────────────────────
  {
    name: "Omoda",
    slug: "omoda",
    country: "Китай",
    popular: false,
    sortOrder: 200,
    models: [
      {
        name: "C5",
        slug: "c5",
        bodyType: "кроссовер",
        yearFrom: 2022,
        generations: [
          {
            name: "I",
            slug: "i",
            yearFrom: 2022,
            bodyType: "кроссовер",
            modifications: [
              { name: "1.5 Turbo CVT 2WD", engine: "SQRE4T15C", volume: 1.5, power: 147, fuel: "бензин", drive: "передний", transmission: "вариатор", yearFrom: 2022 },
              { name: "1.6 Turbo DCT 2WD", engine: "SQRF4J16", volume: 1.6, power: 186, fuel: "бензин", drive: "передний", transmission: "робот", yearFrom: 2022 },
            ],
          },
        ],
      },
      {
        name: "S5",
        slug: "s5",
        bodyType: "кроссовер",
        yearFrom: 2022,
        generations: [
          {
            name: "I",
            slug: "i",
            yearFrom: 2022,
            bodyType: "кроссовер",
            modifications: [
              { name: "1.5 Turbo CVT 2WD", engine: "SQRE4T15C", volume: 1.5, power: 147, fuel: "бензин", drive: "передний", transmission: "вариатор", yearFrom: 2022 },
              { name: "1.6 Turbo DCT 2WD", engine: "SQRF4J16", volume: 1.6, power: 186, fuel: "бензин", drive: "передний", transmission: "робот", yearFrom: 2022 },
            ],
          },
        ],
      },
    ],
  },
];

/** Индекс «brand/model/generation» → флаг существования (для валидации фитментов). */
export function buildCarIndex(): Set<string> {
  const index = new Set<string>();
  for (const brand of CAR_BRANDS) {
    index.add(brand.slug);
    for (const model of brand.models) {
      index.add(`${brand.slug}/${model.slug}`);
      for (const generation of model.generations) {
        index.add(`${brand.slug}/${model.slug}/${generation.slug}`);
      }
    }
  }
  return index;
}
