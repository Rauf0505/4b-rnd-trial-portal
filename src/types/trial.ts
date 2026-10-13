export type Station = 'Sahiwal' | 'Multan' | 'Lahore' | 'Hyderabad';

export const STATIONS: Station[] = ['Sahiwal', 'Multan', 'Lahore', 'Hyderabad'];

/**
 * Trial categories. Each category drives its own observation schedule
 * (see src/data/trialCategories.ts).
 */
export type TrialCategory =
  | 'Herbicide'
  | 'Fungicide'
  | 'Insecticide'
  | 'Fertilizer / Growth'
  | 'Phytotoxicity';

export const TRIAL_CATEGORIES: TrialCategory[] = [
  'Herbicide',
  'Fungicide',
  'Insecticide',
  'Fertilizer / Growth',
  'Phytotoxicity',
];

/** Only the Insecticide category is split into sub-categories. */
export type InsecticideSubCategory = 'Foliar' | 'Granular';

export const INSECTICIDE_SUB_CATEGORIES: InsecticideSubCategory[] = ['Foliar', 'Granular'];

/**
 * Observation schedules are dynamic per category. The union of every day
 * offset used anywhere in the system is kept here for rendering table /
 * Excel columns that must line up across categories.
 */
export const ALL_OBSERVATION_DAYS: number[] = [0, 1, 3, 7, 10, 12, 14, 21, 28];

export type ObservationDay = number;

export type PhytotoxicityLevel = 'None' | 'Slight' | 'Moderate' | 'Severe';

export const PHYTOTOXICITY_LEVELS: PhytotoxicityLevel[] = ['None', 'Slight', 'Moderate', 'Severe'];

/**
 * A trial can contain multiple products. Every product carries its own
 * agronomic specification block.
 */
export interface TrialProduct {
  id?: string;
  position: number;
  productName: string;
  activeIngredient: string;
  formulation: string;
  dose: string | number;
  unit: string;
  replications: number;
  applications: number;
  /**
   * Optional standard / check reference against which this product is
   * compared. Free text per product — products may share the same value or
   * each carry their own.
   */
  standard: string;
}

export interface ObservationRecord {
  day: number;
  plannedDate: string; // YYYY-MM-DD
  completed: boolean;
  actualDate?: string; // YYYY-MM-DD
  efficacyPercent?: number; // 0 - 100%
  pestMortalityCount?: string; // e.g., "Pre: 28 / Post: 2"
  weedControlPercent?: number;
  phytotoxicity?: PhytotoxicityLevel;
  notes?: string;
  observedBy?: string;
  updatedAt?: string;
}

export type TrialStatus = 'ONGOING' | 'COMPLETED' | 'OBSERVATION DUE';

export interface Trial {
  id: string;
  station: Station;
  stationSerial?: number; // 1, 2, 3... per station
  trialName: string;
  category: TrialCategory;
  insecticideSubCategory?: InsecticideSubCategory | null;
  crop: string;
  pestOrWeed: string;
  products: TrialProduct[];
  /** Snapshot of the day offsets scheduled for this trial. */
  observationSchedule: number[];
  /** day offset -> planned ISO date */
  observationDates: Record<number, string>;
  /** day offset -> observation record */
  observations: Record<number, ObservationRecord>;
  /** Fertilizer / Growth trials have a manually entered harvesting stage date. */
  harvestStageDate?: string | null;
  conductedDate: string; // YYYY-MM-DD
  fieldLocation: string;
  fieldStaffName: string;
  remarks: string;
  createdAt: string;
  updatedAt: string;
}

export type UserRole = 'Field Staff' | 'R&D Officer' | 'Deputy Manager' | 'Admin';

export interface StationSummary {
  station: Station;
  total: number;
  ongoing: number;
  completed: number;
  dueObservations: number;
}

/**
 * A flattened "one row per product" view used by the table, print reports and
 * Excel exports. Trial-level fields are shared, product fields are per row.
 */
export interface TrialProductRow {
  trial: Trial;
  product: TrialProduct;
  productIndex: number;
  productCount: number;
}
