# MECHANICS

A one-page view of how the rules turn into score. Numbers are the current placeholders in `src/data/`.

## Why the game exists

Green and Pleasant has two jobs, and both matter:

1. **It must be fun.** Clear choices, visible consequences, a satisfying economy to grow.
2. **It must teach how nature benefits people.** Ecosystem services are real, local and worth money. Development wears them down. Looking after nature pays back over time. The player should leave understanding *which* nature does *what* for *whom*.

Each mechanic below is there to make one of those lessons playable. The last section lists them.

## 1. Score in one line

```
score = Σ over 24 turns [ Σ tile income × (1 + 0.1 × (H − 5))  −  Σ upkeep ]  −  event damage  +  50 × objectives met
```

- **Tile income** is a building's base GDP plus bonuses from nature, minus penalties from waste and pollution. It never goes below 0.
- **Upkeep** is a fixed running cost per building. A tile whose income falls below its upkeep loses money.
- **H** (happiness, 0 to 10) multiplies all income, from ×0.5 (H 0) to ×1.5 (H 10).
- **One action a turn**: build, restore or pass. Cash starts at £10 and never goes below 0.
- **Biodiversity is scored separately from GDP.** It never adds to GDP. It shows on the HUD and the end screen (intactness, ancient habitats lost), and several objectives reward it (Ancient heritage, Thriving wildlife, Biodiversity net gain, 30 by 30).

## 2. The causal chain

```
buildings ──pressure──▶ touching nature wears out (lower B) ──▶ less service supply
    │                                                               │
    │                        received = supply of the 4 touching squares (N, E, S, W), max 6
    │                                                               │
    │                    ┌──────────────────────┬───────────────────┼──────────────────────┐
    │                    ▼                      ▼                   ▼                      ▼
    │             POL: farm income      GRN: wellbeing ─▶ H    GRN: holiday park     WAT: fleet income
    │                                   ─▶ ×all income          income               WAT: event protection
    │                                                                                WAT: cleans waste
    └──waste──▶ downhill ──▶ river ──▶ sea or lake ──▶ water pollution ──▶ fleet and holiday park income
```

- **Supply** of a nature square = habitat value (0 to 3) × its biodiversity value B (0.4 to 1.0).
- **Received** by a built tile = the sum of the supply of the four squares touching it, capped at 6.
- **Pressure** on a nature square = the pressure of each building within 1 (including diagonals), +1 for waste on it, +1 for sea and lake squares when water pollution is 10 or more. Pressure 1 or 2 means light use; 3 or more means intense use. Heavier use lowers B.

## 3. Three services

| Service | What supplies it | Direct income | Happiness | Events | Waste |
|---|---|---|---|---|---|
| **POL** Pollination and pest control | meadow, heath, woodland | Family farm +POL/2 | – | Pests: family farm, conifer | – |
| **GRN** Green space and clean air | woodland, lake, most habitats | Holiday park +GRN/2 | wellbeing +GRN (max +6) | Heatwave: homes | – |
| **WAT** Clean water and flood protection | fen, peat, saltmarsh, seagrass | Fishing fleet +WAT/2 | – | River flood, storm surge: nearby tiles; heatwave: farms | a land square cleans its WAT supply (rounded down) in waste tokens a turn |

A tile is protected from an event if it receives 3 or more of the named service. Damage to each unprotected tile is max(£2, 4 × its GDP).

## 4. Habitats

Base supply at B = 1. Ancient (primary) habitat has B 1.0, mature 0.9, and restored habitat starts at 0.6 and grows to 0.75 (after 3 turns) and 0.9 (after 7).

| Habitat | POL | GRN | WAT | Cleans (at B 0.9) |
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

A land square cleans waste on itself first, then on any river square touching it. Family farms (POL 1), hill farms (POL 1, GRN 1) and conifer plantations (GRN 2, WAT 1) also supply a little, scaled by their own low B.

## 5. Buildings

