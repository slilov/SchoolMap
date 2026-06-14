// ── Configuration ──────────────────────────────────────────────
const MAP_CENTER = [42.698, 23.322];
const MAP_ZOOM   = 12;

// Tauri API — resolved lazily in loadData() to handle injection timing
function getTauriInvoke() {
  // Tauri 2 injects __TAURI_INTERNALS__ with invoke()
  if (window.__TAURI_INTERNALS__ && window.__TAURI_INTERNALS__.invoke) {
    return window.__TAURI_INTERNALS__.invoke;
  }
  // Also check the public API (if withGlobalTauri or bundler used)
  if (window.__TAURI__ && window.__TAURI__.core) {
    return window.__TAURI__.core.invoke;
  }
  return null;
}

// Colour palette for the 18 districts (cycling)
const DISTRICT_COLOURS = [
  '#e57373','#f06292','#ba68c8','#9575cd',
  '#7986cb','#64b5f6','#4dd0e1','#4db6ac',
  '#81c784','#aed581','#dce775','#fff176',
  '#ffb74d','#ff8a65','#a1887f','#90a4ae',
  '#80cbc4','#ce93d8'
];

// ── Map initialisation ──────────────────────────────────────────
const map = L.map('map', {
  center: MAP_CENTER,
  zoom: MAP_ZOOM,
  zoomControl: true,
  wheelPxPerZoomLevel: 300,   // default е 60 — по-голяма стойност = по-бавен зуум
  wheelDebounceTime:   300    // ms изчакване между scroll събития
});

// OpenStreetMap tile layer
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  maxZoom: 19,
  attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
}).addTo(map);

// ── Layer groups ───────────────────────────────────────────────
const districtsLayer = L.layerGroup().addTo(map);
const schoolsLayer   = L.layerGroup().addTo(map);

let schoolMarkers = [];
const SCHOOL_TYPES = {
  '1': 'Начално училище',
  '2': 'Основно училище',
  '3': 'Средно училище',
  '4': 'Профилирана / специализирана гимназия или училище',
  '5': 'Професионална гимназия',
  '6': 'Специално / помощно училище'
};
const activeFilters = {
  searchQuery: '',
  searchMode: 'name',
  financingTypes: ['1', '2', '3'],
  schoolType: 'all',
  activeProfiles: []
};

// ── Sidebar helpers ────────────────────────────────────────────
const infoPlaceholder = document.getElementById('info-placeholder');
const infoDetail      = document.getElementById('info-detail');

function showInfo(html) {
  infoPlaceholder.classList.add('hidden');
  infoDetail.classList.remove('hidden');
  infoDetail.innerHTML = html;
}

function clearInfo() {
  infoPlaceholder.classList.remove('hidden');
  infoDetail.classList.add('hidden');
  infoDetail.innerHTML = '';
}

// Delegated click on school names in district tree
infoDetail.addEventListener('click', function (e) {
  const li = e.target.closest('.district-school-item');
  if (!li) return;
  const schoolId = li.dataset.schoolId;
  const item = schoolMarkers.find(m => String(m.feature.properties.id) === schoolId);
  if (!item) return;

  // Select marker on map
  selectSchoolMarker(item.marker, item.feature);

  // Show school info below the tree
  const detailDiv = document.getElementById('district-school-detail');
  if (detailDiv) {
    detailDiv.innerHTML = '<hr/>' + buildSchoolInfo(item.feature);
  }

  // Highlight active item in the list
  infoDetail.querySelectorAll('.district-school-item.active').forEach(el => el.classList.remove('active'));
  li.classList.add('active');
});

// ── Loading indicator ──────────────────────────────────────────
const loadingEl = document.createElement('div');
loadingEl.id = 'loading';
loadingEl.textContent = 'Зареждане на данни…';
document.body.appendChild(loadingEl);

