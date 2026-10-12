import {
  Trial,
  TrialProduct,
  Station,
  TrialCategory,
  InsecticideSubCategory,
} from '../types/trial';
import { getObservationSchedule, hasHarvestStage } from './trialCategories';
import { calculateObservationDates } from '../utils/dateUtils';

interface SeedProduct {
  productName: string;
  activeIngredient: string;
  formulation: string;
  dose: string | number;
  unit: string;
  replications: number;
  applications: number;
}

interface SeedInput {
  id: string;
  station: Station;
  trialName: string;
  category: TrialCategory;
  insecticideSubCategory?: InsecticideSubCategory;
  crop: string;
  pestOrWeed: string;
  products: SeedProduct[];
  conductedDate: string;
  harvestStageDate?: string;
  fieldLocation: string;
  fieldStaffName: string;
  remarks: string;
  completedIntervals?: { day: number; actualDate: string; efficacy: number; notes: string }[];
}

function createTrial(data: SeedInput): Trial {
  const schedule = getObservationSchedule(data.category, data.insecticideSubCategory);
  const observationDates = calculateObservationDates(data.conductedDate, schedule);

  const observations: Trial['observations'] = {};
  for (const day of schedule) {
    observations[day] = { day, plannedDate: observationDates[day], completed: false };
  }

  if (data.completedIntervals) {
    for (const item of data.completedIntervals) {
      observations[item.day] = {
        day: item.day,
        plannedDate: observationDates[item.day],
        completed: true,
        actualDate: item.actualDate,
        efficacyPercent: item.efficacy,
        phytotoxicity: 'None',
        notes: item.notes,
        observedBy: data.fieldStaffName,
        updatedAt: item.actualDate,
      };
    }
  }

  const products: TrialProduct[] = data.products.map((p, index) => ({
    position: index,
    ...p,
  }));

  return {
    id: data.id,
    station: data.station,
    trialName: data.trialName,
    category: data.category,
    insecticideSubCategory: data.insecticideSubCategory ?? null,
    crop: data.crop,
    pestOrWeed: data.pestOrWeed,
    products,
    observationSchedule: schedule,
    observationDates,
    observations,
    harvestStageDate: hasHarvestStage(data.category) ? data.harvestStageDate ?? null : null,
    conductedDate: data.conductedDate,
    fieldLocation: data.fieldLocation,
    fieldStaffName: data.fieldStaffName,
    remarks: data.remarks,
    createdAt: `${data.conductedDate}T08:00:00Z`,
    updatedAt: `${data.conductedDate}T08:00:00Z`,
  };
}

