// ── Name normalization module ──────────────────────────────────
// Ports the abbreviation and normalization logic from scripts/build.ps1

const TYPE_ABBREVIATIONS = [
  // Национални специфични (от по-дълъг към по-кратък)
  ['национална природо-математическа гимназия', 'НПМГ'],
  ['национална търговско-банкова гимназия', 'НТБГ'],
  ['софийска гимназия по строителство, архитектура и геодезия', 'СГСАГ'],
  ['софийска гимназия по хлебни и сладкарски технологии', 'СГХСТ'],
  ['софийска математическа гимназия', 'СМГ'],
  ['софийска професионална гимназия по туризъм', 'СПГТ'],
  ['национална професионална гимназия по полиграфия и фотография', 'НПГПФ'],
  ['национална професионална гимназия по прецизна техника и оптика', 'НПГПТО'],
  ['национална гимназия за древни езици и култура', 'НГДЕК'],
  ['национално музикално училище', 'НМУ'],
  ['национално училище за танцово изкуство', 'НУТИ'],
  ['национално училище за изящни изкуства', 'НУИИ'],
  ['национално средно училище', 'НСУ'],
  // ПГ по специализации
  ['професионална гимназия по аудио-, видео- и телекомуникация', 'ПГАВТ'],
  ['професионална гимназия по подемна, строителна и транспортна техника', 'ПГПСТТ'],
  ['професионална гимназия по хранително-вкусови технологии', 'ПГХВТ'],
  ['професионална гимназия по екология и биотехнологии', 'ПГЕБ'],
  ['професионална гимназия по електротехника и автоматика', 'ПГЕА'],
  ['професионална гимназия по информационни технологии и езици', 'ПГИТЕ'],
  ['професионална гимназия по банково дело, търговия и финанси', 'ПГБДТФ'],
  ['професионална гимназия по икономика, информатика и туризъм', 'ПГИИТ'],
  ['професионална гимназия по транспорт и енергетика', 'ПГТЕ'],
  ['професионална гимназия по фризьорство и козметика', 'ПГФК'],
  ['професионална гимназия по текстил и моден дизайн', 'ПГТМД'],
  ['професионална гимназия по текстилни и кожени изделия', 'ПГТКИ'],
  ['професионална гимназия по железопътен транспорт', 'ПГЖТ'],
  ['професионална гимназия по механоелектотехника', 'ПГМЕТ'],
  ['професионална гимназия по селско стопанство', 'ПГСС'],
  ['професионална гимназия по облекло', 'ПГО'],
  ['професионална гимназия по електроника', 'ПГЕ'],
  ['професионална гимназия по телекомуникации', 'ПГТел'],
  ['професионална гимназия по транспорт', 'ПГТр'],
  ['професионална гимназия по охрана и сигурност', 'ПГОС'],
  ['професионална гимназия по туризъм', 'ПГТур'],
  ['професионална гимназия', 'ПГ'],
  // Частни ПГ
  ['частна професионална гимназиа по икономика, информатика и туризъм', 'ЧПГИИТ'],
  ['частна професионална гимназия по банково дело, търговия и финанси', 'ЧПГБДТФ'],
  ['частна професионална гимназия по охрана и сигурност', 'ЧПГОС'],
  ['частна професионална гимназия', 'ЧПГ'],
  ['частна профилирана гимназия по информационни технологии и езици', 'ЧПрГИТЕ'],
  ['частна профилирана гимназия с преподаване на английски език', 'ЧПрГАЕ'],
  ['частна профилирана гимназия', 'ЧПрГ'],
  ['частна гимназия с езиков и хуманитарен профил', 'ЧГЕХП'],
  ['частна езикова гимназия', 'ЧЕГ'],
  // Профилирани
  ['профилирана гимназия за изобразителни изкуства', 'ПрГИИ'],
  ['профилирана гимназия с интензивно изучаване на румънски език', 'ПрГРЕ'],
  ['профилирана гимназия', 'ПрГ'],
  ['профилирана езикова гимназия', 'ПрЕГ'],
  // Езикови
  ['средно училище за чужди езици и мениджмънт', 'СУЧЕМ'],
  ['средно езиково училище', 'СЕУ'],
  ['гимназия с преподаване на испански език', 'ГПИЕ'],
  ['гимназия с изучаване на чужд език', 'ГИЧЕ'],
  ['немска езикова гимназия', 'НЕГ'],
  ['френска езикова гимназия', 'ФЕГ'],
  ['втора английска езикова гимназия', 'II АЕГ'],
  ['първа английска езикова гимназия', 'I АЕГ'],
  ['първа частна английска гимназия', 'I ЧАГ'],
  ['първа частна математическа гимназия', 'I ЧМГ'],
  ['езикова гимназия', 'ЕГ'],
  // Специализирани
  ['специализирано спортно училище', 'ССУ'],
  ['специално училище за ученици с нарушено зрение', 'СУУНЗ'],
  ['софийска духовна семинария', 'СДС'],
  ['финансово-стопанска гимназия', 'ФСГ'],
  // Частни общообразователни
  ['частно средно общообразователно училище', 'ЧСУ'],
  ['частно средно езиково училище', 'ЧСЕУ'],
  ['частно средно училище по изкуства и чужди езици', 'ЧСУ ИЧЕ'],
  ['частно средно училище', 'ЧСУ'],
  ['частно езиково средно училище', 'ЧЕСУ'],
  ['частно основно училище с изучаване на немски език', 'ЧОУНЕ'],
  ['частно основно училище с ранно чуждоезиково обучение', 'ЧОУРЧО'],
  ['частно основно училище', 'ЧОУ'],
  ['частно начално училище', 'ЧНУ'],
  ['частно ОУ с изучаване на английски език', 'ЧОУАЕ'],
  ['частно ОУ', 'ЧОУ'],
  // Помощни / ЦСОП
  ['основно помощно училище', 'ОПУ'],
  // Основни типове (накрая — по-къси)
  ['средно общообразователно училище', 'СУ'],
  ['средно училище', 'СУ'],
  ['основно училище', 'ОУ'],
  ['начално училище', 'НУ'],
  ['сменно-вечерна гимназия', 'СВГ'],
  ['вечерно СУ', 'ВСУ'],
];

