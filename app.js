// Reads card data directly from the tarot-reader submodule's portable
// dataset (src/data/deck.json + src/data/images/). No Python involved —
// this is exactly the "native client reads the data directly" case that
// dataset was built for.

const DECK_URL = "tarot-reader/src/data/deck.json";
const IMAGES_BASE = "tarot-reader/src/data/";
const TRANSLATIONS_URL = "i18n/translations.json";
const SUPPORTED_LANGUAGES = ["en", "ko", "ja", "zh"];
const LANGUAGE_STORAGE_KEY = "tarot-web-lang";

let deck = null;
let translations = null;
let deckByName = null;

async function loadDeck() {
  if (deck) return deck;
  const response = await fetch(DECK_URL);
  if (!response.ok) {
    throw new Error(`Failed to load deck.json: ${response.status}`);
  }
  deck = await response.json();
  deckByName = Object.fromEntries(deck.map((c) => [c.name, c]));
  return deck;
}

async function loadTranslations() {
  if (translations) return translations;
  const response = await fetch(TRANSLATIONS_URL);
  if (!response.ok) {
    throw new Error(`Failed to load translations.json: ${response.status}`);
  }
  translations = await response.json();
  return translations;
}

function loadSavedLanguage() {
  try {
    const saved = localStorage.getItem(LANGUAGE_STORAGE_KEY);
    return SUPPORTED_LANGUAGES.includes(saved) ? saved : "en";
  } catch (err) {
    return "en";
  }
}

function saveLanguage(lang) {
  try {
    localStorage.setItem(LANGUAGE_STORAGE_KEY, lang);
  } catch (err) {
    // Private browsing / blocked storage — language choice just won't
    // persist across reloads. Not fatal.
  }
}

let currentLanguage = loadSavedLanguage();

// Mirrors the spread shapes defined in tarot-reader's src/core.py
// (draw_three / celtic_cross) — reimplemented here in JS since this app
// never involves Python, only the submodule's portable deck.json.
// Structure only (position counts) — label/description text lives in
// i18n/translations.json and is resolved at render time via resolvePosition.
const SPREADS = {
  single: { positionCount: 1 },
  three: { positionCount: 3 },
  celtic: { positionCount: 10 },
};

const FLIP_STAGGER_MS = 150;
let currentReading = null; // { spreadKey, cards: [{englishName, orientation}] } | null

