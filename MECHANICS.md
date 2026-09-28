# MECHANICS

A one-page view of how the rules turn into score, for balancing. Numbers are the current placeholders in `src/data/`. Findings marked *(probe)* come from 15 greedy-bot games (seeds 1 to 15); the rest are read from the code.

## 1. Score in one line

```
score = Σ over 24 turns [ Σ tile GDP × (1 + 0.1 × (H − 5)) ]  −  event damage  +  50 × objectives met
```

- **Tile GDP** is `base` plus a few bonuses and penalties (table 3).
- **H** (happiness, 0 to 10) is a *global* multiplier on all GDP, from ×0.5 (H 0) to ×1.5 (H 10). Most of nature's value reaches the score through H.
- **One action a turn** (build, restore or pass). Cash starts at 10 and is income, not score.
- Biodiversity (B, intactness, ancient habitat) has **no direct score effect**. It only matters through services and objectives.

## 2. The causal chain

```
buildings ──pressure──▶ nearby nature intensity ──▶ B ──▶ service supply ──▶ services received (capped at 6)
    │                                                                               │
    └──waste──▶ flows downhill ──▶ river ──▶ sea / lake                             ├─▶ tile GDP bonus (POL, REC)
                   │                  │                                             ├─▶ wellbeing ─▶ H ─▶ ×GDP (REC, AIR, WAT)
                   └─▶ pressure,      └─▶ sea pollution ─▶ fleet / holiday park      └─▶ event protection (FLD, AIR, WAT, POL)
                       wellbeing, farm GDP                 GDP, marine pressure
```

Supply = habitat base × B. Received = sum of supply within the service radius (POL 1, others 2), capped at 6.

## 3. Buildings: what they earn, need and cause

| Building | Cost | Base GDP | Nature bonus to GDP | Other GDP modifiers | Waste | Pressure | Nuisance | Residents | Event risk |
|---|---|---|---|---|---|---|---|---|---|
| Cottages | 2 | 1 | – | – | 1 | 1 | – | 1 | heatwave (AIR) |
| Tower block | 5 | 3 | – | – | 2 | 2 | – | 4 | heatwave (AIR) |
| Family farm | 3 | 1 | +POL/2 (max +3) | −1 per waste token on it | 1 | 1 | – | – | heatwave (WAT), pests (POL) |
| Hill farm | 2 | 2 | – | −1 per waste token | 0 | 1 | – | – | heatwave (WAT) |
| Cluck Towers | 5 | 5 | – | −1 per waste token | 3 | 2 | 2 | – | heatwave (WAT) |
| Conifer | 3 | 2 | – | – | 0 | 1 | – | – | pests (POL) |
| Holiday park | 4 | 1 | +REC/2 (max +3), +1 if ancient within 2 | −2 if waste within 1; −sea pollution/5 if sea within 2 | 1 | 1 | – | – | – |
| School | 3 | 1 | (+2 wellbeing if 2+ nature neighbours) | +1 wellbeing to homes within 3 | 0 | 1 | – | – | – |
| Hospital | 5 | 2 | (+2 wellbeing if AIR ≥ 3) | +1 wellbeing to homes within 4 | 1 | 1 | – | – | – |
| Business park | 4 | 2 | – | +1 per home within 2 (max +3) | 1 | 1 | – | – | – |
| Factory | 5 | 6 | – | – | 3 | 2 | 2 | – | – |
| Recycling centre | 3 | 0 | – | removes 3 waste from own + N,E,S,W | 0 | 1 | – | – | – |
| Harbour | 5 | 5 | – | – | 2 | 2 | 2 | – | – |
| Fishing fleet | 3 | 1 | +1 per healthy seagrass within 2 (max +3) | −sea pollution/5 | 0 | 2 | – | – | – |
| Wind farm | 4 | 3 | – | – | 0 | 0 | – | – | – |

Flood and storm events put **any** built tile near a river, lake (within 1) or the sea (within 2) at risk; protected if FLD ≥ 3. Damage per hit tile is max(2, 4 × its GDP).

## 4. Habitats: what they supply and clean

Base supply at B = 1. Actual supply is multiplied by B (0.4 to 1.0 for nature).

| Habitat | POL | WAT | FLD | AIR | REC | Cleans waste | Notes |
|---|---|---|---|---|---|---|---|
| Peat bog | 0 | 3 | 2 | 3 | 1 | 1 | |
| Moorland | 1 | 2 | 1 | 1 | 2 | 0 | Hill farm ground |
| Heath | 2 | 1 | 0 | 1 | 2 | 1 | Hill farm ground |
| Meadow | 3 | 1 | 1 | 1 | 2 | 1 | |
| Woodland | 2 | 2 | 2 | 3 | 3 | 1 | Best all-rounder |
| Fen | 1 | 3 | 3 | 2 | 2 | 2 | +1 riparian clean |
| Saltmarsh | 0 | 2 | 3 | 2 | 1 | 2 | +1 riparian clean |
| Dunes | 1 | 0 | 3 | 0 | 3 | 0 | |
| River | 0 | 1 | 0 | 0 | 2 | 0 | carries waste 3 steps |
| Lake | 0 | 2 | 1 | 0 | 3 | 0 | waste sink; −10% supply per token, forever |
| Seagrass | 0 | 2 | 1 | 2 | 1 | – | −0.5 sea pollution a turn; fleet bonus |
| Open sea | 0 | 0 | 0 | 0 | 1 | – | waste sink |