const KNOWN_ABBR = new Set([
  'СУ','ОУ','НУ','ПГ','ЕГ','СОУ','НПМГ','НТБГ','СГСАГ','СПГЕ','ЦСОП',
  'ДПН','НГ','ЧПГ','ЧНГ','ЧНУ','ЧОУ','ЧСУ','ЧСОУ','НСУ','ССУ',
  'НФСГ','СГХСТ','ПГТ','ГИЧЕ','СВГ','II','I'
]);

const LOWERCASE_WORDS = new Set([
  'по','и','в','на','за','с','от','към','до','при','без','през','под','над','между','чрез'
]);

const KNOWN_PREFIXES = [
  'НПМГ','НТБГ','СГСАГ','СГХСТ','СПГЕ','НФСГ','НГ ','ПГТ ','ПГ ',
  'ЧПГ ','ЧНГ','ЧНУ','ЧОУ','ЧСУ','ЧСОУ','ЧУТИ','ЧПСОУ','ГИЧЕ'
];

const LQ = '\u201E'; // „
const RQ = '\u201C'; // "

function wrapPatron(text) {
  return LQ + text + RQ;
}

function toTitleCase(text) {
  if (!text) return text;
  const words = text.split(/\s+/);
  const result = [];
  for (const w of words) {
    const lower = w.toLowerCase();
    // Check lowercase words first (и, в, с, etc.) — even single-char ones
    if (result.length > 0 && LOWERCASE_WORDS.has(lower)) {
      result.push(lower);
      continue;
    }
    if (w.length <= 1) { result.push(w.toUpperCase()); continue; }
    const upper = w.toUpperCase();
    if (KNOWN_ABBR.has(upper)) { result.push(upper); continue; }
    result.push(w.charAt(0).toUpperCase() + w.slice(1).toLowerCase());
  }
  return result.join(' ');
}

