# NOTES

Build log, rule interpretations and open questions for the designer. Each numbered interpretation is a place where the spec could be read more than one way; I picked the simplest reading I could find. All of them are easy to change.

## What was built

All six milestones are in place.

1. **Skeleton.** Phaser 4.2.1 (latest stable) + Vite 8 + Vitest 5, set up by hand to match the official template's JS/Vite layout. The board renders from `src/data/maps/estuary.json`. A 24-turn game runs from the title screen to the end screen.
2. **Nature.** PREDICTS classes and intensity, `B`, service supply and receipt, wellbeing and happiness, every GDP formula, inspector, overlays, placement preview.
3. **Market and restoration.** Market mode with seeded stage piles, menu mode, all five restoration actions, succession, Primary loss, marine reserves.
4. **Waste.** Token mode with downhill flow, river flow of up to 3 steps, sinks, riparian cleaning and recycling. Token moves are animated from the turn log. Sea and lake pollution. Simple mode.
5. **Events, objectives, end screen.** Includes counterfactuals (`noNature`, `without[s]`, event damage avoided) and local top-10 high scores for each variant combination.
6. **Tuning tools.** Title-screen variant settings, URL flags, debug view (`D`), first-play hints, `npm run simulate`.

Order of work: I did not finish and run each milestone in turn as section 1 asks. I wrote the whole rules engine and its tests first, then the Phaser scenes. The engine had to be complete before the UI could be tested properly. The git history shows the engine and UI as separate commits, not one commit per milestone.

Tests: 83 Vitest tests, engine line coverage 98.9% (`npm run coverage`). They cover every item in section 17. There are no automated UI tests. I checked the UI by driving it in headless Chromium and looking at screenshots.

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

15. **"Within N" excludes the cell itself everywhere**, including the Holiday park's "waste within 1" and "Primary within 2".
16. **Happiness and crowding.** Population-pressure penalties apply after rounding H, and H is rounded again afterwards.
17. **Nature's contribution is a lower bound.** `noNature` and `without[s]` only zero the *received services* (and recompute happiness, including a hospital losing its AIR boost). Some GDP depends on nature directly and is not removed: the Fishing fleet's seagrass bonus, the Holiday park's ancient-habitat bonus, and forest schools. So nature's real contribution is somewhat higher than shown.
18. **endGame happiness mode.** The final multiplier applies to (GDP − event damage), as in the first sentence of section 13. Each counterfactual is multiplied by the happiness it would have had on the final board.
19. **Event damage** uses the tile's raw GDP this turn, before the happiness multiplier. Score can go below zero; cash cannot.
20. **Event protector.** The protector is the cell with the highest supply of the protecting service within that service's radius (ties go to the first cell in row order). Messages are grouped by habitat or building name.
21. **Event reveal.** The HUD shows the first scheduled event at or after the current turn. This gives exactly "one stage ahead" with the default turns, and still works if `eventTurns` changes.

### Waste

22. **River flow.** In step 1, every token moves. In steps 2 and 3, only tokens on river cells move. A token that enters a river from land in step 1 keeps going for steps 2 and 3.
23. **Cleaning order** within step 10.2 is: each nature cell cleans itself, then riparian buffers, then recycling centres (own cell first, then N, E, S, W).
24. **Lake pollution never goes down.** The spec gives no recovery rule.
25. **Simple mode.** The polluting tile itself counts as "within 1" of itself, so a Factory's own cell holds a token for its effects. Recycling centres add their 3 to the total clean capacity (otherwise they would do nothing in simple mode). In simple mode, tokens are only drawn in the Waste overlay.

### Objectives

26. **Farm to fork**: at least 4 farm tiles that each receive POL ≥ 3. Other farms can exist too.
27. **Ancient heritage** checks every cell that started Primary. Building on one or restoring it fails the objective.

### Art and UI

