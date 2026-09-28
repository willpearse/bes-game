# TODO

Ideas and open questions for later sessions. Newest designer requests first.

## Designer requests

- **Ecosystem variability in how fast services recover.** At the moment every restored habitat gives all its services at the same fraction of full strength (by its B), rising as it matures. In reality some work almost at once (a new wetland soaks up and slows water quickly) while others take decades (woodland shade and recreation). Consider per-habitat, per-service ramp-up speeds, if it can be shown clearly.
- **Check that the sea is still fun and working** after the changes in NOTES 53 to 60 (harbours removed, storm surges hit land only, wind farms act as reefs, fleet pollution penalty capped at −2). Play a few games focused on the coast, and look at fleet and wind farm pay-offs in `npm run payoff`.
- **Bridge types.** Rivers are currently crossed by a free, invisible "bridge" (a square counts as next to built if one river square separates it from a built tile; see NOTES 6a). Think about different bridge types as a layer, with a cost versus impact on the ecosystem trade-off: for example a cheap culvert that blocks fish and adds pressure, a clear-span bridge that costs more and leaves the river alone, or a ford. They could affect river flow, waste, WAT and GRN.
- **More maps.** Add more maps in the same format as `src/data/maps/millValley.json` (explicit elevation grid, `startingCash`, `housingTarget`, `goldScore`) and list them in `src/data/maps/index.js` and the Title screen's Map option. Suggestions from the spec: an upland dale with a large lake; chalk downland meeting a cliff coast.
- **GDP-linked objectives: working landscapes, not gardens of Eden.** Add objectives that are plainly about the economy (for example "earn £X GDP in a single turn", "at least N businesses", "keep 4 working farms profitable all game", "GDP grows every stage"). Waste bills, soil decline and food (NOTES 46, 49, 55) now give farms and industry long-term costs; a further idea is infrastructure that degrades nearby habitat each turn it runs.

- **Waste: what is left after NOTES 62 to 68.** Riverbank nature now cleans waste as it flows past, cleaning and soaking up were raised, and beaver dams and sewage works clean the river itself. Still open: show where waste is going and what is cleaning it (for example a "waste this turn" breakdown: made, soaked up, cleaned, treated, reached the sea); hint at beavers and the sewage works when waste first reaches the river; direct sea clean-up (oyster or mussel beds); stop the 10+ pollution trap from shutting seagrass down entirely.
- **Mill valley happiness crashes on turn 2.** Even if you only pass, happiness falls from 4.6 to 2.2 (it fell from 3.5 to 1.6 before NOTES 62 to 68): the town's own waste settles on the squares around its homes, and each token next to a home costs 1 wellbeing. Consider fewer homes packed together at the start, nature between them, or a smaller wellbeing penalty for waste.
- **Sewage works: check the overflow limit in play.** Bots never build it (it only pays back over several turns). In forced tests (NOTES 67) it paid only when sited high on the river, above most of the town; lower down, more than 16 residents drain into it and it overflows most turns. Decide whether that is the right lesson, or whether the limit should grow (for example, per £ spent on an upgrade).

## Balance (from `npm run simulate`, see NOTES.md 53 to 61 and `reports/`)

- **Mill valley: waste bills dominate, and the best play mixes repair and building.** Bills take more than half of income. Greedy scores highest (about £438) and restores about 8 times a game there; the repair bot (NOTES 61) beats balanced but trails greedy; restoring everything next to buildings scores worst. Decide whether that mix is the intended lesson, or whether repair-first play should do better (for example more bare ground next to the factory and homes, or a slightly lower starting waste).
- **Restorations are free in market mode** (the discarded card has no surcharge in slot 0), which is why greedy restores whenever it gains anything. Decide whether restoring should cost something (for example £1, as in menu mode).
- **Silver and gold are rare** because both objectives are seldom met (2 to 16% of bot games). Check which objectives are near impossible on each map with the simulator.
- **Food buildings vanish from the market in stage C** (NOTES 61): the stage C pile has no family farms, hill farms or fishing fleets and one Cluck Towers, while tower blocks keep coming. This is the main reason "fed at the end" (and so bronze) fails. Add food buildings to the stage C pile, or make bronze check food over the last few turns rather than only the final one.
- The bots only look one turn ahead; a planning bot would show whether early restoration pays back.
- Restoring mature habitat lowers intactness until it matures (young B 0.6), which works against Biodiversity net gain and Thriving wildlife. Decide whether that is the intended lesson.

## Open questions (moved from NOTES.md)

- Should lakes and rivers count as land in the biodiversity intactness mean? They do at the moment, because the spec says "all land cells" and lakes are land-side water.
- Should Offshore wind farms be allowed on marine reserves (NOTES 7)?
- `@vitest/coverage-v8` was added as a dev dependency to measure coverage. Confirm this is OK.

## Smaller ideas

- The event pop-up's "Wrecked" line and the dust-cloud animation (NOTES 57) were built but not checked in a screenshot; look at them the next time a flood hits in play.

- Sound and music (out of scope for the prototype).
- Touch-friendly controls: bigger buttons and a long press for tooltips on phones.
- A pixel font file for headings, if wanted (currently the system sans-serif).
