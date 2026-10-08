// Reads card data directly from the tarot-data submodule's portable
// dataset (src/data/deck.json + src/data/images/). No Python involved —
// this is exactly the "native client reads the data directly" case that
// dataset was built for.

const DECK_URL = "tarot-data/src/data/deck.json";
const IMAGES_BASE = "tarot-data/src/data/";
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

// Mirrors the spread shapes defined in tarot-data's src/core.py
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
let modalIndex = null; // index into currentReading.cards while the pop-up is open

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
  stopIdleTrail();
  const container = document.getElementById("card-view");
  container.innerHTML = "";
  container.className = `card-view spread-${spreadKey}`;
  container.hidden = false;

  currentReading = { spreadKey, cards, drawnAt: new Date() };

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
    centerStack.appendChild(elements[1]);
    crossGrid.appendChild(centerStack);
    elements.slice(2, 6).forEach((el) => crossGrid.appendChild(el));
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
    el.addEventListener("click", () => openCardModal(i));
  });
  document.getElementById("save-reading-button").hidden = false;
}

function fillCardModal(index) {
  const { spreadKey, cards } = currentReading;
  const reading = cards[index];
  const card = deckByName[reading.englishName];
  const { name, meaning, orientationLabel } = resolveCardText(reading.englishName, reading.orientation, currentLanguage);
  const position = resolvePosition(spreadKey, index, currentLanguage);

  const image = document.getElementById("card-modal-image");
  image.src = IMAGES_BASE + card.images.default;
  image.alt = name;

  document.getElementById("card-modal-name").textContent = name;
  document.getElementById("card-modal-orientation").textContent = orientationLabel;
  document.getElementById("card-modal-meaning").textContent = meaning;

  const positionEl = document.getElementById("card-modal-position");
  const positionDescEl = document.getElementById("card-modal-position-desc");
  positionEl.hidden = !position;
  positionDescEl.hidden = !position;
  if (position) {
    positionEl.textContent = position.label;
    positionDescEl.textContent = position.description;
  }
}

function openCardModal(index) {
  modalIndex = index;
  fillCardModal(index);
  const modal = document.getElementById("card-modal");
  modal.hidden = false;
  document.getElementById("card-modal-close").focus();
}

function closeCardModal() {
  modalIndex = null;
  document.getElementById("card-modal").hidden = true;
}

const TRAIL_MS = 3000;
const TRAIL_W = 480;
const TRAIL_H = 320;
const TRAIL_LINKS = [64, 50, 36];
const TRAIL_SPEED = [0.9, -1.4, 2.1];

// Planar three-link arm: each joint rotates continuously at its own angular
// speed; returns the joint positions, base first, end effector last.
function armPoints(ms, phases) {
  const sec = ms / 1000;
  const pts = [{ x: TRAIL_W / 2, y: TRAIL_H / 2 }];
  let cumulative = 0;
  TRAIL_LINKS.forEach((length, i) => {
    cumulative += TRAIL_SPEED[i] * sec + phases[i];
    const prev = pts[pts.length - 1];
    pts.push({ x: prev.x + length * Math.sin(cumulative), y: prev.y - length * Math.cos(cumulative) });
  });
  return pts;
}

let idleTrailFrame = null;

function startIdleTrail() {
  if (idleTrailFrame !== null) return;
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  const canvas = document.getElementById("trail-canvas");
  const dpr = window.devicePixelRatio || 1;
  canvas.width = TRAIL_W * dpr;
  canvas.height = TRAIL_H * dpr;
  const ctx = canvas.getContext("2d");
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  canvas.hidden = false;

  const phases = TRAIL_LINKS.map(() => Math.random() * 2 * Math.PI);
  const trail = [];
  const bg = cssVar("--bg");
  const fg = cssVar("--fg");
  const accent = cssVar("--accent");
  const start = performance.now();

  const frame = (now) => {
    const elapsed = now - start;
    const pts = armPoints(elapsed, phases);
    trail.push({ x: pts[pts.length - 1].x, y: pts[pts.length - 1].y, t: elapsed });
    while (trail.length && elapsed - trail[0].t > TRAIL_MS) trail.shift();

    ctx.globalAlpha = 1;
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, TRAIL_W, TRAIL_H);

    ctx.strokeStyle = accent;
    ctx.lineWidth = 2.5;
    ctx.lineCap = "round";
    for (let i = 1; i < trail.length; i++) {
      ctx.globalAlpha = Math.max(0, 1 - (elapsed - trail[i].t) / TRAIL_MS);
      ctx.beginPath();
      ctx.moveTo(trail[i - 1].x, trail[i - 1].y);
      ctx.lineTo(trail[i].x, trail[i].y);
      ctx.stroke();
    }

    ctx.globalAlpha = 0.5;
    ctx.strokeStyle = fg;
    ctx.lineWidth = 3;
    ctx.beginPath();
    pts.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
    ctx.stroke();
    ctx.globalAlpha = 1;

    idleTrailFrame = requestAnimationFrame(frame);
  };
  idleTrailFrame = requestAnimationFrame(frame);
}