function shuffle(cards) {
  const shuffled = cards.slice();
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

function drawOne(card) {
  const reversed = Math.random() < 0.5;
  return {
    englishName: card.name,
    orientation: reversed ? "Reversed" : "Upright",
  };
}

function drawSpread(cards, positionCount) {
  const drawn = shuffle(cards).slice(0, positionCount);
  return drawn.map(drawOne);
}

// Per-key fallback into the en translations block: used for every lookup
// sourced from translations.json, so a language block that's missing an
// individual key (not just missing entirely) still resolves instead of
// throwing or rendering undefined. Card-object fields (name/upright/reversed)
// already fall back per-field via card.translations and don't need this.
function t(lang, path) {
  const get = (obj) =>
    path.split(".").reduce((o, k) => (o == null ? undefined : o[k]), obj);
  return get(translations[lang]) ?? get(translations.en);
}

function resolveCardText(englishName, orientation, lang) {
  const card = deckByName[englishName];
  const translated = card.translations && card.translations[lang];
  const name = (translated && translated.name) || card.name;
  const meaning =
    orientation === "Reversed"
      ? (translated && translated.reversed) || card.reversed
      : (translated && translated.upright) || card.upright;
  const orientationLabel = t(lang, `orientation.${orientation}`);
  return { name, meaning, orientationLabel };
}

function resolvePosition(spreadKey, index, lang) {
  if (spreadKey === "single") return null;
  const list = t(lang, `positions.${spreadKey}`);
  return list[index];
}

function buildCardElement(englishName, orientation, index, spreadKey) {
  const wrapper = document.createElement("div");
  wrapper.className = `card pos-${index}`;

  const position = resolvePosition(spreadKey, index, currentLanguage);
  let label, description;
  if (position) {
    label = document.createElement("div");
    label.className = "position";

    description = document.createElement("div");
    description.className = "position-description";
  }

  const inner = document.createElement("div");
  inner.className = "card-inner";

  const back = document.createElement("div");
  back.className = "card-back";

  const front = document.createElement("div");
  front.className = "card-front";

  const img = document.createElement("img");
  front.appendChild(img);

  const name = document.createElement("h2");
  front.appendChild(name);

  const orientationEl = document.createElement("p");
  orientationEl.className = "card-orientation";
  front.appendChild(orientationEl);

  const meaning = document.createElement("p");
  meaning.className = "card-meaning";
  front.appendChild(meaning);

  inner.appendChild(back);
  inner.appendChild(front);

  if (position) {
    wrapper.appendChild(label);
    wrapper.appendChild(description);
  }
  wrapper.appendChild(inner);

  updateCardElementText(wrapper, englishName, orientation, index, spreadKey);

  return wrapper;
}

function updateCardElementText(wrapper, englishName, orientation, index, spreadKey) {
  const card = deckByName[englishName];
  const { name, meaning, orientationLabel } = resolveCardText(englishName, orientation, currentLanguage);
  const position = resolvePosition(spreadKey, index, currentLanguage);

  const posLabelEl = wrapper.querySelector(".position");
  const posDescEl = wrapper.querySelector(".position-description");
  if (position && posLabelEl && posDescEl) {
    posLabelEl.textContent = position.label;
    posDescEl.textContent = position.description;
  }

  wrapper.querySelector(".card-front img").src = IMAGES_BASE + card.images.default;
  wrapper.querySelector(".card-front img").alt = name;
  wrapper.querySelector(".card-front h2").textContent = name;
  wrapper.querySelector(".card-orientation").textContent = orientationLabel;
  wrapper.querySelector(".card-meaning").textContent = meaning;
}

function renderSpread(cards, spreadKey) {
  const container = document.getElementById("card-view");
  container.innerHTML = "";
  container.className = `card-view spread-${spreadKey}`;
  container.hidden = false;

  currentReading = { spreadKey, cards };

  const elements = cards.map((card, i) =>
    buildCardElement(card.englishName, card.orientation, i, spreadKey)
  );

  // Celtic Cross: the cross (positions 0-5) and the staff (6-9) are built
  // as two independent layout containers, not one shared grid. Coupling
  // them into a single grid previously made the staff cards' row heights
  // depend on the cross's tallest row (the center card-stack), which
  // pushed staff cards to inconsistent vertical positions relative to
  // each other and to the cross's "right" card — producing overlap
  // rather than clean spacing. As two separate flex layouts, each stacks
  // with its own consistent gap regardless of the other's content height.
  if (spreadKey === "celtic") {
    const crossGrid = document.createElement("div");
    crossGrid.className = "celtic-cross-grid";

    // Cards 0 (Present Situation) and 1 (Challenge) share one grid cell
    // by design (the "crossed" pair) — group them in their own stack so
    // their labels/descriptions render one above the other instead of
    // literally overlapping.
    const centerStack = document.createElement("div");
    centerStack.className = "celtic-center";
    centerStack.appendChild(elements[0]);
    centerStack.appendChild(elements[3]);
    centerStack.appendChild(elements[5]);
    centerStack.appendChild(elements[1]);
    crossGrid.appendChild(centerStack);
    crossGrid.appendChild(elements[4]);
    crossGrid.appendChild(elements[2]);
    container.appendChild(crossGrid);

    const staff = document.createElement("div");
    staff.className = "celtic-staff";
    elements.slice(6).forEach((el) => staff.appendChild(el));
    container.appendChild(staff);
  } else {
    elements.forEach((el) => container.appendChild(el));
  }

  elements.forEach((el, i) => {
    setTimeout(() => el.classList.add("flipped"), i * FLIP_STAGGER_MS);
  });
}

function resetReading() {
  const container = document.getElementById("card-view");
  container.innerHTML = "";
  container.hidden = true;
  currentReading = null;
}

function applyStaticUIText(lang) {
  // Keep <html lang> in sync so screen readers use correct pronunciation
  // rules and browsers pick correct CJK font fallbacks for ko/ja/zh text.
  document.documentElement.lang = lang;

  document.getElementById("app-title").textContent = t(lang, "title");
  document.getElementById("app-subtitle").textContent = t(lang, "subtitle");
  document.getElementById("spread-select-label").textContent = t(lang, "spreadLabel");
  document.getElementById("draw-button").textContent = t(lang, "draw");
  document.getElementById("reset-button").textContent = t(lang, "reset");

  const spreadSelect = document.getElementById("spread-select");
  for (const option of spreadSelect.options) {
    option.textContent = t(lang, `spreads.${option.value}`);
  }
}

function applyLanguage(lang) {
  currentLanguage = lang;
  saveLanguage(lang);
  applyStaticUIText(lang);

  if (!currentReading) return;

  const container = document.getElementById("card-view");
  const cardEls = container.querySelectorAll(".card");
  currentReading.cards.forEach((card, i) => {
    updateCardElementText(cardEls[i], card.englishName, card.orientation, i, currentReading.spreadKey);
  });
}

document.getElementById("draw-button").addEventListener("click", async () => {
  const button = document.getElementById("draw-button");
  button.disabled = true;
  try {
    const spreadKey = document.getElementById("spread-select").value;
    const [cards] = await Promise.all([loadDeck(), loadTranslations()]);
    renderSpread(drawSpread(cards, SPREADS[spreadKey].positionCount), spreadKey);
  } catch (err) {
    alert(
      "Could not load the tarot deck data. If you opened this file " +
        "directly in a browser, serve it over a local web server instead " +
        "(e.g. `python3 -m http.server`) — browsers block fetch() of " +
        "local files over file://."
    );
    console.error(err);
  } finally {
    button.disabled = false;
  }
});

document.getElementById("reset-button").addEventListener("click", resetReading);

document.getElementById("language-select").addEventListener("change", (e) => {
  applyLanguage(e.target.value);
});

(async function init() {
  document.getElementById("language-select").value = currentLanguage;
  try {
    await loadTranslations();
    applyStaticUIText(currentLanguage);
  } catch (err) {
    console.error("Failed to load translations.json on startup:", err);
  }
})();
