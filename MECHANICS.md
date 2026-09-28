# MECHANICS

A one-page view of how the rules turn into score. Numbers are the current placeholders in `src/data/`.

## Why the game exists

Green and Pleasant has two jobs, and both matter:

1. **It must be fun.** Clear choices, visible consequences, a satisfying economy to grow.
2. **It must teach how nature benefits people.** Ecosystem services are real, local and worth money. Development wears them down. Looking after nature pays back over time. The player should leave understanding *which* nature does *what* for *whom*.

Each mechanic below is there to make one of those lessons playable. The last section lists them.

## 1. Score in one line

```
score = Σ over 24 turns [ Σ tile income × (1 + 0.1 × (H − 5))  −  waste bills  −  fertiliser  −  upkeep  −  food bought ]
        − event damage  −  £10 × residents short of the housing target  +  £50 × objectives met
```

Then a **medal**: bronze if the housing target is met and everyone is fed on the last turn; silver if both objectives are met too; gold if the score also reaches the map's gold score (about the build-everything bot's average); platinum for a gold that beats your own best on this device (for this build).

- **Tile income** is a building's base GDP plus bonuses from nature, minus penalties from waste and pollution. It never goes below 0.
- **Waste bill:** nature touching a building soaks up some of its waste (1 per 1.5 water service it receives); every token left over costs £1 (£2 once water pollution reaches 40: chronic pollution is dearer to clean up) and flows downhill. The bill is paid where the waste is made, so cleaning the river afterwards does not lower it; it keeps rivers, homes and the sea clean instead.
- **Upkeep:** a sewage works costs £2 a turn to run.
- **Fertiliser:** family farms and Cluck Towers have soil health (0 to 3). It wears down each turn unless the farm receives 2+ water service (Cluck Towers always wear it down), and recovers otherwise. Each missing point costs £1 a turn.
- **Food:** every resident eats 1 food a turn. Farms and fishing fleets make it; any shortfall is bought in at £1 a unit.
- **Housing target:** each map sets a number of residents to reach by the end, per level: Student (the default) River estuary 9, Mill valley 19; Teacher 16 and 24. The gold score is set per level too.
- **H** (happiness, 0 to 10) multiplies income only, from ×0.5 (H 0) to ×1.5 (H 10).
- **One action a turn**: build, restore or pass. Cash never goes below 0.
- **Biodiversity is scored separately from GDP.** It never adds to GDP. It shows on the HUD and the end screen (intactness, ancient habitats lost), and several objectives reward it (Ancient heritage, Thriving wildlife, Biodiversity net gain, 30 by 30).

## 2. The causal chain

```
buildings ──pressure──▶ touching nature wears out (lower B) ──▶ less service supply
    │                                                               │
    │                        received = supply of the 4 touching squares (N, E, S, W), max 6
    │                                                               │
    │         ┌────────────────────┬──────────────────┬─────────────┼─────────────────────┐
    │         ▼                    ▼                  ▼             ▼                     ▼
    │   POL: farm income     GRN: wellbeing     GRN: holiday   WAT: soaks up waste   WAT: event protection,
    │   and food             ─▶ H ─▶ ×income    park income    (smaller waste bill)  fleet income and food
    │
    │   WAT also keeps farm soil healthy (no fertiliser bill)
    │
    └──waste not soaked up──▶ £1–2 bill each ──▶ downhill ──▶ river ──▶ sea or lake ──▶ water pollution
                                                   (cleaned by nature on the way, by beaver dams in the river,
                                                    or caught by a sewage works, unless it overflows)
                                                                                      ─▶ fleets, holiday parks,
                                                                                         dearer waste bills
```

- **Supply** of a nature square = habitat value (0 to 3) × its biodiversity value B (0.4 to 1.0).
- **Received** by a built tile = the sum of the supply of the four squares touching it, capped at 6.
- **Pressure** on a nature square = the pressure of each building within 1 (including diagonals), +1 for waste on it, +1 for sea and lake squares when water pollution is 10 or more. Pressure 1 or 2 means light use; 3 or more means intense use. Heavier use lowers B.

## 3. Three services

| Service | What supplies it | Income | Food | Happiness | Events | Waste |
|---|---|---|---|---|---|---|
| **POL** Pollination and pest control | meadow, heath, woodland | Family farm +POL/2 | Family farm +POL/2 | – | Pests: family farm, conifer | – |
| **GRN** Green space and clean air | woodland, lake, most habitats | Holiday park +GRN/2 | – | wellbeing +GRN (max +6) | Heatwave: homes | – |
| **WAT** Clean water and flood protection | fen, peat, saltmarsh, seagrass, beaver dams | Fishing fleet +WAT/2 | Fishing fleet +WAT/2 | – | River flood, storm surge: nearby land tiles; heatwave: farms | soaks up 1 waste per 1.5 WAT received; land squares also clean waste flowing past; 2+ keeps farm soil healthy |