function stopIdleTrail() {
  if (idleTrailFrame !== null) cancelAnimationFrame(idleTrailFrame);
  idleTrailFrame = null;
  document.getElementById("trail-canvas").hidden = true;
}

const EXPORT_SCALE = 2;
const EXPORT_CARD_W = 240;
const EXPORT_IMAGE_H = 360;
const EXPORT_PAD = 24;
const EXPORT_COL_GAP = 32;
const EXPORT_ROW_GAP = 40;
const EXPORT_FONT = 'system-ui, -apple-system, "Segoe UI", "Noto Sans CJK KR", "Noto Sans CJK JP", "Noto Sans CJK SC", sans-serif';

// Grid cell (col, row) for each card index, matching the on-screen Celtic Cross.
const SPREAD_CELLS = {
  single: [{ col: 0, row: 0 }],
  three: [{ col: 0, row: 0 }, { col: 1, row: 0 }, { col: 2, row: 0 }],
  celtic: [
    { col: 1, row: 1 }, // 0 Present Situation
    { col: 1, row: 2 }, // 1 Challenge
    { col: 1, row: 3 }, // 2 Distant Past/Foundation
    { col: 0, row: 1 }, // 3 Recent Past
    { col: 1, row: 0 }, // 4 Possible Outcome
    { col: 2, row: 1 }, // 5 Near Future
    { col: 3, row: 0 }, // 6 Your Approach
    { col: 3, row: 1 }, // 7 External Influences
    { col: 3, row: 2 }, // 8 Hopes and Fears
    { col: 3, row: 3 }, // 9 Final Outcome
  ],
};

