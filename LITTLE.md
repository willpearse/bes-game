# Little Green

A small, bright version of Green and Pleasant for reception-age children (4 and 5 year olds), at `little.html` (`npm run dev`, then http://localhost:8080/little.html). It shares the build, the deploy and the seeded RNG with the main game, but has its own engine, data, art and scenes under `src/little/`. The main game is unchanged.

## How it plays

- A garden of 8 × 4 big squares with a stream along the bottom, one house and a duck.
- **Eight turns.** Each turn an animal family visits and asks for a **house** or a **veg patch**; the child chooses where it goes. Then the child picks **flowers**, a **tree** or **reeds** from three big cards and puts it down.
- **Touching** means the four squares next to a piece (as in the main game). While a finger is down, those squares glow yellow.
- **No reading needed.** Everything is said out loud (the browser's own speech, British English where the device has a voice), shown by faces, and backed by sounds made in code. Tapping the visitor repeats what they said. A grown-up can mute it with the speaker button.
- **Wish bubbles** float over any house or veg patch that still wants something, showing the piece it wants. After 15 seconds without a move, a spoken hint and a wiggle point at one of them.
- **No money and no losing.** Hot houses recover the next turn, and the stream can be cleaned again.

## The three mechanics

| Mechanic | Rule | What the child sees | Lesson |
|---|---|---|---|
| **Pollination** | Each turn, a veg patch touching flowers grows a strawberry (up to 3 shown) | A bee flies from the flowers; a strawberry flies into the basket. Without flowers, the patch shakes and shows a flower bubble. | Bees help food grow |
| **Mucky water** | Each house makes 1 mucky water a turn. Reeds touching the house soak it up; otherwise it runs into the stream. Each reed bed beside the stream then cleans 1 from it. | A brown drop flies to the reeds (sparkle) or into the stream (splash). The stream browns, and the duck is sad once there are 2 or more. | Plants clean dirty water |
| **Heatwave** | On turns 4 and 8 (suns on the turn track, with a spoken warning at the start of the turn), a house touching a tree stays cool; the others get hot until the next turn | The screen glows orange and a sun in sunglasses comes down. Cool houses sparkle; hot ones turn orange, sweat and shake. | Trees keep us cool |

## Stars

At the end there are up to three stars, each said out loud. A missing star gets a gentle "next time" line instead.

- **Bee star:** every veg patch has flowers touching it.
- **Water star:** the stream is clean (1 mucky water or less), so the duck is happy.
- **Cool star:** every house was cool in the last heatwave.

The basket also shows how many strawberries were grown, for counting.

## Code

```
little.html                    entry page (second Vite input, see vite.config.js)
src/little/
  main.js                      Phaser config (1280x720 logical at RES, FIT, antialiased)
  engine/                      pure JS, no Phaser; plain JSON state; takeTurn(state, action) -> { state, log }
    state.js                   createGame (garden, visitors), touching, helpers
    turn.js                    blocked, legalTargets, takeTurn
    rules.js                   bees, muck, heatwave, needs (wish bubbles and hints), stars
  data/                        config.js (every number), pieces.js, lines.js (everything said), garden.json
  art/                         palette.js (bright colours), draw.js (all textures drawn with Phaser graphics)
  scenes/                      Boot, Start (play button; unlocks sound), Garden (board, panel, animations), Stars
  voice.js sound.js prefs.js   speech, Web Audio effects, mute switch
  layout.js ui.js              positions and small helpers
tests/little/                  Vitest for the engine
scripts/little-sim.js          balance check: node scripts/little-sim.js --games 500
```

Turn order inside `takeTurn` after the nature piece goes down: houses cool off, bees, mucky water (houses, then reeds cleaning the stream), heatwave (on heatwave turns), then the next visitor or the stars. The scene plays the log back one event at a time.

The art is drawn with Phaser graphics rather than pixel sprites: chunky shapes, thick outlines and saturated colours read better for small children at arm's length on a tablet. Good and bad are always shown by faces and movement as well as colour.

## Balance (500 games each, `node scripts/little-sim.js --games 500`)

| Player | Bee | Water | Cool | 0 / 1 / 2 / 3 stars |
|---|---|---|---|---|
| Random taps | 1% | 9% | 1% | 89% / 10% / 0% / 0% |
| Follows the wish bubbles half the time | 21% | 78% | 12% | 15% / 60% / 22% / 2% |
| Sensible (always meets the most wishes) | 93% | 100% | 73% | 0% / 2% / 30% / 68% |

Purely random play rarely earns a star, but a child who follows the bubbles even half the time usually gets one or two, and careful play usually gets all three. The cool star is the hardest because every house needs both a tree and reeds.

## Open questions

- **Speech quality varies.** iPads have decent British voices; some Android tablets and Chromebooks sound robotic or have none. If that is a problem, record the lines in `data/lines.js` as audio clips.
- **Does "touching" work for this age?** The glowing squares and wish bubbles should help, but it needs testing with real children.
- **Words:** "mucky water" is used for waste. Children that age might prefer "poo"; that is the designer's call.
- **Visitors choose the piece** (house or veg patch); the child chooses where. Letting children choose freely is easy to add if wanted.
- **Portrait tablets** get a letterboxed landscape view; a portrait layout would make the board bigger.
