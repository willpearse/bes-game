# Green and Pleasant

A single-player, browser-based, pixel-art tile-placement game about the value of nature to a local economy, set in Great Britain. See `NOTES.md` for rule interpretations and balance notes, `TODO.md` for future work, and `CLAUDE.md` for a guide to the code.

## Run it

```sh
npm install
npm run dev        # http://localhost:8080
npm test           # engine tests (Vitest)
npm run coverage   # engine line coverage
npm run build      # static build in dist/
npm run simulate -- --games 500 --bot greedy
```

## Variants

The title screen offers the tile mode (market or menu), when happiness counts, the nature-at-work animations, the seed, and a choice of 2 objectives from the 4 the seed offers. Flowing waste and crowding are always on in normal play, but every variant can still be switched by URL query for testing:

```
?market=menu&waste=simple&happiness=endGame&pressure=1&seed=42
```

| Query | Values | Meaning |
|---|---|---|
| `market` | `market` (default), `menu` | Take tiles from a 6-slot market, or pick any unlocked tile |
| `waste` | `tokens` (default), `simple` | Waste tokens flow downhill, or only affect neighbours |
| `happiness` | `perTurn` (default), `endGame` | When happiness multiplies GDP |
| `pressure` | `1` (default), `0` | Population pressure (crowding) lowers happiness |
| `seed` | number | Replay a particular game |

## Controls

- Click a market card, then a gold square on the map, to build.
- Switch to **Restore**, pick an action and a card to discard, then click a square.
- **P** passes the turn. **Esc** or right-click cancels. **N** turns the nature-at-work animations on or off. **D** toggles the debug view.
- The bottom bar switches map overlays (each service, biodiversity, waste flow). The button at its right end toggles full screen.
- On a phone, play it sideways. On iPhone or iPad, tap Share → "Add to Home Screen" to play without browser bars (Apple doesn't allow a full-screen button on web pages).

## Layout

- `src/engine/`: the rules, pure JavaScript with no Phaser import, driven by a seeded RNG.
- `src/data/`: every tunable number and table (flat, data-only files).
- `src/art/`: the palette and 32×32 sprites as palette-index strings (drawn by `scripts/draw-sprites.js`).
- `src/scenes/`: Phaser scenes (Boot, Title, Game, UI, End).
- `scripts/simulate.js`: headless balance simulation with a random and a greedy bot.

## Deploying to GitHub Pages

`.github/workflows/pages.yml` runs the tests, builds, and publishes `dist/` on each push to `main` (and the current working branch). To turn it on: repository **Settings → Pages → Build and deployment → Source: GitHub Actions**. If the deploy step is refused for a non-default branch, add the branch under **Settings → Environments → github-pages → Deployment branches**, or merge to `main`.
