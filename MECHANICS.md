# MECHANICS

A one-page view of how the rules turn into score. Numbers are the current placeholders in `src/data/`.

## Why the game exists

Green and Pleasant has two jobs, and both matter:

1. **It must be fun.** Clear choices, visible consequences, a satisfying economy to grow.
2. **It must teach how nature benefits people.** Ecosystem services are real, local and worth money. Development wears them down. Looking after nature pays back over time. The player should leave understanding *which* nature does *what* for *whom*.

Each mechanic below is there to make one of those lessons playable. The last section lists them.

## 1. Score in one line

```
score = Σ over 24 turns [ Σ tile income × (1 + 0.1 × (H − 5))  −  waste bills  −  food bought ]
        − event damage  −  £10 × residents short of the housing target  +  £50 × objectives met
```

- **Tile income** is a building's base GDP plus bonuses from nature, minus penalties from waste and pollution. It never goes below 0.
- **Waste bill:** nature touching a building soaks up some of its waste; every token left over costs £1 and flows downhill.
- **Food:** every resident eats 1 food a turn. Farms and fishing fleets make it; any shortfall is bought in at £1 a unit.
- **Housing target:** each map sets a number of residents to reach by the end (River estuary 16, Mill valley 30).
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
    └──waste not soaked up──▶ £1 bill each ──▶ downhill ──▶ river ──▶ sea or lake ──▶ water pollution
                                                                                      ─▶ fleets, holiday parks
```

- **Supply** of a nature square = habitat value (0 to 3) × its biodiversity value B (0.4 to 1.0).
- **Received** by a built tile = the sum of the supply of the four squares touching it, capped at 6.
- **Pressure** on a nature square = the pressure of each building within 1 (including diagonals), +1 for waste on it, +1 for sea and lake squares when water pollution is 10 or more. Pressure 1 or 2 means light use; 3 or more means intense use. Heavier use lowers B.

## 3. Three services

| Service | What supplies it | Income | Food | Happiness | Events | Waste |
|---|---|---|---|---|---|---|
| **POL** Pollination and pest control | meadow, heath, woodland | Family farm +POL/2 | Family farm +POL/2 | – | Pests: family farm, conifer | – |
| **GRN** Green space and clean air | woodland, lake, most habitats | Holiday park +GRN/2 | – | wellbeing +GRN (max +6) | Heatwave: homes | – |
| **WAT** Clean water and flood protection | fen, peat, saltmarsh, seagrass | Fishing fleet +WAT/2 | Fishing fleet +WAT/2 | – | River flood, storm surge: nearby tiles; heatwave: farms | soaks up 1 waste per 2 WAT received; land squares also clean waste flowing past |

A tile is protected from an event if it receives 3 or more of the named service. Damage to each unprotected tile is max(£4, 8 × its GDP that turn).

## 4. Habitats

Base supply at B = 1. Ancient (primary) habitat has B 1.0, mature 0.9, and restored habitat starts at 0.6 and grows to 0.75 (after 3 turns) and 0.9 (after 7).

| Habitat | POL | GRN | WAT | Cleans flowing waste (at B 0.9) |
|---|---|---|---|---|
| Peat bog | 0 | 2 | 3 | 2 |
| Moorland | 1 | 2 | 1 | 0 |
| Heath | 2 | 2 | 1 | 0 |
| Meadow | 3 | 2 | 1 | 0 |
| Woodland | 2 | 3 | 2 | 1 |
| Fen | 1 | 2 | 3 | 2 |
| Saltmarsh | 0 | 1 | 3 | 2 |
| Dunes | 1 | 2 | 2 | 1 |
| River | 0 | 2 | 0 | – (carries waste up to 3 squares a turn) |
| Lake | 0 | 3 | 1 | – (waste sink) |
| Seagrass | 0 | 1 | 3 | – (each healthy cell removes 0.5 water pollution a turn) |
| Open sea | 0 | 1 | 0 | – (waste sink) |

A land square cleans flowing waste on itself first, then on any river square touching it. Water pollution also disperses by 10% a turn. Family farms (POL 1), hill farms (POL 1, GRN 1) and conifer plantations (GRN 2, WAT 1) also supply a little, scaled by their own low B.

## 5. Buildings

| Building | Cost | Income | Food | Waste | Pressure | Nuisance | Residents |
|---|---|---|---|---|---|---|---|
| Cottages | 2 | 1 | – | 1 | 1 | – | 1 |
| Tower block | 5 | 3 | – | 2 | 2 | – | 4 |
| Family farm | 3 | 1 + POL/2 | 1 + POL/2 | 1 | 1 | – | – |
| Hill farm | 2 | 2 | 1 | 0 | 1 | – | – |
| Cluck Towers | 7 | 4 | 3 | 3 | 2 | 2 | – |
| Conifer plantation | 3 | 2 | – | 0 | 1 | – | – |
| Holiday park | 4 | 1 + GRN/2; −2 if waste within 1; −pollution/5 if sea or lake within 2 | – | 1 | 1 | – | – |
| School | 3 | 1; +1 wellbeing to homes within 3 | – | 0 | 1 | – | – |
| Hospital | 5 | 2; +2 wellbeing to homes within 4 | – | 1 | 1 | – | – |
| Business park | 6 | 2 + 1 per home within 2 (max +2) | – | 1 | 1 | – | – |
| Factory | 8 | 6 | – | 3 | 2 | 2 | – |
| Recycling centre | 3 | 0; soaks up 3 waste a turn from buildings touching it | – | 0 | 1 | – | – |
| Harbour | 7 | 5 | – | 2 | 2 | 2 | – |
| Fishing fleet | 4 | 1 + WAT/2; −pollution/5 | 1 + WAT/2 | 0 | 2 | – | – |
| Offshore wind farm | 4 | 3 | – | 0 | 0 | – | – |

Bonuses round down. Farms (Family farm, Hill farm, Cluck Towers) also lose 1 income per waste token on them and face the heatwave. Homes are Cottages and Tower blocks: each resident eats 1 food a turn.

## 6. Happiness

```
wellbeing (per home, 0 to 10) = base (cottages 4, tower block 3) + GRN received (max 6)
                                + school bonus + hospital bonus − nuisance (max 4) − waste (max 3)
