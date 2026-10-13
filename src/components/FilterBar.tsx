import React from 'react';
import {
  Station,
  STATIONS,
  TrialStatus,
  TrialCategory,
  InsecticideSubCategory,
  TRIAL_CATEGORIES,
  INSECTICIDE_SUB_CATEGORIES,
} from '../types/trial';
import {
  Search,
  Filter,
  RotateCcw,
  ArrowUpDown,
  FileSpreadsheet,
  Printer,
  X
} from 'lucide-react';
import { ExportMenu } from './ExportMenu';

interface FilterBarProps {
  searchQuery: string;
  onSearchChange: (q: string) => void;
  selectedStation: Station | 'All';
  onStationChange: (s: Station | 'All') => void;
  selectedStatus: TrialStatus | 'All';
  onStatusChange: (status: TrialStatus | 'All') => void;
  selectedCategory: TrialCategory | 'All';
  onCategoryChange: (category: TrialCategory | 'All') => void;
  selectedSubCategory: InsecticideSubCategory | 'All';
  onSubCategoryChange: (sub: InsecticideSubCategory | 'All') => void;
  selectedCrop: string;
  onCropChange: (crop: string) => void;
  selectedPest: string;
  onPestChange: (pest: string) => void;
  selectedProduct: string;
  onProductChange: (product: string) => void;
  selectedStaff: string;
  onStaffChange: (staff: string) => void;
  sortOrder: 'desc' | 'asc';
  onToggleSort: () => void;
  onResetFilters: () => void;
  uniqueCrops: string[];
  uniquePests: string[];
  uniqueProducts: string[];
  uniqueStaff: string[];
  onDownloadCurrentExcel: (includeStandard: boolean) => void;
  onPrintCurrentReport: (includeStandard: boolean) => void;
  totalFilteredCount: number;
}