A tile is protected from an event if it receives 3 or more of the named service. Damage to each unprotected tile is max(£2, 4 × its GDP that turn). **Floods and storm surges also wreck 1 in 5 of the tiles they hit** (rounded), the most exposed first (largest shortfall of water service; ties broken at random by the seed): the building is gone and the square becomes bare ground. Heatwaves and pest outbreaks only cost money.

## 4. Habitats

Base supply at B = 1. Ancient (primary) habitat has B 1.0, mature 0.9, and restored habitat starts at 0.6 and grows to 0.75 (after 3 turns) and 0.9 (after 7): every service grows at the same pace. **Bare ground** is worn-out, compacted land (PREDICTS class urban, B 0.15 to 0.4): it supplies almost nothing, can be built on, and can be restored to woodland, meadow or (next to water) wetland, which is an immediate gain.

| Habitat | POL | GRN | WAT | Cleans flowing waste (at B 0.9) |
|---|---|---|---|---|
| Bare ground | 0 | 1 | 0 | 0 |
| Peat bog | 0 | 2 | 3 | 3 |
| Moorland | 1 | 2 | 1 | 1 |
| Heath | 2 | 2 | 1 | 1 |
| Meadow | 3 | 2 | 1 | 1 |
| Woodland | 2 | 3 | 2 | 2 |
| Fen | 1 | 2 | 3 | 3 |
| Saltmarsh | 0 | 1 | 3 | 3 |
| Dunes | 1 | 2 | 2 | 2 |
| River | 0 | 2 | 0 | – (carries waste up to 3 squares a turn) |
| River with a beaver dam | 0 | 3 | 2 | 3 (and holds waste that reaches it until next turn) |
| Lake | 0 | 3 | 1 | – (waste sink) |
| Seagrass | 0 | 1 | 3 | – (each healthy cell removes 0.5 water pollution a turn) |
| Open sea | 0 | 1 | 0 | – (waste sink) |

