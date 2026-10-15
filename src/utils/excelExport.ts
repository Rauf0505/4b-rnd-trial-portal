import ExcelJS from 'exceljs';
import { Trial, Station, STATIONS, TrialProductRow } from '../types/trial';
import { formatDateDisplay, formatISODate } from './dateUtils';
import { isTrialCompleted, isObservationDue, getObservationProgress, getTrialSchedule } from './statusLogic';
import { flattenToProductRows, hasHarvestStage, categoryLabel } from '../data/trialCategories';

interface ColumnConfig {
  header: string;
  key: string;
  width: number;
  align?: 'left' | 'center';
}

const REPORT_TITLE = '4B R&D TRIAL PORTAL';

/** Union of observation days used by the given trials, sorted ascending. */
function collectObservationDays(trials: Trial[]): number[] {
  const set = new Set<number>();
  trials.forEach((t) => getTrialSchedule(t).forEach((d) => set.add(d)));
  return Array.from(set).sort((a, b) => a - b);
}

/** Build the ordered column config for a station sheet. */
function buildStationColumns(
  days: number[],
  showHarvest: boolean,
  includeStandard = true
): ColumnConfig[] {
  const cols: ColumnConfig[] = [
    { header: 'Sr. No.', key: 'srNo', width: 8, align: 'center' },
    { header: 'Station', key: 'station', width: 13 },
    { header: 'Trial Name', key: 'trialName', width: 40 },
    { header: 'Category', key: 'category', width: 17 },
    { header: 'Sub-Category', key: 'subCategory', width: 13, align: 'center' },
    { header: 'Crop', key: 'crop', width: 13, align: 'center' },
    { header: 'Pest / Weed', key: 'pestOrWeed', width: 28 },
    { header: 'Product / Brand', key: 'productName', width: 22 },
    { header: 'Active Ingredient', key: 'activeIngredient', width: 24 },
    { header: 'Formulation', key: 'formulation', width: 12, align: 'center' },
    { header: 'Dose', key: 'dose', width: 9, align: 'center' },
    { header: 'Unit', key: 'unit', width: 13, align: 'center' },
    ...(includeStandard
      ? [{ header: 'Standard / Check', key: 'standard', width: 22 } as ColumnConfig]
      : []),
    { header: 'Replications', key: 'replications', width: 12, align: 'center' },
    { header: 'Applications', key: 'applications', width: 12, align: 'center' },
    { header: 'Conducted Date', key: 'conductedDate', width: 15, align: 'center' },
  ];

  days.forEach((day) => {
    cols.push({ header: `${day} DAA`, key: `daa_${day}`, width: 15, align: 'center' });
  });

  if (showHarvest) {
    cols.push({ header: 'Harvest Stage', key: 'harvest', width: 15, align: 'center' });
  }

  cols.push(
    { header: 'Status', key: 'status', width: 17, align: 'center' },
    { header: 'Field Staff', key: 'fieldStaffName', width: 26 },
    { header: 'Location', key: 'fieldLocation', width: 32 },
    { header: 'Remarks', key: 'remarks', width: 36 }
  );

  return cols;
}

/**
 * Human-readable status. ONGOING is the primary state for any unfinished
 * trial; a due observation is shown as a layered alert.
 */
function statusText(trial: Trial, referenceDateISO: string): string {
  if (isTrialCompleted(trial, referenceDateISO)) return 'COMPLETED';
  if (isObservationDue(trial, referenceDateISO)) return 'ONGOING (OBS. DUE)';
  return 'ONGOING';
}

function statusFill(completed: boolean, due: boolean): { argb: string } | null {
  if (completed) return { argb: 'FFD1E7DD' };
  if (due) return { argb: 'FFFFEDD5' };
  return { argb: 'FFFEF9C3' };
}

/** True when a filter summary represents an actual (non-empty) filter set. */
function hasActiveFilters(filterSummary?: string): boolean {
  return !!filterSummary && filterSummary !== 'No filters applied';
}

