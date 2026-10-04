# Tarot (Web)

A local, browser-based tarot reading app — used like a desktop app, run on
your own machine, or visited live at
[zafrem.github.io/tarot-web](https://zafrem.github.io/tarot-web/).

Card data (78 cards, meanings, and public-domain Rider-Waite-Smith images)
comes from the [tarot-data](https://github.com/zafrem/tarot-data) repo,
included here as a git submodule. This app reads `tarot-data/src/data/`
directly — no Python, no server-side calls into that repo.

## Setup

```bash
git submodule update --init
```

## Running

Browsers block `fetch()` of local files over `file://`, so serve this
directory instead of opening `index.html` directly:

```bash
python3 -m http.server 8000
# then open http://localhost:8000
```

## Updating the card data

```bash
cd tarot-data
git pull origin main
cd ..
git add tarot-data
git commit -m "Update tarot-data submodule"
```

## Deployment

Pushes to `main` auto-deploy to GitHub Pages via
[`.github/workflows/deploy-pages.yml`](.github/workflows/deploy-pages.yml).
That workflow checks out with `submodules: recursive` before deploying —
GitHub Pages' default "deploy from a branch" source does not initialize
submodules, which would otherwise leave `tarot-data/` empty on the live
site and break the deck data fetch.

---

[![Buy Me A Coffee](https://img.shields.io/badge/Buy%20Me%20a%20Coffee-ffdd00?style=for-the-badge&logo=buy-me-a-coffee&logoColor=black)](https://buymeacoffee.com/zafrem)

