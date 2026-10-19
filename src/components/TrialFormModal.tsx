import React, { useState, useEffect } from 'react';
import {
  Trial,
  TrialProduct,
  Station,
  STATIONS,
  TrialCategory,
  InsecticideSubCategory,
  TRIAL_CATEGORIES,
  INSECTICIDE_SUB_CATEGORIES,
} from '../types/trial';
import { getObservationSchedule, hasHarvestStage, formatSchedule } from '../data/trialCategories';
import type { TrialFormInput } from '../services/trialService';
import { calculateObservationDates, formatDateDisplay, formatISODate } from '../utils/dateUtils';
import {
  X,
  Calendar,
  Sprout,
  Check,
  Building2,
  User,
  MapPin,
  FileText,
  FlaskConical,
  Layers,
  Calculator,
  Plus,
  Trash2,
  Package,
  Loader2,
} from 'lucide-react';
import confetti from 'canvas-confetti';

interface TrialFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (trialData: TrialFormInput) => void | Promise<void>;
  editingTrial?: Trial | null;
  defaultStation?: Station;
  isSaving?: boolean;
  /**
   * Previously used Standard / Check values (from every trial). Rendered as a
   * `<datalist>` so the field works as a dropdown + free text.
   */
  standardOptions?: string[];
}

const COMMON_CROPS = [
  'Cotton', 'Rice', 'Wheat', 'Sugarcane', 'Maize', 'Tomato', 'Potato', 'Chili', 'Mango', 'Citrus', 'Onion', 'Mustard',
];

const COMMON_FORMULATIONS = [
  'EC (Emulsifiable Concentrate)',
  'SC (Suspension Concentrate)',
  'SG (Soluble Granule)',
  'WDG (Water Dispersible Granule)',
  'WP (Wettable Powder)',
  'SL (Soluble Liquid)',
  'FS (Flowable Concentrate for Seed Treatment)',
  'GR (Granule)',
  'OD (Oil Dispersion)',
  'SP (Soluble Powder)',
  'DF (Dry Flowable)',
  'WG (Water Dispersible Granule)',
];

const COMMON_UNITS = [
  'ml/acre',
  'gm/acre',
  'kg/ha',
  'L/ha',
  'gm/100L water',
  'ml/100L water',
  'kg/acre',
];

const emptyProduct = (position: number): TrialProduct => ({
  position,
  productName: '',
  activeIngredient: '',
  formulation: 'SC',
  dose: '',
  unit: 'ml/acre',
  replications: 3,
  applications: 1,
  standard: [],
});