function cssVar(name) {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

function loadImage(src) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

function wrapText(ctx, text, maxWidth) {
  const lines = [];
  let line = "";
  for (const token of text.split(/(\s+)/)) {
    if (!token) continue;
    if (!line && /^\s+$/.test(token)) continue;
    const candidate = line + token;
    if (ctx.measureText(candidate).width <= maxWidth) {
      line = candidate;
      continue;
    }
    if (line.trim()) {
      lines.push(line.trimEnd());
      line = "";
    }
    for (const ch of token) {
      if (!line && /\s/.test(ch)) continue;
      const next = line + ch;
      if (line && ctx.measureText(next).width > maxWidth) {
        lines.push(line);
        line = ch;
      } else {
        line = next;
      }
    }
  }
  if (line.trim()) lines.push(line.trimEnd());
  return lines;
}

function exportTextBlocks(ctx, index) {
  const { englishName, orientation } = currentReading.cards[index];
  const { name, meaning, orientationLabel } = resolveCardText(englishName, orientation, currentLanguage);
  const position = resolvePosition(currentReading.spreadKey, index, currentLanguage);
  const blocks = [];
  const add = (text, font, color, lineHeight, gapAfter, alpha = 1) => {
    ctx.font = font;
    blocks.push({ lines: wrapText(ctx, text, EXPORT_CARD_W), font, color, lineHeight, gapAfter, alpha });
  };
  const accent = cssVar("--accent");
  const fg = cssVar("--fg");
  if (position) {
    add(position.label, `600 22px ${EXPORT_FONT}`, accent, 28, 2);
    add(position.description, `18px ${EXPORT_FONT}`, fg, 24, 10, 0.75);
  }
  add(name, `700 26px ${EXPORT_FONT}`, fg, 32, 4);
  add(orientationLabel, `600 20px ${EXPORT_FONT}`, accent, 26, 6);
  add(meaning, `18px ${EXPORT_FONT}`, fg, 26, 0);
  return blocks;
}

function layoutExport(cells, measureCtx) {
  const items = cells.map((cell) => {
    const blocks = exportTextBlocks(measureCtx, cell.index);
    const textHeight = blocks.reduce((sum, b) => sum + b.lines.length * b.lineHeight + b.gapAfter, 0);
    return { ...cell, blocks, height: EXPORT_IMAGE_H + 14 + textHeight };
  });
  const cols = Math.max(...items.map((i) => i.col)) + 1;
  const rows = Math.max(...items.map((i) => i.row)) + 1;
  const rowHeights = [];
  for (let r = 0; r < rows; r++) {
    rowHeights.push(Math.max(0, ...items.filter((i) => i.row === r).map((i) => i.height)));
  }
  const rowY = [];
  let y = EXPORT_PAD;
  for (let r = 0; r < rows; r++) {
    rowY.push(y);
    y += rowHeights[r] + EXPORT_ROW_GAP;
  }
  items.forEach((item) => {
    item.x = EXPORT_PAD + item.col * (EXPORT_CARD_W + EXPORT_COL_GAP);
    item.y = rowY[item.row];
  });
  return {
    items,
    width: EXPORT_PAD * 2 + cols * EXPORT_CARD_W + (cols - 1) * EXPORT_COL_GAP,
    height: rowY[rows - 1] + rowHeights[rows - 1] + EXPORT_PAD,
  };
}

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

async function exportCells(cells, filename) {
  const measureCtx = document.createElement("canvas").getContext("2d");
  const layout = layoutExport(cells, measureCtx);
  const images = await Promise.all(
    layout.items.map((item) =>
      loadImage(IMAGES_BASE + deckByName[currentReading.cards[item.index].englishName].images.default)
    )
  );

  const canvas = document.createElement("canvas");
  canvas.width = layout.width * EXPORT_SCALE;
  canvas.height = layout.height * EXPORT_SCALE;
  const ctx = canvas.getContext("2d");
  ctx.scale(EXPORT_SCALE, EXPORT_SCALE);
  ctx.fillStyle = cssVar("--bg");
  ctx.fillRect(0, 0, layout.width, layout.height);
  ctx.textBaseline = "top";

  layout.items.forEach((item, k) => {
    const img = images[k];
    if (img) {
      const scale = Math.min(EXPORT_CARD_W / img.naturalWidth, EXPORT_IMAGE_H / img.naturalHeight);
      const w = img.naturalWidth * scale;
      const h = img.naturalHeight * scale;
      ctx.drawImage(img, item.x + (EXPORT_CARD_W - w) / 2, item.y + (EXPORT_IMAGE_H - h) / 2, w, h);
    }
    let ty = item.y + EXPORT_IMAGE_H + 14;
    item.blocks.forEach((block) => {
      ctx.font = block.font;
      ctx.fillStyle = block.color;
      ctx.globalAlpha = block.alpha;
      block.lines.forEach((line) => {
        ctx.fillText(line, item.x, ty);
        ty += block.lineHeight;
      });
      ctx.globalAlpha = 1;
      ty += block.gapAfter;
    });
  });

  canvas.toBlob((blob) => downloadBlob(blob, filename), "image/png");
}

const SPREAD_FILENAME_NAMES = { single: "Single Card", three: "Three-Card", celtic: "Celtic Cross" };

function exportFilename(spreadKey, suffix) {
  const drawn = currentReading.drawnAt;
  const pad = (n) => String(n).padStart(2, "0");
  const stamp = `${drawn.getFullYear()}-${pad(drawn.getMonth() + 1)}-${pad(drawn.getDate())}_${pad(drawn.getHours())}${pad(drawn.getMinutes())}`;
  return [SPREAD_FILENAME_NAMES[spreadKey], stamp, suffix].filter(Boolean).join("_") + ".png";
}

function saveReading() {
  if (!currentReading) return;
  const cells = SPREAD_CELLS[currentReading.spreadKey].map((cell, index) => ({ index, ...cell }));
  exportCells(cells, exportFilename(currentReading.spreadKey));
}

function saveCard() {
  if (modalIndex === null) return;
  exportCells(
    [{ index: modalIndex, col: 0, row: 0 }],
    exportFilename(currentReading.spreadKey, `Card ${modalIndex + 1}`)
  );
}

function resetReading() {
  closeCardModal();
  const container = document.getElementById("card-view");
  container.innerHTML = "";
  container.hidden = true;
  currentReading = null;
  document.getElementById("save-reading-button").hidden = true;
  startIdleTrail();
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
  document.getElementById("save-reading-button").textContent = t(lang, "saveReading");
  document.getElementById("card-modal-save").textContent = t(lang, "saveCard");

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

  if (modalIndex !== null) fillCardModal(modalIndex);

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

document.getElementById("card-modal-close").addEventListener("click", closeCardModal);
document.getElementById("card-modal-save").addEventListener("click", saveCard);
document.getElementById("save-reading-button").addEventListener("click", saveReading);
document.querySelector("#card-modal .card-modal-backdrop").addEventListener("click", closeCardModal);
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && modalIndex !== null) closeCardModal();
});

document.getElementById("language-select").addEventListener("change", (e) => {
  applyLanguage(e.target.value);
});

(async function init() {
  startIdleTrail();
  document.getElementById("language-select").value = currentLanguage;
  try {
    await loadTranslations();
    applyStaticUIText(currentLanguage);
  } catch (err) {
    console.error("Failed to load translations.json on startup:", err);
  }
})();

document.getElementById("footer-year").textContent = new Date().getFullYear();

