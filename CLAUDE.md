# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

A minimal, dependency-free static web app (`index.html`, `app.js`, `style.css`) that draws a random tarot card. There is no build step, no framework, no package.json. All card data (78 cards, meanings, images) lives in the `tarot-reader` git submodule and is read directly by `app.js` via `fetch()` — no server-side or Python involvement.

## Commands

```bash
# One-time setup: fetch the submodule
git submodule update --init

# Run locally — must be served over HTTP, not opened as a file:// URL,
# because browsers block fetch() of local files over file://
python3 -m http.server 8000
# then open http://localhost:8000

# Pull latest card data from tarot-reader and commit the submodule bump
cd tarot-reader && git pull origin main && cd ..
git add tarot-reader
git commit -m "Update tarot-reader submodule"
```

There is no lint, test, or build tooling in this repo.

```bash
# Manually trigger a Pages deployment without a new push
gh workflow run deploy-pages.yml
```

## Architecture

- `index.html` — single page: a hidden `#card-view` section (image, name, orientation, meaning) and a `#draw-button`.
- `app.js` — all logic. `loadDeck()` fetches and caches `tarot-reader/src/data/deck.json` (78-entry array, each card: `name`, `arcana`, `number`/`suit`, `upright`/`reversed` meaning text, `images.default` path, plus a `translations` field keyed by language code with per-card ko/ja/zh overrides of `name`/`upright`/`reversed`, looked up by the card's English `name`). `loadTranslations()` fetches and caches `i18n/translations.json` (UI strings, orientation labels, and spread position labels/descriptions, one block per `SUPPORTED_LANGUAGES` code). `drawOne()`/`drawSpread()` pick random card(s) and orientation(s) (50/50 upright/reversed) for the selected spread; `renderSpread()`, `buildCardElement()`, and `updateCardElementText()` resolve the current-language text via `resolveCardText()`/`resolvePosition()` and write it into the DOM, un-hiding `#card-view`. `currentReading` (`{spreadKey, cards: [{englishName, orientation}]}`) tracks the logical reading separately from the rendered DOM text, so `applyLanguage()` can re-render an existing reading in place on a language switch instead of redrawing. The chosen language persists across reloads in `localStorage` under the key `tarot-web-lang`. Click handler on `#draw-button` wires drawing and rendering together and shows an alert (with the file:// hint) if the fetch fails.
- `style.css` — light/dark theme via `prefers-color-scheme` and CSS custom properties (`--fg`, `--bg`, `--accent`); otherwise a single centered `main` column, no layout framework.
- `tarot-reader/` — git submodule (https://github.com/zafrem/tarot-reader), pinned to a specific commit. This repo only ever reads `tarot-reader/src/data/deck.json` and `tarot-reader/src/data/images/`; nothing here depends on the Python library, CLI, or API also present in that submodule. See `tarot-reader/CLAUDE.md` for that repo's own internals if you need to change the data format itself.
- `.github/workflows/deploy-pages.yml` — deploys to GitHub Pages (https://zafrem.github.io/tarot-web/) on every push to `main`. Checks out with `submodules: recursive` — required because Pages' default branch-deploy source does not initialize submodules, which would otherwise serve an empty `tarot-reader/` and break the deck fetch on the live site.

## Working with the submodule

Card data changes (new cards, fixed meanings, new images) belong in the `tarot-reader` repo, not here. This repo should only ever bump the submodule pointer (via `git add tarot-reader` after pulling) — don't edit files under `tarot-reader/` directly from this repo's history, since those edits live in a detached-HEAD checkout and are easy to lose.
