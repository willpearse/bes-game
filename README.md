# Green and Pleasant

A single-player, browser-based, pixel-art tile-placement game about the value of nature to a local economy, set in Great Britain. See `NOTES.md` for rule interpretations and balance notes, `TODO.md` for future work, and `CLAUDE.md` for a guide to the code.

## Run it

```sh
npm install
npm run dev        # http://localhost:8080
npm test           # engine tests (Vitest)
npm run coverage   # engine line coverage
npm run build      # static build in dist/
npm run simulate -- --games 500 --bot all   # random, greedy, nature, balanced
npm run payoff -- --games 300               # building pay-off with and without nature, vs theory
```

## How you win

Each game lasts 24 turns. Your score is the GDP you earned (after waste bills, fertiliser, food bought and event damage), plus £50 for each objective met, minus £10 for each resident short of the map's housing target. The end screen also awards a medal:

- **Bronze**: the housing target is met and everyone is fed on the last turn.
- **Silver**: bronze, and both objectives are met.
- **Gold**: silver, and a score above the map's gold score (about what a build-everything bot averages).
- **Platinum**: a gold that beats your own best score on this device.

High scores are kept in the browser's local storage for each map, each setting and each build (commit), so scores from older rules never count.

## Variants

The title screen offers the map (River estuary or Mill valley), the tile mode (market or menu), when happiness counts, the nature-at-work animations, the seed, and a choice of 2 objectives from the 4 the seed offers. Flowing waste is always on in normal play, but every variant can still be switched by URL query for testing:

```
?map=millValley&market=menu&waste=simple&happiness=endGame&seed=42
```

| Query | Values | Meaning |
|---|---|---|
| `market` | `market` (default), `menu` | Take tiles from a 6-slot market, or pick any unlocked tile |
| `waste` | `tokens` (default), `simple` | Waste tokens flow downhill, or only affect neighbours |
| `happiness` | `perTurn` (default), `endGame` | When happiness multiplies GDP |
| `map` | `estuary` (default), `millValley` | Which map to play |
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
- `scripts/bots.js`: the simulation bots (random, greedy, nature, balanced), each a one-sentence rule.
- `scripts/simulate.js`: headless balance simulation.
- `scripts/payoff.js`: how much each kind of building earns with and without nature touching it, against what the parameters predict.

## Deploying to GitHub Pages

`.github/workflows/pages.yml` runs the tests, builds, and publishes `dist/` on each push to `main` (and the current working branch). To turn it on: repository **Settings → Pages → Build and deployment → Source: GitHub Actions**. If the deploy step is refused for a non-default branch, add the branch under **Settings → Environments → github-pages → Deployment branches**, or merge to `main`.
