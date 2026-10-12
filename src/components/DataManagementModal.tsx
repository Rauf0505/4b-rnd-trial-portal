import React, { useRef } from 'react';
import { Trial, STATIONS } from '../types/trial';
import { 
  Database, 
  RotateCcw, 
  Download, 
  Upload, 
  X, 
  CheckCircle2, 
  AlertTriangle 
} from 'lucide-react';

interface DataManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  trials: Trial[];
  legacyAvailable?: boolean;
  onResetSeedData: () => void;
  onImportData: (importedTrials: Trial[]) => void;
  onMigrateLocalData: () => void;
}

export const DataManagementModal: React.FC<DataManagementModalProps> = ({
  isOpen,
  onClose,
  trials,
  legacyAvailable = false,
  onResetSeedData,
  onImportData,
  onMigrateLocalData,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleExportJSON = () => {
    const jsonStr = JSON.stringify(trials, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `4B_RD_Trials_Backup_${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        if (Array.isArray(parsed)) {
          onImportData(parsed);
          alert('Database restored successfully from JSON backup!');
          onClose();
        } else {
          alert('Invalid JSON structure: Expected an array of trials.');
        }
      } catch (err) {
        alert('Failed to parse JSON file.');
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 print-hide">
      <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 p-6 space-y-5">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-gray-100">
          <div className="flex items-center space-x-2.5">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-gray-900">Database Management</h3>
              <p className="text-xs text-gray-500">Persistent storage backup, restore & sample data</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Database Status */}
        <div className="bg-gray-50 rounded-xl p-3.5 border border-gray-200 text-xs space-y-1.5">
          <div className="flex justify-between text-gray-600">
            <span>Total Stored Trials:</span>
            <strong className="text-gray-900">{trials.length} records</strong>
          </div>
          <div className="flex justify-between text-gray-600">
            <span>Storage Mechanism:</span>
            <strong className="text-emerald-700 font-semibold">Supabase (Cloud PostgreSQL)</strong>
          </div>
          <div className="pt-2 border-t border-gray-200 grid grid-cols-4 gap-1 text-center font-medium">
            {STATIONS.map((st) => (
              <div key={st} className="bg-white p-1 rounded border border-gray-200">
                <span className="text-[10px] text-gray-500 block">{st}</span>
                <span className="font-bold text-emerald-800">
                  {trials.filter((t) => t.station === st).length}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className="space-y-3">
          
          {/* JSON Export */}
          <button
            onClick={handleExportJSON}
            className="w-full flex items-center justify-between px-4 py-2.5 bg-gray-50 hover:bg-gray-100 rounded-xl border border-gray-200 text-xs font-semibold text-gray-800 transition-colors"
          >
            <div className="flex items-center space-x-2">
              <Download className="w-4 h-4 text-emerald-600" />
              <span>Export Full Database to JSON</span>
            </div>
            <span className="text-[10px] text-gray-400">Download Backup</span>
          </button>

          {/* JSON Import */}
          <button
            onClick={() => fileInputRef.current?.click()}
            className="w-full flex items-center justify-between px-4 py-2.5 bg-gray-50 hover:bg-gray-100 rounded-xl border border-gray-200 text-xs font-semibold text-gray-800 transition-colors"
          >
            <div className="flex items-center space-x-2">
              <Upload className="w-4 h-4 text-emerald-600" />
              <span>Import & Restore from JSON Backup</span>
            </div>
            <span className="text-[10px] text-gray-400">Upload File</span>
          </button>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileUpload}
            accept=".json"
            className="hidden"
          />

          {/* Migrate legacy local data */}
          {legacyAvailable && (
            <div className="pt-2 border-t border-gray-100">
              <button
                onClick={() => {
                  if (
                    window.confirm(
                      'Migrate the trials stored in this browser (from the previous version) into Supabase? This replaces current database contents.'
                    )
                  ) {
                    onMigrateLocalData();
                    onClose();
                  }
                }}
                className="w-full flex items-center justify-center space-x-2 px-4 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 rounded-xl border border-emerald-200 text-xs font-bold transition-colors"
              >
                <Database className="w-4 h-4 text-emerald-600" />
                <span>Migrate Legacy Local Data into Supabase</span>
              </button>
            </div>
          )}

          {/* Reset to Seed Data */}
          <div className="pt-2 border-t border-gray-100">
            <button
              onClick={() => {
                if (window.confirm('Reset database to realistic factory sample trials?')) {
                  onResetSeedData();
                  onClose();
                }
              }}
              className="w-full flex items-center justify-center space-x-2 px-4 py-2 bg-amber-50 hover:bg-amber-100 text-amber-800 rounded-xl border border-amber-200 text-xs font-bold transition-colors"
            >
              <RotateCcw className="w-4 h-4 text-amber-600" />
              <span>Reload Realistic Sample Trials (All 4 Stations)</span>
            </button>
          </div>
        </div>

        <div className="flex justify-end pt-2">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-gray-600 hover:text-gray-800 bg-gray-100 hover:bg-gray-200 rounded-xl"
          >
            Done
          </button>
        </div>

      </div>
    </div>
  );
};
