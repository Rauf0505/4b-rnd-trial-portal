import {
  TrialCategory,
  InsecticideSubCategory,
  Trial,
  TrialProductRow,
} from '../types/trial';

/**
 * Every schedule starts at 0 DAA — a baseline reading taken on the application
 * (conducted) date before/at treatment.
 */
export const ZERO_DAY = 0;

/** Standard schedule used by Herbicide, Fungicide, Granular insecticide and Fertilizer. */
export const STANDARD_SCHEDULE: number[] = [0, 3, 7, 14, 21, 28];

/** Phytotoxicity is monitored more frequently early on. */
export const PHYTOTOXICITY_SCHEDULE: number[] = [0, 1, 3, 7, 10, 12, 14, 21];

/** Foliar insecticide gets an extra early 1 DAA reading. */
export const INSECTICIDE_FOLIAR_SCHEDULE: number[] = [0, 1, 3, 7, 14, 21, 28];

/**
 * Resolve the observation day offsets for a category (and insecticide
 * sub-category where relevant).
 */
export function getObservationSchedule(
  category: TrialCategory,
  subCategory?: InsecticideSubCategory | null
): number[] {
  switch (category) {
    case 'Phytotoxicity':
      return [...PHYTOTOXICITY_SCHEDULE];
    case 'Insecticide':
      return subCategory === 'Foliar'
        ? [...INSECTICIDE_FOLIAR_SCHEDULE]
        : [...STANDARD_SCHEDULE];
    case 'Herbicide':
    case 'Fungicide':
    case 'Fertilizer / Growth':
    default:
      return [...STANDARD_SCHEDULE];
  }
}

/** Fertilizer / Growth trials require a manually entered harvesting stage date. */
export function hasHarvestStage(category: TrialCategory): boolean {
  return category === 'Fertilizer / Growth';
}

/** Human readable schedule, e.g. "3, 7, 14, 21, 28 DAA". */
export function formatSchedule(schedule: number[]): string {
  return `${schedule.join(', ')} DAA`;
}

/** Label including sub-category when present, e.g. "Insecticide (Foliar)". */
export function categoryLabel(
  category: TrialCategory,
  subCategory?: InsecticideSubCategory | null
): string {
  if (category === 'Insecticide' && subCategory) {
    return `${category} (${subCategory})`;
  }
  return category;
}

/**
 * Flatten trials into one row per product. Trials with no products (legacy
 * fallback) still produce a single placeholder row so they remain visible.
 */
export function flattenToProductRows(trials: Trial[]): TrialProductRow[] {
  const rows: TrialProductRow[] = [];
  for (const trial of trials) {
    const products =
      trial.products && trial.products.length > 0
        ? trial.products
        : [
            {
              position: 0,
              productName: '(no product)',
              activeIngredient: '',
              formulation: '',
              dose: '',
              unit: '',
              replications: 0,
              applications: 0,
              standard: '',
            } as TrialProductRow['product'],
          ];
    products.forEach((product, index) => {
      rows.push({
        trial,
        product,
        productIndex: index,
        productCount: products.length,
      });
    });
  }
  return rows;
}
