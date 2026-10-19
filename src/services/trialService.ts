import {
  Trial,
  Station,
  TrialCategory,
  InsecticideSubCategory,
  TrialProduct,
  ObservationRecord,
  STATIONS,
} from '../types/trial';
import { requireSupabase } from '../lib/supabase';
import { getObservationSchedule, hasHarvestStage } from '../data/trialCategories';
import { calculateObservationDates } from '../utils/dateUtils';

// ── Database row shapes (snake_case) ────────────────────────────────────────
interface TrialRow {
  id: string;
  station: Station;
  station_serial: number | null;
  trial_name: string;
  category: TrialCategory;
  insecticide_sub_category: InsecticideSubCategory | null;
  crop: string;
  pest_or_weed: string;
  observation_schedule: number[] | null;
  harvest_stage_date: string | null;
  conducted_date: string;
  field_location: string;
  field_staff_name: string;
  remarks: string | null;
  created_at: string;
  updated_at: string;
}

interface ProductRow {
  id: string;
  trial_id: string;
  position: number;
  product_name: string;
  active_ingredient: string | null;
  formulation: string | null;
  dose: string | null;
  unit: string | null;
  replications: number | null;
  applications: number | null;
  standard: string[] | null;
}

interface ObservationRow {
  id: string;
  trial_id: string;
  day: number;
  planned_date: string;
  completed: boolean;
  actual_date: string | null;
  efficacy_percent: number | null;
  pest_mortality_count: string | null;
  weed_control_percent: number | null;
  phytotoxicity: ObservationRecord['phytotoxicity'] | null;
  notes: string | null;
  observed_by: string | null;
  updated_at: string | null;
}

/** Payload produced by the trial form. */
export interface TrialFormInput {
  station: Station;
  trialName: string;
  category: TrialCategory;
  insecticideSubCategory?: InsecticideSubCategory | null;
  crop: string;
  pestOrWeed: string;
  products: TrialProduct[];
  conductedDate: string;
  harvestStageDate?: string | null;
  fieldLocation: string;
  fieldStaffName: string;
  remarks: string;
}

export interface ObservationEntryInput {
  actualDate: string;
  completed: boolean;
  efficacyPercent?: number;
  pestMortalityCount?: string;
  weedControlPercent?: number;
  phytotoxicity?: ObservationRecord['phytotoxicity'];
  notes?: string;
  observedBy?: string;
}

// ── Serial number assignment (per station, ascending conducted date) ─────────
export function assignStationSerials(trials: Trial[]): Trial[] {
  const byStation: Record<Station, Trial[]> = {
    Sahiwal: [],
    Multan: [],
    Lahore: [],
    Hyderabad: [],
  };
  trials.forEach((t) => {
    if (byStation[t.station]) byStation[t.station].push(t);
  });

  const updated: Trial[] = [];
  STATIONS.forEach((station) => {
    byStation[station]
      .sort((a, b) =>
        a.conductedDate !== b.conductedDate
          ? a.conductedDate.localeCompare(b.conductedDate)
          : a.createdAt.localeCompare(b.createdAt)
      )
      .forEach((item, index) => {
        updated.push({ ...item, stationSerial: index + 1 });
      });
  });
  return updated;
}

// ── Row <-> domain mappers ──────────────────────────────────────────────────
function mapProduct(row: ProductRow): TrialProduct {
  return {
    id: row.id,
    position: row.position,
    productName: row.product_name,
    activeIngredient: row.active_ingredient ?? '',
    formulation: row.formulation ?? '',
    dose: row.dose ?? '',
    unit: row.unit ?? '',
    replications: row.replications ?? 3,
    applications: row.applications ?? 1,
    standard: row.standard ?? [],
  };
}