/** Appended to sheet subtitles to record the active filters, if any. */
function filterSummarySuffix(filterSummary?: string): string {
  return hasActiveFilters(filterSummary) ? `  |  Filters: ${filterSummary}` : '';
}

function styleTitleBlock(
  worksheet: ExcelJS.Worksheet,
  title: string,
  subtitle: string,
  summary: { label: string; value: number; fill: string; color: string }[],
  colCount: number
): void {
  worksheet.mergeCells(1, 1, 1, colCount);
  const titleCell = worksheet.getCell(1, 1);
  titleCell.value = title;
  titleCell.font = { name: 'Calibri', size: 15, bold: true, color: { argb: 'FFFFFFFF' } };
  titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
  titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF166534' } };
  worksheet.getRow(1).height = 30;

  worksheet.mergeCells(2, 1, 2, colCount);
  const metaCell = worksheet.getCell(2, 1);
  metaCell.value = subtitle;
  metaCell.font = { name: 'Calibri', size: 10, italic: true, bold: true, color: { argb: 'FF1F2937' } };
  metaCell.alignment = { horizontal: 'center', vertical: 'middle' };
  metaCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF3F4F6' } };
  worksheet.getRow(2).height = 20;

  // Summary cards spread across the sheet width.
  const seg = Math.max(1, Math.floor(colCount / summary.length));
  summary.forEach((card, index) => {
    const startCol = index * seg + 1;
    const endCol = index === summary.length - 1 ? colCount : startCol + seg - 1;
    worksheet.mergeCells(3, startCol, 3, endCol);
    const cell = worksheet.getCell(3, startCol);
    cell.value = `${card.label}: ${card.value}`;
    cell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: card.color } };
    cell.alignment = { horizontal: 'center', vertical: 'middle' };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: card.fill } };
  });
  worksheet.getRow(3).height = 22;

  worksheet.getRow(4).height = 8;
}

function styleHeaderRow(worksheet: ExcelJS.Worksheet, columns: ColumnConfig[]): void {
  const headerRow = worksheet.getRow(5);
  columns.forEach((col, idx) => {
    const cell = headerRow.getCell(idx + 1);
    cell.value = col.header;
    cell.font = { name: 'Calibri', size: 11, bold: true, color: { argb: 'FFFFFFFF' } };
    cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF15803D' } };
    cell.border = {
      top: { style: 'medium', color: { argb: 'FF0D5A2B' } },
      left: { style: 'thin', color: { argb: 'FFFFFFFF' } },
      bottom: { style: 'medium', color: { argb: 'FF0D5A2B' } },
      right: { style: 'thin', color: { argb: 'FFFFFFFF' } },
    };
  });
  headerRow.height = 28;

  columns.forEach((col, idx) => {
    worksheet.getColumn(idx + 1).width = col.width;
  });

  worksheet.autoFilter = {
    from: { row: 5, column: 1 },
    to: { row: 5, column: columns.length },
  };
}

/** Build the ordered cell values for a flattened product row. */
function buildRowValues(
  row: TrialProductRow,
  columns: ColumnConfig[],
  currentDateISO: string
): (string | number)[] {
  const { trial, product } = row;
  const schedule = getTrialSchedule(trial);

  const daaValues: Record<string, string> = {};
  schedule.forEach((day) => {
    const plannedDate = formatDateDisplay(trial.observationDates[day]);
    const obs = trial.observations[day];
    daaValues[`daa_${day}`] = obs?.completed ? `${plannedDate} [Done]` : plannedDate;
  });

  return columns.map((col) => {
    switch (col.key) {
      case 'srNo':
        return trial.stationSerial ?? 0;
      case 'station':
        return trial.station;
      case 'trialName':
        return trial.trialName;
      case 'category':
        return trial.category;
      case 'subCategory':
        return trial.category === 'Insecticide' ? trial.insecticideSubCategory ?? '-' : '-';
      case 'crop':
        return trial.crop;
      case 'pestOrWeed':
        return trial.pestOrWeed;
      case 'productName':
        return product.productName;
      case 'standard':
        return product.standard || '-';
      case 'activeIngredient':
        return product.activeIngredient;
      case 'formulation':
        return product.formulation;
      case 'dose':
        return String(product.dose ?? '');
      case 'unit':
        return product.unit;
      case 'replications':
        return product.replications;
      case 'applications':
        return product.applications;
      case 'conductedDate':
        return formatDateDisplay(trial.conductedDate);
      case 'harvest':
        return trial.harvestStageDate ? formatDateDisplay(trial.harvestStageDate) : '-';
      case 'status':
        return statusText(trial, currentDateISO);
      case 'fieldStaffName':
        return trial.fieldStaffName;
      case 'fieldLocation':
        return trial.fieldLocation;
      case 'remarks':
        return trial.remarks || '-';
      default:
        return daaValues[col.key] ?? '';
    }
  });
}

