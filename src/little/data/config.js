// Little Green: every tunable number for the reception-age game.
export const LITTLE_CONFIG = {
  turns: 8,                 // each turn: one visitor piece, then one nature piece
  heatwaveTurns: [4, 8],    // turns that end in a heatwave (warned at the start of the turn)
  visitors: { house: 4, veg: 4 }, // pieces the visitors ask for over a game
  firstVisitor: 'veg',      // the first request, so bees show up early
  fruitMax: 3,              // strawberries shown on one veg patch
  muckPerHouse: 1,          // mucky water made by each house each turn
  reedsCleanStream: 1,      // mucky water each reed bed beside the stream cleans a turn
  cleanStreamMax: 1         // the stream counts as clean (happy duck, water star) at or below this
};
