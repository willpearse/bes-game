# CLAUDE.md

Guide for future sessions working on **Green and Pleasant**: a single-player, browser-based pixel-art tile-placement game about the value of nature to a local economy, set in Great Britain. The designer's original spec is not in the repo; `NOTES.md` records how it was interpreted and every later design change.

## Read first

- `NOTES.md`: what was built, every rule interpretation (numbered), designer changes, balance results. Add to it when you interpret or change a rule.
- `TODO.md`: designer requests for later, balance issues, open questions. Add new open questions here, not in NOTES.
- `README.md`: how to run, variants, controls, deploying.

## Commands

```sh
npm install
npm run dev          # Vite dev server, http://localhost:8080
npm test             # Vitest engine tests (tests/*.test.js)
npm run coverage     # engine line coverage (target > 90%)
npm run build        # static build into dist/ (relative base, works on GitHub Pages)
npm run simulate -- --games 500 --bot greedy   # headless balance run (random | greedy | both)
node scripts/draw-sprites.js                   # regenerate src/art/sprites.js
```

Pushing to `main` or the working branch runs `.github/workflows/pages.yml` (test, build, deploy to GitHub Pages).

## Rules that must hold

- **`src/engine/` never imports Phaser.** It is pure, deterministic JavaScript driven by a seeded RNG (`engine/rng.js`, state kept in `state.rng`). The same seed and actions must always give the same game.
- **State is plain JSON.** `takeTurn(state, action)` returns `{ state, log }` and never mutates its input (it copies with `cloneState` in `engine/actions.js`; update that function when adding state fields). `preview()` caches its baseline per state object, which relies on states never being mutated after creation.
- **Every tunable number lives in `src/data/`**, in flat, data-only files (they will later be generated from an ecosystem services model and PREDICTS).
- **No new dependencies** beyond Phaser, Vite and Vitest (plus the approved-pending `@vitest/coverage-v8`) without asking the designer.
- **British English** in all player-facing text. Plain, short, warm, gently humorous, not preachy.
- Engine changes need Vitest tests. Keep coverage above 90%.

## Structure

```
src/
  main.js              Phaser config: canvas is RES x 1280x720, pixelArt, FIT scaling, real-time fps
  session.js           GameSession: bridge between engine and scenes (state, selection, events)
  engine/              pure rules (no Phaser)
    state.js           createGame(), map parsing, recompute(), objective offer/choice
    actions.js         legalTargets(), preview(), takeTurn(), endGame(), cloneState(), placement rules
    intensity.js       pressure -> use intensity, B (PREDICTS), Primary loss, succession, intactness
    services.js        supply, services received, topContributor(), deliveries() for animations
    happiness.js       wellbeing and happiness
    gdp.js             tile GDP, happiness multiplier, counterfactuals (noNature, without[s])
    waste.js           token waste flow (downhill, rivers, sinks) and simple mode
    events.js          events: tiles at risk, protection, damage, reports
    objectives.js      objective evaluation
    market.js          stage piles, market shifting, menu unlocks
    grid.js            grid helpers (within = Chebyshev excluding self, ortho = N,E,S,W)
    rng.js             mulberry32
  data/                config.js (CONFIG + constants), predicts.js, habitats.js, buildings.js,
                       restorations.js, services.js (IPBES mapping), events.js, objectives.js,
                       decks.js, maps/ (estuary.json + index.js)
  art/
    palette.js         16-colour palette and UI colours
    sprites.js         GENERATED 32x32 palette-index strings (edit scripts/draw-sprites.js, or this file)
    textures.js        derives worn (light/intense) and young/intermediate habitat looks
  scenes/              Boot (textures), Title (settings, pick 2 of 4 objectives, scores),
                       Game (board, overlays, animations), UI (HUD, market, inspector, modals), End
  ui/                  layout.js (positions, RES, camera helpers), widgets.js (text, button, panel),
                       prefs.js (URL flags, localStorage: scores, hints, settings), describe.js
tests/                 Vitest; helpers.js has tinyGame() for small hand-made maps
scripts/               simulate.js (bots), draw-sprites.js (art generator)
public/                favicon, web app manifest, home-screen icons
```

## How a turn works

`takeTurn` applies the action, then in order: market update, intensity, Primary loss, succession, supply, services received, happiness, GDP (plus counterfactuals), waste, event, advance turn. The `log` it returns drives all animations and messages (GDP floats, waste token moves, events, toasts).

## Display notes

- Logical size 1280x720. The canvas is drawn at `RES` (2) times that and each scene calls `setupCamera(this)`, which zooms the camera by `RES`. Use logical coordinates everywhere; convert pointer positions with `logicalPointer(scene, pointer)`.
- Sprites are 32x32, shown at 48 px on the board (scale 1.5), so each sprite pixel covers exactly 3x3 canvas pixels. Keep scales at multiples of 0.5 to stay crisp.
- `main.js` resets the canvas `image-rendering` to smooth (Phaser's pixel-art mode sets it to pixelated, which speckles text), and turns off `fps.smoothStep` so animations run in real time on slow devices.
- Checking the UI: there are no UI tests. Build, run `npx vite preview`, and drive it with Playwright (global install, Chromium at `/opt/pw-browsers/chromium`) to take screenshots.

## Variants and settings

`src/data/config.js` holds `CONFIG`. URL flags override it: `?market=menu&waste=simple&happiness=endGame&pressure=0&seed=42`. The title screen offers only tiles (market or menu), happiness timing, the nature-at-work animations, the seed and the objective choice. Flowing waste and crowding are always on in normal play.
