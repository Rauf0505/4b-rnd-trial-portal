import React, { useState, useMemo, useEffect, useCallback } from 'react';
import {
  Trial,
  Station,
  STATIONS,
  UserRole,
  TrialStatus,
  TrialCategory,
  InsecticideSubCategory,
  TRIAL_CATEGORIES,
  INSECTICIDE_SUB_CATEGORIES,
} from './types/trial';
import {
  getStoredRole,
  saveStoredRole,
  getSimulatedDate,
  saveSimulatedDate,
  readLegacyLocalTrials,
  clearLegacyLocalTrials,
} from './utils/storage';
import {
  fetchTrials,
  createTrial,
  updateTrial,
  deleteTrial,
  saveObservation,
  replaceAllTrials,
  buildSchedule,
  TrialFormInput,
  ObservationEntryInput,
} from './services/trialService';
import { SEED_TRIALS } from './data/seedTrials';
import { formatISODate, formatDateDisplay } from './utils/dateUtils';
import { isTrialCompleted, isObservationDue } from './utils/statusLogic';
import {
  downloadCompleteExcel,
  downloadStationExcel,
  downloadOverviewExcel,
} from './utils/excelExport';
import { isSupabaseConfigured } from './lib/supabase';

import { Header } from './components/Header';
import { SetupNotice } from './components/SetupNotice';
import { DashboardStats } from './components/DashboardStats';
import { FilterBar } from './components/FilterBar';
import { TrialTable } from './components/TrialTable';
import { TrialFormModal } from './components/TrialFormModal';
import { ObservationModal } from './components/ObservationModal';
import { StationReportPrintView } from './components/StationReportPrintView';
import { DeleteConfirmModal } from './components/DeleteConfirmModal';
import { DataManagementModal } from './components/DataManagementModal';

import { Plus, Database, Leaf, Loader2, AlertCircle } from 'lucide-react';

/** Merge an edited form payload back into an existing trial, rebuilding the schedule. */
function rebuildTrialFromInput(existing: Trial, input: TrialFormInput): Trial {
  const { schedule, observationDates } = buildSchedule(
    input.category,
    input.insecticideSubCategory,
    input.conductedDate
  );

  const observations: Trial['observations'] = {};
  for (const day of schedule) {
    const prev = existing.observations[day];
    observations[day] = prev
      ? { ...prev, day, plannedDate: observationDates[day] }
      : { day, plannedDate: observationDates[day], completed: false };
  }

  return {
    ...existing,
    ...input,
    insecticideSubCategory: input.category === 'Insecticide' ? input.insecticideSubCategory ?? null : null,
    harvestStageDate: input.category === 'Fertilizer / Growth' ? input.harvestStageDate ?? null : null,
    observationSchedule: schedule,
    observationDates,
    observations,
    updatedAt: new Date().toISOString(),
  };
}