function initStarfield() {
  const canvas = document.getElementById("starfield-canvas");
  if (!canvas || !canvas.getContext) return;
  const ctx = canvas.getContext("2d");
  const darkQuery = window.matchMedia("(prefers-color-scheme: dark)");
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  let stars = [];
  let raf = null;

  function resize() {
    const dpr = window.devicePixelRatio || 1;
    canvas.width = window.innerWidth * dpr;
    canvas.height = window.innerHeight * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function seedStars() {
    const density = (window.innerWidth * window.innerHeight) / 9000;
    const count = Math.round(Math.min(220, Math.max(60, density)));
    stars = Array.from({ length: count }, () => ({
      x: Math.random() * window.innerWidth,
      y: Math.random() * window.innerHeight,
      r: Math.random() * 1.1 + 0.3,
      baseAlpha: Math.random() * 0.5 + 0.3,
      twinkleSpeed: Math.random() * 0.004 + 0.0012,
      phase: Math.random() * Math.PI * 2,
      vx: (Math.random() - 0.5) * 0.08,
      vy: (Math.random() - 0.5) * 0.08,
    }));
  }

  function drawFrame(now) {
    const w = window.innerWidth;
    const h = window.innerHeight;
    ctx.clearRect(0, 0, w, h);
    for (const s of stars) {
      if (!reduced) {
        s.x = (s.x + s.vx + w) % w;
        s.y = (s.y + s.vy + h) % h;
      }
      const alpha = reduced ? s.baseAlpha : s.baseAlpha + Math.sin(now * s.twinkleSpeed + s.phase) * 0.25;
      ctx.globalAlpha = Math.max(0, Math.min(1, alpha));
      ctx.fillStyle = "#ffffff";
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    raf = reduced ? null : requestAnimationFrame(drawFrame);
  }

  function start() {
    if (raf !== null) return;
    resize();
    seedStars();
    raf = requestAnimationFrame(drawFrame);
  }

  function stop() {
    if (raf !== null) cancelAnimationFrame(raf);
    raf = null;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  }

  function sync() {
    if (darkQuery.matches) start();
    else stop();
  }

  window.addEventListener("resize", () => {
    if (darkQuery.matches) resize();
  });
  darkQuery.addEventListener("change", sync);
  sync();
}

initStarfield();

function initCrystalBall() {
  const canvas = document.getElementById("crystal-ball-canvas");
  if (!canvas || !canvas.getContext) return;
  const ctx = canvas.getContext("2d");
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const SIZE = 36;
  const ARMS = 3;
  const STAR_COUNT = 48;

  const dpr = window.devicePixelRatio || 1;
  canvas.width = SIZE * dpr;
  canvas.height = SIZE * dpr;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  const stars = Array.from({ length: STAR_COUNT }, (_, i) => {
    const arm = i % ARMS;
    const t = (Math.floor(i / ARMS) + Math.random() * 0.6) / Math.ceil(STAR_COUNT / ARMS);
    return {
      radius: Math.sqrt(t) * (SIZE * 0.42),
      angle: arm * ((Math.PI * 2) / ARMS) + t * 4.2,
      size: Math.random() * 0.7 + 0.3,
      alpha: 1 - t * 0.6,
    };
  });

  function drawFrame(now) {
    const cx = SIZE / 2;
    const cy = SIZE / 2;
    const r = SIZE / 2;
    const rotation = reduced ? 0 : now * -0.00025;

    ctx.clearRect(0, 0, SIZE, SIZE);

    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.clip();

    const sphere = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
    sphere.addColorStop(0, "#1a1033");
    sphere.addColorStop(1, "#05030a");
    ctx.fillStyle = sphere;
    ctx.fillRect(0, 0, SIZE, SIZE);

    ctx.fillStyle = "#e8d9ff";
    ctx.globalAlpha = 0.9;
    ctx.beginPath();
    ctx.arc(cx, cy, 1.6, 0, Math.PI * 2);
    ctx.fill();

    for (const star of stars) {
      const angle = star.angle + rotation;
      const x = cx + star.radius * Math.cos(angle);
      const y = cy + star.radius * Math.sin(angle);
      ctx.globalAlpha = star.alpha;
      ctx.fillStyle = "#ffffff";
      ctx.beginPath();
      ctx.arc(x, y, star.size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    ctx.restore();

    const glass = ctx.createRadialGradient(cx - r * 0.35, cy - r * 0.4, 0, cx, cy, r);
    glass.addColorStop(0, "rgba(255, 255, 255, 0.35)");
    glass.addColorStop(0.35, "rgba(255, 255, 255, 0.06)");
    glass.addColorStop(1, "rgba(255, 255, 255, 0)");
    ctx.fillStyle = glass;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = "rgba(255, 255, 255, 0.25)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(cx, cy, r - 0.5, 0, Math.PI * 2);
    ctx.stroke();

    if (!reduced) requestAnimationFrame(drawFrame);
  }

  requestAnimationFrame(drawFrame);
}

initCrystalBall();
