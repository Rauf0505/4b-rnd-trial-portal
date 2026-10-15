import React from 'react';
import { Trial, TrialProductRow, UserRole } from '../types/trial';
import { formatDateDisplay, isPastOrToday } from '../utils/dateUtils';
import {
  isTrialCompleted,
  isObservationDue,
  getTrialSchedule,
  getObservationProgress,
} from '../utils/statusLogic';
import { flattenToProductRows, hasHarvestStage, categoryLabel } from '../data/trialCategories';
import {
  CheckCircle2,
  AlertCircle,
  Clock,
  Edit3,
  Trash2,
  ClipboardList,
  MapPin,
  User,
  Check,
} from 'lucide-react';

interface TrialTableProps {
  trials: Trial[];
  referenceDate: string;
  currentRole: UserRole;
  onEditTrial: (trial: Trial) => void;
  onDeleteTrial: (trial: Trial) => void;
  onOpenObservation: (trial: Trial, day?: number) => void;
  /** Show the per-product Standard / Check column (defaults to true). */
  showStandard?: boolean;
}

export const TrialTable: React.FC<TrialTableProps> = ({
  trials,
  referenceDate,
  currentRole,
  onEditTrial,
  onDeleteTrial,
  onOpenObservation,
  showStandard = true,
}) => {
  if (trials.length === 0) {
    return (
      <div className="bg-white rounded-2xl p-12 text-center border border-gray-200 shadow-xs">
        <div className="w-14 h-14 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-3">
          <ClipboardList className="w-7 h-7" />
        </div>
        <h3 className="text-base font-bold text-gray-800">No Field Trials Match Your Criteria</h3>
        <p className="text-xs text-gray-500 mt-1 max-w-sm mx-auto">
          Try resetting your filters or click &quot;Add Trial&quot; above to record a new agricultural field trial.
        </p>
      </div>
    );
  }

  // One row per product, grouped by trial.
  const rows: TrialProductRow[] = flattenToProductRows(trials);

  // Dynamic DAA columns = union of scheduled days across the visible trials.
  const daySet = new Set<number>();
  trials.forEach((t) => getTrialSchedule(t).forEach((d) => daySet.add(d)));
  const observationDays = Array.from(daySet).sort((a, b) => a - b);
  const showHarvest = trials.some((t) => hasHarvestStage(t.category));

  // Render a DAA badge for a trial/day (blank when the day isn't in its schedule).
  const renderDaaBadge = (trial: Trial, day: number) => {
    if (!getTrialSchedule(trial).includes(day)) {
      return <span className="text-gray-300 select-none">–</span>;
    }

    const plannedDate = trial.observationDates[day];
    const obs = trial.observations[day];
    if (!plannedDate) {
      return <span className="text-gray-300 select-none">–</span>;
    }
    const isDue = isPastOrToday(plannedDate, referenceDate) && !obs?.completed;

    if (obs?.completed) {
      return (
        <button
          onClick={() => onOpenObservation(trial, day)}
          title={`Completed on ${formatDateDisplay(obs.actualDate || plannedDate)}${
            obs.efficacyPercent !== undefined ? ` • Efficacy: ${obs.efficacyPercent}%` : ''
          }`}
          className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 hover:bg-emerald-200 transition-colors cursor-pointer"
        >
          <Check className="w-3 h-3 text-emerald-600 stroke-[3]" />
          <span>{formatDateDisplay(plannedDate).slice(0, 6)}</span>
          {obs.efficacyPercent !== undefined && (
            <span className="text-[9px] bg-emerald-200/80 px-1 rounded text-emerald-900">
              {obs.efficacyPercent}%
            </span>
          )}
        </button>
      );
    }

    if (isDue) {
      return (
        <button
          onClick={() => onOpenObservation(trial, day)}
          title={`Observation DUE! Planned: ${formatDateDisplay(plannedDate)}. Click to enter observations.`}
          className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-md text-[10px] font-extrabold bg-orange-100 text-orange-800 border border-orange-300 hover:bg-orange-200 transition-colors animate-pulse cursor-pointer"
        >
          <AlertCircle className="w-3 h-3 text-orange-600" />
          <span>{formatDateDisplay(plannedDate).slice(0, 6)} Due</span>
        </button>
      );
    }

    return (
      <button
        onClick={() => onOpenObservation(trial, day)}
        title={`Scheduled for ${formatDateDisplay(plannedDate)}. Click to enter ahead of time.`}
        className="inline-flex items-center space-x-1 px-1.5 py-0.5 rounded-md text-[10px] text-gray-500 bg-gray-100 hover:bg-gray-200 transition-colors border border-gray-200"
      >
        <Clock className="w-2.5 h-2.5 text-gray-400" />
        <span>{formatDateDisplay(plannedDate).slice(0, 6)}</span>
      </button>
    );
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="bg-emerald-800 text-white font-bold border-b border-emerald-900 select-none">
              <th className="py-3 px-3 w-16 text-center">Sr. No.</th>
              <th className="py-3 px-3 w-24">Station</th>
              <th className="py-3 px-3 min-w-[200px]">Trial Name</th>
              <th className="py-3 px-3 w-32">Category</th>
              <th className="py-3 px-3 w-20 text-center">Sub-Cat.</th>
              <th className="py-3 px-3 w-24">Crop</th>
              <th className="py-3 px-3 min-w-[150px]">Pest / Weed</th>
              <th className="py-3 px-3 min-w-[150px]">Product / Brand</th>
              <th className="py-3 px-3 min-w-[130px]">Active Ingr.</th>
              <th className="py-3 px-3 w-20 text-center">Form.</th>
              <th className="py-3 px-3 w-24 text-center">Dose</th>
              {showStandard && <th className="py-3 px-3 min-w-[150px]">Standard / Check</th>}
              <th className="py-3 px-3 w-16 text-center">Rep.</th>
              <th className="py-3 px-3 w-16 text-center">App.</th>
              <th className="py-3 px-3 min-w-[100px] text-center">Conducted</th>
              {observationDays.map((day) => (
                <th key={day} className="py-3 px-2 text-center min-w-[85px]">{day} DAA</th>
              ))}
              {showHarvest && <th className="py-3 px-2 text-center min-w-[95px]">Harvest</th>}
              <th className="py-3 px-3 text-center min-w-[120px]">Status</th>
              <th className="py-3 px-3 min-w-[130px]">Field Staff</th>
              <th className="py-3 px-3 min-w-[150px]">Location</th>
              <th className="py-3 px-3 min-w-[160px]">Remarks</th>
              <th className="py-3 px-3 text-center min-w-[130px] sticky right-0 bg-emerald-800 z-10 shadow-l">
                Actions
              </th>
            </tr>
          </thead>

          <tbody className="divide-y divide-gray-200">
            {trials.map((trial) => {
              const isCompleted = isTrialCompleted(trial, referenceDate);
              const due = isObservationDue(trial, referenceDate);
              const progress = getObservationProgress(trial);
              const trialRows = rows.filter((r) => r.trial.id === trial.id);
              const productCount = trialRows.length || 1;

              let rowBgClass = 'bg-white hover:bg-gray-50/80';
              if (isCompleted) {
                rowBgClass = 'completed-row bg-emerald-50/90 hover:bg-emerald-100/70 border-emerald-200 text-emerald-950';
              } else if (due) {
                rowBgClass = 'bg-orange-50/50 hover:bg-orange-100/60 border-orange-200';
              }

              const trialLevelCell = 'align-middle';

              return trialRows.map(({ product }, productIndex) => (
                <tr key={`${trial.id}-${productIndex}`} className={`transition-colors text-[11px] ${rowBgClass}`}>
                  {productIndex === 0 && (
                    <>
                      <td rowSpan={productCount} className={`py-3 px-3 text-center font-bold text-gray-700 border-r border-gray-100 ${trialLevelCell}`}>
                        <span className="inline-block px-1.5 py-0.5 rounded bg-gray-200/60 text-gray-800">
                          {trial.stationSerial}
                        </span>
                      </td>
                      <td rowSpan={productCount} className={`py-3 px-3 font-semibold text-emerald-900 whitespace-nowrap border-r border-gray-100 ${trialLevelCell}`}>
                        {trial.station}
                      </td>
                      <td rowSpan={productCount} className={`py-3 px-3 font-bold text-gray-900 leading-snug border-r border-gray-100 ${trialLevelCell}`}>
                        {trial.trialName}
                      </td>
                      <td rowSpan={productCount} className={`py-3 px-3 border-r border-gray-100 ${trialLevelCell}`}>
                        <span className="inline-block px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-800 border border-indigo-200 text-[10px] font-semibold">
                          {trial.category}
                        </span>
                      </td>
                      <td rowSpan={productCount} className={`py-3 px-3 text-center text-gray-700 font-semibold border-r border-gray-100 ${trialLevelCell}`}>
                        {trial.category === 'Insecticide' ? trial.insecticideSubCategory || '–' : '–'}
                      </td>
                      <td rowSpan={productCount} className={`py-3 px-3 font-semibold text-gray-800 whitespace-nowrap border-r border-gray-100 ${trialLevelCell}`}>
                        <span className="inline-block px-2 py-0.5 rounded-full bg-emerald-100/70 text-emerald-900 text-[10px]">
                          {trial.crop}
                        </span>
                      </td>
                      <td rowSpan={productCount} className={`py-3 px-3 text-gray-700 font-medium border-r border-gray-100 ${trialLevelCell}`}>
                        {trial.pestOrWeed}
                      </td>
                    </>
                  )}

                  {/* Product-level cells */}
                  <td className="py-3 px-3 font-bold text-emerald-900 whitespace-nowrap border-r border-gray-50">
                    {product.productName}
                  </td>
                  <td className="py-3 px-3 text-gray-600 border-r border-gray-50">
                    {product.activeIngredient}
                  </td>
                  <td className="py-3 px-3 text-center font-semibold text-gray-700 border-r border-gray-50">
                    <span className="px-1.5 py-0.5 bg-slate-100 rounded text-[10px]">
                      {product.formulation}
                    </span>
                  </td>
                  <td className="py-3 px-3 text-center font-semibold text-gray-800 whitespace-nowrap border-r border-gray-50">
                    {product.dose} {product.unit}
                  </td>
                  {showStandard && (
                    <td className="py-3 px-3 text-gray-700 whitespace-nowrap border-r border-gray-50">
                      {product.standard ? (
                        <span className="inline-block px-2 py-0.5 rounded-full bg-sky-50 text-sky-800 border border-sky-200 text-[10px] font-semibold">
                          {product.standard}
                        </span>
                      ) : (
                        <span className="text-gray-300">–</span>
                      )}
                    </td>
                  )}
                  <td className="py-3 px-3 text-center text-gray-600 border-r border-gray-50">
                    {product.replications}
                  </td>
                  <td className="py-3 px-3 text-center text-gray-600 border-r border-gray-50">
                    {product.applications}
                  </td>

                  {productIndex === 0 && (
                    <>
                      <td rowSpan={productCount} className={`py-3 px-3 text-center font-medium text-gray-800 whitespace-nowrap border-r border-gray-100 ${trialLevelCell}`}>
                        {formatDateDisplay(trial.conductedDate)}
                      </td>
                      {observationDays.map((day) => (
                        <td key={day} rowSpan={productCount} className={`py-3 px-1 text-center whitespace-nowrap border-r border-gray-100 ${trialLevelCell}`}>
                          {renderDaaBadge(trial, day)}
                        </td>
                      ))}
                      {showHarvest && (
                        <td rowSpan={productCount} className={`py-3 px-2 text-center whitespace-nowrap border-r border-gray-100 ${trialLevelCell}`}>
                          {trial.harvestStageDate ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-teal-100 text-teal-800 border border-teal-300">
                              {formatDateDisplay(trial.harvestStageDate).slice(0, 6)}
                            </span>
                          ) : (
                            <span className="text-gray-300">–</span>
                          )}
                        </td>
                      )}
                      <td rowSpan={productCount} className={`py-3 px-3 text-center whitespace-nowrap border-r border-gray-100 ${trialLevelCell}`}>
                        {isCompleted ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black bg-emerald-600 text-white shadow-xs">
                            <CheckCircle2 className="w-3 h-3 stroke-[3]" />
                            COMPLETED
                          </span>
                        ) : (
                          <div className="flex flex-col items-center gap-1">
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
                              <Clock className="w-3 h-3 text-amber-600" />
                              ONGOING
                            </span>
                            {due && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-extrabold bg-orange-500 text-white shadow-xs animate-pulse">
                                <AlertCircle className="w-2.5 h-2.5" />
                                OBS. DUE
                              </span>
                            )}
                          </div>
                        )}
                      </td>
                      <td rowSpan={productCount} className={`py-3 px-3 text-gray-700 whitespace-nowrap border-r border-gray-100 ${trialLevelCell}`}>
                        <span className="flex items-center gap-1">
                          <User className="w-3 h-3 text-gray-400 shrink-0" />
                          {trial.fieldStaffName}
                        </span>
                      </td>
                      <td rowSpan={productCount} className={`py-3 px-3 text-gray-600 max-w-[180px] truncate border-r border-gray-100 ${trialLevelCell}`} title={trial.fieldLocation}>
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3 h-3 text-gray-400 shrink-0" />
                          {trial.fieldLocation}
                        </span>
                      </td>
                      <td rowSpan={productCount} className={`py-3 px-3 text-gray-500 max-w-[180px] truncate border-r border-gray-100 ${trialLevelCell}`} title={trial.remarks}>
                        {trial.remarks || '-'}
                      </td>
                      <td rowSpan={productCount} className={`py-2.5 px-3 text-center sticky right-0 bg-white/95 backdrop-blur-xs border-l border-gray-200 z-10 shadow-l ${trialLevelCell}`}>
                        <div className="flex flex-col sm:flex-row items-center justify-center gap-1">
                          <button
                            onClick={() => onOpenObservation(trial)}
                            title="Enter / View Actual Observations"
                            className="flex items-center space-x-1 px-2 py-1 text-[10px] font-bold text-emerald-800 bg-emerald-100 hover:bg-emerald-200 rounded-lg transition-colors border border-emerald-300"
                          >
                            <ClipboardList className="w-3 h-3 text-emerald-700" />
                            <span>Obs ({progress.completedCount}/{progress.total})</span>
                          </button>

                          <button
                            onClick={() => onEditTrial(trial)}
                            title="Edit Trial Information"
                            className="p-1 text-gray-600 hover:text-emerald-700 hover:bg-gray-100 rounded-lg transition-colors"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>

                          {(currentRole === 'Admin' || currentRole === 'R&D Officer' || currentRole === 'Field Staff') && (
                            <button
                              onClick={() => onDeleteTrial(trial)}
                              title="Delete Trial Entry"
                              className="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </>
                  )}
                </tr>
              ));
            })}
          </tbody>
        </table>
      </div>

      <div className="bg-gray-50 px-4 py-3 border-t border-gray-200 flex flex-col sm:flex-row items-center justify-between text-xs text-gray-600 gap-2">
        <div>
          Showing <strong className="text-gray-900">{trials.length}</strong> trials
          <span className="text-gray-400"> &bull; {rows.length} product rows</span>
        </div>
        <div className="flex items-center space-x-4 text-[11px]">
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block"></span>
            Completed
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-orange-500 inline-block"></span>
            Observation Due
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-400 inline-block"></span>
            Ongoing
          </span>
        </div>
      </div>
    </div>
  );
};