Cleaning is WAT supply (or a dam's 3) × B, rounded to the nearest token. A land square cleans waste on itself first, then on any river square touching it, and keeps cleaning (up to its amount for the turn) as waste flows past during the turn. Water pollution also disperses by 10% a turn. Family farms (POL 1), hill farms (POL 1, GRN 1) and conifer plantations (GRN 2, WAT 1) also supply a little, scaled by their own low B.

## 5. Buildings

| Building | Cost | Income | Food | Waste | Pressure | Nuisance | Residents |
|---|---|---|---|---|---|---|---|
| Cottages | 2 | 1 | – | 1 | 1 | – | 1 |
| Tower block | 5 | 3 | – | 2 | 2 | – | 4 |
| Family farm | 3 | 1 + POL/2; soil | 1 + POL/2 | 1 | 1 | – | – |
| Hill farm | 2 | 2 | 1 | 0 | 1 | – | – |
| Cluck Towers | 7 | 4; soil always wears down | 3 | 3 | 2 | 2 | – |
| Conifer plantation | 3 | 2 | – | 0 | 1 | – | – |
| Holiday park | 4 | 1 + GRN/2; −2 if waste within 1; −pollution/5 if sea or lake within 2 | – | 1 | 1 | – | – |
| School | 3 | 1; +1 wellbeing to homes within 3 | – | 0 | 1 | – | – |
| Hospital | 5 | 2; +2 wellbeing to homes within 4 | – | 1 | 1 | – | – |
| Business park | 6 | 2 + 1 per home within 2 (max +2) | – | 1 | 1 | – | – |
| Factory | 8 | 6 | – | 3 | 2 | 2 | – |
| Fishing fleet | 4 | 1 + WAT/2; −pollution/5 (at most −2) | 1 + WAT/2 | 0 | 2 | – | – |
| Offshore wind farm | 4 | 3; a reef: sea squares touching it are protected like a marine reserve | – | 0 | 0 | – | – |
| Sewage works (on a river square) | 8 | 0; £2 upkeep a turn | – | 0 | 1 | – | – |

**Sewage works.** All waste that reaches it goes into its tank, and it treats 6 a turn. It gives no services. **Storm overflow:** in a river flood, or in any turn when more than 16 residents drain through it (homes whose waste flows downhill past it), the whole tank pours into the river just downstream.

Bonuses round down. Farms (Family farm, Hill farm, Cluck Towers) also lose 1 income per waste token on them and face the heatwave. Homes are Cottages and Tower blocks: each resident eats 1 food a turn.

## 6. Happiness

```
wellbeing (per home, 0 to 10) = base (cottages 4, tower block 3) + GRN received (max 6)
                                + school bonus + hospital bonus − nuisance (max 4) − waste (max 3)
H = resident-weighted average wellbeing
```

Nuisance is 2 for each Cluck Towers or Factory within 1. Waste is 1 per token on the home or a square touching it.

## 7. Costs and harms

| Harm | Made by | What it hits | Effect on score |
|---|---|---|---|
| **Waste bill** | waste that touching nature cannot soak up | the building that made it | £1 a token every turn (£2 once water pollution is 40+) |
| **Worn soil** | farms without 2+ water service; Cluck Towers always | the farm | £1 fertiliser per missing soil point, every turn |
| **Food bought** | residents beyond what farms and fleets feed | the town | £1 a unit, every turn |
| **Pressure** | buildings within 1; waste on the square; water pollution ≥ 10 (sea and lakes) | nature square's use intensity | lower B, so less supply, less soaking up and less cleaning; intense ancient habitat is lost for good |
| **Waste tokens** | released waste | the square and everything downhill | +1 pressure; homes −1 wellbeing per token; farms −1 income per token; holiday park −2 |
| **Water pollution** | waste reaching the sea or a lake | fleets; holiday parks near water; sea and lake squares at ≥ 10 | −1 income per 5 pollution; pressure on seagrass |
| **Nuisance** | Cluck Towers, factory | homes within 1 | −2 wellbeing each |
| **Upkeep** | sewage works | the town | £2 a turn each |
| **Storm overflow** | a river flood, or more than 16 residents draining into a sewage works | the river below the works | its whole tank of waste is released at once |
| **Events** | turns 8, 16, 24 | unprotected tiles at risk | −max(£2, 4 × tile GDP) each; floods and storm surges wreck 1 in 5 of the tiles they hit (most exposed first), leaving bare ground |
| **Housing shortfall** | too few homes at the end | score | −£10 per resident short |

## 8. Restoration

One action, costs a turn (and a market discard, or £1 in menu mode). Plant woodland (on meadow, heath, moorland or bare ground), restore wetland (fen, on meadow or bare ground next to water), sow meadow (on bare ground), rewet peat (on moorland), welcome beavers (a dam on a river square: +1 GRN and +2 WAT, holds waste for a turn and cleans up to 3 a turn), or set up a marine reserve (open sea becomes seagrass after 4 turns; protects marine squares within 1). Restoring a farm or plantation demolishes it. Restored habitat is never ancient again.

## 9. Maps

| Map | Start | Housing target (Student / Teacher) | Gold score (Student / Teacher) | Cash |
|---|---|---|---|---|
| River estuary | wild, healthy land; a village of 2 cottages; many ancient habitats | 9 / 16 | £880 / £730 | £10 |
| Mill valley | a worn valley: a town of 9 cottages and a tower block, with bare ground in the gaps; 4 family farms and 2 hill farms (the old mill and poultry sheds have gone, leaving bare ground) | 19 / 24 | £810 / £790 | £15 |

The estuary teaches "build on the nature you already have"; Mill valley teaches "a worn landscape costs you, and repairing it pays".

## 10. What each mechanic teaches

| Mechanic | Lesson |
|---|---|
| Services come only from the four touching squares | Nature's benefits are local: *where* nature is matters. |
| Three services, each with a clear job | Different habitats do different things: meadows feed farms, woods and lakes make places pleasant, wetlands clean water and stop floods. |
| Supply = habitat × B; pressure lowers B | Worn-out nature delivers less. Development next to nature degrades the very services it relies on. |
| Food depends on pollination and clean water | Nature feeds people: farms and fisheries need pollinators and healthy water. |
| Waste bill, soaked up by touching nature; dearer when pollution is chronic | Nature-based solutions do real work: wetlands and woods beside a factory cut its clean-up costs, and letting pollution build up makes everything dearer. |
| Soil health and fertiliser | Intensive farming wears soil out; nature that holds water and nutrients keeps farms productive without fertiliser. |
| Bare ground, restorable at once | Worn-out land gives almost nothing; restoring it pays from day one. |
| Happiness multiplies income | Green space is good for people, and happy people make the whole economy work better. |
| Waste flows downhill into one water pollution number | Pollution travels; it is cheapest to stop at the source or beside the river. |
| Event damage and wrecked tiles | Nature-based defences (saltmarsh, fen, seagrass) protect homes and businesses for free; unprotected ones are lost. |
| Wind farms as reefs | Well-sited infrastructure can help nature too. |
| Beaver dams | Nature can clean a river from inside it: dams slow the water, trap pollution and hold back floods. |
| Sewage works and storm overflows | Engineering can clean water too, but it costs money every year, and an overloaded system dumps untreated sewage when it rains. Where you put it matters. |
| Student and Teacher levels | The same lessons at two levels of challenge. |
| Medals | A region must house and feed its people first; doing it well with nature is what earns the better medals. |
| Housing target | A region needs homes as well as habitats; the question is where to put them. |
| Ancient habitat can be lost but never restored | Some losses are permanent. Restoration helps but takes years and never fully replaces the old. |
| Two maps | Starting with healthy nature is a gift; repairing worn nature is harder but still pays. |
| End screen counterfactuals | How much of the economy nature quietly pays for, service by service, including food and waste treatment. |
| Biodiversity scored apart from GDP | Nature has value beyond money, and looking after it is a goal in its own right. |
