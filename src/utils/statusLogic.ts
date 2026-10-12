import { Trial } from '../types/trial';
import { STANDARD_SCHEDULE, hasHarvestStage } from '../data/trialCategories';
import { formatISODate, isPastOrToday } from './dateUtils';

/** Resolve the trial's observation schedule, tolerating legacy/empty data. */
export function getTrialSchedule(trial: Trial): number[] {
  if (trial.observationSchedule && trial.observationSchedule.length > 0) {
    return [...trial.observationSchedule].sort((a, b) => a - b);
  }
  return [...STANDARD_SCHEDULE];
}

/** The final observation day offset (e.g. 28). */
export function getFinalObservationDay(trial: Trial): number {
  const schedule = getTrialSchedule(trial);
  return schedule[schedule.length - 1] ?? 28;
}

/**
 * The date the trial is considered finished:
 * - Fertilizer / Growth: the manually entered harvesting stage date when set.
 * - Everything else: the final scheduled observation date.
 */
export function getCompletionDate(trial: Trial): string {
  if (hasHarvestStage(trial.category) && trial.harvestStageDate) {
    return trial.harvestStageDate;
  }
  return trial.observations && trial.observationDates
    ? trial.observationDates[getFinalObservationDay(trial)]
    : '';
}

/**
 * A trial is COMPLETED once its completion date (final observation, or the
 * harvest stage date for Fertilizer / Growth) has arrived or passed.
 */
export function isTrialCompleted(trial: Trial, referenceDateISO?: string): boolean {
  const ref = referenceDateISO || formatISODate(new Date());
  const completionDate = getCompletionDate(trial);
  return !!completionDate && isPastOrToday(completionDate, ref);
}

/**
 * A trial is ONGOING while it is not completed. "Observation Due" is a layered
 * alert on top of ongoing, not a mutually exclusive state.
 */
export function isTrialOngoing(trial: Trial, referenceDateISO?: string): boolean {
  return !isTrialCompleted(trial, referenceDateISO);
}

/** Observation days that are due today or in the past but uncompleted. */
export function getDueIntervals(trial: Trial, referenceDateISO?: string): number[] {
  const ref = referenceDateISO || formatISODate(new Date());
  return getTrialSchedule(trial).filter((day) => {
    const planned = trial.observationDates[day];
    const obs = trial.observations[day];
    return !!planned && isPastOrToday(planned, ref) && (!obs || !obs.completed);
  });
}

/**
 * True when at least one scheduled observation has reached its planned date but
 * has not been recorded. This is the actionable "alert" layered over ONGOING.
 */
export function isObservationDue(trial: Trial, referenceDateISO?: string): boolean {
  return getDueIntervals(trial, referenceDateISO).length > 0;
}

/** Check if a specific observation day is due. */
export function isIntervalDue(
  trial: Trial,
  day: number,
  referenceDateISO?: string
): boolean {
  const ref = referenceDateISO || formatISODate(new Date());
  const planned = trial.observationDates[day];
  const obs = trial.observations[day];
  return !!planned && isPastOrToday(planned, ref) && (!obs || !obs.completed);
}

/** Progress of observations completed, e.g. { completedCount: 3, total: 5 }. */
export function getObservationProgress(trial: Trial): { completedCount: number; total: number } {
  const schedule = getTrialSchedule(trial);
  let completedCount = 0;
  for (const day of schedule) {
    if (trial.observations[day]?.completed) {
      completedCount++;
    }
  }
  return { completedCount, total: schedule.length };
}
