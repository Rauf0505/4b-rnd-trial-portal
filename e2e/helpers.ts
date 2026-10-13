import { expect, type Download, type Locator, type Page } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import ExcelJS from 'exceljs';

// ── .env loading ────────────────────────────────────────────────────────────

let cachedEnv: Record<string, string> | null = null;

/** Parse the repo's .env file into a plain object (read once per worker). */
export function env(): Record<string, string> {
  if (cachedEnv) return cachedEnv;
  const text = readFileSync(resolve(process.cwd(), '.env'), 'utf8');
  const out: Record<string, string> = {};
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    const i = line.indexOf('=');
    if (i === -1) continue;
    out[line.slice(0, i).trim()] = line.slice(i + 1).trim().replace(/^["']|["']$/g, '');
  }
  cachedEnv = out;
  return out;
}

function apiBase(): string {
  const url = env().VITE_SUPABASE_URL;
  if (!url) throw new Error('VITE_SUPABASE_URL is missing from .env');
  return url.replace(/\/$/, '');
}

function apiHeaders(): Record<string, string> {
  const key = env().VITE_SUPABASE_ANON_KEY;
  if (!key) throw new Error('VITE_SUPABASE_ANON_KEY is missing from .env');
  return { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' };
}

// ── direct database access (used only for cleanup / baseline verification) ───

/** Exact row count for a Supabase table, optionally filtered by a PostgREST query. */
export async function countRows(table: string, query = ''): Promise<number> {
  const res = await fetch(`${apiBase()}/rest/v1/${table}?select=id${query ? `&${query}` : ''}`, {
    headers: { ...apiHeaders(), Prefer: 'count=exact', Range: '0-0' },
  });
  if (!res.ok) throw new Error(`countRows(${table}) failed: ${res.status} ${await res.text()}`);
  const range = res.headers.get('content-range') ?? '';
  const total = range.split('/')[1];
  if (!total || total === '*') return 0;
  return Number(total);
}

/** Delete every trial whose name starts with `prefix` (children cascade). */
export async function deleteTrialsByNamePrefix(prefix: string): Promise<number> {
  const filter = encodeURIComponent(`${prefix}*`);
  const res = await fetch(`${apiBase()}/rest/v1/trials?trial_name=like.${filter}`, {
    method: 'DELETE',
    headers: { ...apiHeaders(), Prefer: 'return=representation' },
  });
  if (!res.ok) throw new Error(`deleteTrialsByNamePrefix failed: ${res.status} ${await res.text()}`);
  const rows = (await res.json()) as unknown;
  return Array.isArray(rows) ? rows.length : 0;
}

// ── date helpers (mirror the app's local-time formatting) ───────────────────

export function toISODate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function todayISO(): string {
  return toISODate(new Date());
}

export function addDaysISO(iso: string, days: number): string {
  const [y, m, d] = iso.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  dt.setDate(dt.getDate() + days);
  return toISODate(dt);
}

// ── UI helpers ──────────────────────────────────────────────────────────────

/** Load the SPA and wait until the dashboard + table have rendered. */
export async function gotoApp(page: Page): Promise<void> {
  await page.goto('/');
  await expect(page.getByText('Total Trials', { exact: true })).toBeVisible();
  await expect(page.locator('table')).toBeVisible();
}

/** Read a dashboard KPI number by its label (e.g. "Total Trials"). */
export async function kpiNumber(page: Page, label: string): Promise<number> {
  const p = page.getByText(label, { exact: true }).first();
  const value = p.locator('xpath=following-sibling::h3[1]');
  return Number((await value.innerText()).trim());
}

/** Switch the in-app role switcher (persisted in localStorage). */
export async function setRole(page: Page, role: string): Promise<void> {
  await page.locator('header').getByRole('button', { name: role, exact: true }).click();
}

/** Drive the header "System Reference Date" time simulator. */
export async function setReferenceDate(page: Page, iso: string): Promise<void> {
  await page.getByTitle(/System Reference Date/).click();
  await page.locator('input[type="date"]').first().fill(iso);
  await page.getByRole('button', { name: 'Done', exact: true }).click();
}

/** Type into the instant search box. */
export async function search(page: Page, text: string): Promise<void> {
  await page.getByPlaceholder(/Instant search/).fill(text);
}

/** The header/overview/print export triggers shed a popover; wait for it. */
export async function openExportMenu(page: Page, trigger: Locator): Promise<void> {
  await trigger.click();
  await expect(page.getByRole('menuitem').first()).toBeVisible();
}

/** Click a menu option and capture the resulting download. */
export async function downloadViaMenu(
  page: Page,
  trigger: Locator,
  option: RegExp
): Promise<Download> {
  await openExportMenu(page, trigger);
  const item = page.getByRole('menuitem', { name: option });
  await expect(item).toBeVisible();
  const [download] = await Promise.all([page.waitForEvent('download'), item.click()]);
  return download;
}

/** Click a menu option that opens an in-app view (e.g. the print report). */
export async function selectViaMenu(
  page: Page,
  trigger: Locator,
  option: RegExp
): Promise<void> {
  await openExportMenu(page, trigger);
  await page.getByRole('menuitem', { name: option }).click();
}

/** Parse a downloaded .xlsx workbook. */
export async function readWorkbook(download: Download): Promise<ExcelJS.Workbook> {
  const path = await download.path();
  if (!path) throw new Error('Download did not produce a readable file path');
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(path);
  return wb;
}

/** True when any cell in any sheet equals `text`. */
export function workbookHasText(workbook: ExcelJS.Workbook, text: string): boolean {
  let found = false;
  for (const ws of workbook.worksheets) {
    ws.eachRow((row) => {
      row.eachCell({ includeEmpty: false }, (cell) => {
        if (cell.text === text) found = true;
      });
    });
  }
  return found;
}

/** All string cell values across every sheet (handy for diagnostics). */
export function workbookStrings(workbook: ExcelJS.Workbook): string[] {
  const values: string[] = [];
  for (const ws of workbook.worksheets) {
    ws.eachRow((row) => {
      row.eachCell({ includeEmpty: false }, (cell) => {
        if (cell.text) values.push(cell.text);
      });
    });
  }
  return values;
}

/** Poll the DB until `table` reports exactly `expected` rows (or time out). */
export async function expectRowCount(
  table: string,
  expected: number,
  query = '',
  timeoutMs = 15_000
): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  let last = -1;
  while (Date.now() < deadline) {
    last = await countRows(table, query);
    if (last === expected) return;
    await new Promise((r) => setTimeout(r, 500));
  }
  expect(last, `${table} row count did not settle to ${expected}`).toBe(expected);
}