H = resident-weighted average wellbeing
```

Nuisance is 2 for each Cluck Towers, Factory or Harbour within 1. Waste is 1 per token on the home or a square touching it.

## 7. Costs and harms

| Harm | Made by | What it hits | Effect on score |
|---|---|---|---|
| **Waste bill** | waste that touching nature and recycling cannot soak up | the building that made it | £1 a token, every turn |
| **Food bought** | residents beyond what farms and fleets feed | the town | £1 a unit, every turn |
| **Pressure** | buildings within 1; waste on the square; water pollution ≥ 10 (sea and lakes) | nature square's use intensity | lower B, so less supply, less soaking up and less cleaning; intense ancient habitat is lost for good |
| **Waste tokens** | released waste | the square and everything downhill | +1 pressure; homes −1 wellbeing per token; farms −1 income per token; holiday park −2 |
| **Water pollution** | waste reaching the sea or a lake | fleets; holiday parks near water; sea and lake squares at ≥ 10 | −1 income per 5 pollution; pressure on seagrass |
| **Nuisance** | Cluck Towers, factory, harbour | homes within 1 | −2 wellbeing each |
| **Events** | turns 8, 16, 24 | unprotected tiles at risk | −max(£4, 8 × tile GDP) each |
| **Housing shortfall** | too few homes at the end | score | −£10 per resident short |

## 8. Restoration

One action, costs a turn (and a market discard, or £1 in menu mode). Plant woodland, restore wetland (fen, next to water), sow meadow, rewet peat, or set up a marine reserve (open sea becomes seagrass after 4 turns; protects marine squares within 1). Restoring a farm or plantation demolishes it. Restored habitat is never ancient again.

## 9. Maps

| Map | Start | Housing target | Cash |
|---|---|---|---|
| River estuary | wild, healthy land; a village of 2 cottages; many ancient habitats | 16 | £10 |
| Mill valley | a worn valley: a town of 10 cottages and a tower block, 4 family farms, 2 hill farms, Cluck Towers and a factory by the river | 30 | £15 |

The estuary teaches "build on the nature you already have"; Mill valley teaches "a worn landscape costs you, and repairing it pays".

## 10. What each mechanic teaches

| Mechanic | Lesson |
|---|---|
| Services come only from the four touching squares | Nature's benefits are local: *where* nature is matters. |
| Three services, each with a clear job | Different habitats do different things: meadows feed farms, woods and lakes make places pleasant, wetlands clean water and stop floods. |
| Supply = habitat × B; pressure lowers B | Worn-out nature delivers less. Development next to nature degrades the very services it relies on. |
| Food depends on pollination and clean water | Nature feeds people: farms and fisheries need pollinators and healthy water. |
| Waste bill, soaked up by touching nature | Nature-based solutions do real work: wetlands and woods beside a factory cut its clean-up costs. |
| Happiness multiplies income | Green space is good for people, and happy people make the whole economy work better. |
| Waste flows downhill into one water pollution number | Pollution travels; it is cheapest to stop at the source or beside the river. |
| Bigger event damage; water protection | Nature-based defences (saltmarsh, fen, seagrass) protect homes and businesses for free. |
| Housing target | A region needs homes as well as habitats; the question is where to put them. |
| Ancient habitat can be lost but never restored | Some losses are permanent. Restoration helps but takes years and never fully replaces the old. |
| Two maps | Starting with healthy nature is a gift; repairing worn nature is harder but still pays. |
| End screen counterfactuals | How much of the economy nature quietly pays for, service by service, including food and waste treatment. |
| Biodiversity scored apart from GDP | Nature has value beyond money, and looking after it is a goal in its own right. |
