import React, { useState } from 'react';
import { Trial, Station, STATIONS, TrialProductRow } from '../types/trial';
import { formatDateDisplay } from '../utils/dateUtils';
import {
  isTrialCompleted,
  isObservationDue,
  getTrialSchedule,
} from '../utils/statusLogic';
import { flattenToProductRows, hasHarvestStage, categoryLabel } from '../data/trialCategories';
import logoUrl from '../assets/Four Brothers Logo.png';
import { ExportMenu } from './ExportMenu';
import { Printer, X, FileSpreadsheet } from 'lucide-react';

interface StationReportPrintViewProps {
  isOpen: boolean;
  onClose: () => void;
  trials: Trial[];
  referenceDate: string;
  defaultStation?: Station;
  onDownloadStationExcel: (station: Station, includeStandard: boolean) => void;
  /** Human-readable description of the active filters, if any. */
  filterSummary?: string;
  /** Show the per-product Standard / Check column (defaults to true). */
  includeStandard?: boolean;
}

export const StationReportPrintView: React.FC<StationReportPrintViewProps> = ({
  isOpen,
  onClose,
  trials,
  referenceDate,
  defaultStation = 'Sahiwal',
  onDownloadStationExcel,
  filterSummary,
  includeStandard = true,
}) => {
  const [selectedStation, setSelectedStation] = useState<Station>(defaultStation);

  if (!isOpen) return null;

  const stationTrials = trials.filter((t) => t.station === selectedStation);
  const total = stationTrials.length;
  const completed = stationTrials.filter((t) => isTrialCompleted(t, referenceDate)).length;
  const ongoing = stationTrials.filter((t) => !isTrialCompleted(t, referenceDate)).length;
  const due = stationTrials.filter((t) => isObservationDue(t, referenceDate)).length;

  const daySet = new Set<number>();
  stationTrials.forEach((t) => getTrialSchedule(t).forEach((d) => daySet.add(d)));
  const observationDays = Array.from(daySet).sort((a, b) => a - b);
  const showHarvest = stationTrials.some((t) => hasHarvestStage(t.category));

  const handlePrint = () => window.print();

  const renderDaaPrint = (trial: Trial, day: number) => {
    if (!getTrialSchedule(trial).includes(day)) return '–';
    const dt = formatDateDisplay(trial.observationDates[day]).slice(0, 6);
    const obs = trial.observations[day];
    return obs?.completed ? `${dt} [OK]` : dt;
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4">
      <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 w-full max-w-6xl overflow-hidden my-4 max-h-[92vh] flex flex-col">
        {/* Action bar */}
        <div className="bg-emerald-900 text-white px-5 py-3.5 flex flex-wrap items-center justify-between gap-3 print-hide border-b border-emerald-800">
          <div className="flex items-center space-x-2">
            <span className="text-xs font-bold text-emerald-300 uppercase tracking-wider">Select Station:</span>
            <div className="flex items-center space-x-1">
              {STATIONS.map((st) => (
                <button
                  key={st}
                  onClick={() => setSelectedStation(st)}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                    selectedStation === st
                      ? 'bg-emerald-400 text-emerald-950 shadow-sm'
                      : 'bg-emerald-800 text-emerald-200 hover:bg-emerald-700'
                  }`}
                >
                  {st}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <ExportMenu
              disabled={total === 0}
              title={total === 0 ? `No ${selectedStation} trials match the current filters` : `Download ${selectedStation} Excel`}
              className="flex items-center space-x-1.5 px-3 py-1.5 bg-emerald-800 hover:bg-emerald-700 text-emerald-100 text-xs font-semibold rounded-lg border border-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed"
              options={[
                {
                  label: 'With Standard column',
                  description: 'Include the Standard / Check column',
                  onSelect: () => onDownloadStationExcel(selectedStation, true),
                },
                {
                  label: 'Without Standard column',
                  description: 'Exclude the Standard / Check column',
                  onSelect: () => onDownloadStationExcel(selectedStation, false),
                },
              ]}
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-300" />
              <span>Download Excel</span>
            </ExportMenu>
            <button
              onClick={handlePrint}
              className="flex items-center space-x-1.5 px-4 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-emerald-950 text-xs font-extrabold rounded-lg shadow-sm"
            >
              <Printer className="w-4 h-4" />
              <span>Print / Save as PDF</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-emerald-200 hover:text-white hover:bg-emerald-800 rounded-lg"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable container */}
        <div className="p-6 sm:p-8 overflow-y-auto flex-1 bg-white text-gray-900 print:p-0 print:m-0 print:overflow-visible">
          <div className="border-b-2 border-emerald-800 pb-4 mb-4 text-center">
            <img src={logoUrl} alt="Four Brothers" className="h-14 mx-auto mb-2 object-contain" />
            <h1 className="text-xl sm:text-2xl font-black text-emerald-950 tracking-tight uppercase">
              4B R&amp;D Trial Portal — Station Status Report
            </h1>
            <div className="mt-1 flex flex-wrap items-center justify-center gap-4 text-xs font-bold text-gray-700">
              <span className="bg-emerald-50 text-emerald-900 px-3 py-1 rounded-md border border-emerald-200">
                Station: <strong>{selectedStation}</strong>
              </span>
              <span className="bg-gray-50 text-gray-800 px-3 py-1 rounded-md border border-gray-200">
                Report Generated: <strong>{formatDateDisplay(referenceDate)}</strong>
              </span>
              <span className="text-gray-500 font-medium">
                Pesticide Efficacy &amp; Regulatory Trial Tracking System
              </span>
              {filterSummary && filterSummary !== 'No filters applied' && (
                <span className="bg-amber-50 text-amber-900 px-3 py-1 rounded-md border border-amber-200">
                  Filters: <strong>{filterSummary}</strong>
                </span>
              )}
            </div>
          </div>

          <div className="grid grid-cols-4 gap-3 mb-5 text-center">
            <div className="border border-gray-300 rounded-lg p-2.5 bg-gray-50">
              <span className="text-[10px] font-bold uppercase tracking-wider text-gray-600 block">Total Trials</span>
              <span className="text-lg font-black text-gray-900">{total}</span>
            </div>
            <div className="border border-amber-300 rounded-lg p-2.5 bg-amber-50">
              <span className="text-[10px] font-bold uppercase tracking-wider text-amber-800 block">Ongoing</span>
              <span className="text-lg font-black text-amber-800">{ongoing}</span>
            </div>
            <div className="border border-emerald-300 rounded-lg p-2.5 bg-emerald-50">
              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800 block">Completed</span>
              <span className="text-lg font-black text-emerald-800">{completed}</span>
            </div>
            <div className="border border-orange-300 rounded-lg p-2.5 bg-orange-50">
              <span className="text-[10px] font-bold uppercase tracking-wider text-orange-800 block">Observations Due</span>
              <span className="text-lg font-black text-orange-800">{due}</span>
            </div>
          </div>

          <div className="overflow-x-auto print:overflow-visible">
            <table className="w-full text-left border-collapse border border-gray-300 text-[10px]">
              <thead>
                <tr className="bg-emerald-900 text-white font-bold text-center print:bg-gray-800 print:text-white">
                  <th className="border border-gray-400 p-1.5 w-8">Sr.</th>
                  <th className="border border-gray-400 p-1.5 text-left min-w-[130px]">Trial Name</th>
                  <th className="border border-gray-400 p-1.5 min-w-[70px]">Category</th>
                  <th className="border border-gray-400 p-1.5 w-12">Crop</th>
                  <th className="border border-gray-400 p-1.5 text-left min-w-[100px]">Target Pest/Weed</th>
                  <th className="border border-gray-400 p-1.5 text-left min-w-[95px]">Product</th>
                  {includeStandard && (
                    <th className="border border-gray-400 p-1.5 text-left min-w-[95px]">Standard</th>
                  )}
                  <th className="border border-gray-400 p-1.5 text-left min-w-[90px]">Active Ingr.</th>
                  <th className="border border-gray-400 p-1.5 w-9">Form.</th>
                  <th className="border border-gray-400 p-1.5 w-14">Dose</th>
                  <th className="border border-gray-400 p-1.5 w-7">Rep.</th>
                  <th className="border border-gray-400 p-1.5 w-7">App.</th>
                  <th className="border border-gray-400 p-1.5 min-w-[60px]">Conducted</th>
                  {observationDays.map((day) => (
                    <th key={day} className="border border-gray-400 p-1.5 min-w-[50px]">{day} DAA</th>
                  ))}
                  {showHarvest && <th className="border border-gray-400 p-1.5 min-w-[55px]">Harvest</th>}
                  <th className="border border-gray-400 p-1.5 min-w-[70px]">Status</th>
                  <th className="border border-gray-400 p-1.5 text-left min-w-[85px]">Staff</th>
                  <th className="border border-gray-400 p-1.5 text-left min-w-[100px]">Location</th>
                </tr>
              </thead>
              <tbody>
                {stationTrials.map((t) => {
                  const productRows: TrialProductRow[] = flattenToProductRows([t]);
                  const productCount = productRows.length || 1;
                  const isCompleted = isTrialCompleted(t, referenceDate);
                  const status = isCompleted
                    ? 'COMPLETED'
                    : isObservationDue(t, referenceDate)
                    ? 'ONGOING (OBS. DUE)'
                    : 'ONGOING';

                  return productRows.map(({ product }, pIdx) => (
                    <tr
                      key={`${t.id}-${pIdx}`}
                      className={`border-b border-gray-300 ${
                        isCompleted ? 'bg-emerald-100 font-medium' : pIdx % 2 === 1 ? 'bg-gray-50' : 'bg-white'
                      }`}
                    >
                      {pIdx === 0 && (
                        <>
                          <td rowSpan={productCount} className="border border-gray-300 p-1 text-center font-bold align-middle">
                            {t.stationSerial}
                          </td>
                          <td rowSpan={productCount} className="border border-gray-300 p-1 font-semibold text-gray-900 leading-tight align-middle">
                            {t.trialName}
                          </td>
                          <td rowSpan={productCount} className="border border-gray-300 p-1 text-center align-middle">
                            {categoryLabel(t.category, t.insecticideSubCategory)}
                          </td>
                          <td rowSpan={productCount} className="border border-gray-300 p-1 text-center font-medium align-middle">
                            {t.crop}
                          </td>
                          <td rowSpan={productCount} className="border border-gray-300 p-1 align-middle">
                            {t.pestOrWeed}
                          </td>
                        </>
                      )}
                      <td className="border border-gray-300 p-1 font-bold text-gray-900">{product.productName}</td>
                      {includeStandard && (
                        <td className="border border-gray-300 p-1 text-gray-700">{product.standard || '–'}</td>
                      )}
                      <td className="border border-gray-300 p-1 text-gray-700">{product.activeIngredient}</td>
                      <td className="border border-gray-300 p-1 text-center">{product.formulation}</td>
                      <td className="border border-gray-300 p-1 text-center">{product.dose} {product.unit}</td>
                      <td className="border border-gray-300 p-1 text-center">{product.replications}</td>
                      <td className="border border-gray-300 p-1 text-center">{product.applications}</td>
                      {pIdx === 0 && (
                        <>
                          <td rowSpan={productCount} className="border border-gray-300 p-1 text-center whitespace-nowrap align-middle">
                            {formatDateDisplay(t.conductedDate).slice(0, 6)}
                          </td>
                          {observationDays.map((day) => (
                            <td key={day} rowSpan={productCount} className="border border-gray-300 p-1 text-center whitespace-nowrap align-middle">
                              {renderDaaPrint(t, day)}
                            </td>
                          ))}
                          {showHarvest && (
                            <td rowSpan={productCount} className="border border-gray-300 p-1 text-center whitespace-nowrap align-middle">
                              {t.harvestStageDate ? formatDateDisplay(t.harvestStageDate).slice(0, 6) : '–'}
                            </td>
                          )}
                          <td rowSpan={productCount} className="border border-gray-300 p-1 text-center font-bold whitespace-nowrap align-middle">
                            {status}
                          </td>
                          <td rowSpan={productCount} className="border border-gray-300 p-1 text-gray-700 align-middle">
                            {t.fieldStaffName}
                          </td>
                          <td rowSpan={productCount} className="border border-gray-300 p-1 text-gray-600 align-middle">
                            {t.fieldLocation}
                          </td>
                        </>
                      )}
                    </tr>
                  ));
                })}
              </tbody>
            </table>
          </div>

          <div className="mt-8 pt-4 border-t border-gray-300 grid grid-cols-3 gap-6 text-center text-xs">
            <div>
              <div className="border-b border-gray-400 h-10 mb-1"></div>
              <p className="font-bold text-gray-800">Station In-Charge / Field Staff</p>
              <p className="text-[10px] text-gray-500">{selectedStation} Research Station</p>
            </div>
            <div>
              <div className="border-b border-gray-400 h-10 mb-1"></div>
              <p className="font-bold text-gray-800">R&amp;D Officer</p>
              <p className="text-[10px] text-gray-500">Field Trial Evaluation Section</p>
            </div>
            <div>
              <div className="border-b border-gray-400 h-10 mb-1"></div>
              <p className="font-bold text-gray-800">Deputy Manager R&amp;D</p>
              <p className="text-[10px] text-gray-500">Corporate Agricultural Operations</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