28. **Sprites are 32×32, not 16×16** (changed at the designer's request for a cuter, less blocky look). They are still palette-index strings in `src/art/sprites.js`, still made into textures at boot with `Graphics.generateTexture`, and still swappable for a spritesheet. They are drawn by `scripts/draw-sprites.js` (rounded shapes, soft outlines); run `node scripts/draw-sprites.js` to regenerate after editing it, or edit `sprites.js` directly. The palette is still 16 colours, now softer, with a plum outline instead of black.
29. **Worn and recovering looks** are derived in `src/art/textures.js`. Light and intense use turn soft, noise-shaped patches of vegetation into bare ground (about 20% and 50%). Young and intermediate stages thin the vegetation the same way; woodland has hand-drawn saplings and small trees instead. Built tiles stand on the intense-use version of their habitat.
30. **Sharp text.** The canvas is drawn at twice the logical size (2560×1440; `RES` in `src/ui/layout.js`), and every scene's camera zooms ×2. Text is rendered at high resolution with smooth filtering. Phaser's pixel-art mode sets `image-rendering: pixelated` on the canvas, which made text speckled whenever the browser shrank the canvas; `main.js` sets it back to smooth. Sprites still look crisp, because inside the canvas each sprite pixel covers exactly 3×3 canvas pixels. The font is the system sans-serif (Trebuchet MS / Segoe UI / Verdana).
31. **Full screen.** A button at the bottom right (and on the title screen) toggles full screen where the browser allows it (desktop, Android). iPhones do not allow it for web pages, so the page is also an installable web app (`public/manifest.webmanifest`, Apple home-screen tags, icons): "Add to Home Screen" opens it without browser bars. The title screen explains this on touch devices without full-screen support. In portrait on a small screen, a banner suggests turning the phone sideways.
32. Hints show on the first game only, at most one per turn: how to place, overlays (after the first build), waste (turn 3+), restoring (turn 5+).

## Balance observations (placeholder numbers)

From `npm run simulate -- --games 500` (seeds 1 to 500, default variant):

```
random bot (5.2 s)
  Score (£)                  mean     401.9  sd    103.4  min    156.5  median    398.4  max    735.1
  GDP after damage (£)       mean     350.2  sd    100.4  min    106.5  median    352.2  max    685.1
  Nature's share of GDP      mean     49.6%  sd     7.9%  min    30.3%  median    48.8%  max    72.8%
    POL contribution (£)     mean      26.0  sd     36.3  min      0.0  median      0.0  max    168.1
    WAT contribution (£)     mean      22.6  sd      9.1  min      0.0  median     22.7  max     50.4
    FLD contribution (£)     mean       0.0  sd      0.0  min      0.0  median      0.0  max      0.0
    AIR contribution (£)     mean      49.9  sd     18.4  min      0.4  median     49.8  max    108.8
    REC contribution (£)     mean      87.8  sd     35.7  min     15.0  median     83.4  max    240.4
  Event hits (tiles)         mean       0.2  sd      0.4  min      0.0  median      0.0  max      2.0
  Event damage (£)           mean       1.2  sd      3.0  min      0.0  median      0.0  max     16.0
  Damage avoided (£)         mean      55.1  sd     25.8  min      8.0  median     52.0  max    146.0
  Primary cells lost         mean       0.9  sd      1.2  min      0.0  median      1.0  max      7.0
  Intactness at end          mean     80.3%  sd     2.3%  min    73.0%  median    80.2%  max    86.8%
  Objectives met             mean       1.0  sd      0.7  min      0.0  median      1.0  max      2.0

greedy bot (428.7 s)
  Score (£)                  mean    1213.4  sd    109.6  min    905.1  median   1217.1  max   1524.1
  GDP after damage (£)       mean    1160.8  sd    104.7  min    844.5  median   1168.4  max   1440.7
  Nature's share of GDP      mean     61.1%  sd     3.7%  min    47.9%  median    61.4%  max    71.5%
    POL contribution (£)     mean     253.9  sd     58.2  min     51.9  median    258.8  max    387.9
    WAT contribution (£)     mean      64.1  sd     13.2  min     18.0  median     65.3  max     93.2
    FLD contribution (£)     mean       0.0  sd      0.0  min      0.0  median      0.0  max      0.0
    AIR contribution (£)     mean     169.4  sd     24.1  min    118.0  median    166.6  max    246.4
    REC contribution (£)     mean     320.8  sd     45.0  min    201.9  median    322.9  max    423.3
  Event hits (tiles)         mean       0.3  sd      0.5  min      0.0  median      0.0  max      3.0
  Event damage (£)           mean       2.2  sd      4.6  min      0.0  median      0.0  max     40.0
  Damage avoided (£)         mean     140.6  sd     44.2  min     38.0  median    142.0  max    270.0
  Primary cells lost         mean       6.3  sd      1.5  min      2.0  median      7.0  max     11.0
  Intactness at end          mean     67.7%  sd     1.4%  min    63.9%  median    67.6%  max    72.0%
  Objectives met             mean       1.1  sd      0.7  min      0.0  median      1.0  max      2.0
```

What stands out:

- **The service cap saturates almost everywhere.** A tile surrounded by mature nature gets 20 or more units of most services within radius 2, so nearly every tile receives the cap of 6 for all five services. The starting cottages receive 6.0 of everything, and happiness starts at 10. Services therefore rarely separate a good spot from a bad one until the map is heavily built up. Options: lower base values, divide supply by the number of cells in range, add distance decay, or raise the cap and lower the per-cell values.
- **Flood protection earns £0 in the counterfactuals**, because no GDP formula uses FLD; it only matters in events. And because FLD is usually ≥ 3, events rarely hit anything (on average 0.2 to 0.3 tiles hit per game). So "damage avoided" is the only place FLD shows up.
- **Wetland county is met from the start** on the estuary map: it has 4 fen cells and 3 peat bog cells.
- **The greedy bot scores about 3 times as much as the random bot** (£1,213 against £402) and loses about 6 ancient cells a game, against about 1 for the random bot. Chasing GDP visibly costs biodiversity, which fits the design intent.
- Nature's share of GDP is about 50 to 60%. That seems a good headline number, but it is mostly Recreation and Air, largely because of the cap effect above.

## Open questions

- Should lake pollution recover over time, and should lakes count as land in the intactness mean? At the moment they do count, because the spec says "all land cells" and lakes are land-side water.
- Should the Fishing fleet's seagrass bonus and the Holiday park's ancient-habitat bonus count toward nature's contribution (see 17)?
- Should Offshore wind farms be allowed on marine reserves (see 7)?
- The spec's `valleyFormula` hard-codes column 4 as the river line. Future maps should store an explicit elevation grid, which the map loader already accepts (`"elevation": [[...], ...]`).
