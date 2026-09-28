# NOTES

Build log, rule interpretations and open questions for the designer. Each numbered interpretation is a place where the spec could be read more than one way; I picked the simplest reading I could find. All of them are easy to change.

## What was built

All six milestones are in place.

1. **Skeleton.** Phaser 4.2.1 (latest stable) + Vite 8 + Vitest 5, set up by hand to match the official template's JS/Vite layout. The board renders from `src/data/maps/estuary.json`. A 24-turn game runs from the title screen to the end screen.
2. **Nature.** PREDICTS classes and intensity, `B`, service supply and receipt, wellbeing and happiness, every GDP formula, inspector, overlays, placement preview.
3. **Market and restoration.** Market mode with seeded stage piles, menu mode, all five restoration actions, succession, Primary loss, marine reserves.
4. **Waste.** Token mode with downhill flow, river flow of up to 3 steps, sinks, riparian cleaning and recycling. Token moves are animated from the turn log. Sea and lake pollution. Simple mode. (Later simplified: see 36 to 43.)
5. **Events, objectives, end screen.** Includes counterfactuals (`noNature`, `without[s]`, event damage avoided) and local top-10 high scores for each variant combination.
6. **Tuning tools.** Title-screen variant settings, URL flags, debug view (`D`), first-play hints, `npm run simulate`.

Order of work: I did not finish and run each milestone in turn as section 1 asks. I wrote the whole rules engine and its tests first, then the Phaser scenes. The engine had to be complete before the UI could be tested properly. The git history shows the engine and UI as separate commits, not one commit per milestone.

Tests: 95 Vitest tests, engine line coverage 98.7% (`npm run coverage`). They cover every item in section 17. There are no automated UI tests. I checked the UI by driving it in headless Chromium and looking at screenshots.

## Dependencies

- `phaser`, `vite`, `vitest` as allowed.
- **`@vitest/coverage-v8`** (dev only). This is Vitest's own coverage plugin, needed to measure the >90% line-coverage target. Please confirm this is OK; if not, remove it and the `coverage` script.

## Rule interpretations

### Cells and map

1. **Built cells keep `habitat`.** On a built cell, `habitat` is the ground under the tile (for example the village is on `meadow`). This is how "marine", Hill farm placement and the Harbour's "built land tile" check work. Nature cells use `habitat` as in the spec.
2. **Starting village.** The `#` cells are Cottages on mature-secondary meadow, not Primary. They do not count toward the Ancient heritage objective.
3. **`createGame()`** runs steps 3, 6, 7 and 8. It also projects each tile's GDP so the inspector has a number before turn 1. No cash is credited.
4. **Built cells** always have pressure 0 and their fixed intensity. Pressure only acts on nature cells.
5. **Services are rounded to 3 decimals** after multiplying and summing. Without this, floating-point noise such as 2.9999999 would fail thresholds like FLD ≥ 3.

### Building and restoring

