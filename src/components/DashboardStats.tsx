import React from 'react';
import { Trial, Station, STATIONS } from '../types/trial';
import { isTrialCompleted, isObservationDue } from '../utils/statusLogic';
import { 
  FlaskConical, 
  Hourglass, 
  CheckCircle2, 
  AlertCircle, 
  MapPin, 
  FileSpreadsheet, 
  Printer,
  ChevronRight,
  TrendingUp
} from 'lucide-react';

interface DashboardStatsProps {
  trials: Trial[];
  referenceDate: string;
  activeStation: Station | 'All';
  onStationSelect: (station: Station | 'All') => void;
  onDownloadStationExcel: (station: Station) => void;
  onPrintStationReport: (station: Station) => void;
  /** Matching trials per station after the active filters are applied. */
  stationMatchCounts?: Record<Station, number>;
}

export const DashboardStats: React.FC<DashboardStatsProps> = ({
  trials,
  referenceDate,
  activeStation,
  onStationSelect,
  onDownloadStationExcel,
  onPrintStationReport,
  stationMatchCounts,
}) => {
  // Master aggregate counts
  // ONGOING = every unfinished trial; "Observations Due" is a layered alert
  // (a subset of ongoing), so Ongoing + Completed = Total.
  const totalTrials = trials.length;
  const completedTrials = trials.filter((t) => isTrialCompleted(t, referenceDate)).length;
  const ongoingTrials = trials.filter((t) => !isTrialCompleted(t, referenceDate)).length;
  const dueTrials = trials.filter((t) => isObservationDue(t, referenceDate)).length;

  // Station breakdown
  const stationStats = STATIONS.map((station) => {
    const list = trials.filter((t) => t.station === station);
    return {
      station,
      total: list.length,
      completed: list.filter((t) => isTrialCompleted(t, referenceDate)).length,
      ongoing: list.filter((t) => !isTrialCompleted(t, referenceDate)).length,
      due: list.filter((t) => isObservationDue(t, referenceDate)).length,
    };
  });

  return (
    <div className="space-y-5 print-hide">
      {/* 4 Main KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        
        {/* Total Trials */}
        <div className="bg-white rounded-2xl p-4 sm:p-5 shadow-sm border border-gray-100 flex items-center justify-between hover:border-emerald-200 transition-all">
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Total Trials</p>
            <h3 className="text-2xl sm:text-3xl font-extrabold text-gray-900 mt-1">{totalTrials}</h3>
            <p className="text-[11px] text-gray-400 mt-1 flex items-center gap-1 font-medium">
              <TrendingUp className="w-3 h-3 text-emerald-500" /> Across 4 Stations
            </p>
          </div>
          <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-xl bg-slate-100 flex items-center justify-center text-slate-700">
            <FlaskConical className="w-5 h-5 sm:w-6 sm:h-6" />
          </div>
        </div>

        {/* Ongoing Trials (Yellow/Amber) */}
        <div className="bg-white rounded-2xl p-4 sm:p-5 shadow-sm border border-amber-100/80 flex items-center justify-between hover:border-amber-300 transition-all">
          <div>
            <p className="text-xs font-semibold text-amber-700 uppercase tracking-wider">Ongoing Trials</p>
            <h3 className="text-2xl sm:text-3xl font-extrabold text-amber-600 mt-1">{ongoingTrials}</h3>
            <p className="text-[11px] text-amber-600/80 mt-1 font-medium">Active in field</p>
          </div>
          <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-xl bg-amber-50 flex items-center justify-center text-amber-600 border border-amber-200/60">
            <Hourglass className="w-5 h-5 sm:w-6 sm:h-6" />
          </div>
        </div>

        {/* Observations Due (Orange Alert) */}
        <div className={`bg-white rounded-2xl p-4 sm:p-5 shadow-sm border transition-all ${
          dueTrials > 0 ? 'border-orange-200 bg-orange-50/20' : 'border-gray-100'
        }`}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-orange-700 uppercase tracking-wider">Observations Due</p>
              <h3 className="text-2xl sm:text-3xl font-extrabold text-orange-600 mt-1">{dueTrials}</h3>
              <p className="text-[11px] text-orange-600/90 mt-1 font-medium">
                {dueTrials > 0 ? 'Action required today' : 'All up to date'}
              </p>
            </div>
            <div className={`w-11 h-11 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center ${
              dueTrials > 0 
                ? 'bg-orange-100 text-orange-600 border border-orange-300 animate-pulse' 
                : 'bg-gray-100 text-gray-500'
            }`}>
              <AlertCircle className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
          </div>
        </div>

        {/* Completed Trials (Green Highlight) */}
        <div className="bg-emerald-50/60 rounded-2xl p-4 sm:p-5 shadow-sm border border-emerald-200/90 flex items-center justify-between hover:border-emerald-300 transition-all">
          <div>
            <p className="text-xs font-semibold text-emerald-800 uppercase tracking-wider">Completed Trials</p>
            <h3 className="text-2xl sm:text-3xl font-extrabold text-emerald-700 mt-1">{completedTrials}</h3>
            <p className="text-[11px] text-emerald-700/80 mt-1 font-medium">Final observation / harvest reached</p>
          </div>
          <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-xl bg-emerald-100 flex items-center justify-center text-emerald-700 border border-emerald-300">
            <CheckCircle2 className="w-5 h-5 sm:w-6 sm:h-6" />
          </div>
        </div>

      </div>

      {/* Station-Wise Summary Section */}
      <div className="bg-white rounded-2xl p-4 sm:p-5 shadow-sm border border-gray-100">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-gray-100 gap-2 mb-4">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center text-emerald-700">
              <MapPin className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-bold text-gray-900">Station-Wise Field Operations</h2>
              <p className="text-xs text-gray-500">Live operational status across all four regional research stations</p>
            </div>
          </div>
          <span className="text-xs text-emerald-700 bg-emerald-50 font-semibold px-2.5 py-1 rounded-full border border-emerald-200 self-start sm:self-auto">
            4 Dedicated Regional Centers
          </span>
        </div>

        {/* Station Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {stationStats.map((item) => {
            const isSelected = activeStation === item.station;
            const matchCount = stationMatchCounts?.[item.station];
            const noMatches = matchCount === 0;
            return (
              <div
                key={item.station}
                className={`rounded-xl p-3.5 border transition-all relative ${
                  isSelected
                    ? 'border-emerald-500 bg-emerald-50/40 shadow-md ring-2 ring-emerald-500/20'
                    : 'border-gray-200/90 bg-gray-50/50 hover:border-emerald-300 hover:bg-white'
                }`}
              >
                {/* Station Title & Select */}
                <div className="flex items-center justify-between mb-2.5">
                  <button
                    onClick={() => onStationSelect(item.station)}
                    className="flex items-center space-x-1.5 text-left group"
                  >
                    <span className="font-bold text-sm text-gray-900 group-hover:text-emerald-700">
                      {item.station}
                    </span>
                    <ChevronRight className="w-3.5 h-3.5 text-gray-400 group-hover:text-emerald-600 transition-transform group-hover:translate-x-0.5" />
                  </button>
                  <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-slate-200/70 text-slate-800">
                    {item.total} {item.total === 1 ? 'Trial' : 'Trials'}
                  </span>
                </div>

                {/* Sub-metrics */}
                <div className="grid grid-cols-3 gap-1.5 py-2 border-y border-gray-100 text-center mb-3">
                  <div className="bg-white rounded-lg p-1.5 border border-amber-100">
                    <span className="text-[10px] text-amber-700 font-medium block">Ongoing</span>
                    <span className="text-xs font-bold text-amber-700">{item.ongoing}</span>
                  </div>
                  <div className="bg-white rounded-lg p-1.5 border border-emerald-100">
                    <span className="text-[10px] text-emerald-700 font-medium block">Completed</span>
                    <span className="text-xs font-bold text-emerald-700">{item.completed}</span>
                  </div>
                  <div className={`rounded-lg p-1.5 border ${
                    item.due > 0 ? 'bg-orange-50 border-orange-200 text-orange-700' : 'bg-white border-gray-100 text-gray-500'
                  }`}>
                    <span className="text-[10px] font-medium block">Due Obs</span>
                    <span className="text-xs font-bold">{item.due}</span>
                  </div>
                </div>

                {/* Actions for this station */}
                <div className="flex items-center justify-between gap-1.5">
                  <button
                    onClick={() => onDownloadStationExcel(item.station)}
                    disabled={noMatches}
                    title={noMatches ? `No ${item.station} trials match the current filters` : `Download ${item.station} Excel sheet`}
                    className="flex-1 flex items-center justify-center space-x-1 px-2 py-1 text-[11px] font-semibold text-emerald-800 bg-emerald-100/70 hover:bg-emerald-200/80 rounded-lg transition-colors border border-emerald-200 disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <FileSpreadsheet className="w-3 h-3 text-emerald-700" />
                    <span>Excel</span>
                  </button>
                  <button
                    onClick={() => onPrintStationReport(item.station)}
                    disabled={noMatches}
                    title={noMatches ? `No ${item.station} trials match the current filters` : `Print ${item.station} Report`}
                    className="flex-1 flex items-center justify-center space-x-1 px-2 py-1 text-[11px] font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors border border-slate-200 disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <Printer className="w-3 h-3 text-slate-600" />
                    <span>Print</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
