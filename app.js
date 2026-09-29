// Reads card data directly from the tarot-reader submodule's portable
// dataset (src/data/deck.json + src/data/images/). No Python involved —
// this is exactly the "native client reads the data directly" case that
// dataset was built for.

const DECK_URL = "tarot-reader/src/data/deck.json";
const IMAGES_BASE = "tarot-reader/src/data/";

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

function drawCard(cards) {
  const card = cards[Math.floor(Math.random() * cards.length)];
  const reversed = Math.random() < 0.5;
  return {
    name: card.name,
    orientation: reversed ? "Reversed" : "Upright",
    meaning: reversed ? card.reversed : card.upright,
    image: IMAGES_BASE + card.images.default,
  };
}

function renderCard(card) {
  document.getElementById("card-image").src = card.image;
  document.getElementById("card-image").alt = card.name;
  document.getElementById("card-name").textContent = card.name;
  document.getElementById("card-orientation").textContent = card.orientation;
  document.getElementById("card-meaning").textContent = card.meaning;
  document.getElementById("card-view").hidden = false;
}

document.getElementById("draw-button").addEventListener("click", async () => {
  const button = document.getElementById("draw-button");
  button.disabled = true;
  try {
    const cards = await loadDeck();
    renderCard(drawCard(cards));
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
