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
    if (w.length <= 1) { result.push(w.toUpperCase()); continue; }
    const upper = w.toUpperCase();
    if (KNOWN_ABBR.has(upper)) { result.push(upper); continue; }
    const lower = w.toLowerCase();
    if (result.length > 0 && LOWERCASE_WORDS.has(lower)) {
      result.push(lower);
      continue;
    }
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

function buildFullName(name) {
  if (!name) return name;
  let cleaned = cleanRawName(name);

  // СОУ → СУ (абревиатура и пълна форма)
  cleaned = cleaned.replace(/(?<![а-яА-ЯёЁ])СОУ(?![а-яА-ЯёЁ])/gi, 'СУ');
  cleaned = cleaned.replace(/ЧСОУ/gi, 'ЧСУ');
  cleaned = cleaned.replace(/средно общообразователно училище/gi, 'Средно училище');
  cleaned = cleaned.replace(/частно средно общообразователно училище/gi, 'Частно средно училище');

  // If ALL CAPS — convert to mixed case
  const hasNoCyrilLower = !/[а-я]/.test(cleaned);
  const hasUpperRun = /[А-Я]{3,}/.test(cleaned);
  if (hasNoCyrilLower && hasUpperRun) {
    let number = '';
    let rest = cleaned;
    const numMatch = cleaned.match(/^(\d+[-]?(?:ВО|МА|ТО|РО|во|ма|то|ро)?)\s+(.+)$/i);
    if (numMatch) {
      number = numMatch[1] + ' ';
      rest = numMatch[2];
    }

    // Try to find type in dictionary
    const lowerRest = rest.toLowerCase();
    let typePart = null;
    let patronPart = null;
    for (const [key] of TYPE_ABBREVIATIONS) {
      if (lowerRest.startsWith(key)) {
        typePart = rest.substring(0, key.length);
        patronPart = rest.substring(key.length).trim().replace(/^[,;]\s*/, '');
        break;
      }
    }

    if (typePart) {
      const typeSentence = typePart.charAt(0).toUpperCase() + typePart.slice(1).toLowerCase();
      if (patronPart) {
        cleaned = number + typeSentence + ' ' + toTitleCase(patronPart);
      } else {
        cleaned = number + typeSentence;
      }
    } else {
      cleaned = number + rest.charAt(0).toUpperCase() + rest.slice(1).toLowerCase();
    }
  }

  cleaned = cleaned.replace(/;\s*$/, '').trim();
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
