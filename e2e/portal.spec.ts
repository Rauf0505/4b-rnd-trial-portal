import { expect, test, type Page } from '@playwright/test';
import {
  addDaysISO,
  countRows,
  deleteTrialsByNamePrefix,
  downloadViaMenu,
  gotoApp,
  kpiNumber,
  readWorkbook,
  search,
  selectViaMenu,
  setReferenceDate,
  setRole,
  todayISO,
  workbookHasText,
  workbookStrings,
  expectRowCount,
} from './helpers';

/**
 * End-to-end coverage for the 4B R&D Trial Portal.
 *
 * These tests run against the *live* Supabase project, so every record they
 * create is named with the `E2E-` prefix and removed again in `afterAll`. The
 * suite finishes by asserting the database is back to its seeded baseline.
 */

const RUN = Date.now();
const SINGLE = `E2E-Single-${RUN}`;
const MULTI = `E2E-Multi-${RUN}`;
const DIFF = `E2E-Diff-${RUN}`;
const STD_SINGLE = `E2E-Std-Alpha-${RUN}`;
const STD_SHARED = `E2E-Std-Shared-${RUN}`;
const STD_A = `E2E-Std-A-${RUN}`;
const STD_B = `E2E-Std-B-${RUN}`;

const PROD_A = `E2E Prod A ${RUN}`;
const PROD_B = `E2E Prod B ${RUN}`;

const STANDARD_HEADER = 'Standard / Check';
const PREFIX = 'E2E-';

const pageErrors: string[] = [];

let dbBaseline = { trials: 0, products: 0, observations: 0 };

// ── small local helpers ─────────────────────────────────────────────────────