function hideLoading() {
  loadingEl.classList.add('hidden');
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function hasValue(value) {
  return value !== null && value !== undefined && value !== '';
}

function safeExternalUrl(value) {
  if (!hasValue(value)) return '';

  try {
    const url = new URL(String(value), window.location.href);
    return ['http:', 'https:'].includes(url.protocol) ? url.href : '';
  } catch (err) {
    return '';
  }
}

// ── Districts ──────────────────────────────────────────────────
let districtColourMap = {};
let selectedDistrictLayer = null;

function deselectDistrict() {
  if (selectedDistrictLayer) {
    selectedDistrictLayer.setStyle({ fillOpacity: 0.12, weight: 2 });
    selectedDistrictLayer.closeTooltip();
    selectedDistrictLayer = null;
  }
}

function loadDistricts(geojson) {
  let colourIndex = 0;

  L.geoJSON(geojson, {
    style: function (feature) {
      const colour = DISTRICT_COLOURS[colourIndex % DISTRICT_COLOURS.length];
      const name = getDistrictName(feature);
      districtColourMap[name] = colour;
      colourIndex++;
      return {
        color:       colour,
        weight:      2,
        opacity:     0.9,
        fillColor:   colour,
        fillOpacity: 0.12
      };
    },

    onEachFeature: function (feature, layer) {
      const name = getDistrictName(feature);

      // Persistent tooltip (label on map)
      layer.bindTooltip(escapeHtml(name), {
        permanent:  false,
        direction:  'center',
        className:  'district-tooltip'
      });

      layer.on({
        mouseover: function (e) {
          if (selectedDistrictLayer !== e.target) {
            e.target.setStyle({ fillOpacity: 0.30, weight: 3 });
            e.target.openTooltip();
          }
        },
        mouseout: function (e) {
          if (selectedDistrictLayer !== e.target) {
            e.target.setStyle({ fillOpacity: 0.12, weight: 2 });
            e.target.closeTooltip();
          }
        },
        click: function (e) {
          if (e.originalEvent) e.originalEvent._infoHandled = true;
          // Deselect previous
          deselectDistrict();
          // Select this one
          selectedDistrictLayer = e.target;
          e.target.setStyle({ fillOpacity: 0.30, weight: 3 });
          e.target.openTooltip();

          var info = '';
          try {
            info = buildDistrictInfo(feature);
          } catch (err) {
            info = '<h3>Грешка</h3><p>' + err.message + '</p>';
          }
          showInfo(info);
          map.fitBounds(e.target.getBounds(), { padding: [40, 40] });
        }
      });
    }
  }).addTo(districtsLayer);
}

function getDistrictName(feature) {
  const p = feature.properties || {};
  return p.obns_cyr || p['name:bg'] || p.name || p.NAME || '(без име)';
}

function buildDistrictInfo(feature) {
  const p = feature.properties || {};
  const name = escapeHtml(getDistrictName(feature));
  const districtCode = p.obns_num;

  const TYPE_DOTS = {
    '1': '🟢', '2': '🔵', '3': '🟠',
    '4': '🟣', '5': '🔴', '6': '🟤'
  };

  const FINANCING_TREE_LABELS = {
    '1': 'Държавни',
    '2': 'Общински',
    '3': 'Частни'
  };

  // Group schools by financing, then list with type dot
  const finGroups = { '1': [], '2': [], '3': [] };
  let total = 0;
  for (const item of schoolMarkers) {
    const sp = item.feature.properties || {};
    if (sp.kod_rayon === districtCode) {
      const fin = String(sp.finansiran || '2');
      if (!finGroups[fin]) finGroups[fin] = [];
      finGroups[fin].push({
        id: sp.id,
        name: sp.short_name || sp.object_nam || '(без име)',
        type: String(sp.type)
      });
      total++;
    }
  }

  let statsHtml = '';
  if (total > 0) {
    const finOrder = ['1', '2', '3'];
    const sections = finOrder
      .filter(f => finGroups[f] && finGroups[f].length > 0)
      .map(f => {
        const items = finGroups[f].sort((a, b) => a.name.localeCompare(b.name, 'bg'));
        const list = items.map(s => {
          const dot = TYPE_DOTS[s.type] || '⚪';
          return `<li class="district-school-item" data-school-id="${s.id}">${dot} ${escapeHtml(s.name)}</li>`;
        }).join('');
        return `<details class="district-type-group">
          <summary>${FINANCING_TREE_LABELS[f] || f} <span class="count">(${finGroups[f].length})</span></summary>
          <ul class="district-school-list">${list}</ul>
        </details>`;
      })
      .join('');
    statsHtml = `<p><span class="label">Училища в района: ${total}</span></p>${sections}
      <div id="district-school-detail"></div>`;
  } else {
    statsHtml = '<p><em>Няма данни за училища в района</em></p>';
  }

  return `<h3>Район ${name}</h3>${statsHtml}`;
}

// ── Schools ────────────────────────────────────────────────────
const FINANCING_LETTERS = { '1': 'Д', '2': 'О', '3': 'Ч' };
const TYPE_COLOURS = {
  '1': '#4caf50',   // Начално — зелено
  '2': '#2196f3',   // Основно — синьо
  '3': '#ff9800',   // Средно — оранжево
  '4': '#9c27b0',   // Профилирана/специализирана — лилаво
  '5': '#f44336',   // Професионална гимназия — червено
  '6': '#795548'    // Специално/помощно — кафяво
};

function createSchoolIcon(finansiran, type, selected) {
  const letter = FINANCING_LETTERS[String(finansiran)] || 'У';
  const colour = TYPE_COLOURS[String(type)] || '#1565c0';
  const scale = selected ? 2 : 1;
  const w = 22 * scale, h = 30 * scale;
  return L.divIcon({
    className: '',
    html: `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 22 30">
      <ellipse cx="11" cy="28" rx="5" ry="2" fill="rgba(0,0,0,0.25)"/>
      <path d="M11 0 C6.03 0 2 4.03 2 9 C2 16 11 28 11 28 C11 28 20 16 20 9 C20 4.03 15.97 0 11 0 Z"
            fill="${colour}" stroke="#fff" stroke-width="1.5"/>
      <text x="11" y="13" font-size="9" font-family="Arial" font-weight="bold"
            fill="#fff" text-anchor="middle">${letter}</text>
    </svg>`,
    iconSize:   [w, h],
    iconAnchor: [w / 2, h],
    popupAnchor:[0, -h]
  });
}

let selectedSchoolMarker = null;

function deselectSchoolMarker() {
  if (selectedSchoolMarker) {
    const sp = selectedSchoolMarker._schoolFeature.properties;
    selectedSchoolMarker.setIcon(createSchoolIcon(sp.finansiran, sp.type, false));
    selectedSchoolMarker = null;
  }
}

function selectSchoolMarker(marker, feature) {
  deselectSchoolMarker();
  const sp = feature.properties;
  marker.setIcon(createSchoolIcon(sp.finansiran, sp.type, true));
  marker._schoolFeature = feature;
  selectedSchoolMarker = marker;
}

function loadSchools(geojson) {
  schoolsLayer.clearLayers();
  schoolMarkers = [];

  L.geoJSON(geojson, {
    pointToLayer: function (feature, latlng) {
      // Enrich the feature with profiles dynamically
      enrichSchoolFeature(feature);
      const marker = L.marker(latlng, { icon: createSchoolIcon(feature.properties.finansiran, feature.properties.type, false) });
      marker._schoolFeature = feature;

      // Bind tooltip directly to the marker (crucial for MultiPoint layers)
      const name = getSchoolShortName(feature);
      marker.bindTooltip(escapeHtml(name), {
        permanent: false,
        direction: 'top',
        className: 'school-tooltip'
      });

      // Click handler on the marker itself
      marker.on('click', function (e) {
        if (e.originalEvent) e.originalEvent._infoHandled = true;
        selectSchoolMarker(marker, feature);
        showInfo(buildSchoolInfo(feature));
      });

      schoolMarkers.push({
        feature: feature,
        marker: marker
      });

      return marker;
    }
  });

  // Load all markers into the LayerGroup initially
  schoolMarkers.forEach(item => {
    item.marker.addTo(schoolsLayer);
  });

  // Update total UI counts
  document.getElementById('total-count').textContent = schoolMarkers.length;
  document.getElementById('visible-count').textContent = schoolMarkers.length;
}


const FINANCING_LABELS = {
  '1': 'Държавно',
  '2': 'Общинско',
  '3': 'Частно'
};

// Automatically scan name & note of schools to assign category profiles/specialties
function enrichSchoolFeature(feature) {
  const p = feature.properties || {};
  if (p._enriched) return; // skip if already enriched

  const name = (p.object_nam || "").toLowerCase();
  const note = (p.zabelezhka || "").toLowerCase();
  const type = String(p.type);

  p.profiles = [];

  // 1. Math and IT profile
  if (
    name.includes("математическа") || 
    name.includes("математика") || 
    name.includes("софийска математическа") || 
    name.includes("информатика") || 
    name.includes("компютър") || 
    name.includes("софтуер") || 
    name.includes("евклид") || 
    note.includes("математик") || 
    note.includes("информатик")
  ) {
    p.profiles.push("math");
  }

  // 2. Language profile
  if (
    name.includes("чужди езици") || 
    name.includes("английск") || 
    name.includes("немск") || 
    name.includes("руск") || 
    name.includes("френск") || 
    name.includes("испанск") || 
    name.includes("езиков") || 
    name.includes("румънски") || 
    name.includes("италиански") || 
    name.includes("класическа") ||
    note.includes("чужд език") || 
    note.includes("английск") || 
    note.includes("немск")
  ) {
    p.profiles.push("lang");
  }

  // 3. Art and Science profile
  if (
    name.includes("изкуства") || 
    name.includes("танцово") || 
    name.includes("музикално") || 
    name.includes("художествена") || 
    name.includes("семинария") || 
    name.includes("приложни") || 
    name.includes("артис") || 
    name.includes("дизайн") ||
    name.includes("култура") ||
    note.includes("изкуств") ||
    note.includes("музик")
  ) {
    p.profiles.push("art");
  }

  // 4. Sports profile
  if (
    name.includes("спортно") || 
    name.includes("спортен") || 
    (name.includes("васил левски") && type === "4") || // specialized sport school
    note.includes("спорт")
  ) {
    p.profiles.push("sport");
  }

  p._enriched = true;
}

function getSchoolName(feature) {
  const p = feature.properties || {};
  return p.object_nam || p['name:bg'] || p.name || p.NAME || '(без наименование)';
}

function getSchoolShortName(feature) {
  const p = feature.properties || {};
  return p.short_name || getSchoolName(feature);
}

function buildSchoolInfo(feature) {
  const p = feature.properties || {};
  const name = escapeHtml(getSchoolName(feature));
  const typeLabel = SCHOOL_TYPES[String(p.type)] || (hasValue(p.type) ? `Тип ${escapeHtml(p.type)}` : '');

  // Render Badges
  let badgesHtml = '<div class="badge-container">';
  
  if (p.finansiran && FINANCING_LABELS[p.finansiran]) {
    badgesHtml += `<span class="badge badge-fin-${escapeHtml(p.finansiran)}">${escapeHtml(FINANCING_LABELS[p.finansiran])}</span>`;
  }
  
  if (typeLabel) {
    badgesHtml += `<span class="badge badge-type-label">${escapeHtml(typeLabel)}</span>`;
  }
  
  if (p.profiles && p.profiles.length > 0) {
    p.profiles.forEach(profile => {
      let label = '';
      if (profile === 'math') label = '📐 Мат. / ИТ';
      if (profile === 'lang') label = '🌐 Езиков';
      if (profile === 'art') label = '🎨 Изкуства';
      if (profile === 'sport') label = '⚽ Спортен';
      if (label) {
        badgesHtml += `<span class="badge badge-profile-label">${escapeHtml(label)}</span>`;
      }
    });
  }
  badgesHtml += '</div>';

  const rows = [
    badgesHtml,
    hasValue(p.adres)      ? `<p><span class="label">Адрес</span><br/>${escapeHtml(p.adres)}</p>` : '',
    hasValue(p.kod_rayon)  ? `<p><span class="label">Район</span><br/>Район ${escapeHtml(p.kod_rayon)}</p>` : '',
    hasValue(p.br_paralel) ? `<p><span class="label">Брой паралелки</span><br/>${escapeHtml(p.br_paralel)}</p>` : '',
    hasValue(p.zabelezhka) ? `<p><span class="label">Забележка</span><br/><i>${escapeHtml(p.zabelezhka)}</i></p>` : ''
  ].join('');

  return `<h3>${name}</h3>${rows || '<p>Няма допълнителни данни.</p>'}`;
}

// Multi-attribute live filtering
function applyFilters() {
  let visibleCount = 0;

  schoolMarkers.forEach(item => {
    const p = item.feature.properties || {};
    const marker = item.marker;

    // 1. Search matching (unified — mode-dependent)
    const shortName = (p.short_name || '').toLowerCase();
    const fullName = (p.object_nam || '').toLowerCase();
    const address = (p.adres || '').toLowerCase();
    const query = activeFilters.searchQuery.toLowerCase();
    let matchesSearch = true;
    if (query) {
      if (activeFilters.searchMode === 'name') {
        matchesSearch = shortName.startsWith(query) || fullName.startsWith(query);
      } else {
        matchesSearch = shortName.includes(query) || fullName.includes(query) || address.includes(query);
      }
    }

    // 2. Financing matching
    const financing = String(p.finansiran);
    const matchesFinancing = activeFilters.financingTypes.includes(financing);

    // 3. School Type matching
    const type = String(p.type);
    const matchesType = activeFilters.schoolType === 'all' || type === activeFilters.schoolType;

    // 4. Profiles matching (school must have at least one of active filters if activeProfiles is not empty)
    const matchesProfiles = activeFilters.activeProfiles.length === 0 || 
      (p.profiles && p.profiles.some(prof => activeFilters.activeProfiles.includes(prof)));

    const shouldShow = matchesSearch && matchesFinancing && matchesType && matchesProfiles;

    if (shouldShow) {
      if (!schoolsLayer.hasLayer(marker)) {
        schoolsLayer.addLayer(marker);
      }
      visibleCount++;
    } else {
      if (schoolsLayer.hasLayer(marker)) {
        schoolsLayer.removeLayer(marker);
      }
    }
  });

  document.getElementById('visible-count').textContent = visibleCount;
}

function setupFilterListeners() {
  // Search — unified with mode toggle
  const searchInput = document.getElementById('search-input');
  const searchModeBtn = document.getElementById('search-mode-toggle');
  let searchMode = 'name'; // 'name' = prefix match by school name, 'free' = includes everywhere

  searchModeBtn.addEventListener('click', function () {
    searchMode = searchMode === 'name' ? 'free' : 'name';
    activeFilters.searchMode = searchMode;
    searchModeBtn.textContent = searchMode === 'name' ? '🏫' : '🔍';
    searchModeBtn.title = searchMode === 'name'
      ? 'Режим: По име (prefix). Натисни за свободно търсене.'
      : 'Режим: Свободно търсене. Натисни за търсене по име.';
    searchInput.placeholder = searchMode === 'name'
      ? 'Търсене по име на училище...'
      : 'Свободно търсене (име, адрес...)';
    applyFilters();
    searchInput.focus();
  });

  searchInput.addEventListener('input', function (e) {
    activeFilters.searchQuery = e.target.value.trim();
    applyFilters();
  });

  // Financing checkboxes
  const checkboxes = document.querySelectorAll('.filter-finansiran');
  checkboxes.forEach(cb => {
    cb.addEventListener('change', function () {
      const activeFin = [];
      checkboxes.forEach(c => {
        if (c.checked) activeFin.push(c.value);
      });
      activeFilters.financingTypes = activeFin;
      applyFilters();
    });
  });

  // School Type dropdown
  const typeSelect = document.getElementById('filter-type');
  typeSelect.addEventListener('change', function (e) {
    activeFilters.schoolType = e.target.value;
    applyFilters();
  });

  // Profile Tag buttons
  const tagButtons = document.querySelectorAll('.tag-btn');
  tagButtons.forEach(btn => {
    btn.addEventListener('click', function () {
      const profile = this.getAttribute('data-profile');
      
      if (this.classList.contains('active')) {
        this.classList.remove('active');
        activeFilters.activeProfiles = activeFilters.activeProfiles.filter(p => p !== profile);
      } else {
        this.classList.add('active');
        activeFilters.activeProfiles.push(profile);
      }
      applyFilters();
    });
  });
}

// ── Layer toggles ──────────────────────────────────────────────
document.getElementById('toggle-districts').addEventListener('change', function () {
  if (this.checked) map.addLayer(districtsLayer);
  else              map.removeLayer(districtsLayer);
});

document.getElementById('toggle-schools').addEventListener('change', function () {
  if (this.checked) map.addLayer(schoolsLayer);
  else              map.removeLayer(schoolsLayer);
});

// ── Close info on map click ────────────────────────────────────
map.on('click', function (e) {
  // Don't clear if click was on a layer (district/school) that already handled it
  if (!e.originalEvent._infoHandled) {
    deselectDistrict();
    deselectSchoolMarker();
    clearInfo();
  }
});

// ── Refresh data from API ──────────────────────────────────────
async function refreshData() {
  const invoke = getTauriInvoke();
  if (!invoke) return;

  const btn = document.getElementById('btn-refresh');
  btn.disabled = true;
  btn.textContent = '⏳ Обновяване...';

  try {
    // Fetch fresh data from Sofiaplan API
    const [schools, districts] = await Promise.all([
      invoke('fetch_schools_from_api'),
      invoke('fetch_districts_from_api')
    ]);

    // Save to local JSON files
    await Promise.all([
      invoke('save_schools', { data: schools }),
      invoke('save_districts', { data: districts })
    ]);

    // Apply normalization with overrides
    const overrides = await invoke('read_overrides');
    normalizeSchools(schools, overrides);

    // Reload the map layers
    districtsLayer.clearLayers();
    districtColourMap = {};
    loadDistricts(districts);
    loadSchools(schools);
    applyFilters();

    btn.textContent = '✅ Обновено!';
    setTimeout(() => { btn.textContent = '🔄 Обнови данни'; }, 2000);
  } catch (err) {
    console.error('Refresh error:', err);
    const msg = err instanceof Error ? err.message : String(err);
    btn.textContent = '❌ Грешка';
    btn.title = msg;
    setTimeout(() => {
      btn.textContent = '🔄 Обнови данни';
      btn.title = 'Обнови данните от API';
    }, 3000);
  } finally {
    btn.disabled = false;
  }
}

document.getElementById('btn-refresh').addEventListener('click', refreshData);

// ── Table Editor ──────────────────────────────────────────────
const tableEditor = document.getElementById('table-editor');
const namesTableBody = document.querySelector('#names-table tbody');
let originalValues = {}; // id -> {short_name, object_nam}

function openTableEditor() {
  // Populate table with current data
  namesTableBody.innerHTML = '';
  originalValues = {};

  const sorted = [...schoolMarkers].sort((a, b) => {
    const na = a.feature.properties.short_name || a.feature.properties.object_nam || '';
    const nb = b.feature.properties.short_name || b.feature.properties.object_nam || '';
    return na.localeCompare(nb, 'bg');
  });

  for (const item of sorted) {
    const p = item.feature.properties;
    const id = String(p.id);
    const shortName = p.short_name || '';
    const fullName = p.object_nam || '';
    originalValues[id] = { short_name: shortName, object_nam: fullName };

    const tr = document.createElement('tr');
    tr.innerHTML = `<td>${escapeHtml(id)}</td>
      <td><input type="text" data-id="${id}" data-field="short_name" value="${escapeHtml(shortName)}" /></td>
      <td><input type="text" data-id="${id}" data-field="object_nam" value="${escapeHtml(fullName)}" /></td>`;
    namesTableBody.appendChild(tr);
  }

  // Mark modified inputs on change
  namesTableBody.addEventListener('input', function (e) {
    if (e.target.tagName !== 'INPUT') return;
    const id = e.target.dataset.id;
    const field = e.target.dataset.field;
    const orig = originalValues[id] ? originalValues[id][field] : '';
    if (e.target.value !== orig) {
      e.target.classList.add('modified');
    } else {
      e.target.classList.remove('modified');
    }
  });

  tableEditor.classList.remove('hidden');
}

function closeTableEditor() {
  tableEditor.classList.add('hidden');
  namesTableBody.innerHTML = '';
}

async function saveTableEdits() {
  const invoke = getTauriInvoke();
  if (!invoke) return;

  // Collect changes
  const inputs = namesTableBody.querySelectorAll('input.modified');
  if (inputs.length === 0) {
    closeTableEditor();
    return;
  }

  // Load current overrides
  let overrides = {};
  try { overrides = await invoke('read_overrides'); } catch(e) {}

  const changes = {};
  inputs.forEach(input => {
    const id = input.dataset.id;
    const field = input.dataset.field;
    const value = input.value.trim();
    if (!changes[id]) changes[id] = {};
    changes[id][field] = value;
  });

  // Merge into overrides (use bracket notation for quotes)
  for (const [id, fields] of Object.entries(changes)) {
    if (!overrides[id]) overrides[id] = {};
    for (const [field, value] of Object.entries(fields)) {
      overrides[id][field] = value.replace(/\u201E/g, '[').replace(/\u201C/g, ']');
    }
  }

  // Save
  await invoke('save_overrides', { data: overrides });

  // Update in-memory features
  for (const [id, fields] of Object.entries(changes)) {
    const item = schoolMarkers.find(m => String(m.feature.properties.id) === id);
    if (!item) continue;
    const p = item.feature.properties;
    if (fields.short_name !== undefined) p.short_name = fields.short_name;
    if (fields.object_nam !== undefined) p.object_nam = fields.object_nam;
    // Update tooltip
    item.marker.unbindTooltip();
    item.marker.bindTooltip(escapeHtml(p.short_name || p.object_nam), {
      permanent: false, direction: 'top', className: 'school-tooltip'
    });
  }

  closeTableEditor();
}

document.getElementById('btn-edit-names').addEventListener('click', openTableEditor);
document.getElementById('btn-close-table').addEventListener('click', closeTableEditor);
document.getElementById('btn-save-table').addEventListener('click', saveTableEdits);

// ── Bootstrap ──────────────────────────────────────────────────
window.addEventListener('load', function () { map.invalidateSize(); });

async function loadData() {
  const invoke = getTauriInvoke();
  if (invoke) {
    const [schools, districts, overrides] = await Promise.all([
      invoke('read_schools'),
      invoke('read_districts'),
      invoke('read_overrides')
    ]);
    // Apply name normalization + overrides
    normalizeSchools(schools, overrides);
    return { schools, districts };
  }
  // Fallback: use global variables from data.js (browser mode)
  return {
    schools: typeof SCHOOLS_DATA !== 'undefined' ? SCHOOLS_DATA : null,
    districts: typeof DISTRICTS_DATA !== 'undefined' ? DISTRICTS_DATA : null
  };
}

(async function init() {
  try {
    const data = await loadData();
    if (data.districts) loadDistricts(data.districts);
    if (data.schools) loadSchools(data.schools);
    setupFilterListeners();
  } catch (err) {
    console.error('Init error:', err);
    const msg = err instanceof Error ? err.message : String(err);
    loadingEl.textContent = 'Грешка: ' + msg;
    loadingEl.classList.remove('hidden');
    return;
  }
  hideLoading();
})();
