/**
 * Format a Date or ISO string into DD-MMM-YYYY (e.g. 06-Oct-2026)
 */
export function formatDateDisplay(dateInput?: string | Date | null): string {
  if (!dateInput) return '-';
  const date = typeof dateInput === 'string' ? new Date(dateInput + 'T00:00:00') : dateInput;
  if (isNaN(date.getTime())) return String(dateInput);

  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const day = String(date.getDate()).padStart(2, '0');
  const month = months[date.getMonth()];
  const year = date.getFullYear();

  return `${day}-${month}-${year}`;
}

/**
 * Format a Date into ISO YYYY-MM-DD
 */
export function formatISODate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Adds N days to an ISO date string (YYYY-MM-DD)
 */
export function addDays(dateStr: string, days: number): string {
  const [year, month, day] = dateStr.split('-').map(Number);
  const d = new Date(year, month - 1, day);
  d.setDate(d.getDate() + days);
  return formatISODate(d);
}

/**
 * Calculate observation dates from conductedDate for a dynamic list of day
 * offsets, e.g. calculateObservationDates('2026-10-01', [3,7,14,21,28]).
 */
export function calculateObservationDates(
  conductedDate: string,
  schedule: number[]
): Record<number, string> {
  const dates: Record<number, string> = {};
  for (const day of schedule) {
    dates[day] = addDays(conductedDate, day);
  }
  return dates;
}

/**
 * Checks if a given date string (YYYY-MM-DD) is in the past or today relative to referenceDate
 * Tolerates missing/invalid input (returns false) so partial data can't crash rendering.
 */
export function isPastOrToday(dateStr?: string | null, referenceDateStr?: string): boolean {
  if (!dateStr) return false;
  const target = dateStr.slice(0, 10);
  const ref = referenceDateStr ? referenceDateStr.slice(0, 10) : formatISODate(new Date());
  return target <= ref;
}

/**
 * Checks if a date string is today
 */
export function isToday(dateStr?: string | null, referenceDateStr?: string): boolean {
  if (!dateStr) return false;
  const target = dateStr.slice(0, 10);
  const ref = referenceDateStr ? referenceDateStr.slice(0, 10) : formatISODate(new Date());
  return target === ref;
}

/**
 * Difference in days between two ISO dates (target - reference)
 */
export function daysDifference(targetDateStr?: string | null, referenceDateStr?: string): number {
  if (!targetDateStr) return 0;
  const [ty, tm, td] = targetDateStr.split('-').map(Number);
  const ref = referenceDateStr ? referenceDateStr : formatISODate(new Date());
  const [ry, rm, rd] = ref.split('-').map(Number);

  const t = new Date(ty, tm - 1, td).getTime();
  const r = new Date(ry, rm - 1, rd).getTime();
  return Math.round((t - r) / (1000 * 60 * 60 * 24));
}
