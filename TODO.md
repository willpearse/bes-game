# TODO

Ideas and open questions for later sessions. Newest designer requests first.

## Designer requests

- **Bridge types.** Rivers are currently crossed by a free, invisible "bridge" (a square counts as next to built if one river square separates it from a built tile; see NOTES 6a). Think about different bridge types as a layer, with a cost versus impact on the ecosystem trade-off: for example a cheap culvert that blocks fish and adds pressure, a clear-span bridge that costs more and leaves the river alone, or a ford. They could affect river flow, waste, WAT and REC.
- **Different maps.** Add more maps in the same format as `src/data/maps/estuary.json`. Suggestions from the spec: an upland dale with a large lake; chalk downland meeting a cliff coast. New maps should store an explicit elevation grid (the loader already accepts `"elevation": [[...], ...]`), because `valleyFormula` hard-codes the river at column 4. The title screen will need a map picker, and high scores are already kept per map.
- **GDP-linked objectives: working landscapes, not gardens of Eden.** Add objectives that are plainly about the economy (for example "earn £X GDP in a single turn", "at least N businesses", "keep 4 working farms profitable all game", "GDP grows every stage") so the game is clearly about landscapes that work. This needs clear long-term costs and downsides from farms and other infrastructure, including when nature nearby is supporting them, so there is a real trade-off rather than "restore everything". Ideas: soil degradation on intensive farms over time, maintenance costs, farms that lose yield if pollinators decline, infrastructure that degrades nearby habitat each turn it runs.

- **Waste is too fast and too hard to fight.** Waste reaches the sea within a turn or two (river tokens move up to 3 squares a turn), and players will struggle to see how to deal with it. Once waste is in the sea, the only clean-up is healthy seagrass (0.5 a turn per cell; 4 cells on the estuary map). It gets worse: at sea pollution 10+, all sea cells gain pressure, which can push seagrass to intense use and switch its cleaning off. Prevention (fen and saltmarsh by the river, recycling centres) exists but isn't explained in the game. Ideas: slow the flow (fewer river steps, or waste pauses on each square); show where waste is going and what is cleaning it (for example a "waste this turn" breakdown: made, cleaned by fen, reached the sea); hint at the counter-play when waste first reaches the river or sea; add direct sea clean-up with its own costs (restoring oyster or mussel beds, a sewage works tile); stop the 10+ pollution trap from shutting seagrass down entirely.

## Balance (from `npm run simulate`, see NOTES.md)

- The service cap of 6 is reached almost everywhere, so services rarely separate a good spot from a bad one, and happiness starts at 10. Options: lower base values, distance decay, divide supply by the number of cells in range, or a higher cap with lower per-cell values.
- Flood protection earns £0 in the GDP counterfactuals (no GDP formula uses FLD) and protects so well that events rarely hit anything.
- The greedy bot scores about 3 times the random bot and loses about 6 ancient cells a game.
- Check the new objectives with the simulator: how often each is met by each bot, and whether any is trivially met or near impossible on the estuary map.

## Open questions (moved from NOTES.md)

- Should lake pollution recover over time? Should lakes and rivers count as land in the biodiversity intactness mean? They do at the moment, because the spec says "all land cells" and lakes are land-side water.
- Should the Fishing fleet's seagrass bonus and the Holiday park's ancient-habitat bonus count toward nature's contribution (NOTES 17)? At the moment they don't, so nature's contribution is a lower bound.
- Should Offshore wind farms be allowed on marine reserves (NOTES 7)?
- `@vitest/coverage-v8` was added as a dev dependency to measure coverage. Confirm this is OK.

## Smaller ideas

- Sound and music (out of scope for the prototype).
- Touch-friendly controls: bigger buttons and a long press for tooltips on phones.
- A pixel font file for headings, if wanted (currently the system sans-serif).
