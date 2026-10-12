import React from 'react';
import { Trial } from '../types/trial';
import { AlertTriangle, Trash2, X } from 'lucide-react';

interface DeleteConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  trial: Trial | null;
  onConfirm: () => void;
}

export const DeleteConfirmModal: React.FC<DeleteConfirmModalProps> = ({
  isOpen,
  onClose,
  trial,
  onConfirm,
}) => {
  if (!isOpen || !trial) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 print-hide">
      <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 p-6 space-y-4">
        <div className="w-12 h-12 rounded-2xl bg-red-100 text-red-600 flex items-center justify-center mx-auto">
          <AlertTriangle className="w-6 h-6" />
        </div>

        <div className="text-center">
          <h3 className="text-lg font-bold text-gray-900">Delete Field Trial?</h3>
          <p className="text-xs text-gray-500 mt-1">
            Are you sure you want to delete this trial record from the database? This action cannot be undone.
          </p>
        </div>

        <div className="bg-gray-50 rounded-xl p-3 text-xs border border-gray-200">
          <p className="font-bold text-gray-900">{trial.trialName}</p>
          <p className="text-gray-500 mt-0.5">
            Station: <strong>{trial.station}</strong> &bull; Crop: <strong>{trial.crop}</strong> &bull; Product:{' '}
            <strong>{trial.products[0]?.productName || '—'}</strong>
            {trial.products.length > 1 ? ` (+${trial.products.length - 1} more)` : ''}
          </p>
        </div>

        <div className="flex items-center justify-end space-x-3 pt-2">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={() => {
              onConfirm();
              onClose();
            }}
            className="flex items-center space-x-1.5 px-4 py-2 text-xs font-bold text-white bg-red-600 hover:bg-red-700 rounded-xl shadow-md transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Delete Trial</span>
          </button>
        </div>
      </div>
    </div>
  );
};
