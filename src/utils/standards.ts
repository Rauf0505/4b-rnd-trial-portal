/**
 * Normalise a stored Standard / Check value into a clean list of strings.
 *
 * The database column is a Postgres `text[]` (so the REST API returns an
 * array), but this intentionally also tolerates the legacy single-string shape
 * and JSON-encoded arrays. That way a data-shape mismatch between a deployed
 * bundle and the database can never crash the UI.
 */
export function normalizeStandards(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.map((item) => String(item ?? '').trim()).filter(Boolean);
  }

  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) return [];

    // Legacy JSON-encoded arrays (e.g. '["A","B"]').
    if (trimmed.startsWith('[')) {
      try {
        const parsed = JSON.parse(trimmed);
        if (Array.isArray(parsed)) {
          return parsed.map((item) => String(item ?? '').trim()).filter(Boolean);
        }
      } catch {
        // Not JSON after all — fall through and treat it as one value.
      }
    }

    return [trimmed];
  }

  return [];
}