export const FilterBar: React.FC<FilterBarProps> = ({
  searchQuery,
  onSearchChange,
  selectedStation,
  onStationChange,
  selectedStatus,
  onStatusChange,
  selectedCategory,
  onCategoryChange,
  selectedSubCategory,
  onSubCategoryChange,
  selectedCrop,
  onCropChange,
  selectedPest,
  onPestChange,
  selectedProduct,
  onProductChange,
  selectedStaff,
  onStaffChange,
  sortOrder,
  onToggleSort,
  onResetFilters,
  uniqueCrops,
  uniquePests,
  uniqueProducts,
  uniqueStaff,
  onDownloadCurrentExcel,
  onPrintCurrentReport,
  totalFilteredCount,
}) => {
  const hasActiveFilters =
    searchQuery ||
    selectedStation !== 'All' ||
    selectedStatus !== 'All' ||
    selectedCategory !== 'All' ||
    selectedSubCategory !== 'All' ||
    selectedCrop !== 'All' ||
    selectedPest !== 'All' ||
    selectedProduct !== 'All' ||
    selectedStaff !== 'All';

  return (
    <div className="bg-white rounded-2xl p-4 sm:p-5 shadow-sm border border-gray-200 space-y-4 print-hide">
      
      {/* Top Search & Station Tabs */}
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
        
        {/* Instant Search Box */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-3" />
          <input
            type="text"
            placeholder="Instant search by Trial, Product, Crop, Pest, Staff, or Location..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full pl-10 pr-9 py-2 text-xs sm:text-sm bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none transition-all placeholder:text-gray-400"
          />
          {searchQuery && (
            <button
              onClick={() => onSearchChange('')}
              className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Station Segment Filter Tabs */}
        <div className="flex items-center bg-gray-100 p-1 rounded-xl self-start lg:self-auto overflow-x-auto no-scrollbar">
          <button
            onClick={() => onStationChange('All')}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all whitespace-nowrap ${
              selectedStation === 'All'
                ? 'bg-emerald-700 text-white shadow-xs'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            All Stations
          </button>
          {STATIONS.map((st) => (
            <button
              key={st}
              onClick={() => onStationChange(st)}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all whitespace-nowrap ${
                selectedStation === st
                  ? 'bg-emerald-700 text-white shadow-xs'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              {st}
            </button>
          ))}
        </div>

      </div>

      {/* Filter Dropdowns Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2.5 pt-1">
        
        {/* Status Dropdown */}
        <div>
          <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">
            Status
          </label>
          <select
            value={selectedStatus}
            onChange={(e) => onStatusChange(e.target.value as any)}
            className="w-full px-2.5 py-1.5 text-xs bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:bg-white font-medium"
          >
            <option value="All">All Statuses</option>
            <option value="ONGOING">ONGOING (all unfinished)</option>
            <option value="OBSERVATION DUE">OBSERVATION DUE (needs entry)</option>
            <option value="COMPLETED">COMPLETED</option>
          </select>
        </div>

        {/* Trial Category Dropdown */}
        <div>
          <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">
            Trial Category
          </label>
          <select
            value={selectedCategory}
            onChange={(e) => {
              const value = e.target.value as TrialCategory | 'All';
              onCategoryChange(value);
              if (value !== 'Insecticide') onSubCategoryChange('All');
            }}
            className="w-full px-2.5 py-1.5 text-xs bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:bg-white font-medium"
          >
            <option value="All">All Categories</option>
            {TRIAL_CATEGORIES.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>

        {/* Insecticide Sub-Category Dropdown */}
        <div>
          <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">
            Sub-Category
          </label>
          <select
            value={selectedSubCategory}
            disabled={selectedCategory !== 'Insecticide'}
            onChange={(e) => onSubCategoryChange(e.target.value as InsecticideSubCategory | 'All')}
            className="w-full px-2.5 py-1.5 text-xs bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:bg-white font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            title={selectedCategory !== 'Insecticide' ? 'Only applies to Insecticide trials' : undefined}
          >
            <option value="All">{selectedCategory === 'Insecticide' ? 'All Sub-Categories' : 'N/A'}</option>
            {INSECTICIDE_SUB_CATEGORIES.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>

        {/* Crop Dropdown */}
        <div>
          <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">
            Crop
          </label>
          <select
            value={selectedCrop}
            onChange={(e) => onCropChange(e.target.value)}
            className="w-full px-2.5 py-1.5 text-xs bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:bg-white font-medium"
          >
            <option value="All">All Crops</option>
            {uniqueCrops.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>

        {/* Pest / Weed Dropdown */}
        <div>
          <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">
            Pest / Weed
          </label>
          <select
            value={selectedPest}
            onChange={(e) => onPestChange(e.target.value)}
            className="w-full px-2.5 py-1.5 text-xs bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:bg-white font-medium"
          >
            <option value="All">All Pests / Weeds</option>
            {uniquePests.map((p) => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
        </div>

        {/* Product Dropdown */}
        <div>
          <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">
            Product / Brand
          </label>
          <select
            value={selectedProduct}
            onChange={(e) => onProductChange(e.target.value)}
            className="w-full px-2.5 py-1.5 text-xs bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:bg-white font-medium"
          >
            <option value="All">All Products</option>
            {uniqueProducts.map((pr) => (
              <option key={pr} value={pr}>{pr}</option>
            ))}
          </select>
        </div>

        {/* Field Staff Dropdown */}
        <div>
          <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">
            Field Staff
          </label>
          <select
            value={selectedStaff}
            onChange={(e) => onStaffChange(e.target.value)}
            className="w-full px-2.5 py-1.5 text-xs bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:bg-white font-medium"
          >
            <option value="All">All Field Staff</option>
            {uniqueStaff.map((st) => (
              <option key={st} value={st}>{st}</option>
            ))}
          </select>
        </div>

        {/* Sort Order Toggle */}
        <div>
          <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">
            Conducted Date
          </label>
          <button
            onClick={onToggleSort}
            className="w-full flex items-center justify-between px-2.5 py-1.5 text-xs bg-gray-50 border border-gray-200 rounded-lg hover:bg-gray-100 font-medium text-gray-800 transition-colors"
          >
            <span>{sortOrder === 'desc' ? 'Newest First' : 'Oldest First'}</span>
            <ArrowUpDown className="w-3.5 h-3.5 text-gray-500" />
          </button>
        </div>

      </div>

      {/* Bottom Filter Bar Actions */}
      <div className="flex flex-wrap items-center justify-between pt-2 border-t border-gray-100 gap-2">
        <div className="flex items-center space-x-2 text-xs text-gray-500">
          <span>Found <strong className="text-gray-900">{totalFilteredCount}</strong> matching trials</span>
          {hasActiveFilters && (
            <button
              onClick={onResetFilters}
              className="inline-flex items-center gap-1 text-emerald-700 hover:text-emerald-900 font-semibold ml-2"
            >
              <RotateCcw className="w-3 h-3" /> Reset Filters
            </button>
          )}
        </div>

        <div className="flex items-center space-x-2">
          {/* Quick Download Excel for current filter (with / without Standard) */}
          <ExportMenu
            disabled={totalFilteredCount === 0}
            title={
              totalFilteredCount === 0
                ? 'No trials match the current filters'
                : 'Download Excel for the current filter results (Overview + matching station sheets)'
            }
            className="flex items-center space-x-1.5 px-3 py-1.5 text-xs font-bold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 rounded-lg border border-emerald-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            options={[
              {
                label: 'With Standard column',
                description: 'Include the Standard / Check column',
                onSelect: () => onDownloadCurrentExcel(true),
              },
              {
                label: 'Without Standard column',
                description: 'Exclude the Standard / Check column',
                onSelect: () => onDownloadCurrentExcel(false),
              },
            ]}
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-700" />
            <span>
              {selectedStation === 'All'
                ? `Download Excel (${totalFilteredCount})`
                : `Download ${selectedStation} Excel (${totalFilteredCount})`}
            </span>
          </ExportMenu>

          {/* Quick Print Report (with / without Standard) */}
          <ExportMenu
            title="Print-friendly station report"
            className="flex items-center space-x-1.5 px-3 py-1.5 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg border border-slate-200 transition-colors"
            options={[
              {
                label: 'With Standard column',
                description: 'Include the Standard / Check column',
                onSelect: () => onPrintCurrentReport(true),
              },
              {
                label: 'Without Standard column',
                description: 'Exclude the Standard / Check column',
                onSelect: () => onPrintCurrentReport(false),
              },
            ]}
          >
            <Printer className="w-3.5 h-3.5 text-slate-600" />
            <span>
              {selectedStation === 'All' ? 'Print Station Report' : `Print ${selectedStation} Report`}
            </span>
          </ExportMenu>
        </div>
      </div>

    </div>
  );
};
