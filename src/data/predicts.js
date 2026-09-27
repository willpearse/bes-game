// Placeholder PREDICTS biodiversity value table: B by land-use class and use intensity.
// To be replaced with PREDICTS-derived values (flat, data-only).
export const LAND_USE_NAMES = {
  primary: 'Primary vegetation',
  matureSecondary: 'Mature secondary',
  intermediateSecondary: 'Intermediate secondary',
  youngSecondary: 'Young secondary',
  plantation: 'Plantation forest',
  pasture: 'Pasture',
  cropland: 'Cropland',
  urban: 'Urban'
};

export const PREDICTS_B = {
  primary:               { minimal: 1.00, light: 0.90, intense: 0.75 },
  matureSecondary:       { minimal: 0.90, light: 0.80, intense: 0.65 },
  intermediateSecondary: { minimal: 0.75, light: 0.65, intense: 0.55 },
  youngSecondary:        { minimal: 0.60, light: 0.50, intense: 0.40 },
  plantation:            { minimal: 0.55, light: 0.45, intense: 0.35 },
  pasture:               { minimal: 0.60, light: 0.50, intense: 0.35 },
  cropland:              { minimal: 0.50, light: 0.40, intense: 0.25 },
  urban:                 { minimal: 0.40, light: 0.30, intense: 0.15 }
};