export const SEED_TRIALS: Trial[] = [
  // ── SAHIWAL ───────────────────────────────────────────────────────────────
  createTrial({
    id: 'tr-swl-001',
    station: 'Sahiwal',
    trialName: 'Evaluation of Emamectin Benzoate 5% SG against Spodoptera frugiperda in Maize',
    category: 'Insecticide',
    insecticideSubCategory: 'Granular',
    crop: 'Maize',
    pestOrWeed: 'Fall Armyworm (Spodoptera frugiperda)',
    products: [
      {
        productName: 'Proclaim 05 SG',
        activeIngredient: 'Emamectin Benzoate',
        formulation: 'SG',
        dose: 80,
        unit: 'gm/acre',
        replications: 3,
        applications: 1,
      },
    ],
    conductedDate: '2026-09-02',
    fieldLocation: 'Chak 84/9-L, Maize Research Section, Sahiwal',
    fieldStaffName: 'Muhammad Arslan, Research Associate',
    remarks: 'Trial concluded with 94.2% mean mortality at 14 DAA. No phytotoxicity observed.',
    completedIntervals: [
      { day: 3, actualDate: '2026-09-05', efficacy: 78, notes: 'Significant larval knockdown within 72 hrs' },
      { day: 7, actualDate: '2026-09-09', efficacy: 89, notes: 'Foliage feeding suppressed significantly' },
      { day: 14, actualDate: '2026-09-16', efficacy: 94, notes: 'Maximal control observed across all replications' },
      { day: 21, actualDate: '2026-09-23', efficacy: 91, notes: 'Residual efficacy maintained' },
      { day: 28, actualDate: '2026-09-30', efficacy: 86, notes: 'Trial completed successfully.' },
    ],
  }),

  createTrial({
    id: 'tr-swl-002',
    station: 'Sahiwal',
    trialName: 'Bio-efficacy of Flubendiamide 480 SC on Helicoverpa armigera in Tomato',
    category: 'Insecticide',
    insecticideSubCategory: 'Foliar',
    crop: 'Tomato',
    pestOrWeed: 'Fruit Borer (Helicoverpa armigera)',
    products: [
      {
        productName: 'Belt 480 SC',
        activeIngredient: 'Flubendiamide',
        formulation: 'SC',
        dose: 40,
        unit: 'ml/acre',
        replications: 4,
        applications: 2,
      },
    ],
    conductedDate: '2026-10-05',
    fieldLocation: 'Vegetable Experimental Area, Chichawatni Road, Sahiwal',
    fieldStaffName: 'Tariq Mehmood, Field Officer',
    remarks: 'Moderate pest population pre-spray (8 larvae/10 plants).',
    completedIntervals: [
      { day: 1, actualDate: '2026-10-06', efficacy: 60, notes: 'Initial feeding damage arrested' },
      { day: 3, actualDate: '2026-10-08', efficacy: 82, notes: 'Quick cessation of fruit boring damage' },
    ],
  }),

  createTrial({
    id: 'tr-swl-003',
    station: 'Sahiwal',
    trialName: 'Post-emergence Herbicidal Efficacy on Broadleaf Weeds in Autumn Potato',
    category: 'Herbicide',
    crop: 'Potato',
    pestOrWeed: 'Chenopodium album & Trianthema portulacastrum',
    products: [
      {
        productName: 'Sencor 70 WP',
        activeIngredient: 'Metribuzin',
        formulation: 'WP',
        dose: 250,
        unit: 'gm/acre',
        replications: 3,
        applications: 1,
      },
    ],
    conductedDate: '2026-10-02',
    fieldLocation: 'Potato Research Station, Montgomery Block, Sahiwal',
    fieldStaffName: 'Muhammad Arslan, Research Associate',
    remarks: 'Applied at 2-3 leaf stage of weeds. Moisture adequate.',
    completedIntervals: [],
  }),

  // ── MULTAN ────────────────────────────────────────────────────────────────
  createTrial({
    id: 'tr-mlt-001',
    station: 'Multan',
    trialName: 'Comparative Efficacy of Spirotetramat 240 SC against Whitefly in BT Cotton',
    category: 'Insecticide',
    insecticideSubCategory: 'Foliar',
    crop: 'Cotton',
    pestOrWeed: 'Whitefly (Bemisia tabaci)',
    products: [
      {
        productName: 'Movento 240 SC',
        activeIngredient: 'Spirotetramat',
        formulation: 'SC',
        dose: 125,
        unit: 'ml/acre',
        replications: 4,
        applications: 2,
      },
    ],
    conductedDate: '2026-09-04',
    fieldLocation: 'Central Cotton Research Institute (CCRI) Farm, Multan',
    fieldStaffName: 'Engr. Waqas Javed, R&D Agronomist',
    remarks: 'High whitefly nymph mortality recorded. Two-way systemic action confirmed.',
    completedIntervals: [
      { day: 1, actualDate: '2026-09-05', efficacy: 55, notes: 'Adult activity reduced' },
      { day: 3, actualDate: '2026-09-07', efficacy: 74, notes: 'Adult flight reduced by 70%' },
      { day: 7, actualDate: '2026-09-11', efficacy: 86, notes: 'Nymphal mortality highly evident' },
      { day: 14, actualDate: '2026-09-18', efficacy: 93, notes: 'Sooty mold development arrested' },
      { day: 21, actualDate: '2026-09-25', efficacy: 90, notes: 'Continuous suppression observed' },
      { day: 28, actualDate: '2026-10-02', efficacy: 85, notes: 'Final count completed.' },
    ],
  }),

  createTrial({
    id: 'tr-mlt-002',
    station: 'Multan',
    trialName: 'Screening of Pyriproxyfen 10.8 EC against Cotton Mealybug and Jassid Complex',
    category: 'Insecticide',
    insecticideSubCategory: 'Foliar',
    crop: 'Cotton',
    pestOrWeed: 'Cotton Mealybug & Amrasca biguttula',
    products: [
      {
        productName: 'Tiger 10.8 EC',
        activeIngredient: 'Pyriproxyfen',
        formulation: 'EC',
        dose: 400,
        unit: 'ml/acre',
        replications: 3,
        applications: 1,
      },
    ],
    conductedDate: '2026-09-29',
    fieldLocation: 'MNS University of Agriculture Research Block, Multan',
    fieldStaffName: 'Shahid Iqbal, Field Specialist',
    remarks: 'Testing IGR efficacy on nymphal stages. Weather clear 35°C.',
    completedIntervals: [
      { day: 1, actualDate: '2026-09-30', efficacy: 50, notes: 'Hatching disruption initiated' },
      { day: 3, actualDate: '2026-10-02', efficacy: 71, notes: 'Reduced nymph population' },
    ],
  }),

  createTrial({
    id: 'tr-mlt-003',
    station: 'Multan',
    trialName: 'Comparative Bio-efficacy of Two Mango Hopper Insecticides on Mango Panicles',
    category: 'Insecticide',
    insecticideSubCategory: 'Foliar',
    crop: 'Mango',
    pestOrWeed: 'Mango Hopper (Idioscopus clypealis)',
    products: [
      {
        productName: 'Oshin 20 SG',
        activeIngredient: 'Dinotefuran',
        formulation: 'SG',
        dose: 100,
        unit: 'gm/100L water',
        replications: 3,
        applications: 1,
      },
      {
        productName: 'Confidor 200 SL',
        activeIngredient: 'Imidacloprid',
        formulation: 'SL',
        dose: 250,
        unit: 'ml/acre',
        replications: 3,
        applications: 1,
      },
    ],
    conductedDate: '2026-10-08',
    fieldLocation: 'Mango Research Station, Shujabad, Multan',
    fieldStaffName: 'Engr. Waqas Javed, R&D Agronomist',
    remarks: 'Split-plot comparison of two hopper insecticides at flowering bud stage.',
    completedIntervals: [],
  }),

  // ── LAHORE ────────────────────────────────────────────────────────────────
  createTrial({
    id: 'tr-lhr-001',
    station: 'Lahore',
    trialName: 'Performance of Chlorantraniliprole 18.5 SC on Yellow Stem Borer in Basmati Rice',
    category: 'Insecticide',
    insecticideSubCategory: 'Foliar',
    crop: 'Rice',
    pestOrWeed: 'Yellow Stem Borer (Scirpophaga incertulas)',
    products: [
      {
        productName: 'Coragen 20 SC',
        activeIngredient: 'Chlorantraniliprole',
        formulation: 'SC',
        dose: 50,
        unit: 'ml/acre',
        replications: 4,
        applications: 1,
      },
    ],
    conductedDate: '2026-09-01',
    fieldLocation: 'Rice Research Institute, Kala Shah Kaku, Lahore',
    fieldStaffName: 'Dr. Asif Raza, Senior R&D Officer',
    remarks: 'Significant reduction in dead hearts and white heads vs untreated check.',
    completedIntervals: [
      { day: 1, actualDate: '2026-09-02', efficacy: 62, notes: 'Egg laying inhibited' },
      { day: 3, actualDate: '2026-09-04', efficacy: 85, notes: 'Adult egg laying inhibited' },
      { day: 7, actualDate: '2026-09-08', efficacy: 94, notes: 'Dead hearts prevented across plots' },
      { day: 14, actualDate: '2026-09-15', efficacy: 96, notes: 'Zero larval entry in treated tillers' },
      { day: 21, actualDate: '2026-09-22', efficacy: 94, notes: 'Excellent residual protection' },
      { day: 28, actualDate: '2026-09-29', efficacy: 92, notes: 'Trial concluded with full panicle emergence.' },
    ],
  }),

  createTrial({
    id: 'tr-lhr-002',
    station: 'Lahore',
    trialName: 'Efficacy of Bispyribac-sodium 100 SC on Barnyard Grass in Transplanted Rice',
    category: 'Herbicide',
    crop: 'Rice',
    pestOrWeed: 'Echinochloa colona & Cyperus iria',
    products: [
      {
        productName: 'Nominee 100 SC',
        activeIngredient: 'Bispyribac-sodium',
        formulation: 'SC',
        dose: 100,
        unit: 'ml/acre',
        replications: 3,
        applications: 1,
      },
    ],
    conductedDate: '2026-09-26',
    fieldLocation: 'Agronomy Demonstration Block 4, Muridke Road, Lahore',
    fieldStaffName: 'Hamza Bilal, Field Inspector',
    remarks: 'Applied at 15 days after transplantation.',
    completedIntervals: [
      { day: 3, actualDate: '2026-09-29', efficacy: 65, notes: 'Chlorosis observed in weed tips' },
      { day: 7, actualDate: '2026-10-03', efficacy: 88, notes: 'Severe weed desiccation; no crop yellowing' },
    ],
  }),

  createTrial({
    id: 'tr-lhr-003',
    station: 'Lahore',
    trialName: 'Evaluation of Azoxystrobin + Difenoconazole against Early Blight in Tomato',
    category: 'Fungicide',
    crop: 'Tomato',
    pestOrWeed: 'Early Blight (Alternaria solani)',
    products: [
      {
        productName: 'Amistar Top 325 SC',
        activeIngredient: 'Azoxystrobin + Difenoconazole',
        formulation: 'SC',
        dose: 200,
        unit: 'ml/acre',
        replications: 3,
        applications: 2,
      },
    ],
    conductedDate: '2026-10-07',
    fieldLocation: 'Tunnel Farming Complex, Raiwind Greenhouses, Lahore',
    fieldStaffName: 'Hamza Bilal, Field Inspector',
    remarks: 'Protective spray applied upon earliest manifestation of lower leaf rings.',
    completedIntervals: [],
  }),

  // ── HYDERABAD ─────────────────────────────────────────────────────────────
  createTrial({
    id: 'tr-hyd-001',
    station: 'Hyderabad',
    trialName: 'Management of Sugarcane Early Shoot Borer with Fipronil 0.3 GR',
    category: 'Insecticide',
    insecticideSubCategory: 'Granular',
    crop: 'Sugarcane',
    pestOrWeed: 'Early Shoot Borer (Chilo infuscatellus)',
    products: [
      {
        productName: 'Regent 0.3 GR',
        activeIngredient: 'Fipronil',
        formulation: 'GR',
        dose: 8,
        unit: 'kg/acre',
        replications: 4,
        applications: 1,
      },
    ],
    conductedDate: '2026-08-28',
    fieldLocation: 'Sindh Agriculture University Research Farm, Tandojam, Hyderabad',
    fieldStaffName: 'Abdul Sattar Chandio, Field Officer',
    remarks: 'Granular soil application followed by light irrigation.',
    completedIntervals: [
      { day: 3, actualDate: '2026-08-31', efficacy: 80, notes: 'Soil absorption verified' },
      { day: 7, actualDate: '2026-09-04', efficacy: 91, notes: 'Root uptake systemic effect noted' },
      { day: 14, actualDate: '2026-09-11', efficacy: 95, notes: 'Tiller mortality stopped' },
      { day: 21, actualDate: '2026-09-18', efficacy: 93, notes: 'New tillers emerging vigorous' },
      { day: 28, actualDate: '2026-09-25', efficacy: 90, notes: 'Trial concluded with high cane stalk vigor' },
    ],
  }),

  createTrial({
    id: 'tr-hyd-002',
    station: 'Hyderabad',
    trialName: 'Crop Safety Assessment of a New Sulfonylurea Herbicide on Rice (Phytotoxicity Screening)',
    category: 'Phytotoxicity',
    crop: 'Rice',
    pestOrWeed: 'Crop Safety / Phytotoxicity',
    products: [
      {
        productName: 'Trial Herbicide TH-21 SC',
        activeIngredient: 'Bensulfuron-methyl',
        formulation: 'SC',
        dose: 60,
        unit: 'ml/acre',
        replications: 4,
        applications: 1,
      },
    ],
    conductedDate: '2026-10-06',
    fieldLocation: 'Experimental Farm Kunri Road, Mirpurkhas-Hyderabad Belt',
    fieldStaffName: 'Ghulam Rasool Solangi, Assistant Agronomist',
    remarks: 'Frequent early readings to detect any crop injury. Upward leaf curling monitored.',
    completedIntervals: [
      { day: 1, actualDate: '2026-10-07', efficacy: 5, notes: 'No visible crop injury' },
      { day: 3, actualDate: '2026-10-09', efficacy: 8, notes: 'Slight transient yellowing, recovered' },
    ],
  }),

  createTrial({
    id: 'tr-hyd-003',
    station: 'Hyderabad',
    trialName: 'Effect of NPK Growth Booster on Cotton Biomass and Yield (Fertilizer Trial)',
    category: 'Fertilizer / Growth',
    crop: 'Cotton',
    pestOrWeed: 'Crop Growth & Yield Enhancement',
    products: [
      {
        productName: 'GrowMax 20-20-20',
        activeIngredient: 'NPK + Micronutrients',
        formulation: 'SP',
        dose: 2,
        unit: 'kg/acre',
        replications: 4,
        applications: 3,
      },
    ],
    conductedDate: '2026-10-09',
    harvestStageDate: '2026-11-20',
    fieldLocation: 'Cotton Sub-station, Hala Naka, Hyderabad',
    fieldStaffName: 'Abdul Sattar Chandio, Field Officer',
    remarks: 'Foliar growth booster applied at squaring. Harvest stage date entered manually.',
    completedIntervals: [],
  }),
];