function populateSheet(
  workbook: ExcelJS.Workbook,
  sheetName: string,
  title: string,
  subtitle: string,
  rows: TrialProductRow[],
  columns: ColumnConfig[],
  summary: { label: string; value: number; fill: string; color: string }[],
  currentDateISO: string
): ExcelJS.Worksheet {
  const worksheet = workbook.addWorksheet(sheetName, {
    views: [{ state: 'frozen', ySplit: 5 }],
    pageSetup: {
      orientation: 'landscape',
      paperSize: 9,
      fitToPage: true,
      fitToWidth: 1,
      fitToHeight: 0,
    },
  });

  styleTitleBlock(worksheet, title, subtitle, summary, columns.length);
  styleHeaderRow(worksheet, columns);

  const statusColIndex = columns.findIndex((c) => c.key === 'status') + 1;

  rows.forEach((row, index) => {
    const rowNumber = 6 + index;
    const r = worksheet.getRow(rowNumber);
    const values = buildRowValues(row, columns, currentDateISO);
    const isCompleted = isTrialCompleted(row.trial, currentDateISO);
    const due = isObservationDue(row.trial, currentDateISO);

    values.forEach((val, colIdx) => {
      const cell = r.getCell(colIdx + 1);
      cell.value = val;
      cell.font = { name: 'Calibri', size: 10 };
      cell.border = {
        top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        right: { style: 'thin', color: { argb: 'FFE2E8F0' } },
      };

      const align = columns[colIdx]?.align;
      cell.alignment = { horizontal: align ?? 'left', vertical: 'middle' };

      if (isCompleted) {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD1E7DD' } };
        cell.font = { name: 'Calibri', size: 10, bold: colIdx + 1 === statusColIndex, color: { argb: 'FF0F5132' } };
      } else if (colIdx + 1 === statusColIndex) {
        const fill = statusFill(false, due);
        if (fill) cell.fill = { type: 'pattern', pattern: 'solid', fgColor: fill };
        cell.font = {
          name: 'Calibri',
          size: 10,
          bold: true,
          color: due ? { argb: 'FF9A3412' } : { argb: 'FF854D0E' },
        };
      } else if (index % 2 === 1) {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8FAFC' } };
      }
    });

    r.height = 24;
  });

  return worksheet;
}

