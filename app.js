// Reads card data directly from the tarot-reader submodule's portable
// dataset (src/data/deck.json + src/data/images/). No Python involved —
// this is exactly the "native client reads the data directly" case that
// dataset was built for.

const DECK_URL = "tarot-reader/src/data/deck.json";
const IMAGES_BASE = "tarot-reader/src/data/";

// Mirrors the spread shapes defined in tarot-reader's src/core.py
// (draw_three / celtic_cross) — reimplemented here in JS since this app
// never involves Python, only the submodule's portable deck.json.
const SPREADS = {
  single: {
    positions: [null],
  },
  three: {
    positions: [
      {
        label: "Past",
        description: "What has led to the current situation.",
      },
      {
        label: "Present",
        description: "The heart of the matter right now.",
      },
      {
        label: "Future",
        description: "Where things are heading if the current path continues.",
      },
    ],
  },
  celtic: {
    positions: [
      {
        label: "Present Situation",
        description: "The heart of the matter — your current circumstances.",
      },
      {
        label: "Challenge",
        description: "What crosses you — the immediate obstacle or tension.",
      },
      {
        label: "Distant Past/Foundation",
        description: "The root cause or foundation this situation is built on.",
      },
      {
        label: "Recent Past",
        description: "What's recently passed or is now fading from influence.",
      },
      {
        label: "Possible Outcome",
        description: "A potential direction if things continue as they are.",
      },
      {
        label: "Near Future",
        description: "What's approaching next.",
      },
      {
        label: "Your Approach",
        description: "How you're approaching the situation.",
      },
      {
        label: "External Influences",
        description: "People, environment, and outside forces at play.",
      },
      {
        label: "Hopes and Fears",
        description: "What you hope for — or secretly fear.",
      },
      {
        label: "Final Outcome",
        description: "The likely culmination of the reading.",
      },
    ],
  },
};

const FLIP_STAGGER_MS = 150;

let deck = null;

async function loadDeck() {
  if (deck) return deck;
  const response = await fetch(DECK_URL);
  if (!response.ok) {
    throw new Error(`Failed to load deck.json: ${response.status}`);
  }
  deck = await response.json();
  return deck;
}

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
    name: card.name,
    orientation: reversed ? "Reversed" : "Upright",
    meaning: reversed ? card.reversed : card.upright,
    image: IMAGES_BASE + card.images.default,
  };
}

function drawSpread(cards, positions) {
  const drawn = shuffle(cards).slice(0, positions.length);
  return drawn.map(drawOne);
}

function buildCardElement(card, position, index) {
  const wrapper = document.createElement("div");
  wrapper.className = `card pos-${index}`;

  if (position) {
    const label = document.createElement("div");
    label.className = "position";
    label.textContent = position.label;
    wrapper.appendChild(label);

    const description = document.createElement("div");
    description.className = "position-description";
    description.textContent = position.description;
    wrapper.appendChild(description);
  }

  const inner = document.createElement("div");
  inner.className = "card-inner";

  const back = document.createElement("div");
  back.className = "card-back";

  const front = document.createElement("div");
  front.className = "card-front";

  const img = document.createElement("img");
  img.src = card.image;
  img.alt = card.name;
  front.appendChild(img);

  const name = document.createElement("h2");
  name.textContent = card.name;
  front.appendChild(name);

  const orientation = document.createElement("p");
  orientation.className = "card-orientation";
  orientation.textContent = card.orientation;
  front.appendChild(orientation);

  const meaning = document.createElement("p");
  meaning.className = "card-meaning";
  meaning.textContent = card.meaning;
  front.appendChild(meaning);

  inner.appendChild(back);
  inner.appendChild(front);
  wrapper.appendChild(inner);

  return wrapper;
}

function renderSpread(cards, positions, spreadKey) {
  const container = document.getElementById("card-view");
  container.innerHTML = "";
  container.className = `card-view spread-${spreadKey}`;
  container.hidden = false;

  cards.forEach((card, i) => {
    const el = buildCardElement(card, positions[i], i);
    container.appendChild(el);
    setTimeout(() => el.classList.add("flipped"), i * FLIP_STAGGER_MS);
  });
}

function resetReading() {
  const container = document.getElementById("card-view");
  container.innerHTML = "";
  container.hidden = true;
}

document.getElementById("draw-button").addEventListener("click", async () => {
  const button = document.getElementById("draw-button");
  button.disabled = true;
  try {
    const spreadKey = document.getElementById("spread-select").value;
    const positions = SPREADS[spreadKey].positions;
    const cards = await loadDeck();
    renderSpread(drawSpread(cards, positions), positions, spreadKey);
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

// Placeholder only — real translation is a separate, not-yet-built effort.
// This just remembers the choice; no UI or card text is translated yet.
let currentLanguage = "en";
document.getElementById("language-select").addEventListener("change", (e) => {
  currentLanguage = e.target.value;
});