export default function App() {
  // Master dataset (Supabase)
  const [trials, setTrials] = useState<Trial[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [legacyAvailable, setLegacyAvailable] = useState(false);

  // Active role
  const [role, setRole] = useState<UserRole>(() => getStoredRole());

  // Reference date (system time or simulated for testing)
  const [referenceDate, setReferenceDate] = useState<string>(() => {
    return getSimulatedDate() || formatISODate(new Date());
  });

  // Filter States
  const [activeStation, setActiveStation] = useState<Station | 'All'>('All');
  const [statusFilter, setStatusFilter] = useState<TrialStatus | 'All'>('All');
  const [categoryFilter, setCategoryFilter] = useState<TrialCategory | 'All'>('All');
  const [subCategoryFilter, setSubCategoryFilter] = useState<InsecticideSubCategory | 'All'>('All');
  const [cropFilter, setCropFilter] = useState('All');
  const [pestFilter, setPestFilter] = useState('All');
  const [productFilter, setProductFilter] = useState('All');
  const [staffFilter, setStaffFilter] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');

  // Modal states
  const [isTrialFormOpen, setIsTrialFormOpen] = useState(false);
  const [editingTrial, setEditingTrial] = useState<Trial | null>(null);

  const [isObservationOpen, setIsObservationOpen] = useState(false);
  const [activeObsTrial, setActiveObsTrial] = useState<Trial | null>(null);
  const [obsInitialDay, setObsInitialDay] = useState<number | undefined>(undefined);

  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [printStation, setPrintStation] = useState<Station>('Sahiwal');
  const [printIncludeStandard, setPrintIncludeStandard] = useState(true);

  // Per-product Standard / Check column visibility in the on-screen table.
  const [showStandardColumn, setShowStandardColumn] = useState(true);

  const [trialToDelete, setTrialToDelete] = useState<Trial | null>(null);
  const [isDataModalOpen, setIsDataModalOpen] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

  // ── Data loading ──────────────────────────────────────────────────────────
  const loadAll = useCallback(async () => {
    setIsLoading(true);
    setLoadError(null);
    try {
      const data = await fetchTrials();
      setTrials(data);
    } catch (err: any) {
      console.error(err);
      setLoadError(err?.message || 'Failed to load trials from Supabase.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setIsLoading(false);
      return;
    }
    loadAll();
    setLegacyAvailable(Boolean(readLegacyLocalTrials()?.length));
  }, [loadAll]);

  // ── Role + reference date ─────────────────────────────────────────────────
  const handleRoleChange = (newRole: UserRole) => {
    setRole(newRole);
    saveStoredRole(newRole);
  };

  const handleReferenceDateChange = (newDate: string | null) => {
    if (newDate) {
      setReferenceDate(newDate);
      saveSimulatedDate(newDate);
    } else {
      const todayISO = formatISODate(new Date());
      setReferenceDate(todayISO);
      saveSimulatedDate(null);
    }
  };

  // ── Derived filter options ────────────────────────────────────────────────
  const uniqueCrops = useMemo(
    () => Array.from(new Set(trials.map((t) => t.crop))).filter(Boolean).sort(),
    [trials]
  );

  const uniquePests = useMemo(
    () => Array.from(new Set(trials.map((t) => t.pestOrWeed))).filter(Boolean).sort(),
    [trials]
  );

  const uniqueProducts = useMemo(() => {
    const set = new Set<string>();
    trials.forEach((t) => t.products.forEach((p) => p.productName && set.add(p.productName)));
    return Array.from(set).sort();
  }, [trials]);

  // Previously used Standard / Check values, offered as a dropdown in the form.
  const uniqueStandards = useMemo(() => {
    const set = new Set<string>();
    trials.forEach((t) =>
      t.products.forEach((p) => {
        const value = p.standard.trim();
        if (value) set.add(value);
      })
    );
    return Array.from(set).sort();
  }, [trials]);

  const uniqueStaff = useMemo(
    () => Array.from(new Set(trials.map((t) => t.fieldStaffName))).filter(Boolean).sort(),
    [trials]
  );

  // ── Filtered & sorted trials ──────────────────────────────────────────────
  const filteredTrials = useMemo(() => {
    return trials
      .filter((t) => {
        if (activeStation !== 'All' && t.station !== activeStation) return false;

        // ONGOING = any unfinished trial (includes those with a due observation).
        // OBSERVATION DUE is a layered alert, so these filters intentionally overlap.
        if (statusFilter !== 'All') {
          const completed = isTrialCompleted(t, referenceDate);
          const due = isObservationDue(t, referenceDate);
          if (statusFilter === 'COMPLETED' && !completed) return false;
          if (statusFilter === 'ONGOING' && completed) return false;
          if (statusFilter === 'OBSERVATION DUE' && !due) return false;
        }

        if (categoryFilter !== 'All' && t.category !== categoryFilter) return false;
        if (
          subCategoryFilter !== 'All' &&
          (t.category !== 'Insecticide' || t.insecticideSubCategory !== subCategoryFilter)
        ) {
          return false;
        }

        if (cropFilter !== 'All' && t.crop !== cropFilter) return false;
        if (pestFilter !== 'All' && t.pestOrWeed !== pestFilter) return false;
        if (productFilter !== 'All' && !t.products.some((p) => p.productName === productFilter)) return false;
        if (staffFilter !== 'All' && t.fieldStaffName !== staffFilter) return false;

        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const matches =
            t.trialName.toLowerCase().includes(q) ||
            t.crop.toLowerCase().includes(q) ||
            t.pestOrWeed.toLowerCase().includes(q) ||
            t.fieldStaffName.toLowerCase().includes(q) ||
            t.fieldLocation.toLowerCase().includes(q) ||
            t.station.toLowerCase().includes(q) ||
            t.category.toLowerCase().includes(q) ||
            t.products.some(
              (p) =>
                p.productName.toLowerCase().includes(q) ||
                p.activeIngredient.toLowerCase().includes(q) ||
                (p.standard && p.standard.toLowerCase().includes(q))
            ) ||
            (t.remarks && t.remarks.toLowerCase().includes(q));

          if (!matches) return false;
        }

        return true;
      })
      .sort((a, b) => {
        if (sortOrder === 'desc') return b.conductedDate.localeCompare(a.conductedDate);
        return a.conductedDate.localeCompare(b.conductedDate);
      });
  }, [
    trials,
    activeStation,
    statusFilter,
    categoryFilter,
    subCategoryFilter,
    cropFilter,
    pestFilter,
    productFilter,
    staffFilter,
    searchQuery,
    sortOrder,
    referenceDate,
  ]);

  // ── Active-filter description + per-station match counts (for exports/print) ─
  const isFilterActive =
    activeStation !== 'All' ||
    statusFilter !== 'All' ||
    categoryFilter !== 'All' ||
    subCategoryFilter !== 'All' ||
    cropFilter !== 'All' ||
    pestFilter !== 'All' ||
    productFilter !== 'All' ||
    staffFilter !== 'All' ||
    searchQuery.trim() !== '';

  const filterSummary = useMemo(() => {
    if (!isFilterActive) return 'No filters applied';
    const parts: string[] = [];
    if (activeStation !== 'All') parts.push(`Station: ${activeStation}`);
    if (statusFilter !== 'All') parts.push(`Status: ${statusFilter}`);
    if (categoryFilter !== 'All') parts.push(`Category: ${categoryFilter}`);
    if (subCategoryFilter !== 'All') parts.push(`Sub-Category: ${subCategoryFilter}`);
    if (cropFilter !== 'All') parts.push(`Crop: ${cropFilter}`);
    if (pestFilter !== 'All') parts.push(`Pest/Weed: ${pestFilter}`);
    if (productFilter !== 'All') parts.push(`Product: ${productFilter}`);
    if (staffFilter !== 'All') parts.push(`Staff: ${staffFilter}`);
    if (searchQuery.trim()) parts.push(`Search: "${searchQuery.trim()}"`);
    return parts.join(' · ');
  }, [
    isFilterActive,
    activeStation,
    statusFilter,
    categoryFilter,
    subCategoryFilter,
    cropFilter,
    pestFilter,
    productFilter,
    staffFilter,
    searchQuery,
  ]);

  const stationMatchCounts = useMemo(() => {
    const counts = {} as Record<Station, number>;
    STATIONS.forEach((s) => {
      counts[s] = 0;
    });
    filteredTrials.forEach((t) => {
      counts[t.station] = (counts[t.station] || 0) + 1;
    });
    return counts;
  }, [filteredTrials]);

  // ── CRUD handlers ─────────────────────────────────────────────────────────
  const handleSaveTrial = async (formData: TrialFormInput) => {
    setIsSaving(true);
    try {
      if (editingTrial) {
        const updated = rebuildTrialFromInput(editingTrial, formData);
        const fresh = await updateTrial(updated);
        setTrials(fresh);
        setEditingTrial(null);
      } else {
        const fresh = await createTrial(formData);
        setTrials(fresh);
      }
    } catch (err: any) {
      console.error(err);
      alert(`Failed to save trial: ${err?.message || 'Unknown error'}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!trialToDelete) return;
    try {
      const fresh = await deleteTrial(trialToDelete.id);
      setTrials(fresh);
      setTrialToDelete(null);
    } catch (err: any) {
      console.error(err);
      alert(`Failed to delete trial: ${err?.message || 'Unknown error'}`);
    }
  };

  const handleSaveObservation = async (trialId: string, day: number, obsData: ObservationEntryInput) => {
    setIsSaving(true);
    try {
      const fresh = await saveObservation(trialId, day, obsData);
      setTrials(fresh);
      const current = fresh.find((t) => t.id === trialId);
      if (current) setActiveObsTrial(current);
    } catch (err: any) {
      console.error(err);
      alert(`Failed to save observation: ${err?.message || 'Unknown error'}`);
    } finally {
      setIsSaving(false);
    }
  };

  // ── Excel downloads ───────────────────────────────────────────────────────
  // Every export reflects the active filters: it operates on `filteredTrials`
  // (already filtered + sorted) and records the filter summary in the header.
  const handleDownloadAllExcel = async (includeStandard: boolean) => {
    setIsDownloading(true);
    try {
      await downloadCompleteExcel(filteredTrials, referenceDate, filterSummary, includeStandard);
    } catch (err) {
      console.error('Download failed:', err);
      alert('Error generating Excel file. Please try again.');
    } finally {
      setIsDownloading(false);
    }
  };

  const handleDownloadOverviewExcel = async (includeStandard: boolean) => {
    setIsDownloading(true);
    try {
      await downloadOverviewExcel(filteredTrials, referenceDate, filterSummary, includeStandard);
    } catch (err) {
      console.error('Download failed:', err);
      alert('Error generating overview Excel. Please try again.');
    } finally {
      setIsDownloading(false);
    }
  };

  const handleDownloadStationExcel = async (station: Station, includeStandard: boolean) => {
    setIsDownloading(true);
    try {
      await downloadStationExcel(station, filteredTrials, referenceDate, filterSummary, includeStandard);
    } catch (err) {
      console.error('Download failed:', err);
      alert('Error generating station Excel. Please try again.');
    } finally {
      setIsDownloading(false);
    }
  };

  // The filter-bar download button shares the complete-workbook behaviour:
  // Overview + one sheet per station that has matching trials.
  const handleDownloadCurrentFilteredExcel = async (includeStandard: boolean) => {
    await handleDownloadAllExcel(includeStandard);
  };

  // ── Print ─────────────────────────────────────────────────────────────────
  const handleOpenPrintForStation = (station: Station, includeStandard: boolean) => {
    setPrintStation(station);
    setPrintIncludeStandard(includeStandard);
    setIsPrintModalOpen(true);
  };

  const handleOpenPrintModal = (includeStandard: boolean) => {
    setPrintStation(activeStation !== 'All' ? activeStation : 'Sahiwal');
    setPrintIncludeStandard(includeStandard);
    setIsPrintModalOpen(true);
  };

  const handleResetFilters = () => {
    setActiveStation('All');
    setStatusFilter('All');
    setCategoryFilter('All');
    setSubCategoryFilter('All');
    setCropFilter('All');
    setPestFilter('All');
    setProductFilter('All');
    setStaffFilter('All');
    setSearchQuery('');
    setSortOrder('desc');
  };

  // ── Data management actions ───────────────────────────────────────────────
  const handleResetSeedData = async () => {
    setIsSaving(true);
    try {
      const fresh = await replaceAllTrials(SEED_TRIALS);
      setTrials(fresh);
    } catch (err: any) {
      console.error(err);
      alert(`Failed to load sample data: ${err?.message || 'Unknown error'}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleImportData = async (imported: Trial[]) => {
    setIsSaving(true);
    try {
      const fresh = await replaceAllTrials(imported);
      setTrials(fresh);
    } catch (err: any) {
      console.error(err);
      alert(`Failed to import data: ${err?.message || 'Unknown error'}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleMigrateLocalData = async () => {
    const legacy = readLegacyLocalTrials();
    if (!legacy) return;
    setIsSaving(true);
    try {
      // Legacy records already match the Trial shape except for the new
      // category/products fields; normalise them before upload.
      const normalised: Trial[] = (legacy as any[]).map((t) => {
        const products = Array.isArray(t.products) && t.products.length > 0
          ? t.products
          : [
              {
                position: 0,
                productName: t.productName || '(no product)',
                activeIngredient: t.activeIngredient || '',
                formulation: t.formulation || '',
                dose: t.dose ?? '',
                unit: t.unit || '',
                replications: t.replications ?? 3,
                applications: t.applications ?? 1,
                standard: '',
              },
            ];
        const schedule =
          Array.isArray(t.observationSchedule) && t.observationSchedule.length > 0
            ? t.observationSchedule
            : [0, 3, 7, 14, 21, 28];
        return {
          ...t,
          category: t.category || 'Herbicide',
          insecticideSubCategory: t.insecticideSubCategory ?? null,
          products,
          observationSchedule: schedule,
          observationDates: t.observationDates || {},
          observations: t.observations || {},
          harvestStageDate: t.harvestStageDate ?? null,
        } as Trial;
      });
      const fresh = await replaceAllTrials(normalised);
      setTrials(fresh);
      clearLegacyLocalTrials();
      setLegacyAvailable(false);
      alert('Local data migrated to Supabase successfully.');
    } catch (err: any) {
      console.error(err);
      alert(`Migration failed: ${err?.message || 'Unknown error'}`);
    } finally {
      setIsSaving(false);
    }
  };

  // ── Guards ────────────────────────────────────────────────────────────────
  if (!isSupabaseConfigured) {
    return <SetupNotice />;
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center gap-3 text-emerald-800">
        <Loader2 className="w-8 h-8 animate-spin" />
        <p className="text-sm font-semibold">Loading trials from Supabase…</p>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="bg-white rounded-2xl shadow-xl border border-red-200 max-w-lg w-full p-8 space-y-4 text-center">
          <div className="w-12 h-12 rounded-xl bg-red-100 text-red-600 flex items-center justify-center mx-auto">
            <AlertCircle className="w-6 h-6" />
          </div>
          <h1 className="text-lg font-extrabold text-gray-900">Could not load data</h1>
          <p className="text-xs text-gray-500 break-words">{loadError}</p>
          <button
            onClick={loadAll}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-bold rounded-xl"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col selection:bg-emerald-200 selection:text-emerald-900">
      <Header
        currentRole={role}
        onRoleChange={handleRoleChange}
        activeStation={activeStation}
        onStationSelect={setActiveStation}
        referenceDate={referenceDate}
        onReferenceDateChange={handleReferenceDateChange}
        onOpenNewTrialModal={() => {
          setEditingTrial(null);
          setIsTrialFormOpen(true);
        }}
        onDownloadAllExcel={handleDownloadAllExcel}
        onDownloadOverviewExcel={handleDownloadOverviewExcel}
        onOpenPrintModal={handleOpenPrintModal}
        isDownloading={isDownloading}
        matchCount={filteredTrials.length}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-5 sm:py-7 space-y-6">
        {role === 'Field Staff' && (
          <div className="bg-gradient-to-r from-emerald-800 to-emerald-950 text-white rounded-2xl p-4 sm:p-5 shadow-lg border border-emerald-700 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 print-hide animate-in fade-in">
            <div className="flex items-center space-x-3.5">
              <div className="w-12 h-12 rounded-xl bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center text-emerald-300 shrink-0">
                <Leaf className="w-6 h-6 text-emerald-400" />
              </div>
              <div>
                <h3 className="font-bold text-base text-white flex items-center gap-2">
                  4B R&D Field Trial Entry Portal
                  <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-emerald-500 text-emerald-950">
                    Fast &lt; 1 Min
                  </span>
                </h3>
                <p className="text-xs text-emerald-200/90 mt-0.5">
                  Record new trials on-site. Observation schedules adjust automatically to the selected trial category.
                </p>
              </div>
            </div>
            <button
              onClick={() => {
                setEditingTrial(null);
                setIsTrialFormOpen(true);
              }}
              className="w-full sm:w-auto px-5 py-2.5 bg-emerald-400 hover:bg-emerald-300 text-emerald-950 font-extrabold text-xs sm:text-sm rounded-xl shadow-md transition-all active:scale-95 flex items-center justify-center gap-2"
            >
              <Plus className="w-4 h-4 stroke-[3]" />
              <span>Submit New Field Trial</span>
            </button>
          </div>
        )}

        <DashboardStats
          trials={trials}
          referenceDate={referenceDate}
          activeStation={activeStation}
          onStationSelect={setActiveStation}
          onDownloadStationExcel={handleDownloadStationExcel}
          onPrintStationReport={handleOpenPrintForStation}
          stationMatchCounts={stationMatchCounts}
        />

        <FilterBar
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          selectedStation={activeStation}
          onStationChange={setActiveStation}
          selectedStatus={statusFilter}
          onStatusChange={setStatusFilter}
          selectedCategory={categoryFilter}
          onCategoryChange={setCategoryFilter}
          selectedSubCategory={subCategoryFilter}
          onSubCategoryChange={setSubCategoryFilter}
          selectedCrop={cropFilter}
          onCropChange={setCropFilter}
          selectedPest={pestFilter}
          onPestChange={setPestFilter}
          selectedProduct={productFilter}
          onProductChange={setProductFilter}
          selectedStaff={staffFilter}
          onStaffChange={setStaffFilter}
          sortOrder={sortOrder}
          onToggleSort={() => setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc')}
          onResetFilters={handleResetFilters}
          uniqueCrops={uniqueCrops}
          uniquePests={uniquePests}
          uniqueProducts={uniqueProducts}
          uniqueStaff={uniqueStaff}
          onDownloadCurrentExcel={handleDownloadCurrentFilteredExcel}
          onPrintCurrentReport={handleOpenPrintModal}
          totalFilteredCount={filteredTrials.length}
        />

        <div className="space-y-2">
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center space-x-2">
              <h2 className="text-base sm:text-lg font-bold text-gray-900">
                {activeStation === 'All' ? 'All Research Stations' : `${activeStation} Station`} Trial Records
              </h2>
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                {filteredTrials.length} {filteredTrials.length === 1 ? 'Trial' : 'Trials'}
              </span>
            </div>
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="text-xs text-gray-500 hidden sm:block">
                Green rows = Completed &bull; Orange = Observations Due &bull; One row per product
              </div>
              <button
                type="button"
                onClick={() => setShowStandardColumn((value) => !value)}
                title="Show or hide the per-product Standard / Check column"
                className={`text-xs font-semibold px-2.5 py-1 rounded-lg border transition-colors whitespace-nowrap ${
                  showStandardColumn
                    ? 'bg-sky-50 text-sky-800 border-sky-200 hover:bg-sky-100'
                    : 'bg-gray-50 text-gray-500 border-gray-200 hover:bg-gray-100'
                }`}
              >
                {showStandardColumn ? 'Hide' : 'Show'} Standard
              </button>
            </div>
          </div>

          <TrialTable
            trials={filteredTrials}
            referenceDate={referenceDate}
            currentRole={role}
            showStandard={showStandardColumn}
            onEditTrial={(t) => {
              setEditingTrial(t);
              setIsTrialFormOpen(true);
            }}
            onDeleteTrial={(t) => setTrialToDelete(t)}
            onOpenObservation={(t, day) => {
              setActiveObsTrial(t);
              setObsInitialDay(day);
              setIsObservationOpen(true);
            }}
          />
        </div>
      </main>

      <div className="fixed bottom-5 right-5 sm:hidden z-30 print-hide">
        <button
          onClick={() => {
            setEditingTrial(null);
            setIsTrialFormOpen(true);
          }}
          className="w-14 h-14 rounded-full bg-emerald-600 hover:bg-emerald-500 text-white shadow-xl flex items-center justify-center active:scale-90 transition-all border-2 border-white"
          title="Add New Field Trial"
        >
          <Plus className="w-7 h-7 stroke-[3]" />
        </button>
      </div>

      <footer className="bg-white border-t border-gray-200 py-6 mt-12 print-hide text-xs text-gray-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center space-x-2">
            <Leaf className="w-4 h-4 text-emerald-600" />
            <span className="font-bold text-gray-800">4B R&D Trial Portal</span>
            <span>&bull; Four Stations: Sahiwal, Multan, Lahore, Hyderabad</span>
          </div>

          <div className="flex items-center space-x-4">
            {legacyAvailable && (
              <button
                onClick={handleMigrateLocalData}
                className="flex items-center space-x-1 text-amber-700 hover:text-amber-900 font-semibold"
                title="Push legacy local trials into Supabase"
              >
                <Database className="w-3.5 h-3.5" />
                <span>Migrate Local Data</span>
              </button>
            )}
            <button
              onClick={() => setIsDataModalOpen(true)}
              className="flex items-center space-x-1 text-emerald-700 hover:text-emerald-900 font-semibold"
            >
              <Database className="w-3.5 h-3.5" />
              <span>Database & Backup</span>
            </button>
            <span>&bull;</span>
            <button
              onClick={() => handleReferenceDateChange(null)}
              className="text-gray-500 hover:text-gray-800"
            >
              System Date: {formatDateDisplay(referenceDate)}
            </button>
          </div>
        </div>
      </footer>

      {/* MODALS */}
      <TrialFormModal
        isOpen={isTrialFormOpen}
        onClose={() => {
          setIsTrialFormOpen(false);
          setEditingTrial(null);
        }}
        onSave={handleSaveTrial}
        editingTrial={editingTrial}
        defaultStation={activeStation !== 'All' ? activeStation : 'Sahiwal'}
        isSaving={isSaving}
        standardOptions={uniqueStandards}
      />

      <ObservationModal
        isOpen={isObservationOpen}
        onClose={() => {
          setIsObservationOpen(false);
          setActiveObsTrial(null);
          setObsInitialDay(undefined);
        }}
        trial={activeObsTrial}
        referenceDate={referenceDate}
        onSaveObservation={handleSaveObservation}
        isSaving={isSaving}
        initialDay={obsInitialDay}
      />

      <StationReportPrintView
        isOpen={isPrintModalOpen}
        onClose={() => setIsPrintModalOpen(false)}
        trials={filteredTrials}
        referenceDate={referenceDate}
        defaultStation={printStation}
        onDownloadStationExcel={handleDownloadStationExcel}
        filterSummary={filterSummary}
        includeStandard={printIncludeStandard}
      />

      <DeleteConfirmModal
        isOpen={!!trialToDelete}
        onClose={() => setTrialToDelete(null)}
        trial={trialToDelete}
        onConfirm={handleDeleteConfirm}
      />

      <DataManagementModal
        isOpen={isDataModalOpen}
        onClose={() => setIsDataModalOpen(false)}
        trials={trials}
        legacyAvailable={legacyAvailable}
        onResetSeedData={handleResetSeedData}
        onImportData={handleImportData}
        onMigrateLocalData={handleMigrateLocalData}
      />
    </div>
  );
}
