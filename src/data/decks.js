// Stage piles (section 8.3) and menu-mode unlocks (section 8.2).
export const STAGE_ORDER = ['A', 'B', 'C'];

export const STAGE_PILES = {
  cottages:     { A: 6, B: 3, C: 1 },
  towerBlock:   { A: 0, B: 2, C: 3 },
  familyFarm:   { A: 4, B: 1, C: 0 },
  hillFarm:     { A: 2, B: 0, C: 0 },
  cluckTowers:  { A: 1, B: 2, C: 1 },
  conifer:      { A: 2, B: 0, C: 0 },
  holidayPark:  { A: 1, B: 2, C: 1 },
  school:       { A: 2, B: 0, C: 0 },
  hospital:     { A: 0, B: 1, C: 1 },
  businessPark: { A: 1, B: 1, C: 2 },
  factory:      { A: 0, B: 1, C: 2 },
  recycling:    { A: 1, B: 1, C: 1 },
  harbour:      { A: 0, B: 1, C: 1 },
  fishingFleet: { A: 2, B: 1, C: 0 },
  windFarm:     { A: 0, B: 0, C: 3 }
};

export const MENU_UNLOCKS = {
  A: ['cottages', 'familyFarm', 'hillFarm', 'conifer', 'school', 'holidayPark', 'businessPark', 'recycling', 'fishingFleet'],
  B: ['towerBlock', 'cluckTowers', 'hospital', 'factory', 'harbour'],
  C: ['windFarm']
};
