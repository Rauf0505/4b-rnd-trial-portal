import React, { useState, useEffect } from 'react';
import { Trial, PhytotoxicityLevel, PHYTOTOXICITY_LEVELS } from '../types/trial';
import { getTrialSchedule, isIntervalDue } from '../utils/statusLogic';
import type { ObservationEntryInput } from '../services/trialService';
import { formatDateDisplay, formatISODate, isPastOrToday } from '../utils/dateUtils';
import {
  X,
  Calendar,
  CheckCircle2,
  AlertCircle,
  Clock,
  Check,
  ClipboardCheck,
  Percent,
  ShieldAlert,
  User,
  FileText,
  Loader2,
} from 'lucide-react';
import confetti from 'canvas-confetti';

interface ObservationModalProps {
  isOpen: boolean;
  onClose: () => void;
  trial: Trial | null;
  referenceDate: string;
  onSaveObservation: (trialId: string, day: number, data: ObservationEntryInput) => void | Promise<void>;
  initialDay?: number;
  isSaving?: boolean;
}

export const ObservationModal: React.FC<ObservationModalProps> = ({
  isOpen,
  onClose,
  trial,
  referenceDate,
  onSaveObservation,
  initialDay,
  isSaving = false,
}) => {
  const [selectedDay, setSelectedDay] = useState<number>(3);

  const [actualDate, setActualDate] = useState(formatISODate(new Date()));
  const [efficacyPercent, setEfficacyPercent] = useState<number | ''>(85);
  const [pestMortalityCount, setPestMortalityCount] = useState('');
  const [phytotoxicity, setPhytotoxicity] = useState<PhytotoxicityLevel>('None');
  const [notes, setNotes] = useState('');
  const [observedBy, setObservedBy] = useState('');

  const schedule = trial ? getTrialSchedule(trial) : [];

  // Pick the requested day (or the first scheduled day) when the modal opens.
  useEffect(() => {
    if (!trial) return;
    const valid = initialDay !== undefined && schedule.includes(initialDay);
    setSelectedDay(valid ? (initialDay as number) : schedule[0] ?? 3);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trial?.id, initialDay, isOpen]);

  // Sync field values whenever trial or selected day changes.
  useEffect(() => {
    if (!trial) return;
    const obs = trial.observations[selectedDay];
    const plannedDate = trial.observationDates[selectedDay];
    if (obs && obs.completed) {
      setActualDate(obs.actualDate || plannedDate);
      setEfficacyPercent(obs.efficacyPercent !== undefined ? obs.efficacyPercent : '');
      setPestMortalityCount(obs.pestMortalityCount || '');
      setPhytotoxicity(obs.phytotoxicity || 'None');
      setNotes(obs.notes || '');
      setObservedBy(obs.observedBy || trial.fieldStaffName);
    } else {
      setActualDate(isPastOrToday(plannedDate, referenceDate) ? plannedDate : formatISODate(new Date()));
      setEfficacyPercent('');
      setPestMortalityCount('');
      setPhytotoxicity('None');
      setNotes('');
      setObservedBy(trial.fieldStaffName);
    }
  }, [trial, selectedDay, referenceDate]);

  if (!isOpen || !trial) return null;

  const currentPlannedDate = trial.observationDates[selectedDay];
  const currentObs = trial.observations[selectedDay];
  const isDue = isIntervalDue(trial, selectedDay, referenceDate);
  const completedCount = schedule.filter((d) => trial.observations[d]?.completed).length;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await onSaveObservation(trial.id, selectedDay, {
        actualDate: actualDate || currentPlannedDate,
        completed: true,
        efficacyPercent: efficacyPercent === '' ? undefined : Number(efficacyPercent),
        pestMortalityCount: pestMortalityCount.trim(),
        phytotoxicity,
        notes: notes.trim(),
        observedBy: observedBy.trim() || trial.fieldStaffName,
      });
      confetti({ particleCount: 25, spread: 45, origin: { y: 0.7 } });
    } catch {
      // handled by parent
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 print-hide">
      <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in-95 my-4">
        {/* Header */}
        <div className="bg-emerald-800 text-white px-5 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="w-9 h-9 rounded-lg bg-emerald-700 flex items-center justify-center text-emerald-200">
              <ClipboardCheck className="w-5 h-5 text-emerald-300" />
            </div>
            <div>
              <h3 className="font-bold text-base sm:text-lg">Field Observation Records</h3>
              <p className="text-xs text-emerald-200/80">
                {trial.station} Station &bull; {trial.crop} &bull; {trial.products[0]?.productName || '—'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close observation form"
            className="w-8 h-8 rounded-lg bg-emerald-900/50 hover:bg-emerald-700 text-emerald-200 hover:text-white flex items-center justify-center transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Context banner */}
        <div className="bg-gray-50 px-5 py-3 border-b border-gray-200 flex flex-wrap items-center justify-between gap-2 text-xs">
          <div>
            <span className="font-bold text-gray-900">{trial.trialName}</span>
            <div className="text-gray-500 mt-0.5">
              {trial.category}
              {trial.insecticideSubCategory ? ` (${trial.insecticideSubCategory})` : ''} &bull; Conducted:{' '}
              <strong className="text-gray-800">{formatDateDisplay(trial.conductedDate)}</strong> &bull; Target:{' '}
              <strong className="text-gray-800">{trial.pestOrWeed}</strong>
            </div>
          </div>
          <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
            {completedCount}/{schedule.length} observations
          </span>
        </div>

        {/* Dynamic day tabs */}
        <div className="px-5 pt-4">
          <div className="flex flex-wrap gap-1.5 p-1 bg-gray-100 rounded-xl">
            {schedule.map((day) => {
              const obs = trial.observations[day];
              const planned = trial.observationDates[day];
              const isIntDue = isPastOrToday(planned, referenceDate) && !obs?.completed;
              const isSelected = selectedDay === day;

              return (
                <button
                  key={day}
                  type="button"
                  onClick={() => setSelectedDay(day)}
                  className={`flex-1 min-w-[64px] py-2 px-1 rounded-lg text-xs font-bold transition-all flex flex-col items-center justify-center relative ${
                    isSelected
                      ? 'bg-white text-emerald-900 shadow-md ring-2 ring-emerald-500/30'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-white/50'
                  }`}
                >
                  <span className="text-[11px] font-extrabold">{day} DAA</span>
                  {obs?.completed ? (
                    <span className="mt-0.5 text-[9px] text-emerald-700 flex items-center gap-0.5 font-bold">
                      <CheckCircle2 className="w-3 h-3 text-emerald-600 inline" /> Done
                    </span>
                  ) : isIntDue ? (
                    <span className="mt-0.5 text-[9px] text-orange-700 flex items-center gap-0.5 font-bold animate-pulse">
                      <AlertCircle className="w-3 h-3 text-orange-500 inline" /> Due
                    </span>
                  ) : (
                    <span className="mt-0.5 text-[9px] text-gray-400 flex items-center gap-0.5">
                      <Clock className="w-2.5 h-2.5 text-gray-400 inline" /> Pending
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSave} className="p-5 space-y-4">
          <div className="bg-emerald-50/70 border border-emerald-200/80 rounded-xl p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider">
                1. Planned Observation Date:
              </div>
              <div className="text-base font-extrabold text-emerald-950 flex items-center gap-1.5 mt-0.5">
                <Calendar className="w-4 h-4 text-emerald-600" />
                {formatDateDisplay(currentPlannedDate)} &nbsp;({selectedDay} DAA)
              </div>
            </div>

            <div className="sm:text-right">
              <div className="text-[11px] font-bold text-gray-700 uppercase tracking-wider">
                2. Observation Status:
              </div>
              <div className="mt-0.5">
                {currentObs?.completed ? (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    Completed on {formatDateDisplay(currentObs.actualDate || currentPlannedDate)}
                  </span>
                ) : isDue ? (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-orange-100 text-orange-800 border border-orange-300">
                    <AlertCircle className="w-3.5 h-3.5 text-orange-600" />
                    OBSERVATION DUE NOW
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-700 border border-gray-200">
                    <Clock className="w-3.5 h-3.5 text-gray-500" />
                    Scheduled for {formatDateDisplay(currentPlannedDate)}
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1 flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-emerald-600" />
                Actual Observation Date <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                value={actualDate}
                onChange={(e) => setActualDate(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1 flex items-center gap-1">
                <User className="w-3.5 h-3.5 text-emerald-600" />
                Observed By (Staff)
              </label>
              <input
                type="text"
                placeholder="Field staff name"
                value={observedBy}
                onChange={(e) => setObservedBy(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1 flex items-center gap-1">
                <Percent className="w-3.5 h-3.5 text-emerald-600" />
                Efficacy / Control (%)
              </label>
              <div className="relative">
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="0.5"
                  placeholder="e.g. 92.5"
                  value={efficacyPercent}
                  onChange={(e) => setEfficacyPercent(e.target.value === '' ? '' : Number(e.target.value))}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500 pr-8"
                />
                <span className="absolute right-3 top-2.5 text-xs font-bold text-gray-400">%</span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                Pest Count / Pre vs Post
              </label>
              <input
                type="text"
                placeholder="e.g. Pre: 18 / Post: 1 per plant"
                value={pestMortalityCount}
                onChange={(e) => setPestMortalityCount(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1 flex items-center gap-1">
              <ShieldAlert className="w-3.5 h-3.5 text-emerald-600" />
              Phytotoxicity Symptoms
            </label>
            <div className="grid grid-cols-4 gap-2">
              {PHYTOTOXICITY_LEVELS.map((level) => (
                <button
                  type="button"
                  key={level}
                  onClick={() => setPhytotoxicity(level)}
                  className={`py-1.5 px-2 text-xs font-bold rounded-lg border transition-all ${
                    phytotoxicity === level
                      ? level === 'None'
                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                        : level === 'Slight'
                        ? 'bg-amber-500 text-white border-amber-500 shadow-xs'
                        : 'bg-red-600 text-white border-red-600 shadow-xs'
                      : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  {level}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1 flex items-center gap-1">
              <FileText className="w-3.5 h-3.5 text-emerald-600" />
              Observation Notes &amp; Findings
            </label>
            <textarea
              rows={2}
              placeholder="e.g. Rapid knockdown noted, leaf vigor healthy, no yellowing or leaf scorch."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500 resize-none"
            />
          </div>

          <div className="pt-3 border-t border-gray-100 flex items-center justify-between">
            <span className="text-xs text-gray-500">
              Saving updates the {selectedDay} DAA observation for this trial.
            </span>
            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm font-semibold text-gray-600 hover:text-gray-800 bg-gray-100 hover:bg-gray-200 rounded-xl"
              >
                Close
              </button>
              <button
                type="submit"
                disabled={isSaving}
                className="flex items-center space-x-1.5 px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm rounded-xl shadow-md transition-all active:scale-95 disabled:opacity-60"
              >
                {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4 stroke-[3]" />}
                <span>Save {selectedDay} DAA Observation</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
