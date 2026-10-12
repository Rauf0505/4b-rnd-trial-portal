import React, { useState } from 'react';
import { Station, STATIONS, UserRole } from '../types/trial';
import { formatDateDisplay, formatISODate } from '../utils/dateUtils';
import logoUrl from '../assets/Four Brothers Logo.png';
import { 
  FileSpreadsheet, 
  Printer, 
  Plus, 
  UserCheck, 
  Calendar, 
  RotateCcw,
  MapPin,
  Clock
} from 'lucide-react';

interface HeaderProps {
  currentRole: UserRole;
  onRoleChange: (role: UserRole) => void;
  activeStation: Station | 'All';
  onStationSelect: (station: Station | 'All') => void;
  referenceDate: string;
  onReferenceDateChange: (date: string | null) => void;
  onOpenNewTrialModal: () => void;
  onDownloadAllExcel: () => void;
  onDownloadOverviewExcel: () => void;
  onOpenPrintModal: () => void;
  isDownloading?: boolean;
  matchCount?: number;
}

export const Header: React.FC<HeaderProps> = ({
  currentRole,
  onRoleChange,
  activeStation,
  onStationSelect,
  referenceDate,
  onReferenceDateChange,
  onOpenNewTrialModal,
  onDownloadAllExcel,
  onDownloadOverviewExcel,
  onOpenPrintModal,
  isDownloading = false,
  matchCount,
}) => {
  const [showDatePicker, setShowDatePicker] = useState(false);
  const isSimulated = referenceDate !== formatISODate(new Date());
  const noMatches = matchCount === 0;

  return (
    <header className="bg-emerald-900 text-white shadow-lg sticky top-0 z-40 print-hide border-b border-emerald-800">
      {/* Top Banner */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 sm:h-20">
          
          {/* Logo & Title */}
          <div className="flex items-center space-x-3">
            <div className="h-10 sm:h-12 px-2 rounded-xl bg-white flex items-center justify-center border border-emerald-400/30 shadow-inner overflow-hidden">
              <img
                src={logoUrl}
                alt="Four Brothers"
                className="h-7 sm:h-9 w-auto object-contain"
              />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h1 className="text-lg sm:text-xl font-bold tracking-tight text-white flex items-center gap-1.5">
                  4B <span className="text-emerald-400 font-extrabold">R&D</span>
                </h1>
                <span className="hidden md:inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-700/60 text-emerald-200 border border-emerald-600/50">
                  Trial Portal
                </span>
              </div>
              <p className="text-xs text-emerald-200/80 hidden sm:block">
                Pesticide Efficacy & Agronomy Trial Tracking System
              </p>
            </div>
          </div>

          {/* Right Action Controls */}
          <div className="flex items-center space-x-2 sm:space-x-3">
            
            {/* Reference Date Indicator & Time Simulator */}
            <div className="relative">
              <button
                onClick={() => setShowDatePicker(!showDatePicker)}
                title="System Reference Date (Click to adjust or test dates)"
                className={`flex items-center space-x-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                  isSimulated
                    ? 'bg-amber-500/20 border-amber-400 text-amber-200 hover:bg-amber-500/30'
                    : 'bg-emerald-800/80 border-emerald-700 text-emerald-100 hover:bg-emerald-700/80'
                }`}
              >
                <Calendar className="w-3.5 h-3.5 text-emerald-300" />
                <span className="hidden sm:inline">Date:</span>
                <span className="font-semibold">{formatDateDisplay(referenceDate)}</span>
                {isSimulated && (
                  <span className="px-1 py-0.2 text-[9px] bg-amber-400 text-amber-950 font-bold rounded">
                    Simulated
                  </span>
                )}
              </button>

              {/* Date Simulator Popover */}
              {showDatePicker && (
                <div className="absolute right-0 mt-2 w-72 bg-white rounded-xl shadow-2xl border border-gray-200 p-4 text-gray-800 z-50 animate-in fade-in zoom-in-95">
                  <div className="flex items-center justify-between pb-2 border-b border-gray-100 mb-3">
                    <div className="flex items-center space-x-1.5 text-emerald-800 font-semibold text-xs">
                      <Clock className="w-4 h-4 text-emerald-600" />
                      <span>System Reference Date</span>
                    </div>
                    {isSimulated && (
                      <button
                        onClick={() => {
                          onReferenceDateChange(null);
                          setShowDatePicker(false);
                        }}
                        className="text-[11px] text-emerald-600 hover:text-emerald-800 font-medium flex items-center gap-1"
                      >
                        <RotateCcw className="w-3 h-3" /> Reset
                      </button>
                    )}
                  </div>
                  <p className="text-[11px] text-gray-500 mb-3 leading-relaxed">
                    Set the reference date to evaluate trial progression, trigger observation due dates, or check 28 DAA completion status.
                  </p>
                  <input
                    type="date"
                    value={referenceDate}
                    onChange={(e) => onReferenceDateChange(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none mb-3"
                  />
                  <div className="flex justify-end gap-2">
                    <button
                      onClick={() => setShowDatePicker(false)}
                      className="px-3 py-1 text-xs bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 font-medium"
                    >
                      Done
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Role Switcher */}
            <div className="hidden lg:flex items-center bg-emerald-950/60 p-1 rounded-xl border border-emerald-800/80">
              <span className="px-2 text-[11px] text-emerald-300 font-medium flex items-center gap-1">
                <UserCheck className="w-3.5 h-3.5 text-emerald-400" />
                Role:
              </span>
              {(['Field Staff', 'R&D Officer', 'Deputy Manager', 'Admin'] as UserRole[]).map((role) => (
                <button
                  key={role}
                  onClick={() => onRoleChange(role)}
                  className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-all ${
                    currentRole === role
                      ? 'bg-emerald-500 text-white shadow-sm'
                      : 'text-emerald-300/80 hover:text-white hover:bg-emerald-800/40'
                  }`}
                >
                  {role}
                </button>
              ))}
            </div>

            {/* Primary Action: Add New Trial */}
            <button
              onClick={onOpenNewTrialModal}
              className="flex items-center space-x-1.5 px-3 py-1.5 sm:px-4 sm:py-2 bg-emerald-500 hover:bg-emerald-400 text-emerald-950 font-bold text-xs sm:text-sm rounded-xl shadow-md transition-all active:scale-95"
            >
              <Plus className="w-4 h-4 text-emerald-950 stroke-[3]" />
              <span className="hidden xs:inline">Add Trial</span>
              <span className="xs:hidden">Add</span>
            </button>

            {/* Download Complete Excel */}
            <button
              onClick={onDownloadAllExcel}
              disabled={isDownloading || noMatches}
              title={
                noMatches
                  ? 'No trials match the current filters'
                  : 'Download Excel for the current filter results: Dashboard Overview + matching station worksheets'
              }
              className="flex items-center space-x-1.5 px-2.5 py-1.5 sm:px-3 sm:py-2 bg-emerald-800 hover:bg-emerald-700 text-emerald-100 font-semibold text-xs sm:text-sm rounded-xl border border-emerald-700/80 transition-colors shadow-sm disabled:opacity-60 disabled:cursor-not-allowed"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-300" />
              <span className="hidden md:inline">Download Excel</span>
            </button>

            {/* Download Dashboard Overview only */}
            <button
              onClick={onDownloadOverviewExcel}
              disabled={isDownloading || noMatches}
              title={
                noMatches
                  ? 'No trials match the current filters'
                  : 'Download the Dashboard Overview sheet for the current filter results'
              }
              className="hidden lg:flex items-center space-x-1.5 px-3 py-2 bg-emerald-800 hover:bg-emerald-700 text-emerald-100 font-semibold text-xs sm:text-sm rounded-xl border border-emerald-700/80 transition-colors shadow-sm disabled:opacity-60 disabled:cursor-not-allowed"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-300" />
              <span>Overview</span>
            </button>

            {/* Print Report */}
            <button
              onClick={onOpenPrintModal}
              title="Print-friendly Station Status Report"
              className="flex items-center space-x-1.5 px-2.5 py-1.5 sm:px-3 sm:py-2 bg-emerald-800 hover:bg-emerald-700 text-emerald-100 font-semibold text-xs sm:text-sm rounded-xl border border-emerald-700/80 transition-colors shadow-sm"
            >
              <Printer className="w-4 h-4 text-emerald-300" />
              <span className="hidden md:inline">Print Report</span>
            </button>
          </div>
        </div>

        {/* Mobile Role Switcher + Station Navigation Bar */}
        <div className="flex items-center justify-between py-2 border-t border-emerald-800/60 overflow-x-auto no-scrollbar gap-2">
          {/* Station Selector Pills */}
          <div className="flex items-center space-x-1 text-xs">
            <span className="text-emerald-300/80 text-[11px] font-medium mr-1 hidden sm:flex items-center gap-1">
              <MapPin className="w-3 h-3 text-emerald-400" />
              Station:
            </span>
            <button
              onClick={() => onStationSelect('All')}
              className={`px-3 py-1 rounded-lg font-semibold transition-all whitespace-nowrap text-xs ${
                activeStation === 'All'
                  ? 'bg-white text-emerald-900 shadow'
                  : 'bg-emerald-800/50 text-emerald-200 hover:bg-emerald-800'
              }`}
            >
              All Stations
            </button>
            {STATIONS.map((station) => (
              <button
                key={station}
                onClick={() => onStationSelect(station)}
                className={`px-3 py-1 rounded-lg font-semibold transition-all whitespace-nowrap text-xs ${
                  activeStation === station
                    ? 'bg-white text-emerald-900 shadow'
                    : 'bg-emerald-800/50 text-emerald-200 hover:bg-emerald-800'
                }`}
              >
                {station}
              </button>
            ))}
          </div>

          {/* Mobile Role Dropdown */}
          <div className="lg:hidden flex items-center">
            <select
              value={currentRole}
              onChange={(e) => onRoleChange(e.target.value as UserRole)}
              className="bg-emerald-800 text-white text-xs rounded-lg px-2 py-1 border border-emerald-700 focus:outline-none"
            >
              <option value="Field Staff">Role: Field Staff</option>
              <option value="R&D Officer">Role: R&D Officer</option>
              <option value="Deputy Manager">Role: Deputy Manager</option>
              <option value="Admin">Role: Admin</option>
            </select>
          </div>
        </div>
      </div>
    </header>
  );
};