function cleanRawName(name) {
  if (!name) return name;
  name = name.replace(/\s{2,}/g, ' ').trim();
  name = name.replace(/;\s*$/, '');
  name = name.replace(/[""„"»«\u00AB\u00BB\u201C\u201D\u201E\u201F]/g, '');
  name = name.replace(/\s*[–—]\s*/g, ' - ');
  return name.trim();
}

function buildShortName(name) {
  if (!name) return name;

  const cleaned = cleanRawName(name);
  let lower = cleaned.toLowerCase();

  // Check if already starts with a known abbreviation prefix
  for (const prefix of KNOWN_PREFIXES) {
    if (cleaned.startsWith(prefix)) {
      let rest = cleaned.substring(prefix.trimEnd().length).trim();
      rest = rest.replace(/^,\s*/, '');
      if (rest && /^(професионална|частна|гимназия|училище)/i.test(rest)) break;
      // Replace obsolete ЧСОУ/ЧПСОУ with ЧСУ/ЧПСУ
      let outPrefix = prefix.trimEnd().replace(/ЧСОУ/, 'ЧСУ').replace(/ЧПСОУ/, 'ЧПСУ');
      if (rest) {
        const patron = toTitleCase(rest);
        return outPrefix + ' ' + wrapPatron(patron);
      }
      return outPrefix;
    }
  }

  // Extract leading number (e.g., "21 СОУ ..." or "148 СОУ ...")
  let number = '';
  let nameForSearch = lower;
  const numMatch = cleaned.match(/^(\d+[-]?(?:во|ма|то|ро)?)\s+(.+)$/i);
  let cleanedRest = cleaned;
  if (numMatch) {
    number = numMatch[1];
    nameForSearch = numMatch[2].toLowerCase();
    cleanedRest = numMatch[2];
  }

  // СОУ → СУ (word boundary \b doesn't work with Cyrillic)
  nameForSearch = nameForSearch.replace(/(?<![а-яё])соу(?![а-яё])/gi, 'су');
  nameForSearch = nameForSearch.replace(/чсоу/gi, 'чсу');
  cleanedRest = cleanedRest.replace(/(?<![а-яА-ЯёЁ])СОУ(?![а-яА-ЯёЁ])/gi, 'СУ');
  cleanedRest = cleanedRest.replace(/ЧСОУ/gi, 'ЧСУ');

  // Search type in dictionary
  let abbr = null;
  let patron = '';
  for (const [key, value] of TYPE_ABBREVIATIONS) {
    if (nameForSearch.startsWith(key)) {
      abbr = value;
      let rest = cleanedRest.substring(key.length).trim();
      rest = rest.replace(/^[,;]\s*/, '');
      patron = rest;
      break;
    }
  }

  // Try short forms
  if (!abbr) {
    const shortTypes = [['су ', 'СУ'], ['оу ', 'ОУ'], ['ну ', 'НУ']];
    for (const [st, sv] of shortTypes) {
      if (nameForSearch.startsWith(st)) {
        abbr = sv;
        patron = cleanedRest.substring(st.length).trim();
        break;
      }
    }
  }

  // If match found
  if (abbr) {
    const prefix = number ? number + ' ' + abbr : abbr;
    if (patron) {
      patron = toTitleCase(patron);
      patron = patron.replace(/\s*\(.*\)\s*$/, '').trim();
      if (patron) return prefix + ' ' + wrapPatron(patron);
    }
    return prefix;
  }

  // No type found — just normalize case
  return number
    ? number + ' ' + toTitleCase(cleanedRest)
    : toTitleCase(cleaned);
}

// Abbreviations to expand in full names (short → full form)
const ABBR_TO_FULL = [
  ['НПМГ', 'Национална природо-математическа гимназия'],
  ['НТБГ', 'Национална търговско-банкова гимназия'],
  ['СГСАГ', 'Софийска гимназия по строителство, архитектура и геодезия'],
  ['СГХСТ', 'Софийска гимназия по хлебни и сладкарски технологии'],
  ['СМГ', 'Софийска математическа гимназия'],
  ['СПГТ', 'Софийска професионална гимназия по туризъм'],
  ['НПГПФ', 'Национална професионална гимназия по полиграфия и фотография'],
  ['НПГПТО', 'Национална професионална гимназия по прецизна техника и оптика'],
  ['НГДЕК', 'Национална гимназия за древни езици и култура'],
  ['НМУ', 'Национално музикално училище'],
  ['НУТИ', 'Национално училище за танцово изкуство'],
  ['НУИИ', 'Национално училище за изящни изкуства'],
  ['НСУ', 'Национално средно училище'],
  ['ПГАВТ', 'Професионална гимназия по аудио-, видео- и телекомуникация'],
  ['ПГПСТТ', 'Професионална гимназия по подемна, строителна и транспортна техника'],
  ['ПГХВТ', 'Професионална гимназия по хранително-вкусови технологии'],
  ['ПГЕБ', 'Професионална гимназия по екология и биотехнологии'],
  ['ПГЕА', 'Професионална гимназия по електротехника и автоматика'],
  ['ПГИТЕ', 'Професионална гимназия по информационни технологии и езици'],
  ['ПГБДТФ', 'Професионална гимназия по банково дело, търговия и финанси'],
  ['ПГИИТ', 'Професионална гимназия по икономика, информатика и туризъм'],
  ['ПГТЕ', 'Професионална гимназия по транспорт и енергетика'],
  ['ПГФК', 'Професионална гимназия по фризьорство и козметика'],
  ['ПГТМД', 'Професионална гимназия по текстил и моден дизайн'],
  ['ПГТКИ', 'Професионална гимназия по текстилни и кожени изделия'],
  ['ПГЖТ', 'Професионална гимназия по железопътен транспорт'],
  ['ПГМЕТ', 'Професионална гимназия по механоелектотехника'],
  ['ПГСС', 'Професионална гимназия по селско стопанство'],
  ['ПГО', 'Професионална гимназия по облекло'],
  ['ПГЕ', 'Професионална гимназия по електроника'],
  ['ПГТел', 'Професионална гимназия по телекомуникации'],
  ['ПГТр', 'Професионална гимназия по транспорт'],
  ['ПГОС', 'Професионална гимназия по охрана и сигурност'],
  ['ПГТур', 'Професионална гимназия по туризъм'],
  ['ПГТ', 'Професионална гимназия по транспорт'],
  ['ЧПГ', 'Частна професионална гимназия'],
  ['ЧПрГ', 'Частна профилирана гимназия'],
  ['ЧЕГ', 'Частна езикова гимназия'],
  ['ЧНГ', 'Частна немска гимназия'],
  ['ПрГ', 'Профилирана гимназия'],
  ['ПрЕГ', 'Профилирана езикова гимназия'],
  ['СУЧЕМ', 'Средно училище за чужди езици и мениджмънт'],
  ['СЕУ', 'Средно езиково училище'],
  ['ГПИЕ', 'Гимназия с преподаване на испански език'],
  ['ГИЧЕ', 'Гимназия с изучаване на чужд език'],
  ['НЕГ', 'Немска езикова гимназия'],
  ['ФЕГ', 'Френска езикова гимназия'],
  ['ЕГ', 'Езикова гимназия'],
  ['ССУ', 'Специализирано спортно училище'],
  ['ФСГ', 'Финансово-стопанска гимназия'],
  ['ЧСУ', 'Частно средно училище'],
  ['ЧСЕУ', 'Частно средно езиково училище'],
  ['ЧЕСУ', 'Частно езиково средно училище'],
  ['ЧОУ', 'Частно основно училище'],
  ['ЧНУ', 'Частно начално училище'],
  ['СВГ', 'Сменно-вечерна гимназия'],
  ['ВСУ', 'Вечерно средно училище'],
  // Basic types last (shorter match)
  ['СОУ', 'Средно училище'],
  ['СУ', 'Средно училище'],
  ['ОУ', 'Основно училище'],
  ['НУ', 'Начално училище'],
  ['ПГ', 'Професионална гимназия'],
];

function buildFullName(name) {
  if (!name) return name;
  let cleaned = cleanRawName(name);

  // СОУ → СУ first (before further processing)
  cleaned = cleaned.replace(/(?<![а-яА-ЯёЁ])СОУ(?![а-яА-ЯёЁ])/gi, 'СУ');
  cleaned = cleaned.replace(/ЧСОУ/gi, 'ЧСУ');
  cleaned = cleaned.replace(/средно общообразователно училище/gi, 'средно училище');
  cleaned = cleaned.replace(/частно средно общообразователно училище/gi, 'частно средно училище');

  // Extract leading number
  let number = '';
  let rest = cleaned;
  const numMatch = cleaned.match(/^(\d+[-]?(?:во|ма|то|ро)?)\s+(.+)$/i);
  if (numMatch) {
    number = numMatch[1];
    rest = numMatch[2];
  }

  // If ALL CAPS — convert to mixed case first
  const hasNoCyrilLower = !/[а-я]/.test(rest);
  const hasUpperRun = /[А-Я]{3,}/.test(rest);
  if (hasNoCyrilLower && hasUpperRun) {
    rest = rest.charAt(0).toUpperCase() + rest.slice(1).toLowerCase();
  }

  // Try to expand abbreviation at start
  const restUpper = rest.replace(/^\s+/, '');

  // Handle "Частно ОУ ...", "Частна ПГ ..." patterns
  const chastnoMatch = restUpper.match(/^(частн[оа])\s+/i);
  if (chastnoMatch) {
    const chastno = chastnoMatch[1].charAt(0).toUpperCase() + chastnoMatch[1].slice(1).toLowerCase();
    const afterChastno = restUpper.substring(chastnoMatch[0].length);
    for (const [abbr, full] of ABBR_TO_FULL) {
      const re = new RegExp('^' + abbr.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '(?:\\s|$)', 'i');
      if (re.test(afterChastno)) {
        let patron = afterChastno.substring(abbr.length).trim().replace(/^[,;]\s*/, '');
        // Build "Частно основно училище" from "Частно" + "Основно училище"
        const fullType = chastno + ' ' + full.charAt(0).toLowerCase() + full.slice(1);
        if (patron) {
          patron = toTitleCase(patron);
          patron = patron.replace(/\s*\(.*\)\s*$/, '').trim();
          return (number ? number + ' ' : '') + fullType + ' ' + wrapPatron(patron);
        }
        return (number ? number + ' ' : '') + fullType;
      }
    }
  }

  for (const [abbr, full] of ABBR_TO_FULL) {
    // Match abbreviation followed by space or end
    const re = new RegExp('^' + abbr.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '(?:\\s|$)', 'i');
    if (re.test(restUpper)) {
      let patron = restUpper.substring(abbr.length).trim().replace(/^[,;]\s*/, '');
      const typePart = full.charAt(0).toUpperCase() + full.slice(1);
      if (patron) {
        patron = toTitleCase(patron);
        patron = patron.replace(/\s*\(.*\)\s*$/, '').trim();
        const result = number ? number + ' ' + typePart + ' ' + wrapPatron(patron) : typePart + ' ' + wrapPatron(patron);
        return result;
      }
      return number ? number + ' ' + typePart : typePart;
    }
  }

  // Try to find type in dictionary (full text form)
  const lowerRest = rest.toLowerCase();
  for (const [key] of TYPE_ABBREVIATIONS) {
    if (lowerRest.startsWith(key)) {
      const typePart = key.charAt(0).toUpperCase() + key.slice(1);
      let patron = rest.substring(key.length).trim().replace(/^[,;]\s*/, '');
      if (patron) {
        patron = toTitleCase(patron);
        patron = patron.replace(/\s*\(.*\)\s*$/, '').trim();
        const result = number ? number + ' ' + typePart + ' ' + wrapPatron(patron) : typePart + ' ' + wrapPatron(patron);
        return result;
      }
      const result = number ? number + ' ' + typePart : typePart;
      return result;
    }
  }

  // No type recognized — just clean up
  cleaned = (number ? number + ' ' + rest : rest).replace(/;\s*$/, '').trim();
  return cleaned;
}

/**
 * Apply bracket-to-quote replacement: [text] → „text"
 */
function replaceBrackets(str) {
  if (!str || !str.includes('[')) return str;
  return str.replace(/\[([^\]]+)\]/g, LQ + '$1' + RQ);
}

/**
 * Normalize all school features in a GeoJSON object.
 * Applies: fullName normalization, shortName generation, overrides.
 * @param {Object} geojson - Schools GeoJSON
 * @param {Object} overrides - Overrides map (id → {object_nam, short_name, ...})
 * @returns {Object} - Modified GeoJSON (mutated in place)
 */
function normalizeSchools(geojson, overrides) {
  if (!geojson || !geojson.features) return geojson;

  for (const feature of geojson.features) {
    const p = feature.properties;
    if (!p) continue;

    const original = p.object_nam;

    // Generate full normalized name
    p.object_nam = buildFullName(original);

    // Generate short name
    p.short_name = buildShortName(original);

    // Apply overrides by id
    const id = String(p.id);
    if (overrides && overrides[id]) {
      const ov = overrides[id];
      for (const key of Object.keys(ov)) {
        if (key === '_comment' || key === 'examples') continue;
        p[key] = ov[key];
      }
    }

    // Replace [brackets] with „quotes"
    if (p.object_nam) p.object_nam = replaceBrackets(p.object_nam);
    if (p.short_name) p.short_name = replaceBrackets(p.short_name);
  }

  return geojson;
}