6. **"Next to built"**: every built tile except Fishing fleet and Offshore wind farm counts, including a Harbour, so a town can grow along the shore from a harbour.
6a. **Crossing rivers (designer's change).** A land square also counts as "next to built" when a single river square lies between it and a built land tile in a straight line, as if bridged. Without this the estuary river (which runs the full height of the map) kept every town on the right bank. Bridges are free and have no effect on nature yet; see `TODO.md`.
7. **Wind farms on reserves.** Only fleets and harbours are banned from reserve cells, so a wind farm can go on one. While a reserve cell is built on, it does not turn into seagrass.
8. **Losing ancient habitat another way.** Building on a Primary cell, or restoring one (for example planting woodland on ancient meadow), also counts as losing ancient habitat. It shows the same toast and counts toward "Ancient habitats lost" on the end screen. The preview warns in both cases, and also warns when a build would push a nearby Primary cell to intense use.
9. **Restore in market mode.** The player picks which card to discard; the cheapest non-empty slot is selected by default. Taking slot k for a restoration counts as "taking" it for the market rule, so slot 0 is also discarded unless k = 0.
10. **Restored cells** start at `minimal` intensity for display, then step 3 of the same turn sets the real intensity. Step 5 in that same turn ages them to 1. So "young → intermediate at age 3" happens at the end of the third turn after restoring.
11. **Marine reserve timing.** An open-sea reserve keeps its own counter (`reserveAge`) and becomes seagrass at 4. It then becomes a normal restored `youngSecondary` cell with `age` 0 and matures at 3 and 7 as usual; without the reset it would skip straight to intermediate. A reserve on existing seagrass keeps its land-use class. The reserve cell itself is protected (forced to `minimal`), as well as marine cells within 1.

### Market

12. **Pass** discards slot 0, like any turn where slot 0 was not taken.
13. **Stage piles.** At the start of turns 9 and 17, all earlier piles are emptied. Tiles already in the market stay. When a pile runs out mid-stage, draws come from the next pile, which makes that later stage smaller.
14. **Stage start turns** are in config (`stageStartTurns`), so they can change with `turns`.

### Wellbeing, GDP and counterfactuals

15. **"Within N" excludes the cell itself everywhere**, including the Holiday park's "waste within 1".
16. **Happiness and crowding.** Population-pressure penalties apply after rounding H, and H is rounded again afterwards.
17. **Nature's contribution.** `noNature` and `without[s]` zero the *received services* and recompute income and happiness. Since the simplification (40), every nature bonus to GDP goes through a service, so nothing is left out. Event damage avoided is reported separately and is not part of the counterfactuals.
18. **endGame happiness mode.** The final multiplier applies to (GDP − event damage), as in the first sentence of section 13. Each counterfactual is multiplied by the happiness it would have had on the final board.
19. **Event damage** uses the tile's net GDP this turn (income minus upkeep), before the happiness multiplier, with the £2 minimum. Score can go below zero; cash cannot.
20. **Event protector.** The protector is the cell with the highest supply of the protecting service within that service's radius (ties go to the first cell in row order). Messages are grouped by habitat or building name.
21. **Event reveal.** The HUD shows the first scheduled event at or after the current turn. This gives exactly "one stage ahead" with the default turns, and still works if `eventTurns` changes.

### Waste

22. **River flow.** In step 1, every token moves. In steps 2 and 3, only tokens on river cells move. A token that enters a river from land in step 1 keeps going for steps 2 and 3.
23. **Cleaning order** within step 10.2 is: each nature land cell (in row order) cleans its own cell, then touching river cells (N, E, S, W), up to its capacity; then recycling centres (own cell first, then N, E, S, W).
24. **Water pollution** is one number for the sea and lakes together (see 42). Only healthy seagrass lowers it.
25. **Simple mode.** The polluting tile itself counts as "within 1" of itself, so a Factory's own cell holds a token for its effects. Recycling centres add their 3 to the total clean capacity (otherwise they would do nothing in simple mode). In simple mode, tokens are only drawn in the Waste overlay.

### Objectives

26. **Farm to fork**: at least 4 farm tiles that each receive POL ≥ 3. Other farms can exist too.
27. **Ancient heritage** checks every cell that started Primary. Building on one or restoring it fails the objective.
27a. **Pick 2 of 4 (designer's change).** The seed draws 4 objectives (`objectiveOffer` in config); the player keeps 2 on the title screen (`config.objectives`). Invalid choices fall back to the first 2 on offer. The offer is drawn last, so choosing does not change the market or events.
27b. **New objectives and thresholds.** Added: Biodiversity net gain, 30 by 30, Pollinator paradise, Blue carbon, Rewilder, Clean rivers, Nature pays, Coast guard. On the estuary map, several fixed counts would be met on turn 1 (30 meadow/heath, 11 saltmarsh/seagrass, 7 fen/peat cells), so those are measured against the start: Wetland county is now "create 2 new fen or peat bog cells", Pollinator paradise is "no net loss of meadow and heath", Blue carbon is "gain 2 saltmarsh or seagrass". 30 by 30 counts sea cells protected by a reserve (the reserve cell and marine cells within 1). Coast guard needs at least 2 built tiles within 2 of the sea, all receiving FLD ≥ 3. Nature pays uses the running counterfactual totals (before any end-game happiness multiplier).
27c. **Fixed settings (designer's change).** Flowing waste and crowding (population pressure) are always on. The title screen no longer offers them; `?waste=simple` and `?pressure=0` still work for testing.

### Art and UI

28. **Sprites are 32×32, not 16×16** (changed at the designer's request for a cuter, less blocky look). They are still palette-index strings in `src/art/sprites.js`, still made into textures at boot with `Graphics.generateTexture`, and still swappable for a spritesheet. They are drawn by `scripts/draw-sprites.js` (rounded shapes, soft outlines); run `node scripts/draw-sprites.js` to regenerate after editing it, or edit `sprites.js` directly. The palette is still 16 colours, now softer, with a plum outline instead of black.
29. **Worn and recovering looks** are derived in `src/art/textures.js`. Light and intense use turn soft, noise-shaped patches of vegetation into bare ground (about 20% and 50%). Young and intermediate stages thin the vegetation the same way; woodland has hand-drawn saplings and small trees instead. Built tiles stand on the intense-use version of their habitat.
30. **Sharp text.** The canvas is drawn at twice the logical size (2560×1440; `RES` in `src/ui/layout.js`), and every scene's camera zooms ×2. Text is rendered at high resolution with smooth filtering. Phaser's pixel-art mode sets `image-rendering: pixelated` on the canvas, which made text speckled whenever the browser shrank the canvas; `main.js` sets it back to smooth. Sprites still look crisp, because inside the canvas each sprite pixel covers exactly 3×3 canvas pixels. The font is the system sans-serif (Trebuchet MS / Segoe UI / Verdana).
31. **Full screen.** A button at the bottom right (and on the title screen) toggles full screen where the browser allows it (desktop, Android). iPhones do not allow it for web pages, so the page is also an installable web app (`public/manifest.webmanifest`, Apple home-screen tags, icons): "Add to Home Screen" opens it without browser bars. The title screen explains this on touch devices without full-screen support. In portrait on a small screen, a banner suggests turning the phone sideways.
32. **Nature at work animations.** Each turn, up to 10 small icons fly from the nature square that supplies the most of a service to a tile that uses it (`deliveries()` in `engine/services.js`; `uses` in `data/buildings.js`): pollination to family farms, green space to homes and holiday parks, water to fishing fleets. Bees wobble and leaves spin. In events, shields pop up over protected tiles with a line back to the protector, and hit tiles flash red. Placement previews draw arrows from each supplying square. On by default; switch on the title screen or with N.
33. **Restore icons** appear on the Restore buttons (short labels, full name in the tooltip), as faint ghosts on every square an action can be used on, and in the inspector preview.
34. **Real-time animation.** Phaser's default smooths frame times to 60 fps, which slowed every timer and animation when the frame rate dropped (turns took several seconds to finish in a software-rendered browser). `fps.smoothStep` is off so timings stay in real time.
35. Hints show on the first game only, at most one per turn: how to place, overlays (after the first build), waste (turn 3+), restoring (turn 5+).

### Simplified mechanics (designer's change)

The designer asked for suggestions 1 to 6 of the first `MECHANICS.md` to be made (not 7: biodiversity stays out of GDP). The aim is fewer mechanics, each with one clear job the player can see on the board, so the game teaches which nature does what.

36. **Services reach the four touching squares.** A built tile receives each service from its N, E, S and W squares only (still capped at 6). Radius 1 with diagonals (8 squares) was tried first; the starting cottages still hit the cap for every service, so the four-square rule was chosen. Pressure still counts all 8 squares around a building.
37. **Three services instead of five.** POL (pollination and pest control) is unchanged. REC and AIR became GRN (green space and clean air). WAT and FLD became WAT (clean water and flood protection). Habitat values were merged by hand, roughly the average of the two old values rounded towards the more important role (for example dunes GRN 2 from REC 3 and AIR 0; saltmarsh and seagrass WAT 3 because they are strong flood and water habitats). Events that used FLD or AIR now use WAT or GRN.
38. **Cleaning comes from the water service.** A land nature cell cleans waste equal to its WAT supply (habitat WAT × B), rounded down. This replaces the separate `cleans` column, the "−1 at intense use" rule and the riparian list: any land cell with a strong water service cleans the river beside it. Rounding down means only wetlands and woods clean (meadow, heath and moorland clean 0), which keeps the lesson "wetlands clean water" clear. Worn or young habitat cleans less because its B is lower.
39. **Upkeep.** Every building has an `upkeep` cost taken off its GDP every turn. Income (base plus bonuses minus penalties) still never goes below 0, but net GDP can, so a farm with no pollinators or a fleet in a polluted sea can lose money. The happiness multiplier applies to income only, not upkeep. Cash still never goes below 0. Upkeep values are first guesses: 0 for cottages, 1 for most tiles, 2 for the big earners and the hospital.
40. **Special nature bonuses folded into services.** The Fishing fleet now earns +WAT/2 (seagrass has WAT 3) instead of +1 per seagrass within 2. The Holiday park lost its +1 for ancient habitat within 2 (ancient habitat already supplies more GRN, because B is 1.0). Forest schools and the hospital's clean-air boost are gone.
41. **Simpler wellbeing.** Wellbeing = base (cottages 4, tower block 3) + GRN received (max 6) + school (+1 if one is within 3) + hospital (+2 if one is within 4) − nuisance − waste, clamped to 0 to 10. The low-water penalty is gone.
42. **One water pollution number.** Waste reaching the sea or a lake adds to `state.pollution` (was `seaPollution`, plus a separate `lakePollution` per lake cell that reduced lake supply and never recovered). At 10 or more, sea and lake cells gain 1 pressure. The Holiday park penalty applies if the sea or a lake is within 2. The Clean seas objective is now "Clean waters" (pollution 2 or less), and Clean rivers no longer checks the lake.
43. **Biodiversity is not GDP.** Intactness and ancient habitat still have no direct effect on GDP. They are shown on the HUD and end screen and rewarded by objectives, which is how the game scores them.

## Balance observations (placeholder numbers)

From `npm run simulate -- --games 500` (seeds 1 to 500, default variant), after the simplification (36 to 43):

```
random bot (3.7 s)
  Score (£)                  mean     205.7  sd     59.1  min     69.7  median    199.4  max    418.6
  GDP after damage (£)       mean     173.9  sd     52.3  min     39.2  median    170.0  max    368.6
  Nature's share of GDP      mean     54.9%  sd    11.3%  min    30.9%  median    53.9%  max    93.9%
    POL contribution (£)     mean      13.1  sd     19.4  min      0.0  median      0.0  max     95.4
    GRN contribution (£)     mean      93.8  sd     28.3  min     25.7  median     92.0  max    181.1
    WAT contribution (£)     mean       5.9  sd     14.0  min      0.0  median      0.0  max     74.1
  Event hits (tiles)         mean       4.5  sd      2.2  min      0.0  median      4.0  max     13.0
  Event damage (£)           mean      21.0  sd     12.9  min      0.0  median     18.0  max     70.0
  Damage avoided (£)         mean      20.3  sd     11.5  min      0.0  median     20.0  max     70.0
  Primary cells lost         mean       0.8  sd      1.1  min      0.0  median      0.0  max      5.0
  Intactness at end          mean     79.8%  sd     2.5%  min    72.2%  median    79.7%  max    86.8%
  Objectives met             mean       0.6  sd      0.7  min      0.0  median      1.0  max      2.0

greedy bot (257.5 s)
  Score (£)                  mean     607.7  sd     79.6  min    392.3  median    608.9  max    838.7
  GDP after damage (£)       mean     593.0  sd     77.6  min    385.7  median    594.2  max    788.7
  Nature's share of GDP      mean     66.9%  sd     6.8%  min    51.8%  median    66.3%  max    86.4%
    POL contribution (£)     mean     172.0  sd     38.2  min     41.1  median    175.0  max    273.3
    GRN contribution (£)     mean     312.0  sd     35.8  min    213.4  median    311.1  max    418.3
    WAT contribution (£)     mean      13.5  sd     12.3  min      0.0  median     13.3  max     49.8
  Event hits (tiles)         mean       9.7  sd      4.1  min      1.0  median      9.0  max     22.0
  Event damage (£)           mean      62.4  sd     28.9  min      4.0  median     58.0  max    154.0
  Damage avoided (£)         mean      45.3  sd     17.9  min      6.0  median     44.0  max    120.0
  Primary cells lost         mean       6.0  sd      1.5  min      2.0  median      6.0  max     10.0
  Intactness at end          mean     67.2%  sd     1.7%  min    62.9%  median    67.2%  max    71.7%
  Objectives met             mean       0.3  sd      0.5  min      0.0  median      0.0  max      2.0
```

What stands out, compared with the five-service version:

- **Services now vary across the board.** In a 10-game greedy probe, about 1% of received values hit the cap at the end (about 75% before). The starting cottages receive about 4.8 green space, and happiness starts at 8.8 rather than 10. Greedy games dip to about 6.5 mid-game.
- **Events now matter.** On average 4.5 (random) and 9.7 (greedy) tiles are hit a game, against 0.2 to 0.3 before. Water protection shows up mainly as damage avoided, which is outside the counterfactuals.
- **Scores are lower** (greedy about £608, random about £206), mostly because of upkeep. The greedy bot still scores about 3 times the random bot and loses about 6 ancient cells a game.
- **Nature's share of GDP** is about 55% (random) to 67% (greedy), mostly green space through happiness, then pollination through farms.
- Water pollution is still high by the end of greedy games (see the waste item in `TODO.md`).

### Four bots and building pay-off (after 36 to 43)

44. **Bots** (`scripts/bots.js`; each is one rule):
    - *random*: pass, build or restore at random.
    - *greedy*: the build or restoration with the best gain in this turn's GDP per pound; passes if nothing gains.
    - *nature*: never builds; every turn makes the restoration that would add most GDP once the habitat has grown, then most happiness, then most biodiversity. It uses `preview(..., { grown: true })`, which scores a restoration as mature habitat (and an open-sea reserve as seagrass), and `intactnessDelta`, both added to `preview()` for this.
    - *balanced*: builds like greedy, but only off ancient habitat and where the new tile keeps at least two nature squares touching it; otherwise restores like the nature bot.

`npm run simulate -- --games 500 --bot all`:

| Bot | Score | GDP after damage | Nature's share | Event hits | Ancient lost | Intactness at end | Objectives met |
|---|---|---|---|---|---|---|---|
| random | £206 | £174 | 55% | 4.5 | 0.8 | 80% | 0.6 |
| greedy | £608 | £593 | 67% | 9.7 | 6.0 | 67% | 0.3 |
| nature | £106 | £70 | 39% | 0.3 | 0 | 87% | 0.7 |
| balanced | £615 | £601 | 66% | 11.1 | 5.5 | 65% | 0.3 |

`npm run payoff -- --games 300` (full tables in `reports/payoff-2026-09-28.md`) records every building's net GDP each turn (income × happiness multiplier − upkeep) against the number of nature squares touching it (k), and compares it with what the parameters predict (each touching square supplies the map's average habitat at light use). Findings:

- **Nature on its own earns almost nothing.** The nature bot keeps the two starting cottages and plants woodland around them (happiness 9.7), but with no other buildings nothing uses the services. Restoring mature habitat also *lowers* intactness during a game (89% to 87%), because young habitat has a lower B than what it replaces.
- **The balanced bot is greedy in disguise.** It never restores (a well-spaced build that gains GDP is always available) and scores the same as greedy, losing slightly fewer ancient cells. The two-neighbour rule rarely binds.
- **Only three buildings depend on nature for income, and the data match the theory for them.** Family farm: about £0 a turn with k ≤ 1, £3.1 with k = 3, £3.8 with k = 4 (above theory, because bots put farms next to meadow, POL 3, not the average square). Homes: wellbeing rises with k as predicted (cottages 4.4 at k = 1 to 9.4 at k = 4), about 0.5 to 1 below theory because of nuisance and waste. Holiday park and fishing fleet: well below theory, because water pollution (about 200 by the end of greedy games) wipes out their income; the fleet never pays back.
- **The best buildings ignore nature.** Business parks (pay-off £39.5 a tile, paid back in under a turn) and factories (£24, one turn) earn the same whatever touches them. Their upkeep (1 and 2) is small against income of 5 to 6.
- **Upkeep takes 26 to 30% of income, but rarely changes a decision.** Every building except the holiday park, school, hospital, recycling centre and fleet pays back its cost in about 2 turns or less.
- **Hazards take about 7% of income.** About 55% of tiles at risk are hit, because protection needs 3 WAT from four touching squares and the average land square supplies 1.2. Observed damage per tile-turn is close to the parameter theory: an exposed, unprotected tile expects to lose 0.75 × 4 × its GDP over a game, about 3 turns of income out of 24. So protecting a factory is worth about £12 a game, while a restoration turn gives up a build worth £20 to £40; the bots are right to ignore protection.
- Caution: k is confounded with timing. Tiles with few nature neighbours are mostly built late, when happiness is lower, so some differences for nature-independent buildings (such as Cluck Towers) reflect when they were built, not what touches them.

Open questions and future work are in `TODO.md`.