async function openTrialForm(page: Page): Promise<void> {
  await page.getByRole('button', { name: 'Add Trial', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Add New Field Trial' })).toBeVisible();
}

interface ProductInput {
  name: string;
  ai: string;
  dose: string;
  /** Standard this product picks, one of `opts.standards`. */
  standard?: string;
}

async function fillTrialForm(
  page: Page,
  opts: {
    station: string;
    category: string;
    subCategory?: string;
    name: string;
    pest: string;
    products: ProductInput[];
    /** Standards added to the trial list (one per click of "Add Standard"). */
    standards?: string[];
  }
): Promise<void> {
  const modal = page
    .locator('div.fixed.inset-0.z-50')
    .filter({ has: page.getByRole('heading', { name: /Add New Field Trial|Edit R&D Field Trial/ }) })
    .last();

  await modal.locator(`select:has(option[value="${opts.station}"])`).selectOption(opts.station);
  await modal.locator(`select:has(option[value="${opts.category}"])`).selectOption(opts.category);
  if (opts.subCategory) {
    await modal
      .locator(`select:has(option[value="${opts.subCategory}"])`)
      .selectOption(opts.subCategory);
  }
  await page.getByPlaceholder('e.g. Bio-efficacy of Emamectin on Spodoptera').fill(opts.name);
  await page
    .getByPlaceholder('e.g. Pink Bollworm, Whitefly, Phalaris minor')
    .fill(opts.pest);

  // Build the trial's standards list first.
  for (let s = 0; s < (opts.standards?.length ?? 0); s++) {
    await page.getByRole('button', { name: 'Add Standard', exact: true }).click();
    await page.getByLabel(`Standard #${s + 1}`, { exact: true }).fill(opts.standards![s]);
  }

  for (let i = 0; i < opts.products.length; i++) {
    if (i > 0) await page.getByRole('button', { name: 'Add Product' }).click();
    const p = opts.products[i];
    await page.getByPlaceholder('e.g. Proclaim 05 SG').nth(i).fill(p.name);
    await page.getByPlaceholder('e.g. Emamectin Benzoate').nth(i).fill(p.ai);
    await page.getByPlaceholder('100').nth(i).fill(p.dose);
    if (p.standard) {
      await page.getByLabel(`Standard for Product #${i + 1}`, { exact: true }).selectOption(p.standard);
    }
  }

  await page
    .getByPlaceholder('e.g. Chak 84/9L, Research Farm Block C')
    .fill('E2E Research Farm, Block E');
  await page.getByPlaceholder('e.g. Muhammad Arslan, Field Officer').fill('E2E Field Officer');
  await page
    .getByPlaceholder(/Weather sunny/)
    .fill(`Automated E2E record for ${opts.name}`);

  await page.getByRole('button', { name: 'Save & Submit Trial' }).click();
  await expect(page.getByRole('heading', { name: 'Add New Field Trial' })).toBeHidden();
}

async function filterTo(page: Page, query: string): Promise<void> {
  await search(page, query);
  await expect(page.getByText(/Found \d+ matching trials/)).toBeVisible();
}

test.describe.configure({ mode: 'serial' });

test.beforeAll(async () => {
  // Remove any leftovers from a previous interrupted run so the baseline is clean.
  await deleteTrialsByNamePrefix(PREFIX);
  dbBaseline = {
    trials: await countRows('trials'),
    products: await countRows('trial_products'),
    observations: await countRows('observations'),
  };
});

test.beforeEach(async ({ page }) => {
  pageErrors.length = 0;
  page.on('pageerror', (e) => pageErrors.push(e.message));
});

test.afterEach(async () => {
  expect(pageErrors, `Uncaught page errors: ${pageErrors.join(' | ')}`).toEqual([]);
});

test.afterAll(async () => {
  await deleteTrialsByNamePrefix(PREFIX);
  await expectRowCount('trials', dbBaseline.trials);
  await expectRowCount('trial_products', dbBaseline.products);
  await expectRowCount('observations', dbBaseline.observations);
});

// ── 1. dashboard smoke / baseline ───────────────────────────────────────────

test('dashboard loads with seeded trials and consistent KPIs', async ({ page }) => {
  await gotoApp(page);

  const total = await kpiNumber(page, 'Total Trials');
  const ongoing = await kpiNumber(page, 'Ongoing Trials');
  const due = await kpiNumber(page, 'Observations Due');
  const completed = await kpiNumber(page, 'Completed Trials');

  expect(total).toBeGreaterThan(0);
  expect(ongoing + completed).toBe(total);
  expect(due).toBeGreaterThanOrEqual(0);

  // The 0 DAA baseline column is part of the union of scheduled observation days.
  await expect(page.getByRole('columnheader', { name: '0 DAA', exact: true })).toBeVisible();
  // Standard / Check column is visible by default.
  await expect(page.getByRole('columnheader', { name: STANDARD_HEADER, exact: true })).toBeVisible();

  // ...and it sits immediately before the Replication column.
  const headers = await page.locator('thead th').allInnerTexts();
  expect(headers).toContain('Rep.');
  expect(headers.indexOf(STANDARD_HEADER)).toBe(headers.indexOf('Rep.') - 1);
});

// ── 2. create a single-product trial ────────────────────────────────────────

test('creates a single-product trial with a 0 DAA baseline that is due today', async ({
  page,
}) => {
  await gotoApp(page);

  const before = {
    total: await kpiNumber(page, 'Total Trials'),
    ongoing: await kpiNumber(page, 'Ongoing Trials'),
    due: await kpiNumber(page, 'Observations Due'),
  };

  await openTrialForm(page);
  await fillTrialForm(page, {
    station: 'Sahiwal',
    category: 'Herbicide',
    name: SINGLE,
    pest: `E2E Pest ${RUN}`,
    standards: [STD_SINGLE],
    products: [
      { name: `E2E Prod Single ${RUN}`, ai: 'Alpha Ingredient', dose: '100', standard: STD_SINGLE },
    ],
  });

  await expect.poll(() => kpiNumber(page, 'Total Trials')).toBe(before.total + 1);
  await expect.poll(() => kpiNumber(page, 'Ongoing Trials')).toBe(before.ongoing + 1);
  await expect.poll(() => kpiNumber(page, 'Observations Due')).toBe(before.due + 1);

  await filterTo(page, SINGLE);
  await expect(page.locator('tbody tr')).toHaveCount(1);

  const row = page.locator('tbody tr').first();
  await expect(row).toContainText(SINGLE);
  await expect(row).toContainText('ONGOING');
  await expect(row).toContainText(STD_SINGLE);
  // 0 DAA baseline is due on the application date.
  await expect(row.getByTitle(/Observation DUE!/).first()).toBeVisible();
});

// ── 3. persistence across reload ────────────────────────────────────────────

test('persists the new trial across a reload', async ({ page }) => {
  await gotoApp(page);
  await filterTo(page, SINGLE);

  await page.reload();
  await expect(page.locator('table')).toBeVisible();
  await search(page, SINGLE);
  await expect(page.locator('tbody tr')).toHaveCount(1);
  await expect(page.locator('tbody tr').first()).toContainText(STD_SINGLE);
});

// ── 4. multi-product trial ──────────────────────────────────────────────────

test('creates a multi-product trial with one row per product, all sharing one Standard', async ({
  page,
}) => {
  await gotoApp(page);
  await openTrialForm(page);

  // The standards inputs suggest values already in use (dropdown + free text).
  await expect(
    page.locator(`#trial-standard-options option[value="${STD_SINGLE}"]`)
  ).toHaveCount(1);

  await fillTrialForm(page, {
    station: 'Multan',
    category: 'Insecticide',
    subCategory: 'Granular',
    name: MULTI,
    pest: `E2E Multi Pest ${RUN}`,
    standards: [STD_SHARED],
    products: [
      { name: PROD_A, ai: 'Alpha AI', dose: '120', standard: STD_SHARED },
      { name: PROD_B, ai: 'Beta AI', dose: '240', standard: STD_SHARED },
    ],
  });

  await filterTo(page, MULTI);
  await expect(page.locator('tbody tr')).toHaveCount(2);

  const body = page.locator('tbody');
  await expect(body.getByText(PROD_A, { exact: true })).toBeVisible();
  await expect(body.getByText(PROD_B, { exact: true })).toBeVisible();
  // Both products picked the same shared standard.
  await expect(body.getByText(STD_SHARED, { exact: true })).toHaveCount(2);
});

// ── 4b. each product can carry its own Standard ─────────────────────────────

test('lets each product carry a different Standard', async ({ page }) => {
  await gotoApp(page);
  await openTrialForm(page);
  await fillTrialForm(page, {
    station: 'Sahiwal',
    category: 'Fungicide',
    name: DIFF,
    pest: `E2E Diff Pest ${RUN}`,
    standards: [STD_A, STD_B],
    products: [
      { name: `E2E Diff P1 ${RUN}`, ai: 'Gamma AI', dose: '90', standard: STD_A },
      { name: `E2E Diff P2 ${RUN}`, ai: 'Delta AI', dose: '180', standard: STD_B },
    ],
  });

  await filterTo(page, DIFF);
  await expect(page.locator('tbody tr')).toHaveCount(2);

  const body = page.locator('tbody');
  await expect(body.getByText(STD_A, { exact: true })).toHaveCount(1);
  await expect(body.getByText(STD_B, { exact: true })).toHaveCount(1);
});

// ── 5. observations + date-driven status transitions ────────────────────────

test('records every observation and completes the trial once its final date passes', async ({
  page,
}) => {
  await gotoApp(page);
  await filterTo(page, SINGLE);

  const row = page.locator('tbody tr').first();
  await expect(row).toContainText('ONGOING');

  await page.getByRole('button', { name: /Obs \(0\/6\)/ }).click();
  await expect(page.getByRole('heading', { name: 'Field Observation Records' })).toBeVisible();

  for (const day of [0, 3, 7, 14, 21, 28]) {
    await page.getByRole('button', { name: new RegExp(`^${day} DAA`) }).click();
    await page.getByPlaceholder('e.g. 92.5').fill('90');
    await page.getByPlaceholder('Field staff name').fill('E2E Observer');
    await page.getByRole('button', { name: new RegExp(`^Save ${day} DAA Observation$`) }).click();
  }

  await page.getByRole('button', { name: 'Close observation form' }).click();
  await expect(page.getByRole('button', { name: /Obs \(6\/6\)/ })).toBeVisible();
  await expect(page.getByTitle(/Completed on/).first()).toBeVisible();

  // Advance the simulated reference date past the final (28 DAA) observation.
  // The dashboard KPIs are global, so assert an increase rather than an exact value.
  const completedBefore = await kpiNumber(page, 'Completed Trials');
  await setReferenceDate(page, addDaysISO(todayISO(), 32));
  await expect.poll(() => kpiNumber(page, 'Completed Trials')).toBeGreaterThanOrEqual(
    completedBefore + 1
  );
  await expect(row).toContainText('COMPLETED');
  await expect(row.getByTitle(/Observation DUE!/)).toHaveCount(0);

  // Returning to today restores the ongoing state.
  await setReferenceDate(page, todayISO());
  await expect(row).toContainText('ONGOING');
});

// ── 6. on-screen Standard column toggle ─────────────────────────────────────

test('shows and hides the Standard column in the on-screen table', async ({ page }) => {
  await gotoApp(page);
  await filterTo(page, SINGLE);

  await expect(page.getByRole('columnheader', { name: STANDARD_HEADER, exact: true })).toBeVisible();
  await expect(page.getByRole('cell', { name: STD_SINGLE, exact: true })).toBeVisible();

  await page.getByRole('button', { name: 'Hide Standard', exact: true }).click();
  await expect(page.getByRole('columnheader', { name: STANDARD_HEADER, exact: true })).toHaveCount(0);

  await page.getByRole('button', { name: 'Show Standard', exact: true }).click();
  await expect(page.getByRole('columnheader', { name: STANDARD_HEADER, exact: true })).toBeVisible();
});

// ── 7. Excel exports ────────────────────────────────────────────────────────

test('exports Excel from every surface with and without the Standard column', async ({
  page,
}) => {
  await gotoApp(page);
  await filterTo(page, SINGLE);

  const headerDownload = page
    .locator('header')
    .getByRole('button', { name: 'Download Excel', exact: true });
  const headerOverview = page
    .locator('header')
    .getByRole('button', { name: 'Overview', exact: true });
  const filterDownload = page.getByRole('button', { name: /^Download Excel \(/ });
  const stationExcel = page.getByRole('button', { name: 'Excel', exact: true }).first();

  // Header "Download Excel" — WITH Standard.
  const withStd = await downloadViaMenu(page, headerDownload, /With Standard column/);
  const withStdWb = await readWorkbook(withStd);
  expect(workbookHasText(withStdWb, STANDARD_HEADER)).toBe(true);
  expect(workbookHasText(withStdWb, STD_SINGLE)).toBe(true);
  expect(workbookStrings(withStdWb).length).toBeGreaterThan(0);

  // Header "Download Excel" — WITHOUT Standard: column and value both gone.
  const withoutStd = await downloadViaMenu(page, headerDownload, /Without Standard column/);
  const withoutStdWb = await readWorkbook(withoutStd);
  expect(workbookHasText(withoutStdWb, STANDARD_HEADER)).toBe(false);
  expect(workbookHasText(withoutStdWb, STD_SINGLE)).toBe(false);

  // Overview-only export — WITH Standard.
  const overview = await downloadViaMenu(page, headerOverview, /With Standard column/);
  const overviewWb = await readWorkbook(overview);
  expect(workbookHasText(overviewWb, STANDARD_HEADER)).toBe(true);

  // Filter-bar "Download Excel (n)" — WITHOUT Standard.
  const filterWithout = await downloadViaMenu(page, filterDownload, /Without Standard column/);
  const filterWb = await readWorkbook(filterWithout);
  expect(workbookHasText(filterWb, STANDARD_HEADER)).toBe(false);

  // Station card "Excel" (Sahiwal) — WITH Standard.
  const stationWith = await downloadViaMenu(page, stationExcel, /With Standard column/);
  const stationWb = await readWorkbook(stationWith);
  expect(workbookHasText(stationWb, STANDARD_HEADER)).toBe(true);
  expect(workbookStrings(stationWb).length).toBeGreaterThan(0);
});

// ── 8. print report ─────────────────────────────────────────────────────────

test('prints the station report with and without the Standard column', async ({ page }) => {
  await gotoApp(page);
  await filterTo(page, SINGLE);

  const printTrigger = page
    .locator('header')
    .getByRole('button', { name: 'Print Report', exact: true });

  await selectViaMenu(page, printTrigger, /With Standard column/);
  await expect(page.getByRole('heading', { name: /Station Status Report/ })).toBeVisible();
  await expect(page.getByRole('columnheader', { name: 'Standard', exact: true }).first()).toBeVisible();
  await page.getByRole('button', { name: 'Close print report' }).click();
  await expect(page.getByRole('heading', { name: /Station Status Report/ })).toHaveCount(0);

  await selectViaMenu(page, printTrigger, /Without Standard column/);
  await expect(page.getByRole('heading', { name: /Station Status Report/ })).toBeVisible();
  await expect(page.getByRole('columnheader', { name: 'Standard', exact: true })).toHaveCount(0);
  await page.getByRole('button', { name: 'Close print report' }).click();
});

// ── 9. filters feed the exports ─────────────────────────────────────────────

test('filters drive the exports and disable downloads on zero matches', async ({ page }) => {
  await gotoApp(page);

  await search(page, 'zzz-no-such-trial-zzz');
  await expect(page.getByText(/Found 0 matching trials/)).toBeVisible();
  await expect(
    page.locator('header').getByRole('button', { name: 'Download Excel', exact: true })
  ).toBeDisabled();
  await expect(page.getByRole('button', { name: /^Download Excel \(/ })).toBeDisabled();
  await expect(page.getByText('No Field Trials Match Your Criteria')).toBeVisible();

  // Clear search -> downloads re-enable.
  await page.getByRole('button', { name: 'Clear search' }).click();
  await expect(page.getByRole('button', { name: /^Download Excel \(/ })).toBeEnabled();

  // Station filter narrows the table and the heading.
  await page.getByRole('button', { name: 'Multan', exact: true }).first().click();
  await expect(page.getByRole('heading', { name: /Multan Station Trial Records/ })).toBeVisible();

  // Status filter shows only completed trials.
  await page.locator('select:has(option[value="COMPLETED"])').selectOption('COMPLETED');
  await expect(page.locator('tbody tr').first()).toContainText('COMPLETED');

  // Reset back to the unfiltered view (the header also has an "All Stations" control).
  await page
    .getByRole('main')
    .getByRole('button', { name: 'All Stations', exact: true })
    .click();
  await page.locator('select:has(option[value="COMPLETED"])').selectOption('All');
  await expect(page.getByRole('heading', { name: /All Research Stations Trial Records/ })).toBeVisible();
});

// ── 10. edit ────────────────────────────────────────────────────────────────

test('edits an existing trial and persists the change', async ({ page }) => {
  await gotoApp(page);
  await filterTo(page, SINGLE);

  const row = page.locator('tbody tr').first();
  await row.getByTitle('Edit Trial Information').click();
  await expect(page.getByRole('heading', { name: 'Edit R&D Field Trial' })).toBeVisible();

  // The per-product Standard dropdown is prefilled from the saved value.
  await expect(
    page.getByLabel('Standard for Product #1', { exact: true })
  ).toHaveValue(STD_SINGLE);

  const newName = `${SINGLE}-EDITED`;
  await page.getByPlaceholder('e.g. Bio-efficacy of Emamectin on Spodoptera').fill(newName);
  await page.getByRole('button', { name: 'Update Trial' }).click();
  await expect(page.getByRole('heading', { name: 'Edit R&D Field Trial' })).toBeHidden();

  await expect.poll(async () => {
    await search(page, '');
    await search(page, SINGLE);
    return (await page.locator('tbody tr').count()) ?? 0;
  }).toBe(1);
  await expect(page.locator('tbody tr').first()).toContainText(SINGLE + '-');
});

// ── 10. role-based delete visibility ────────────────────────────────────────

test('restricts the delete action by role', async ({ page }) => {
  await gotoApp(page);
  await filterTo(page, SINGLE);

  const deleteButton = () => page.locator('tbody tr').first().getByTitle('Delete Trial Entry');

  await setRole(page, 'Deputy Manager');
  await expect(deleteButton()).toHaveCount(0);

  await setRole(page, 'Field Staff');
  await expect(page.getByRole('button', { name: 'Add Trial', exact: true })).toBeVisible();
  await setRole(page, 'R&D Officer');
  await expect(page.getByRole('button', { name: 'Add Trial', exact: true })).toBeVisible();
  await setRole(page, 'Admin');
  await expect(page.getByRole('button', { name: 'Add Trial', exact: true })).toBeVisible();
});

// ── 10b. delete actually removes the row ────────────────────────────────────

test('deletes the created trial', async ({ page }) => {
  await gotoApp(page);
  await setRole(page, 'Admin');
  await filterTo(page, MULTI);

  const row = page.locator('tbody tr').first();
  await row.getByTitle('Delete Trial Entry').click();
  await expect(page.getByRole('heading', { name: 'Delete Field Trial?' })).toBeVisible();
  await page.getByRole('button', { name: 'Delete Trial', exact: true }).click();

  await expect(page.getByText(/Found 0 matching trials/)).toBeVisible();
});
