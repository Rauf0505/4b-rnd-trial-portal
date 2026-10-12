import { UserRole } from '../types/trial';

const LEGACY_TRIALS_KEY = 'agrotrack_trials_v2';
const ROLE_KEY = '4b_rd_active_role';
const LEGACY_ROLE_KEY = 'agrotrack_active_role';
const SIMULATED_DATE_KEY = '4b_rd_simulated_date';

/**
 * Read the legacy (pre-Supabase) localStorage dataset, if any, so it can be
 * migrated into the database. Returns a raw array or null.
 */
export function readLegacyLocalTrials(): unknown[] | null {
  try {
    const data = localStorage.getItem(LEGACY_TRIALS_KEY);
    if (!data) return null;
    const parsed = JSON.parse(data);
    return Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export function clearLegacyLocalTrials(): void {
  localStorage.removeItem(LEGACY_TRIALS_KEY);
}

/**
 * Get / Set the active in-app role (kept in localStorage - not trial data).
 */
export function getStoredRole(): UserRole {
  return (
    (localStorage.getItem(ROLE_KEY) as UserRole) ||
    (localStorage.getItem(LEGACY_ROLE_KEY) as UserRole) ||
    'R&D Officer'
  );
}

export function saveStoredRole(role: UserRole): void {
  localStorage.setItem(ROLE_KEY, role);
}

/**
 * Simulated reference date (allows testing trial progression and due dates).
 */
export function getSimulatedDate(): string | null {
  return localStorage.getItem(SIMULATED_DATE_KEY);
}

export function saveSimulatedDate(dateISO: string | null): void {
  if (dateISO) {
    localStorage.setItem(SIMULATED_DATE_KEY, dateISO);
  } else {
    localStorage.removeItem(SIMULATED_DATE_KEY);
  }
}
