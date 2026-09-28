# TODO

Ideas and open questions for later sessions. Newest designer requests first.

## Designer requests

- **Ecosystem variability in how fast services recover.** At the moment every restored habitat gives all its services at the same fraction of full strength (by its B), rising as it matures. In reality some work almost at once (a new wetland soaks up and slows water quickly) while others take decades (woodland shade and recreation). Consider per-habitat, per-service ramp-up speeds, if it can be shown clearly.
- **Check that the sea is still fun and working** after the changes in NOTES 53 to 60 (harbours removed, storm surges hit land only, wind farms act as reefs, fleet pollution penalty capped at −2). Play a few games focused on the coast, and look at fleet and wind farm pay-offs in `npm run payoff`.
- **Bridge types.** Rivers are currently crossed by a free, invisible "bridge" (a square counts as next to built if one river square separates it from a built tile; see NOTES 6a). Think about different bridge types as a layer, with a cost versus impact on the ecosystem trade-off: for example a cheap culvert that blocks fish and adds pressure, a clear-span bridge that costs more and leaves the river alone, or a ford. They could affect river flow, waste, WAT and GRN.
- **More maps.** Add more maps in the same format as `src/data/maps/millValley.json` (explicit elevation grid, `startingCash`, `housingTarget`, `goldScore`) and list them in `src/data/maps/index.js` and the Title screen's Map option. Suggestions from the spec: an upland dale with a large lake; chalk downland meeting a cliff coast.
- **GDP-linked objectives: working landscapes, not gardens of Eden.** Add objectives that are plainly about the economy (for example "earn £X GDP in a single turn", "at least N businesses", "keep 4 working farms profitable all game", "GDP grows every stage"). Waste bills, soil decline and food (NOTES 46, 49, 55) now give farms and industry long-term costs; a further idea is infrastructure that degrades nearby habitat each turn it runs.

- **Waste is too fast and too hard to fight.** Waste reaches the sea within a turn or two (river tokens move up to 3 squares a turn), and players will struggle to see how to deal with it. Once waste is in the sea or a lake, the only clean-up is healthy seagrass (0.5 a turn per cell; 4 cells on the estuary map). It gets worse: at water pollution 10+, all sea and lake cells gain pressure, which can push seagrass to intense use and switch its cleaning off. Prevention (nature touching buildings soaks up waste; wetlands by the river clean it) exists and a first-game hint mentions it, but it is still hard to see. Ideas: slow the flow (fewer river steps, or waste pauses on each square); show where waste is going and what is cleaning it (for example a "waste this turn" breakdown: made, cleaned by fen, reached the sea); hint at the counter-play when waste first reaches the river or sea; add direct sea clean-up with its own costs (restoring oyster or mussel beds, a sewage works tile); stop the 10+ pollution trap from shutting seagrass down entirely.

## Balance (from `npm run simulate`, see NOTES.md 53 to 60 and `reports/`)

- **Mill valley: waste bills dominate and greedy still scores highest.** Bills take more than half of income; cottages, Cluck Towers and the factory barely break even. The nature bot earns bronze most often but scores lowest. A bot that restores the bare ground around the town first would show whether repairing the valley can beat building; if not, consider more bare ground next to the factory and homes, or a slightly lower starting waste.
- **Silver and gold are rare** because both objectives are seldom met (2 to 16% of bot games). Check which objectives are near impossible on each map with the simulator.
- **"Fed at the end" catches out builders** who add homes late. Decide whether bronze should check food over the last few turns rather than only the final one.
- The bots only look one turn ahead; a planning bot would show whether early restoration pays back.
- Restoring mature habitat lowers intactness until it matures (young B 0.6), which works against Biodiversity net gain and Thriving wildlife. Decide whether that is the intended lesson.

## Open questions (moved from NOTES.md)

- Should lakes and rivers count as land in the biodiversity intactness mean? They do at the moment, because the spec says "all land cells" and lakes are land-side water.
- Should Offshore wind farms be allowed on marine reserves (NOTES 7)?
- `@vitest/coverage-v8` was added as a dev dependency to measure coverage. Confirm this is OK.

## Smaller ideas

- Sound and music (out of scope for the prototype).
- Touch-friendly controls: bigger buttons and a long press for tooltips on phones.
- A pixel font file for headings, if wanted (currently the system sans-serif).