function triggerBrowserDownload(buffer: ArrayBuffer | Uint8Array, fileName: string): void {
  const blob = new Blob([buffer as any], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Dashboard Overview sheet: every trial across every station, one row per
 * product, in a single consolidated sheet.
 */
function populateOverviewSheet(
  workbook: ExcelJS.Workbook,
  trials: Trial[],
  currentDateISO: string,
  filterSummary?: string,
  includeStandard = true
): ExcelJS.Worksheet {
  const totalTrials = trials.length;
  const completed = trials.filter((t) => isTrialCompleted(t, currentDateISO)).length;
  const ongoing = trials.filter((t) => !isTrialCompleted(t, currentDateISO)).length;
  const due = trials.filter((t) => isObservationDue(t, currentDateISO)).length;

  const columns: ColumnConfig[] = [
    { header: 'Sr. No.', key: 'globalSr', width: 8, align: 'center' },
    { header: 'Station', key: 'station', width: 13 },
    { header: 'Trial Name', key: 'trialName', width: 42 },
    { header: 'Category', key: 'category', width: 17 },
    { header: 'Sub-Category', key: 'subCategory', width: 13, align: 'center' },
    { header: 'Crop', key: 'crop', width: 13, align: 'center' },
    { header: 'Pest / Weed', key: 'pestOrWeed', width: 26 },
    { header: 'Product / Brand', key: 'productName', width: 22 },
    { header: 'Active Ingredient', key: 'activeIngredient', width: 24 },
    { header: 'Formulation', key: 'formulation', width: 12, align: 'center' },
    { header: 'Dose', key: 'dose', width: 9, align: 'center' },
    { header: 'Unit', key: 'unit', width: 13, align: 'center' },
    ...(includeStandard
      ? [{ header: 'Standard / Check', key: 'standard', width: 22 } as ColumnConfig]
      : []),
    { header: 'Replications', key: 'replications', width: 12, align: 'center' },
    { header: 'Applications', key: 'applications', width: 12, align: 'center' },
    { header: 'Conducted Date', key: 'conductedDate', width: 15, align: 'center' },
    { header: 'Observation Schedule', key: 'schedule', width: 22, align: 'center' },
    { header: 'Obs. Progress', key: 'progress', width: 14, align: 'center' },
    { header: 'Harvest Stage', key: 'harvest', width: 15, align: 'center' },
    { header: 'Status', key: 'status', width: 17, align: 'center' },
    { header: 'Field Staff', key: 'fieldStaffName', width: 26 },
    { header: 'Location', key: 'fieldLocation', width: 30 },
    { header: 'Remarks', key: 'remarks', width: 34 },
  ];

  const rows = flattenToProductRows(trials);

  const worksheet = workbook.addWorksheet('Dashboard Overview', {
    views: [{ state: 'frozen', ySplit: 5 }],
    pageSetup: { orientation: 'landscape', paperSize: 9, fitToPage: true, fitToWidth: 1, fitToHeight: 0 },
  });

  const generated = formatDateDisplay(currentDateISO);
  const filtered = hasActiveFilters(filterSummary);
  styleTitleBlock(
    worksheet,
    filtered
      ? `${REPORT_TITLE} - DASHBOARD OVERVIEW (FILTERED)`
      : `${REPORT_TITLE} - DASHBOARD OVERVIEW (ALL STATIONS)`,
    filtered
      ? `Matching trials${filterSummarySuffix(filterSummary)}  |  Generated: ${generated}  |  Total Trials: ${totalTrials}  |  Ongoing: ${ongoing}  |  Completed: ${completed}  |  Observations Due: ${due}`
      : `All trials across all locations  |  Generated: ${generated}  |  Total Trials: ${totalTrials}  |  Ongoing: ${ongoing}  |  Completed: ${completed}  |  Observations Due: ${due}`,
    [
      { label: 'Total Trials', value: totalTrials, fill: 'FFE2E8F0', color: 'FF1E293B' },
      { label: 'Ongoing', value: ongoing, fill: 'FFFEF9C3', color: 'FF854D0E' },
      { label: 'Completed', value: completed, fill: 'FFDCFCE7', color: 'FF166534' },
      { label: 'Obs. Due', value: due, fill: 'FFFFEDD5', color: 'FF9A3412' },
    ],
    columns.length
  );
  styleHeaderRow(worksheet, columns);

  const statusColIndex = columns.findIndex((c) => c.key === 'status') + 1;

  rows.forEach((row, index) => {
    const r = worksheet.getRow(6 + index);
    const { trial, product } = row;
    const schedule = getTrialSchedule(trial);
    const progress = getObservationProgress(trial);
    const isCompleted = isTrialCompleted(trial, currentDateISO);
    const due = isObservationDue(trial, currentDateISO);
    const status = statusText(trial, currentDateISO);

    const valueByKey: Record<string, string | number> = {
      globalSr: index + 1,
      station: trial.station,
      trialName: trial.trialName,
      category: trial.category,
      subCategory: trial.category === 'Insecticide' ? trial.insecticideSubCategory ?? '-' : '-',
      crop: trial.crop,
      pestOrWeed: trial.pestOrWeed,
      productName: product.productName,
      standard: product.standard || '-',
      activeIngredient: product.activeIngredient,
      formulation: product.formulation,
      dose: String(product.dose ?? ''),
      unit: product.unit,
      replications: product.replications,
      applications: product.applications,
      conductedDate: formatDateDisplay(trial.conductedDate),
      schedule: `${schedule.join(', ')} DAA`,
      progress: `${progress.completedCount} / ${progress.total}`,
      harvest: trial.harvestStageDate ? formatDateDisplay(trial.harvestStageDate) : '-',
      status,
      fieldStaffName: trial.fieldStaffName,
      fieldLocation: trial.fieldLocation,
      remarks: trial.remarks || '-',
    };

    columns.forEach((col, colIdx) => {
      const cell = r.getCell(colIdx + 1);
      cell.value = valueByKey[col.key] ?? '';
      cell.font = { name: 'Calibri', size: 10 };
      cell.alignment = { horizontal: col.align ?? 'left', vertical: 'middle' };
      cell.border = {
        top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        right: { style: 'thin', color: { argb: 'FFE2E8F0' } },
      };

      if (isCompleted) {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD1E7DD' } };
        cell.font = { name: 'Calibri', size: 10, bold: colIdx + 1 === statusColIndex, color: { argb: 'FF0F5132' } };
      } else if (colIdx + 1 === statusColIndex) {
        const fill = statusFill(false, due);
        if (fill) cell.fill = { type: 'pattern', pattern: 'solid', fgColor: fill };
        cell.font = {
          name: 'Calibri',
          size: 10,
          bold: true,
          color: due ? { argb: 'FF9A3412' } : { argb: 'FF854D0E' },
        };
      } else if (index % 2 === 1) {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8FAFC' } };
      }
    });

    r.height = 22;
  });

  return worksheet;
}

/**
 * 1. Download Complete Excel
 * Workbook with:
 *   Sheet 1: Dashboard Overview (all trials, all locations)
 *   Sheets 2-5: Sahiwal, Multan, Lahore, Hyderabad
 */
export async function downloadCompleteExcel(
  trials: Trial[],
  referenceDateISO?: string,
  filterSummary?: string,
  includeStandard = true
): Promise<void> {
  const refDate = referenceDateISO || formatISODate(new Date());
  const workbook = new ExcelJS.Workbook();
  workbook.creator = REPORT_TITLE;
  workbook.created = new Date();

  populateOverviewSheet(workbook, trials, refDate, filterSummary, includeStandard);
  const filterLine = filterSummarySuffix(filterSummary);

  for (const station of STATIONS) {
    const stationTrials = trials.filter((t) => t.station === station);
    // Skip stations with no matching trials so a filtered workbook stays concise.
    if (stationTrials.length === 0) continue;

    const days = collectObservationDays(stationTrials);
    const showHarvest = stationTrials.some((t) => hasHarvestStage(t.category));
    const columns = buildStationColumns(days, showHarvest, includeStandard);
    const rows = flattenToProductRows(stationTrials);

    const total = stationTrials.length;
    const completed = stationTrials.filter((t) => isTrialCompleted(t, refDate)).length;
    const ongoing = stationTrials.filter((t) => !isTrialCompleted(t, refDate)).length;
    const due = stationTrials.filter((t) => isObservationDue(t, refDate)).length;

    populateSheet(
      workbook,
      station,
      `${REPORT_TITLE} - ${station.toUpperCase()} STATION STATUS REPORT`,
      `Station: ${station}  |  Generated: ${formatDateDisplay(refDate)}${filterLine}  |  Total Trials: ${total}  |  Ongoing: ${ongoing}  |  Completed: ${completed}  |  Observations Due: ${due}`,
      rows,
      columns,
      [
        { label: 'Total Trials', value: total, fill: 'FFE2E8F0', color: 'FF1E293B' },
        { label: 'Ongoing', value: ongoing, fill: 'FFFEF9C3', color: 'FF854D0E' },
        { label: 'Completed', value: completed, fill: 'FFDCFCE7', color: 'FF166534' },
        { label: 'Obs. Due', value: due, fill: 'FFFFEDD5', color: 'FF9A3412' },
      ],
      refDate
    );
  }

  const buffer = await workbook.xlsx.writeBuffer();
  const dateTag = formatDateDisplay(refDate).replace(/-/g, '_');
  triggerBrowserDownload(buffer, `4B_RD_Trial_Report_All_Stations_${dateTag}.xlsx`);
}

/**
 * 2. Download Individual Station Excel
 */
export async function downloadStationExcel(
  station: Station,
  trials: Trial[],
  referenceDateISO?: string,
  filterSummary?: string,
  includeStandard = true
): Promise<void> {
  const refDate = referenceDateISO || formatISODate(new Date());
  const workbook = new ExcelJS.Workbook();
  workbook.creator = REPORT_TITLE;
  workbook.created = new Date();

  const stationTrials = trials.filter((t) => t.station === station);
  const days = collectObservationDays(stationTrials);
  const showHarvest = stationTrials.some((t) => hasHarvestStage(t.category));
  const columns = buildStationColumns(days, showHarvest, includeStandard);
  const rows = flattenToProductRows(stationTrials);

  const total = stationTrials.length;
  const completed = stationTrials.filter((t) => isTrialCompleted(t, refDate)).length;
  const ongoing = stationTrials.filter((t) => !isTrialCompleted(t, refDate)).length;
  const due = stationTrials.filter((t) => isObservationDue(t, refDate)).length;

  populateSheet(
    workbook,
    station,
    `${REPORT_TITLE} - ${station.toUpperCase()} STATION STATUS REPORT`,
    `Station: ${station}  |  Generated: ${formatDateDisplay(refDate)}${filterSummarySuffix(filterSummary)}  |  Total Trials: ${total}  |  Ongoing: ${ongoing}  |  Completed: ${completed}  |  Observations Due: ${due}`,
    rows,
    columns,
    [
      { label: 'Total Trials', value: total, fill: 'FFE2E8F0', color: 'FF1E293B' },
      { label: 'Ongoing', value: ongoing, fill: 'FFFEF9C3', color: 'FF854D0E' },
      { label: 'Completed', value: completed, fill: 'FFDCFCE7', color: 'FF166534' },
      { label: 'Obs. Due', value: due, fill: 'FFFFEDD5', color: 'FF9A3412' },
    ],
    refDate
  );

  const buffer = await workbook.xlsx.writeBuffer();
  const dateTag = formatDateDisplay(refDate).replace(/-/g, '_');
  triggerBrowserDownload(buffer, `4B_RD_${station}_Trial_Report_${dateTag}.xlsx`);
}

/**
 * 3. Download Dashboard Overview only (all stations, single sheet).
 */
export async function downloadOverviewExcel(
  trials: Trial[],
  referenceDateISO?: string,
  filterSummary?: string,
  includeStandard = true
): Promise<void> {
  const refDate = referenceDateISO || formatISODate(new Date());
  const workbook = new ExcelJS.Workbook();
  workbook.creator = REPORT_TITLE;
  workbook.created = new Date();

  populateOverviewSheet(workbook, trials, refDate, filterSummary, includeStandard);

  const buffer = await workbook.xlsx.writeBuffer();
  const dateTag = formatDateDisplay(refDate).replace(/-/g, '_');
  triggerBrowserDownload(buffer, `4B_RD_Dashboard_Overview_${dateTag}.xlsx`);
}

// Re-export so callers can use the label helper without a second import.
export { categoryLabel };