export const TrialFormModal: React.FC<TrialFormModalProps> = ({
  isOpen,
  onClose,
  onSave,
  editingTrial,
  defaultStation = 'Sahiwal',
  isSaving = false,
  standardOptions = [],
}) => {
  const [station, setStation] = useState<Station>(defaultStation);
  const [trialName, setTrialName] = useState('');
  const [category, setCategory] = useState<TrialCategory>('Herbicide');
  const [insecticideSubCategory, setInsecticideSubCategory] = useState<InsecticideSubCategory>('Foliar');
  const [crop, setCrop] = useState('Cotton');
  const [customCrop, setCustomCrop] = useState('');
  const [pestOrWeed, setPestOrWeed] = useState('');
  const [products, setProducts] = useState<TrialProduct[]>([emptyProduct(0)]);
  // Standards / Checks for this trial; each product picks one or more of these.
  const [standards, setStandards] = useState<string[]>([]);
  const [conductedDate, setConductedDate] = useState(formatISODate(new Date()));
  const [harvestStageDate, setHarvestStageDate] = useState('');
  const [fieldLocation, setFieldLocation] = useState('');
  const [fieldStaffName, setFieldStaffName] = useState('');
  const [remarks, setRemarks] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  const schedule = getObservationSchedule(category, insecticideSubCategory);
  const computedDates = calculateObservationDates(conductedDate, schedule);
  const showHarvest = hasHarvestStage(category);

  useEffect(() => {
    if (editingTrial) {
      setStation(editingTrial.station);
      setTrialName(editingTrial.trialName);
      setCategory(editingTrial.category);
      setInsecticideSubCategory(editingTrial.insecticideSubCategory || 'Foliar');
      if (COMMON_CROPS.includes(editingTrial.crop)) {
        setCrop(editingTrial.crop);
        setCustomCrop('');
      } else {
        setCrop('Other');
        setCustomCrop(editingTrial.crop);
      }
      setPestOrWeed(editingTrial.pestOrWeed);
      const editableProducts =
        editingTrial.products.length > 0
          ? editingTrial.products.map((p, i) => ({ ...p, position: i }))
          : [emptyProduct(0)];
      setProducts(editableProducts);
      // Rebuild the standards list from the values saved on the products.
      setStandards(
        Array.from(
          new Set(
            editableProducts
              .flatMap((p) => p.standard ?? [])
              .map((s) => s.trim())
              .filter(Boolean)
          )
        )
      );
      setConductedDate(editingTrial.conductedDate);
      setHarvestStageDate(editingTrial.harvestStageDate || '');
      setFieldLocation(editingTrial.fieldLocation);
      setFieldStaffName(editingTrial.fieldStaffName);
      setRemarks(editingTrial.remarks || '');
      setErrors({});
    } else {
      setStation(defaultStation);
      setTrialName('');
      setCategory('Herbicide');
      setInsecticideSubCategory('Foliar');
      setCrop('Cotton');
      setCustomCrop('');
      setPestOrWeed('');
      setProducts([emptyProduct(0)]);
      setStandards([]);
      setConductedDate(formatISODate(new Date()));
      setHarvestStageDate('');
      setFieldLocation('');
      setFieldStaffName('');
      setRemarks('');
      setErrors({});
    }
  }, [editingTrial, isOpen, defaultStation]);

  if (!isOpen) return null;

  const updateProduct = (index: number, patch: Partial<TrialProduct>) => {
    setProducts((prev) => prev.map((p, i) => (i === index ? { ...p, ...patch } : p)));
  };

  const addProduct = () => setProducts((prev) => [...prev, emptyProduct(prev.length)]);

  const removeProduct = (index: number) =>
    setProducts((prev) =>
      prev.filter((_, i) => i !== index).map((p, i) => ({ ...p, position: i }))
    );

  const addStandard = () => setStandards((prev) => [...prev, '']);

  const updateStandard = (index: number, value: string) =>
    setStandards((prev) => prev.map((s, i) => (i === index ? value : s)));

  const removeStandard = (index: number) => {
    const removed = standards[index];
    setStandards((prev) => prev.filter((_, i) => i !== index));
    // Any product still pointing at the removed standard drops it.
    setProducts((prev) =>
      prev.map((p) => ({ ...p, standard: (p.standard ?? []).filter((s) => s !== removed) }))
    );
  };

  // Clean, de-duplicated options for each product's Standard picker.
  const standardChoices = Array.from(
    new Set(standards.map((s) => s.trim()).filter(Boolean))
  );

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!trialName.trim()) newErrors.trialName = 'Trial name is required';
    if (crop === 'Other' && !customCrop.trim()) newErrors.crop = 'Please specify the crop';
    if (!pestOrWeed.trim()) newErrors.pestOrWeed = 'Target pest or weed is required';
    if (!conductedDate) newErrors.conductedDate = 'Conducted date is required';
    if (!fieldLocation.trim()) newErrors.fieldLocation = 'Field location is required';
    if (!fieldStaffName.trim()) newErrors.fieldStaffName = 'Field staff name is required';
    if (showHarvest && !harvestStageDate) newErrors.harvestStageDate = 'Harvest stage date is required';

    if (products.length === 0) newErrors.products = 'Add at least one product';
    products.forEach((p, i) => {
      if (!p.productName.trim()) newErrors[`product_${i}_name`] = 'Product name is required';
      if (!p.activeIngredient.trim()) newErrors[`product_${i}_ai`] = 'Active ingredient required';
      if (!p.dose || Number(p.dose) <= 0) newErrors[`product_${i}_dose`] = 'Valid dose required';
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    const finalCrop = crop === 'Other' ? customCrop.trim() : crop;

    const payload: TrialFormInput = {
      station,
      trialName: trialName.trim(),
      category,
      insecticideSubCategory: category === 'Insecticide' ? insecticideSubCategory : null,
      crop: finalCrop,
      pestOrWeed: pestOrWeed.trim(),
      products: products.map((p, i) => ({
        ...p,
        position: i,
        standard: (p.standard ?? []).map((s) => s.trim()).filter(Boolean),
      })),
      conductedDate,
      harvestStageDate: showHarvest ? harvestStageDate : null,
      fieldLocation: fieldLocation.trim(),
      fieldStaffName: fieldStaffName.trim(),
      remarks: remarks.trim(),
    };

    try {
      await onSave(payload);
      confetti({ particleCount: 40, spread: 60, origin: { y: 0.8 } });
      onClose();
    } catch {
      // handled by parent
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 print-hide">
      <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 w-full max-w-4xl overflow-hidden animate-in fade-in zoom-in-95 my-4">
        {/* Modal Header */}
        <div className="bg-emerald-800 text-white px-5 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="w-9 h-9 rounded-lg bg-emerald-700 flex items-center justify-center text-emerald-200">
              <Sprout className="w-5 h-5 text-emerald-300" />
            </div>
            <div>
              <h3 className="font-bold text-base sm:text-lg">
                {editingTrial ? 'Edit R&D Field Trial' : 'Add New Field Trial'}
              </h3>
              <p className="text-xs text-emerald-200/80">
                4B R&D Trial Portal • category-driven schedules &amp; multi-product entry
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close trial form"
            className="w-8 h-8 rounded-lg bg-emerald-900/50 hover:bg-emerald-700 text-emerald-200 hover:text-white flex items-center justify-center transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-5 max-h-[80vh] overflow-y-auto">
          {/* Station / Trial name / Category */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1 flex items-center gap-1">
                <Building2 className="w-3.5 h-3.5 text-emerald-600" />
                Station <span className="text-red-500">*</span>
              </label>
              <select
                value={station}
                onChange={(e) => setStation(e.target.value as Station)}
                className="w-full px-3 py-2 text-sm bg-white border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500 font-semibold text-emerald-950"
              >
                {STATIONS.map((st) => (
                  <option key={st} value={st}>{st} Station</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1 flex items-center gap-1">
                <Package className="w-3.5 h-3.5 text-emerald-600" />
                Trial Category <span className="text-red-500">*</span>
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as TrialCategory)}
                className="w-full px-3 py-2 text-sm bg-white border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500 font-semibold text-emerald-950"
              >
                {TRIAL_CATEGORIES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1 flex items-center gap-1">
                <Layers className="w-3.5 h-3.5 text-emerald-600" />
                Sub-Category
              </label>
              <select
                value={insecticideSubCategory}
                disabled={category !== 'Insecticide'}
                onChange={(e) => setInsecticideSubCategory(e.target.value as InsecticideSubCategory)}
                className="w-full px-3 py-2 text-sm bg-white border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500 font-semibold text-emerald-950 disabled:opacity-50 disabled:cursor-not-allowed"
                title={category !== 'Insecticide' ? 'Only applies to Insecticide trials' : undefined}
              >
                {INSECTICIDE_SUB_CATEGORIES.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                Trial Name / Title <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                placeholder="e.g. Bio-efficacy of Emamectin on Spodoptera"
                value={trialName}
                onChange={(e) => setTrialName(e.target.value)}
                className={`w-full px-3 py-2 text-sm border rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none ${
                  errors.trialName ? 'border-red-400 bg-red-50' : 'border-gray-300'
                }`}
              />
              {errors.trialName && <p className="text-[11px] text-red-600 mt-0.5">{errors.trialName}</p>}
            </div>
          </div>

          {/* Crop & target */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 bg-gray-50/70 p-3.5 rounded-xl border border-gray-200/80">
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                Crop <span className="text-red-500">*</span>
              </label>
              <div className="flex gap-2">
                <select
                  value={crop}
                  onChange={(e) => setCrop(e.target.value)}
                  className="flex-1 px-3 py-2 text-sm bg-white border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500"
                >
                  {COMMON_CROPS.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                  <option value="Other">Other (Custom)</option>
                </select>
                {crop === 'Other' && (
                  <input
                    type="text"
                    placeholder="Enter crop"
                    value={customCrop}
                    onChange={(e) => setCustomCrop(e.target.value)}
                    className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500"
                  />
                )}
              </div>
              {errors.crop && <p className="text-[11px] text-red-600 mt-0.5">{errors.crop}</p>}
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                Target Pest / Weed / Disease <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                placeholder="e.g. Pink Bollworm, Whitefly, Phalaris minor"
                value={pestOrWeed}
                onChange={(e) => setPestOrWeed(e.target.value)}
                className={`w-full px-3 py-2 text-sm border rounded-xl focus:ring-2 focus:ring-emerald-500 ${
                  errors.pestOrWeed ? 'border-red-400 bg-red-50' : 'border-gray-300'
                }`}
              />
              {errors.pestOrWeed && <p className="text-[11px] text-red-600 mt-0.5">{errors.pestOrWeed}</p>}
            </div>
          </div>

          {/* Products repeater */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <FlaskConical className="w-4 h-4 text-emerald-600" />
                <h4 className="text-sm font-bold text-gray-800">Products in this Trial</h4>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                  {products.length}
                </span>
              </div>
              <button
                type="button"
                onClick={addProduct}
                className="flex items-center space-x-1 px-3 py-1.5 text-xs font-bold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 rounded-lg border border-emerald-200"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Product</span>
              </button>
            </div>
            {errors.products && <p className="text-[11px] text-red-600">{errors.products}</p>}

            {/* Standards / Checks — each product picks one or more below */}
            <div className="border border-emerald-200 rounded-xl p-3.5 bg-emerald-50/40 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <label className="text-xs font-bold text-gray-700 uppercase tracking-wider">
                  Standards / Checks{' '}
                  <span className="text-gray-400 font-medium normal-case tracking-normal">
                    (products pick one or more)
                  </span>
                </label>
                <button
                  type="button"
                  onClick={addStandard}
                  aria-label="Add Standard"
                  className="flex items-center space-x-1 px-3 py-1.5 text-xs font-bold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 rounded-lg border border-emerald-200 whitespace-nowrap"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Standard</span>
                </button>
              </div>

              {standards.length === 0 ? (
                <p className="text-[11px] text-gray-500">
                  No standards added yet. Use <span className="font-semibold">Add Standard</span>,
                  then assign one to each product.
                </p>
              ) : (
                standards.map((value, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <input
                      type="text"
                      list="trial-standard-options"
                      aria-label={`Standard #${index + 1}`}
                      placeholder="e.g. Untreated Control, or a reference product"
                      value={value}
                      onChange={(e) => updateStandard(index, e.target.value)}
                      className="flex-1 min-w-0 px-3 py-2 text-sm border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500"
                    />
                    <button
                      type="button"
                      onClick={() => removeStandard(index)}
                      aria-label={`Remove Standard #${index + 1}`}
                      className="p-2 text-red-600 hover:text-red-800 hover:bg-red-50 rounded-lg"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))
              )}
              <datalist id="trial-standard-options">
                {standardOptions.map((s) => (
                  <option key={s} value={s} />
                ))}
              </datalist>
            </div>

            {products.map((product, index) => (
              <div key={index} className="border border-gray-200 rounded-xl p-3.5 bg-gray-50/50 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                    Product #{index + 1}
                  </span>
                  {products.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeProduct(index)}
                      className="flex items-center space-x-1 text-[11px] font-semibold text-red-600 hover:text-red-800"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Remove</span>
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                      Product / Brand <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Proclaim 05 SG"
                      value={product.productName}
                      onChange={(e) => updateProduct(index, { productName: e.target.value })}
                      className={`w-full px-3 py-2 text-sm border rounded-xl focus:ring-2 focus:ring-emerald-500 ${
                        errors[`product_${index}_name`] ? 'border-red-400 bg-red-50' : 'border-gray-300'
                      }`}
                    />
                    {errors[`product_${index}_name`] && (
                      <p className="text-[11px] text-red-600 mt-0.5">{errors[`product_${index}_name`]}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                      Active Ingredient <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Emamectin Benzoate"
                      value={product.activeIngredient}
                      onChange={(e) => updateProduct(index, { activeIngredient: e.target.value })}
                      className={`w-full px-3 py-2 text-sm border rounded-xl focus:ring-2 focus:ring-emerald-500 ${
                        errors[`product_${index}_ai`] ? 'border-red-400 bg-red-50' : 'border-gray-300'
                      }`}
                    />
                    {errors[`product_${index}_ai`] && (
                      <p className="text-[11px] text-red-600 mt-0.5">{errors[`product_${index}_ai`]}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                      Formulation
                    </label>
                    <select
                      value={product.formulation}
                      onChange={(e) => updateProduct(index, { formulation: e.target.value })}
                      className="w-full px-3 py-2 text-sm bg-white border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500"
                    >
                      {COMMON_FORMULATIONS.map((f) => (
                        <option key={f} value={f.split(' ')[0]}>{f}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                      Dose <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      step="any"
                      placeholder="100"
                      value={product.dose}
                      onChange={(e) => updateProduct(index, { dose: e.target.value })}
                      className={`w-full px-3 py-2 text-sm border rounded-xl focus:ring-2 focus:ring-emerald-500 ${
                        errors[`product_${index}_dose`] ? 'border-red-400 bg-red-50' : 'border-gray-300'
                      }`}
                    />
                    {errors[`product_${index}_dose`] && (
                      <p className="text-[11px] text-red-600 mt-0.5">{errors[`product_${index}_dose`]}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                      Unit
                    </label>
                    <select
                      value={product.unit}
                      onChange={(e) => updateProduct(index, { unit: e.target.value })}
                      className="w-full px-3 py-2 text-sm bg-white border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500"
                    >
                      {COMMON_UNITS.map((u) => (
                        <option key={u} value={u}>{u}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                      Replications
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="10"
                      value={product.replications}
                      onChange={(e) => updateProduct(index, { replications: Number(e.target.value) })}
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                      Applications
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="5"
                      value={product.applications}
                      onChange={(e) => updateProduct(index, { applications: Number(e.target.value) })}
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                    Standard / Check{' '}
                    <span className="text-gray-400 font-medium normal-case tracking-normal">
                      (optional)
                    </span>
                  </label>
                  <select
                    multiple
                    size={Math.min(Math.max(standardChoices.length, 3), 6)}
                    aria-label={`Standard for Product #${index + 1}`}
                    value={product.standard}
                    onChange={(e) =>
                      updateProduct(index, {
                        standard: Array.from(e.target.selectedOptions, (o) => o.value),
                      })
                    }
                    className="w-full px-3 py-2 text-sm bg-white border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500"
                  >
                    {/* Keep saved values that are no longer in the list selectable. */}
                    {product.standard
                      .filter((s) => !standardChoices.includes(s))
                      .map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    {standardChoices.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                  <p className="mt-1 text-[10px] text-gray-400">
                    Ctrl/Cmd-click to select more than one
                  </p>
                </div>

              </div>
            ))}
          </div>

          {/* Conducted Date + dynamic schedule preview */}
          <div className="bg-emerald-50/70 border border-emerald-200 rounded-2xl p-4 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center space-x-2">
                <Calendar className="w-5 h-5 text-emerald-700" />
                <div>
                  <h4 className="text-xs font-bold text-emerald-900 uppercase tracking-wider">
                    Trial Conducted Date <span className="text-red-500">*</span>
                  </h4>
                  <p className="text-[11px] text-emerald-700">
                    Observation dates auto-calculated from the selected category
                  </p>
                </div>
              </div>
              <input
                type="date"
                value={conductedDate}
                onChange={(e) => setConductedDate(e.target.value)}
                className="px-3 py-2 text-sm border border-emerald-300 rounded-xl bg-white font-bold text-emerald-950 focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div className="pt-2 border-t border-emerald-200/80">
              <div className="flex items-center space-x-1.5 text-xs font-bold text-emerald-900 mb-2">
                <Calculator className="w-3.5 h-3.5 text-emerald-600" />
                <span>Schedule for {category === 'Insecticide' ? `Insecticide (${insecticideSubCategory})` : category}:</span>
                <span className="text-emerald-700 font-semibold">{formatSchedule(schedule)}</span>
              </div>
              <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-7 gap-2 text-center">
                {schedule.map((day) => (
                  <div key={day} className="bg-white rounded-xl p-2 border border-emerald-200/90 shadow-2xs">
                    <span className="text-[11px] font-bold text-emerald-800 block">{day} DAA</span>
                    <span className="text-[11px] font-extrabold text-gray-900">
                      {formatDateDisplay(computedDates[day])}
                    </span>
                    <span className="text-[9px] text-gray-500 block">+{day} Days</span>
                  </div>
                ))}
              </div>
            </div>

            {showHarvest && (
              <div className="pt-2 border-t border-emerald-200/80 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <div>
                  <div className="text-xs font-bold text-emerald-900 uppercase tracking-wider">
                    Harvesting Stage Date <span className="text-red-500">*</span>
                  </div>
                  <p className="text-[11px] text-emerald-700">Entered manually for Fertilizer / Growth trials</p>
                </div>
                <input
                  type="date"
                  value={harvestStageDate}
                  onChange={(e) => setHarvestStageDate(e.target.value)}
                  className={`px-3 py-2 text-sm border rounded-xl bg-white font-bold text-emerald-950 focus:ring-2 focus:ring-emerald-500 ${
                    errors.harvestStageDate ? 'border-red-400 bg-red-50' : 'border-emerald-300'
                  }`}
                />
              </div>
            )}
          </div>

          {/* Location & Staff */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1 flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-emerald-600" />
                Field / Farm Location <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                placeholder="e.g. Chak 84/9L, Research Farm Block C"
                value={fieldLocation}
                onChange={(e) => setFieldLocation(e.target.value)}
                className={`w-full px-3 py-2 text-sm border rounded-xl focus:ring-2 focus:ring-emerald-500 ${
                  errors.fieldLocation ? 'border-red-400 bg-red-50' : 'border-gray-300'
                }`}
              />
              {errors.fieldLocation && <p className="text-[11px] text-red-600 mt-0.5">{errors.fieldLocation}</p>}
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1 flex items-center gap-1">
                <User className="w-3.5 h-3.5 text-emerald-600" />
                Field Staff Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                placeholder="e.g. Muhammad Arslan, Field Officer"
                value={fieldStaffName}
                onChange={(e) => setFieldStaffName(e.target.value)}
                className={`w-full px-3 py-2 text-sm border rounded-xl focus:ring-2 focus:ring-emerald-500 ${
                  errors.fieldStaffName ? 'border-red-400 bg-red-50' : 'border-gray-300'
                }`}
              />
              {errors.fieldStaffName && <p className="text-[11px] text-red-600 mt-0.5">{errors.fieldStaffName}</p>}
            </div>
          </div>

          {/* Remarks */}
          <div>
            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1 flex items-center gap-1">
              <FileText className="w-3.5 h-3.5 text-emerald-600" />
              Remarks / Field Conditions
            </label>
            <textarea
              rows={2}
              placeholder="e.g. Weather sunny, 32°C. Pre-spray pest count recorded at 6 larvae/leaf."
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500 resize-none"
            />
          </div>

          {/* Actions */}
          <div className="pt-3 border-t border-gray-100 flex items-center justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-semibold text-gray-600 hover:text-gray-800 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="flex items-center space-x-2 px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm rounded-xl shadow-md transition-all active:scale-95 disabled:opacity-60"
            >
              {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4 stroke-[3]" />}
              <span>{editingTrial ? 'Update Trial' : 'Save & Submit Trial'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