function mapObservation(row: ObservationRow): ObservationRecord {
  return {
    day: row.day,
    plannedDate: row.planned_date,
    completed: row.completed,
    actualDate: row.actual_date ?? undefined,
    efficacyPercent: row.efficacy_percent ?? undefined,
    pestMortalityCount: row.pest_mortality_count ?? undefined,
    weedControlPercent: row.weed_control_percent ?? undefined,
    phytotoxicity: row.phytotoxicity ?? undefined,
    notes: row.notes ?? undefined,
    observedBy: row.observed_by ?? undefined,
    updatedAt: row.updated_at ?? undefined,
  };
}

/** Build the schedule + planned dates for a category / start date. */
export function buildSchedule(
  category: TrialCategory,
  sub: InsecticideSubCategory | null | undefined,
  conductedDate: string
): { schedule: number[]; observationDates: Record<number, string> } {
  const schedule = getObservationSchedule(category, sub);
  const observationDates = calculateObservationDates(conductedDate, schedule);
  return { schedule, observationDates };
}

// ── Reads ───────────────────────────────────────────────────────────────────
export async function fetchTrials(): Promise<Trial[]> {
  const supabase = requireSupabase();

  const [trialsRes, productsRes, obsRes] = await Promise.all([
    supabase.from('trials').select('*').order('conducted_date', { ascending: false }),
    supabase.from('trial_products').select('*').order('position', { ascending: true }),
    supabase.from('observations').select('*'),
  ]);

  if (trialsRes.error) throw trialsRes.error;
  if (productsRes.error) throw productsRes.error;
  if (obsRes.error) throw obsRes.error;

  const productsByTrial = new Map<string, ProductRow[]>();
  (productsRes.data as ProductRow[] | null)?.forEach((row) => {
    const list = productsByTrial.get(row.trial_id) ?? [];
    list.push(row);
    productsByTrial.set(row.trial_id, list);
  });

  const obsByTrial = new Map<string, ObservationRow[]>();
  (obsRes.data as ObservationRow[] | null)?.forEach((row) => {
    const list = obsByTrial.get(row.trial_id) ?? [];
    list.push(row);
    obsByTrial.set(row.trial_id, list);
  });

  const trials: Trial[] = ((trialsRes.data as TrialRow[] | null) ?? []).map((row) => {
    const products = (productsByTrial.get(row.id) ?? []).map(mapProduct);

    const observationDates: Record<number, string> = {};
    const observations: Record<number, ObservationRecord> = {};
    (obsByTrial.get(row.id) ?? []).forEach((obsRow) => {
      observationDates[obsRow.day] = obsRow.planned_date || '';
      observations[obsRow.day] = mapObservation(obsRow);
    });

    const schedule =
      row.observation_schedule && row.observation_schedule.length > 0
        ? [...row.observation_schedule].sort((a, b) => a - b)
        : getObservationSchedule(row.category, row.insecticide_sub_category);

    // Legacy / partial rows: guarantee the 0 DAA baseline exists and that every
    // scheduled day has a planned date, so the UI never receives an undefined
    // observation date.
    if (!schedule.includes(0)) schedule.unshift(0);
    const derivedDates = calculateObservationDates(row.conducted_date, schedule);
    schedule.forEach((day) => {
      if (!observationDates[day]) observationDates[day] = derivedDates[day];
    });

    return {
      id: row.id,
      station: row.station,
      stationSerial: row.station_serial ?? undefined,
      trialName: row.trial_name,
      category: row.category,
      insecticideSubCategory: row.insecticide_sub_category,
      crop: row.crop,
      pestOrWeed: row.pest_or_weed,
      products,
      observationSchedule: schedule,
      observationDates,
      observations,
      harvestStageDate: row.harvest_stage_date,
      conductedDate: row.conducted_date,
      fieldLocation: row.field_location,
      fieldStaffName: row.field_staff_name,
      remarks: row.remarks ?? '',
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  });

  return assignStationSerials(trials);
}

// ── Writes ──────────────────────────────────────────────────────────────────
function buildTrialRow(input: TrialFormInput) {
  const { schedule } = buildSchedule(
    input.category,
    input.insecticideSubCategory,
    input.conductedDate
  );
  const harvest = hasHarvestStage(input.category) ? input.harvestStageDate || null : null;
  return {
    station: input.station,
    trial_name: input.trialName,
    category: input.category,
    insecticide_sub_category:
      input.category === 'Insecticide' ? input.insecticideSubCategory ?? null : null,
    crop: input.crop,
    pest_or_weed: input.pestOrWeed,
    observation_schedule: schedule,
    harvest_stage_date: harvest,
    conducted_date: input.conductedDate,
    field_location: input.fieldLocation,
    field_staff_name: input.fieldStaffName,
    remarks: input.remarks,
  };
}

function buildProductRows(trialId: string, products: TrialProduct[]) {
  return products.map((p, index) => ({
    trial_id: trialId,
    position: index,
    product_name: p.productName,
    active_ingredient: p.activeIngredient ?? '',
    formulation: p.formulation ?? '',
    dose: String(p.dose ?? ''),
    unit: p.unit ?? '',
    replications: Number(p.replications) || 0,
    applications: Number(p.applications) || 0,
    standard: p.standard ?? [],
  }));
}

function buildObservationRows(trial: Trial) {
  return trial.observationSchedule.map((day) => {
    const obs = trial.observations[day];
    return {
      trial_id: trial.id,
      day,
      planned_date: trial.observationDates[day],
      completed: obs?.completed ?? false,
      actual_date: obs?.completed ? obs?.actualDate ?? null : null,
      efficacy_percent: obs?.efficacyPercent ?? null,
      pest_mortality_count: obs?.pestMortalityCount ?? null,
      weed_control_percent: obs?.weedControlPercent ?? null,
      phytotoxicity: obs?.phytotoxicity ?? null,
      notes: obs?.notes ?? null,
      observed_by: obs?.observedBy ?? null,
    };
  });
}

export async function createTrial(input: TrialFormInput): Promise<Trial[]> {
  const supabase = requireSupabase();
  const { schedule, observationDates } = buildSchedule(
    input.category,
    input.insecticideSubCategory,
    input.conductedDate
  );

  const { data: trialRow, error: trialErr } = await supabase
    .from('trials')
    .insert(buildTrialRow(input))
    .select('*')
    .single();
  if (trialErr) throw trialErr;

  const trialId = (trialRow as TrialRow).id;

  const { error: prodErr } = await supabase
    .from('trial_products')
    .insert(buildProductRows(trialId, input.products));
  if (prodErr) throw prodErr;

  const observationRows = schedule.map((day) => ({
    trial_id: trialId,
    day,
    planned_date: observationDates[day],
  }));
  const { error: obsErr } = await supabase.from('observations').insert(observationRows);
  if (obsErr) throw obsErr;

  return fetchTrials();
}

export async function updateTrial(updated: Trial): Promise<Trial[]> {
  const supabase = requireSupabase();

  const input: TrialFormInput = {
    station: updated.station,
    trialName: updated.trialName,
    category: updated.category,
    insecticideSubCategory: updated.insecticideSubCategory,
    crop: updated.crop,
    pestOrWeed: updated.pestOrWeed,
    products: updated.products,
    conductedDate: updated.conductedDate,
    harvestStageDate: updated.harvestStageDate,
    fieldLocation: updated.fieldLocation,
    fieldStaffName: updated.fieldStaffName,
    remarks: updated.remarks,
  };

  const { error: trialErr } = await supabase
    .from('trials')
    .update(buildTrialRow(input))
    .eq('id', updated.id);
  if (trialErr) throw trialErr;

  // Replace products (simple + reliable).
  const { error: delProdErr } = await supabase
    .from('trial_products')
    .delete()
    .eq('trial_id', updated.id);
  if (delProdErr) throw delProdErr;

  const { error: prodErr } = await supabase
    .from('trial_products')
    .insert(buildProductRows(updated.id, updated.products));
  if (prodErr) throw prodErr;

  // Upsert observations for the (possibly changed) schedule.
  const { error: obsErr } = await supabase
    .from('observations')
    .upsert(buildObservationRows(updated), { onConflict: 'trial_id,day' });
  if (obsErr) throw obsErr;

  return fetchTrials();
}

export async function deleteTrial(trialId: string): Promise<Trial[]> {
  const supabase = requireSupabase();
  const { error } = await supabase.from('trials').delete().eq('id', trialId);
  if (error) throw error;
  return fetchTrials();
}

export async function saveObservation(
  trialId: string,
  day: number,
  entry: ObservationEntryInput
): Promise<Trial[]> {
  const supabase = requireSupabase();

  // `observations.planned_date` is NOT NULL, and Postgres validates NOT NULL
  // constraints before resolving an upsert conflict. Always supply it (derived
  // from the trial's category + conducted date) so inserts and updates work.
  const { data: trialRow, error: trialErr } = await supabase
    .from('trials')
    .select('category, insecticide_sub_category, conducted_date')
    .eq('id', trialId)
    .single();
  if (trialErr) throw trialErr;

  const meta = trialRow as Pick<
    TrialRow,
    'category' | 'insecticide_sub_category' | 'conducted_date'
  >;
  const { observationDates } = buildSchedule(
    meta.category,
    meta.insecticide_sub_category,
    meta.conducted_date
  );

  const { error } = await supabase
    .from('observations')
    .upsert(
      {
        trial_id: trialId,
        day,
        planned_date: observationDates[day] ?? entry.actualDate,
        completed: entry.completed,
        actual_date: entry.actualDate,
        efficacy_percent: entry.efficacyPercent ?? null,
        pest_mortality_count: entry.pestMortalityCount ?? null,
        weed_control_percent: entry.weedControlPercent ?? null,
        phytotoxicity: entry.phytotoxicity ?? null,
        notes: entry.notes ?? null,
        observed_by: entry.observedBy ?? null,
      },
      { onConflict: 'trial_id,day' }
    );
  if (error) throw error;
  return fetchTrials();
}

/**
 * Replace the entire dataset. Used by JSON import and by the "seed data" and
 * localStorage migration actions. Existing rows are deleted first.
 */
export async function replaceAllTrials(trials: Trial[]): Promise<Trial[]> {
  const supabase = requireSupabase();

  const { error: clearObs } = await supabase
    .from('observations')
    .delete()
    .not('id', 'is', null);
  if (clearObs) throw clearObs;
  const { error: clearProd } = await supabase
    .from('trial_products')
    .delete()
    .not('id', 'is', null);
  if (clearProd) throw clearProd;
  const { error: clearTrials } = await supabase.from('trials').delete().not('id', 'is', null);
  if (clearTrials) throw clearTrials;

  for (const trial of trials) {
    const input: TrialFormInput = {
      station: trial.station,
      trialName: trial.trialName,
      category: trial.category,
      insecticideSubCategory: trial.insecticideSubCategory,
      crop: trial.crop,
      pestOrWeed: trial.pestOrWeed,
      products: trial.products,
      conductedDate: trial.conductedDate,
      harvestStageDate: trial.harvestStageDate,
      fieldLocation: trial.fieldLocation,
      fieldStaffName: trial.fieldStaffName,
      remarks: trial.remarks,
    };

    const { data: trialRow, error: trialErr } = await supabase
      .from('trials')
      .insert(buildTrialRow(input))
      .select('*')
      .single();
    if (trialErr) throw trialErr;
    const newId = (trialRow as TrialRow).id;

    if (trial.products.length > 0) {
      const { error: prodErr } = await supabase
        .from('trial_products')
        .insert(buildProductRows(newId, trial.products));
      if (prodErr) throw prodErr;
    }

    const restored: Trial = {
      ...trial,
      id: newId,
      observationSchedule:
        trial.observationSchedule && trial.observationSchedule.length > 0
          ? trial.observationSchedule
          : getObservationSchedule(trial.category, trial.insecticideSubCategory),
    };
    const { error: obsErr } = await supabase
      .from('observations')
      .insert(buildObservationRows(restored));
    if (obsErr) throw obsErr;
  }

  return fetchTrials();
}