Built tiles that also supply: family farm (POL 1), hill farm (POL 1, REC 1), conifer (FLD 1, AIR 2, REC 1), times their own B.

## 5. Services: every route to the score

| Service | Direct GDP | Via wellbeing → H → ×all GDP | Events | Objectives |
|---|---|---|---|---|
| **POL** (radius 1) | Family farm +POL/2 | – | Pests: family farm, conifer | Farm to fork |
| **REC** | Holiday park +REC/2 | +REC/2 (max +3) | – | via Happy place |
| **AIR** | – | +AIR/3 (max +2); hospital boost | Heatwave: homes | via Happy place |
| **WAT** | – | −1 only if WAT < 2 | Heatwave: farms | – |
| **FLD** | – | – | River flood, storm surge: all nearby tiles | Coast guard, Weathered it |

## 6. Damages: every route from harm to score

| Harm | Made by | What it hits | Score effect |
|---|---|---|---|
| **Pressure** | built tiles within 1 (+1 or +2 each), waste on cell (+1), sea pollution ≥ 10 (+1 marine) | nature cell intensity (≥1 light, ≥3 intense) | lower B → lower supply (hidden by the cap); intense ancient → lost for good; intense −1 cleaning; intense seagrass stops cleaning sea and feeding fleets |
| **Waste tokens** | buildings (table 3) | the cell and cells downhill | +1 pressure; homes −1 wellbeing per token on self + N,E,S,W (max −3); farms −1 GDP per token; holiday park −2 |
| **Sea pollution** | waste reaching the sea | fleets; holiday parks near sea; all marine cells at ≥ 10 | −1 GDP per 5 pollution; marine pressure |
| **Lake pollution** | waste reaching a lake | lake supply | −10% per token, never recovers |
| **Nuisance** | Cluck Towers, factory, harbour | homes within 1 | −2 wellbeing each (max −4) |
| **Crowding** | residents ≥ 10, 20, 30, 40 | H | −0.5 H per threshold |
| **Events** | turns 8, 16, 24 | unprotected at-risk tiles | −max(2, 4 × tile GDP) |

## 7. What the tables show

1. **The cap hides almost everything.** The starting cottages receive 6 of every service and H is 10. At the end of greedy games 74% of all received service values are still at the cap *(probe)*. So B, intensity, pressure, habitat choice and restoration rarely change any number that feeds the score. This is the root of most other problems.
2. **Nature's value is almost all one route: REC + AIR → H → ×1.5.** With both capped, wellbeing is 5 + 3 + 2 = 10. Removing them drops H to about 5 and GDP by a third. That is why REC and AIR dominate "nature's contribution" and why it looks like 50 to 60%.
3. **FLD and WAT have almost no job.** FLD only acts in events, and it is nearly always ≥ 3, so events hit about 0.3 tiles a game. WAT only costs 1 wellbeing when below 2, which almost never happens.
4. **Schools and hospitals do nothing while wellbeing is already 10** (it is clamped at 10).
5. **Every build except the recycling centre (GDP 0) pays back in 1 to 3 turns, and nothing has a running cost.** With one action a turn, the best play is to build every turn *(probe: greedy never passes and restores less than once a game)*. A restoration costs a whole turn and pays back nothing the cap does not already give.
6. **Harms are too small or too well placed to bite.** Pressure only lowers B (hidden by the cap). Nuisance only reaches homes within 1, which is easy to avoid. Greedy ends with sea pollution around 147 *(probe)*: this zeroes fleets and seaside holiday parks but touches nothing else. Ancient habitat loss (about 6 a game) costs nothing unless an objective asks for it.
7. **Nature also pays outside the service system**: the holiday park's ancient bonus, the fleet's seagrass bonus and forest schools. These are extra rules to learn and do not show in the counterfactuals.

## 8. Simplification ideas

In rough order of payoff. These are options to discuss, not decisions; each needs a simulator run.

1. **Fix saturation first.** Everything else is hard to judge until services vary across the board. The simplest option is probably one radius (1) for all services, keeping the cap. It makes "what is next to it" the whole rule, which players can read at a glance. Uncertain: untouched areas may still saturate, so the cap or base values may also need lowering.
2. **Cut to three services, each with one clear job:**
   - **Pollination** (POL): farm GDP.
   - **Green space** (REC + AIR): wellbeing, so H, and holiday parks.
   - **Water and flood** (WAT + FLD): event protection, and it could *be* the waste-cleaning stat, replacing the separate `cleans` column.
   This removes two icons, two overlays and a column from every table above, and gives WAT and FLD something to do.
3. **Give buildings an ongoing cost** (upkeep per turn, or yield that falls without nature). This is what makes restoration worth a turn, and matches the "working landscapes" request in `TODO.md`.
4. **Simplify wellbeing.** Today it has 8 parts. Base + green space − nuisance − waste would carry the same story. Schools and hospitals could become flat GDP-plus-H buildings, or be cut.
5. **Fold the special nature bonuses into services** (fleet seagrass bonus, holiday park ancient bonus, forest school), or drop them, so all of nature's value flows through the service counterfactuals.
6. **Simplify waste sinks.** Lake pollution is a second, permanent pollution store with a small effect; it could merge with sea pollution into one "water pollution" number. River speed and sea clean-up are already in `TODO.md`.
7. **Make biodiversity count directly**, for example a small score term for intactness or a fixed penalty per ancient cell lost, so the greedy bot's losses cost something without needing an objective.
