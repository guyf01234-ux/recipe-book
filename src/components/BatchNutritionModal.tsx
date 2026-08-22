'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Salad,
  Sparkles,
  Play,
  Pause,
  RotateCcw,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Cpu,
  Check,
  Plus,
  RefreshCw,
  Info,
} from 'lucide-react';
import { Recipe, NutritionSettings, DEFAULT_NUTRITION_SETTINGS } from '@/types';
import { PRESET_MODELS } from '@/lib/gemini';

interface BatchNutritionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: () => void;
  nutritionSettings?: NutritionSettings;
  activeModel?: string;
}

export const BatchNutritionModal: React.FC<BatchNutritionModalProps> = ({
  isOpen,
  onClose,
  onComplete,
  nutritionSettings = DEFAULT_NUTRITION_SETTINGS,
  activeModel = 'gemini-3.7-flash',
}) => {
  const [stats, setStats] = useState<{
    totalCount: number;
    missingCount: number;
    calculatedCount: number;
  } | null>(null);

  // Calculation mode: 'missing-only' (default) vs 'force-all'
  const [calcMode, setCalcMode] = useState<'missing-only' | 'force-all'>('missing-only');

  // Selected AI model for the batch run
  const [selectedModel, setSelectedModel] = useState<string>(activeModel);
  const [isCustomModel, setIsCustomModel] = useState(false);
  const [customModelInput, setCustomModelInput] = useState('');

  const [isRunning, setIsRunning] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [isDone, setIsDone] = useState(false);
  const [progressCount, setProgressCount] = useState(0);
  const [totalTarget, setTotalTarget] = useState(0);
  const [currentRecipeTitle, setCurrentRecipeTitle] = useState<string>('');
  const [currentStatus, setCurrentStatus] = useState<string>('');
  const [log, setLog] = useState<
    Array<{
      title: string;
      calories?: number;
      protein?: number;
      status: 'success' | 'error' | 'retrying';
      message?: string;
    }>
  >([]);

  const isPausedRef = useRef(false);
  const isRunningRef = useRef(false);

  useEffect(() => {
    if (isOpen) {
      fetchStats();
      setIsDone(false);
      setProgressCount(0);
      setLog([]);
      setCurrentRecipeTitle('');
      setCurrentStatus('');
      setSelectedModel(activeModel);
      setCalcMode('missing-only');
    }
  }, [isOpen, activeModel]);

  const fetchStats = async () => {
    try {
      const res = await fetch('/api/nutrition/batch');
      if (res.ok) {
        const data = await res.json();
        setStats(data);
      }
    } catch (err) {
      console.error('Error fetching batch stats:', err);
    }
  };

  const handleStart = async () => {
    const isForce = calcMode === 'force-all';
    const targetCount = isForce ? (stats?.totalCount ?? 0) : (stats?.missingCount ?? 0);

    if (targetCount === 0) return;

    setIsRunning(true);
    setIsPaused(false);
    setIsDone(false);
    isPausedRef.current = false;
    isRunningRef.current = true;
    setProgressCount(0);
    setTotalTarget(targetCount);

    let currentOffset = 0;
    let processedSoFar = 0;
    let hasMore = true;

    const modelToUse = isCustomModel ? customModelInput.trim() || selectedModel : selectedModel;

    try {
      while (isRunningRef.current && hasMore) {
        if (isPausedRef.current) {
          setCurrentStatus('מושהה...');
          await new Promise((r) => setTimeout(r, 800));
          continue;
        }

        setCurrentStatus(`שולח בקשה לעיבוד ב-${modelToUse}...`);

        const res = await fetch('/api/nutrition/batch', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            limit: 3,
            onlyMissing: !isForce,
            forceAll: isForce,
            offset: currentOffset,
            modelOverride: modelToUse,
          }),
        });

        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          const is429 = res.status === 429 || errData.error?.includes('429');

          if (is429) {
            setCurrentStatus('⏳ מגבלת קצב Gemini API – מבצע Exponential Backoff וממתין 5 שניות...');
            await new Promise((r) => setTimeout(r, 5000));
            continue;
          }
          throw new Error(errData.error || 'שגיאה בעיבוד');
        }

        const data = await res.json();
        const { processedCount, remainingMissing, totalCount, nextOffset, results } = data;

        if (Array.isArray(results)) {
          for (const item of results) {
            if (item.status === 'success') {
              setCurrentRecipeTitle(item.title);
              setLog((prev) => [
                {
                  title: item.title,
                  calories: item.nutrition?.caloriesPerServing,
                  protein: item.nutrition?.proteinGrams,
                  status: 'success',
                },
                ...prev.slice(0, 40),
              ]);
            } else {
              setLog((prev) => [
                {
                  title: item.title,
                  status: 'error',
                  message: item.error,
                },
                ...prev.slice(0, 40),
              ]);
            }
          }
        }

        processedSoFar += processedCount;
        setProgressCount(processedSoFar);
        currentOffset = nextOffset;

        if (isForce) {
          hasMore = currentOffset < totalCount && processedCount > 0;
          setStats((prev) =>
            prev ? { ...prev, calculatedCount: processedSoFar, missingCount: 0 } : null
          );
        } else {
          hasMore = remainingMissing > 0 && processedCount > 0;
          setStats((prev) =>
            prev
              ? {
                  ...prev,
                  missingCount: remainingMissing,
                  calculatedCount: prev.totalCount - remainingMissing,
                }
              : null
          );
        }

        if (!hasMore || processedCount === 0) {
          break;
        }

        // Small pacing delay
        await new Promise((r) => setTimeout(r, 1200));
      }

      setIsDone(true);
      setCurrentStatus('החישוב הושלם בהצלחה!');
      onComplete();
    } catch (err: any) {
      console.error('Batch error:', err);
      setCurrentStatus(`שגיאה: ${err.message || err}`);
    } finally {
      setIsRunning(false);
      isRunningRef.current = false;
    }
  };

  const handlePause = () => {
    isPausedRef.current = !isPaused;
    setIsPaused(!isPaused);
  };

  const handleStop = () => {
    isRunningRef.current = false;
    isPausedRef.current = false;
    setIsRunning(false);
    setIsPaused(false);
  };

  if (!isOpen) return null;

  const targetCount =
    calcMode === 'force-all' ? (stats?.totalCount ?? 0) : (stats?.missingCount ?? 0);
  const progressPercent =
    totalTarget > 0 ? Math.min(100, Math.round((progressCount / totalTarget) * 100)) : 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 modal-overlay">
      <div className="bg-white rounded-3xl w-full max-w-xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[85vh] animate-in fade-in zoom-in-95 duration-150">
        {/* Top Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-emerald-50 via-teal-50 to-emerald-50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white flex items-center justify-center shadow-md shadow-emerald-600/20">
              <Salad className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-extrabold text-slate-900">
                חישוב ערכים תזונתיים לכל הספר
              </h2>
              <p className="text-xs text-slate-500">
                סריקה וחישוב AI חכם עם בחירת מודל והגנה ממגבלות קצב
              </p>
            </div>
          </div>

          <button
            onClick={() => {
              if (isRunning) handleStop();
              onClose();
            }}
            className="text-slate-400 hover:text-slate-600 p-1.5 rounded-xl hover:bg-white/80 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-5 overflow-y-auto flex-1 text-slate-800">
          {/* Overview Cards */}
          <div className="grid grid-cols-3 gap-2.5 text-center">
            <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-2xl">
              <div className="text-[11px] text-slate-500 font-medium">סך הכל בספר</div>
              <div className="text-lg font-black text-slate-900">{stats?.totalCount ?? '...'}</div>
            </div>

            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-2xl">
              <div className="text-[11px] text-emerald-700 font-medium">כבר חושבו ✅</div>
              <div className="text-lg font-black text-emerald-700">
                {stats?.calculatedCount ?? '...'}
              </div>
            </div>

            <div className="p-3 bg-amber-50 border border-amber-200 rounded-2xl">
              <div className="text-[11px] text-amber-800 font-medium">ממתינים לחישוב ⏳</div>
              <div className="text-lg font-black text-amber-800">
                {stats?.missingCount ?? '...'}
              </div>
            </div>
          </div>

          {/* Mode Selection Cards */}
          {!isRunning && !isDone && (
            <div className="space-y-2.5">
              <div className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <span>🎯</span>
                <span>בחר מצב חישוב:</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Mode 1: Missing Only (Default) */}
                <div
                  onClick={() => setCalcMode('missing-only')}
                  className={`p-3.5 rounded-2xl border cursor-pointer transition flex flex-col justify-between ${
                    calcMode === 'missing-only'
                      ? 'border-emerald-500 bg-emerald-50/60 ring-2 ring-emerald-500/20'
                      : 'border-slate-200 hover:border-slate-300 bg-white'
                  }`}
                >
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs text-slate-900">
                        רק מתכונים חסרים (מומלץ)
                      </span>
                      {calcMode === 'missing-only' && (
                        <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                      )}
                    </div>
                    <p className="text-[11px] text-slate-500 leading-snug">
                      מדלג על מתכונים שכבר חושבו וחוסך זמן ומכסות API.
                    </p>
                  </div>
                  <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] font-bold text-emerald-800">
                    <span>יחושבו:</span>
                    <span>{stats?.missingCount ?? 0} מתכונים</span>
                  </div>
                </div>

                {/* Mode 2: Force All */}
                <div
                  onClick={() => setCalcMode('force-all')}
                  className={`p-3.5 rounded-2xl border cursor-pointer transition flex flex-col justify-between ${
                    calcMode === 'force-all'
                      ? 'border-purple-500 bg-purple-50/60 ring-2 ring-purple-500/20'
                      : 'border-slate-200 hover:border-slate-300 bg-white'
                  }`}
                >
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs text-slate-900">
                        חישוב מחדש של כל הספר
                      </span>
                      {calcMode === 'force-all' && (
                        <Check className="w-4 h-4 text-purple-600 shrink-0" />
                      )}
                    </div>
                    <p className="text-[11px] text-slate-500 leading-snug">
                      דורך ומחשב מחדש את כל הספר (מעולה בעת שדרוג מודל AI).
                    </p>
                  </div>
                  <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] font-bold text-purple-800">
                    <span>יחושבו:</span>
                    <span>כל {stats?.totalCount ?? 0} המתכונים</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Model Picker Selector */}
          {!isRunning && !isDone && (
            <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl space-y-2">
              <div className="flex items-center justify-between text-xs font-bold text-slate-800">
                <span className="flex items-center gap-1.5">
                  <Cpu className="w-3.5 h-3.5 text-purple-600" />
                  <span>מודל AI לביצוע החישוב:</span>
                </span>
                <span className="text-[10px] text-slate-400 font-normal">ניתן לשנות בכל עת</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {PRESET_MODELS.map((m) => {
                  const isSelected = !isCustomModel && selectedModel === m.id;
                  return (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => {
                        setIsCustomModel(false);
                        setSelectedModel(m.id);
                      }}
                      className={`px-3 py-2 rounded-xl text-xs text-right border transition flex items-center justify-between ${
                        isSelected
                          ? 'bg-white border-purple-500 text-purple-950 font-bold shadow-xs'
                          : 'bg-white/60 border-slate-200 text-slate-700 hover:bg-white'
                      }`}
                    >
                      <span className="truncate">{m.name.split(' (')[0]}</span>
                      {isSelected && <Check className="w-3.5 h-3.5 text-purple-600 shrink-0" />}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Rate Limit Protection Notice */}
          <div className="p-3 bg-blue-50/70 border border-blue-200 rounded-2xl text-xs text-blue-950 flex items-start gap-2.5">
            <Sparkles className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
            <div className="leading-relaxed text-[11px]">
              <strong>מנגנון Exponential Backoff מובנה:</strong> החישוב מתבצע עם השהיות חכמות והגנה מפני עומס ב-Gemini API.
            </div>
          </div>

          {/* Active Running Status & Progress Bar */}
          {(isRunning || isDone) && (
            <div className="space-y-3 p-4 bg-slate-50 border border-slate-200 rounded-2xl animate-in fade-in duration-200">
              <div className="flex items-center justify-between text-xs font-bold text-slate-800">
                <span className="flex items-center gap-1.5">
                  {isRunning ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-600" />
                  ) : (
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  )}
                  <span>{currentStatus || 'מעבד...'}</span>
                </span>
                <span className="text-emerald-700">{progressPercent}%</span>
              </div>

              {/* Progress Bar */}
              <div className="w-full bg-slate-200 rounded-full h-2.5 overflow-hidden">
                <div
                  className="bg-gradient-to-r from-emerald-500 to-teal-500 h-2.5 rounded-full transition-all duration-300"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>

              <div className="flex items-center justify-between text-[11px] text-slate-500 pt-0.5">
                <span>
                  חושבו: <strong>{progressCount}</strong> מתוך{' '}
                  <strong>{totalTarget}</strong> מתכונים
                </span>
                {currentRecipeTitle && (
                  <span className="text-slate-700 font-medium truncate max-w-[180px]">
                    מתכון: {currentRecipeTitle}
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Activity Log */}
          {log.length > 0 && (
            <div className="space-y-1.5">
              <div className="text-xs font-bold text-slate-700">יומן חישוב בזמן אמת:</div>
              <div className="p-3 bg-slate-900 text-slate-100 rounded-2xl font-mono text-[11px] max-h-40 overflow-y-auto space-y-1.5 shadow-inner">
                {log.map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between gap-2">
                    <span className="truncate">
                      {item.status === 'success' ? '✅' : '❌'} {item.title}
                    </span>
                    {item.status === 'success' ? (
                      <span className="text-emerald-400 shrink-0 text-[10px]">
                        {item.calories} קק״ל | {item.protein}g חלבון
                      </span>
                    ) : (
                      <span className="text-red-400 shrink-0 text-[10px] truncate max-w-[100px]">
                        שגיאה
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Completion Celebration */}
          {isDone && (
            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-center space-y-1 animate-in zoom-in-95 duration-200">
              <div className="text-2xl">🎉</div>
              <div className="font-bold text-sm text-emerald-950">
                {calcMode === 'force-all'
                  ? 'כל המתכונים בספר חושבו מחדש ונשמרו בהצלחה!'
                  : 'כל הערכים התזונתיים החסרים חושבו בהצלחה!'}
              </div>
              <div className="text-xs text-emerald-800">
                ספר המתכונים שלך מעודכן כעת עם תגיות, קלוריות, חלבונים וכפתורי סינון מהירים.
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-between bg-slate-50/70">
          <button
            onClick={() => {
              if (isRunning) handleStop();
              onClose();
            }}
            className="px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-800 transition"
          >
            {isDone ? 'סגור' : 'ביטול'}
          </button>

          <div className="flex items-center gap-2">
            {isRunning ? (
              <>
                <button
                  onClick={handlePause}
                  className="px-3.5 py-2 bg-amber-100 hover:bg-amber-200 text-amber-900 rounded-xl text-xs font-bold transition flex items-center gap-1.5"
                >
                  <Pause className="w-3.5 h-3.5" />
                  <span>{isPaused ? 'המשך' : 'השהה'}</span>
                </button>

                <button
                  onClick={handleStop}
                  className="px-3.5 py-2 bg-red-100 hover:bg-red-200 text-red-900 rounded-xl text-xs font-bold transition"
                >
                  עצור
                </button>
              </>
            ) : (
              <button
                onClick={handleStart}
                disabled={targetCount === 0 && !isDone}
                className={`px-5 py-2.5 text-white rounded-xl text-xs font-bold shadow-md transition flex items-center gap-1.5 disabled:opacity-50 ${
                  calcMode === 'force-all'
                    ? 'bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700'
                    : 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700'
                }`}
              >
                {calcMode === 'force-all' ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>הפעל חישוב מחדש לכל {stats?.totalCount ?? ''} המתכונים 🔄</span>
                  </>
                ) : (
                  <>
                    <Play className="w-3.5 h-3.5 fill-white" />
                    <span>
                      {stats?.missingCount === 0
                        ? 'כל המתכונים כבר מחושבים ✅'
                        : `הפעל חישוב ל-${stats?.missingCount ?? ''} מתכונים חסרים 🥗`}
                    </span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
