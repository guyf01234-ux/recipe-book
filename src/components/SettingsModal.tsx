'use client';

import React, { useState, useEffect } from 'react';
import {
  X,
  Settings as SettingsIcon,
  Sparkles,
  Check,
  Info,
  Cpu,
  Salad,
  Loader2,
  Play,
  RotateCcw,
} from 'lucide-react';
import { NutritionSettings, DEFAULT_NUTRITION_SETTINGS } from '@/types';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSettingsSaved?: (nutritionSettings: NutritionSettings) => void;
  onBatchNutritionComplete?: () => void;
}

interface PresetModel {
  id: string;
  name: string;
  recommended?: boolean;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  onSettingsSaved,
  onBatchNutritionComplete,
}) => {
  const [activeTab, setActiveTab] = useState<'ai' | 'nutrition' | 'batch'>('nutrition');
  const [activeModel, setActiveModel] = useState('gemini-3.7-flash');
  const [customModel, setCustomModel] = useState('');
  const [isCustom, setIsCustom] = useState(false);
  const [presets, setPresets] = useState<PresetModel[]>([]);
  const [nutritionSettings, setNutritionSettings] = useState<NutritionSettings>(DEFAULT_NUTRITION_SETTINGS);
  const [loading, setLoading] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Batch nutrition processing state
  const [isBatchRunning, setIsBatchRunning] = useState(false);
  const [batchProgress, setBatchProgress] = useState<{
    processed: number;
    remaining: number;
    currentTitle?: string;
  } | null>(null);
  const [batchLog, setBatchLog] = useState<string[]>([]);

  useEffect(() => {
    if (isOpen) {
      fetchSettings();
    }
  }, [isOpen]);

  const fetchSettings = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/settings');
      const data = await res.json();
      if (res.ok) {
        setActiveModel(data.model);
        setPresets(data.presetModels || []);
        if (data.nutritionSettings) {
          setNutritionSettings(data.nutritionSettings);
        }
        const isPreset = data.presetModels?.some((p: PresetModel) => p.id === data.model);
        if (!isPreset) {
          setIsCustom(true);
          setCustomModel(data.model);
        } else {
          setIsCustom(false);
          setCustomModel('');
        }
      }
    } catch (err: any) {
      setError('לא הצלחנו לטעון את ההגדרות');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    const selected = isCustom ? customModel.trim() : activeModel;
    if (!selected) {
      setError('נא להזין או לבחור מודל');
      return;
    }

    setLoading(true);
    setError(null);
    setSavedSuccess(false);

    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: selected,
          nutritionSettings,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'שגיאה בשמירת ההגדרות');
      }

      setSavedSuccess(true);
      if (onSettingsSaved) {
        onSettingsSaved(nutritionSettings);
      }
      setTimeout(() => {
        setSavedSuccess(false);
      }, 2000);
    } catch (err: any) {
      setError(err.message || 'שגיאה בשמירת ההגדרות');
    } finally {
      setLoading(false);
    }
  };

  const handleResetNutritionDefaults = () => {
    setNutritionSettings(DEFAULT_NUTRITION_SETTINGS);
  };

  const handleStartBatchNutrition = async () => {
    setIsBatchRunning(true);
    setBatchLog([]);
    setError(null);

    let keepRunning = true;
    let totalProcessed = 0;

    try {
      while (keepRunning) {
        const res = await fetch('/api/nutrition/batch', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            limit: 5,
            onlyMissing: true,
            modelOverride: isCustom ? customModel.trim() : activeModel,
          }),
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'שגיאה בעיבוד אצווה');

        const { processedCount, remainingMissing, results } = data;
        totalProcessed += processedCount;

        if (Array.isArray(results)) {
          for (const r of results) {
            setBatchLog((prev) => [
              `✓ ${r.title}: ${r.status === 'success' ? `${r.nutrition?.caloriesPerServing} קק״ל, ${r.nutrition?.proteinGrams}g חלבון` : 'שגיאה'}`,
              ...prev.slice(0, 30),
            ]);
          }
        }

        setBatchProgress({
          processed: totalProcessed,
          remaining: remainingMissing,
        });

        if (processedCount === 0 || remainingMissing === 0) {
          keepRunning = false;
        }

        // Delay between chunks
        await new Promise((r) => setTimeout(r, 1000));
      }

      if (onBatchNutritionComplete) {
        onBatchNutritionComplete();
      }
    } catch (err: any) {
      console.error('Batch calculation failed:', err);
      setError(err.message || 'שגיאה בחישוב ערכים תזונתיים באצווה');
    } finally {
      setIsBatchRunning(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 modal-overlay">
      <div className="bg-white rounded-2xl w-full max-w-xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center">
              <SettingsIcon className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">הגדרות אפליקציה וערכים תזונתיים</h2>
              <p className="text-xs text-slate-500">התאמת קריטריוני תזונה, דגמי AI וכלי סריקה</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="px-6 pt-2 bg-slate-50/70 border-b border-slate-200 flex items-center gap-2">
          <button
            onClick={() => setActiveTab('nutrition')}
            className={`flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold border-b-2 transition ${
              activeTab === 'nutrition'
                ? 'border-emerald-600 text-emerald-800 bg-white rounded-t-xl'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            <Salad className="w-3.5 h-3.5 text-emerald-600" />
            <span>קטגוריות ערכים תזונתיים</span>
          </button>

          <button
            onClick={() => setActiveTab('batch')}
            className={`flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold border-b-2 transition ${
              activeTab === 'batch'
                ? 'border-amber-600 text-amber-900 bg-white rounded-t-xl'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-600" />
            <span>סריקה וחישוב לכל הספר</span>
          </button>

          <button
            onClick={() => setActiveTab('ai')}
            className={`flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold border-b-2 transition ${
              activeTab === 'ai'
                ? 'border-purple-600 text-purple-900 bg-white rounded-t-xl'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            <Cpu className="w-3.5 h-3.5 text-purple-600" />
            <span>מודל AI (Gemini)</span>
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-6 overflow-y-auto flex-1">
          {error && (
            <div className="p-3 bg-red-50 text-red-700 rounded-xl text-xs border border-red-200">
              {error}
            </div>
          )}

          {savedSuccess && (
            <div className="p-3 bg-emerald-50 text-emerald-800 rounded-xl text-xs border border-emerald-200 flex items-center gap-2">
              <Check className="w-4 h-4 text-emerald-600" />
              <span>ההגדרות נשמרו בהצלחה!</span>
            </div>
          )}

          {/* TAB 1: NUTRITION DEFINITIONS */}
          {activeTab === 'nutrition' && (
            <div className="space-y-4">
              <div className="bg-emerald-50/60 p-3 rounded-xl border border-emerald-100 text-xs text-emerald-950">
                <div className="font-bold mb-1 flex items-center gap-1.5">
                  <Info className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>התאמה אישית של הגדרות הקטגוריות התזונתיות</span>
                </div>
                <p className="text-emerald-900/90 leading-relaxed text-[11px]">
                  כאן תוכל לקבוע את ערכי הסף עבור התגיות והכפתורים באפליקציה. תוכל לעדכן אותם בכל עת (למשל: לשנות חלבון גבוה מ-25g ל-50g), וכל המתכונים יתמיינו ויתויגו לפי הערכים החדשים!
                </p>
              </div>

              {/* Form Controls */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {/* High Protein */}
                <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                      <span>💪</span>
                      <span>עשיר בחלבון</span>
                    </label>
                    <span className="text-[10px] text-emerald-700 font-bold bg-emerald-100 px-1.5 py-0.5 rounded">
                      לפחות
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min={1}
                      max={200}
                      value={nutritionSettings.highProteinMin}
                      onChange={(e) =>
                        setNutritionSettings({
                          ...nutritionSettings,
                          highProteinMin: Number(e.target.value) || 0,
                        })
                      }
                      className="w-20 px-2.5 py-1.5 bg-white border border-slate-300 rounded-xl text-center font-bold text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                    />
                    <span className="text-xs text-slate-500 font-medium">גרם חלבון למנה</span>
                  </div>
                </div>

                {/* Low Calorie */}
                <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                      <span>🥗</span>
                      <span>דל קלוריות</span>
                    </label>
                    <span className="text-[10px] text-amber-800 font-bold bg-amber-100 px-1.5 py-0.5 rounded">
                      עד
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min={50}
                      max={2000}
                      value={nutritionSettings.lowCalorieMax}
                      onChange={(e) =>
                        setNutritionSettings({
                          ...nutritionSettings,
                          lowCalorieMax: Number(e.target.value) || 0,
                        })
                      }
                      className="w-20 px-2.5 py-1.5 bg-white border border-slate-300 rounded-xl text-center font-bold text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                    />
                    <span className="text-xs text-slate-500 font-medium">קלוריות (קק״ל) למנה</span>
                  </div>
                </div>

                {/* Low Carb */}
                <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                      <span>🥑</span>
                      <span>דל פחמימות / קטו</span>
                    </label>
                    <span className="text-[10px] text-indigo-700 font-bold bg-indigo-100 px-1.5 py-0.5 rounded">
                      עד
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min={1}
                      max={200}
                      value={nutritionSettings.lowCarbMax}
                      onChange={(e) =>
                        setNutritionSettings({
                          ...nutritionSettings,
                          lowCarbMax: Number(e.target.value) || 0,
                        })
                      }
                      className="w-20 px-2.5 py-1.5 bg-white border border-slate-300 rounded-xl text-center font-bold text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                    />
                    <span className="text-xs text-slate-500 font-medium">גרם פחמימות למנה</span>
                  </div>
                </div>

                {/* High Fiber */}
                <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                      <span>🌾</span>
                      <span>עשיר בסיבים</span>
                    </label>
                    <span className="text-[10px] text-orange-800 font-bold bg-orange-100 px-1.5 py-0.5 rounded">
                      לפחות
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min={1}
                      max={50}
                      value={nutritionSettings.highFiberMin}
                      onChange={(e) =>
                        setNutritionSettings({
                          ...nutritionSettings,
                          highFiberMin: Number(e.target.value) || 0,
                        })
                      }
                      className="w-20 px-2.5 py-1.5 bg-white border border-slate-300 rounded-xl text-center font-bold text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20"
                    />
                    <span className="text-xs text-slate-500 font-medium">גרם סיבים למנה</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between pt-2">
                <button
                  type="button"
                  onClick={handleResetNutritionDefaults}
                  className="text-xs text-slate-500 hover:text-slate-700 flex items-center gap-1"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>איפוס לברירות מחדל (חלבון 25g, קלוריות 400, פחמימות 15g)</span>
                </button>
              </div>
            </div>
          )}

          {/* TAB 2: BATCH SCANNER */}
          {activeTab === 'batch' && (
            <div className="space-y-4">
              <div className="bg-amber-50/70 p-4 rounded-2xl border border-amber-200 text-xs text-amber-950 space-y-2">
                <div className="font-bold flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-amber-600" />
                  <span>סריקה וחישוב ערכים תזונתיים לכל הספר</span>
                </div>
                <p className="leading-relaxed text-[11px] text-amber-900">
                  הכלי יסרוק את כל המתכונים בספר שעדיין לא חושבו להם ערכים תזונתיים, ויחשב באמצעות AI את כמות הקלוריות, החלבון, הפחמימות והשומן עבור כל מתכון.
                </p>
              </div>

              {batchProgress && (
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-2">
                  <div className="flex items-center justify-between text-xs font-bold text-slate-800">
                    <span>התקדמות סריקה:</span>
                    <span>עובדו {batchProgress.processed} מתכונים (נותרו {batchProgress.remaining})</span>
                  </div>

                  <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
                    <div
                      className="bg-emerald-500 h-2 rounded-full transition-all duration-300"
                      style={{
                        width: `${Math.min(
                          100,
                          (batchProgress.processed /
                            Math.max(1, batchProgress.processed + batchProgress.remaining)) *
                            100
                        )}%`,
                      }}
                    />
                  </div>
                </div>
              )}

              {batchLog.length > 0 && (
                <div className="p-3 bg-slate-900 text-slate-100 rounded-xl font-mono text-[11px] max-h-40 overflow-y-auto space-y-1">
                  {batchLog.map((log, idx) => (
                    <div key={idx}>{log}</div>
                  ))}
                </div>
              )}

              <button
                type="button"
                onClick={handleStartBatchNutrition}
                disabled={isBatchRunning}
                className="w-full py-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-bold text-sm rounded-xl shadow-md transition flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isBatchRunning ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>מחשב ערכים תזונתיים באצווה...</span>
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4 fill-white" />
                    <span>הפעל חישוב ערכים תזונתיים לכל הספר</span>
                  </>
                )}
              </button>
            </div>
          )}

          {/* TAB 3: AI MODEL SELECTION */}
          {activeTab === 'ai' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <Cpu className="w-4 h-4 text-purple-600" />
                  גרסת מודל Gemini
                </label>
                <span className="text-[11px] text-slate-400">מתעדכן מיידית לכל הפעולות</span>
              </div>

              {/* Preset selection list */}
              <div className="space-y-2">
                {presets.map((p) => {
                  const isSelected = !isCustom && activeModel === p.id;
                  return (
                    <div
                      key={p.id}
                      onClick={() => {
                        setIsCustom(false);
                        setActiveModel(p.id);
                      }}
                      className={`p-3.5 rounded-2xl border cursor-pointer transition flex items-center justify-between ${
                        isSelected
                          ? 'border-purple-500 bg-purple-50/50 text-purple-950 font-semibold'
                          : 'border-slate-200 hover:border-slate-300 text-slate-700'
                      }`}
                    >
                      <div className="flex flex-col">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-mono">{p.name}</span>
                          {p.recommended && (
                            <span className="text-[10px] bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full font-bold">
                              מומלץ
                            </span>
                          )}
                        </div>
                      </div>
                      <div
                        className={`w-5 h-5 rounded-full border flex items-center justify-center ${
                          isSelected ? 'border-purple-600 bg-purple-600 text-white' : 'border-slate-300'
                        }`}
                      >
                        {isSelected && <Check className="w-3 h-3" />}
                      </div>
                    </div>
                  );
                })}

                {/* Custom Model Choice */}
                <div
                  onClick={() => setIsCustom(true)}
                  className={`p-3.5 rounded-2xl border cursor-pointer transition ${
                    isCustom
                      ? 'border-purple-500 bg-purple-50/50 text-purple-950'
                      : 'border-slate-200 hover:border-slate-300 text-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold">הזנה חופשית (מודל עתידי)</span>
                    </div>
                    <div
                      className={`w-5 h-5 rounded-full border flex items-center justify-center ${
                        isCustom ? 'border-purple-600 bg-purple-600 text-white' : 'border-slate-300'
                      }`}
                    >
                      {isCustom && <Check className="w-3 h-3" />}
                    </div>
                  </div>

                  {isCustom && (
                    <div className="mt-2" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="text"
                        value={customModel}
                        onChange={(e) => setCustomModel(e.target.value)}
                        placeholder="לדוגמה: gemini-3.7-pro"
                        className="w-full px-3 py-2 text-xs border border-purple-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 font-mono bg-white"
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-between bg-slate-50/50">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-800 transition"
          >
            סגור
          </button>

          <button
            onClick={handleSave}
            disabled={loading || isBatchRunning}
            className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 shadow-sm transition disabled:opacity-50"
          >
            {loading ? 'שומר...' : 'שמור הגדרות'}
          </button>
        </div>
      </div>
    </div>
  );
};