| Building | Cost | Base | Nature bonus | Other modifiers | Upkeep | Waste | Pressure | Nuisance | Residents |
|---|---|---|---|---|---|---|---|---|---|
| Cottages | 2 | 1 | – | – | 0 | 1 | 1 | – | 1 |
| Tower block | 5 | 3 | – | – | 1 | 2 | 2 | – | 4 |
| Family farm | 3 | 1 | +POL/2 | −1 per waste token on it | 1 | 1 | 1 | – | – |
| Hill farm | 2 | 2 | – | −1 per waste token | 1 | 0 | 1 | – | – |
| Cluck Towers | 5 | 5 | – | −1 per waste token | 2 | 3 | 2 | 2 | – |
| Conifer plantation | 3 | 2 | – | – | 1 | 0 | 1 | – | – |
| Holiday park | 4 | 1 | +GRN/2 | −2 if waste within 1; −pollution/5 if sea or lake within 2 | 1 | 1 | 1 | – | – |
| School | 3 | 1 | – | +1 wellbeing to homes within 3 | 1 | 0 | 1 | – | – |
| Hospital | 5 | 2 | – | +2 wellbeing to homes within 4 | 2 | 1 | 1 | – | – |
| Business park | 4 | 2 | – | +1 per home within 2 (max +3) | 1 | 1 | 1 | – | – |
| Factory | 5 | 6 | – | – | 2 | 3 | 2 | 2 | – |
| Recycling centre | 3 | 0 | – | removes 3 waste from its own and touching squares | 1 | 0 | 1 | – | – |
| Harbour | 5 | 5 | – | – | 2 | 2 | 2 | 2 | – |
| Fishing fleet | 3 | 1 | +WAT/2 | −pollution/5 | 1 | 0 | 2 | – | – |
| Offshore wind farm | 4 | 3 | – | – | 1 | 0 | 0 | – | – |

Bonuses round down. Farms are Family farm, Hill farm and Cluck Towers (for waste and the heatwave). Homes are Cottages and Tower blocks.

## 6. Happiness

```
wellbeing (per home, 0 to 10) = base (cottages 4, tower block 3) + GRN received (max 6)
                                + school bonus + hospital bonus − nuisance (max 4) − waste (max 3)
H = resident-weighted average wellbeing, minus 0.5 for each of 10, 20, 30, 40 residents (crowding)
```

Nuisance is 2 for each Cluck Towers, Factory or Harbour within 1. Waste is 1 per token on the home or a square touching it.

## 7. Harms

| Harm | Made by | What it hits | Effect on score |
|---|---|---|---|
| **Pressure** | buildings within 1; waste on the square; water pollution ≥ 10 (sea and lakes) | nature square's use intensity | lower B, so less supply and less cleaning; intense ancient habitat is lost for good |
| **Waste tokens** | buildings | the square and everything downhill | +1 pressure; homes −1 wellbeing per token; farms −1 income per token; holiday park −2 |
| **Water pollution** | waste reaching the sea or a lake | fleets; holiday parks near water; sea and lake squares at ≥ 10 | −1 income per 5 pollution; pressure on seagrass |
| **Nuisance** | Cluck Towers, factory, harbour | homes within 1 | −2 wellbeing each |
| **Crowding** | 10, 20, 30, 40 residents | H | −0.5 H per threshold |
| **Events** | turns 8, 16, 24 | unprotected tiles at risk | −max(£2, 4 × tile GDP) each |
| **Upkeep** | every building, every turn | cash and score | fixed cost, not helped by happiness |

## 8. Restoration

One action, costs a turn (and a market discard, or £1 in menu mode). Plant woodland, restore wetland (fen, next to water), sow meadow, rewet peat, or set up a marine reserve (open sea becomes seagrass after 4 turns; protects marine squares within 1). Restoring a farm or plantation demolishes it, which also removes its upkeep. Restored habitat is never ancient again.

## 9. What each mechanic teaches

| Mechanic | Lesson |
|---|---|
| Services come only from the four touching squares | Nature's benefits are local: *where* nature is matters. |
| Three services, each with a clear job | Different habitats do different things: meadows feed farms, woods and lakes make places pleasant, wetlands clean water and stop floods. |
| Supply = habitat × B; pressure lowers B | Worn-out nature delivers less. Development next to nature degrades the very services it relies on. |
| Upkeep, and income that depends on services | A working landscape needs nature to stay profitable; a farm without pollinators can run at a loss. |
| Happiness multiplies income | Green space is good for people, and happy people make the whole economy work better. |
| Wetlands clean waste; waste flows downhill | Pollution travels; it is cheapest to stop at the source or beside the river. |
| Events and water protection | Nature-based defences (saltmarsh, fen, seagrass) protect homes and businesses for free. |
| Ancient habitat can be lost but never restored | Some losses are permanent. Restoration helps but takes years and never fully replaces the old. |
| End screen counterfactuals | How much of the economy nature quietly pays for, service by service. |
| Biodiversity scored apart from GDP | Nature has value beyond money, and looking after it is a goal in its own right. |
