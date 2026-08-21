'use client';

import React, { useState, useEffect } from 'react';
import { X, Settings as SettingsIcon, Sparkles, Check, Info, Cpu } from 'lucide-react';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface PresetModel {
  id: string;
  name: string;
  recommended?: boolean;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose }) => {
  const [activeModel, setActiveModel] = useState('gemini-3.7-flash');
  const [customModel, setCustomModel] = useState('');
  const [isCustom, setIsCustom] = useState(false);
  const [presets, setPresets] = useState<PresetModel[]>([]);
  const [loading, setLoading] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
        body: JSON.stringify({ model: selected }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'שגיאה בשמירת ההגדרות');
      }

      setActiveModel(data.model);
      setSavedSuccess(true);
      setTimeout(() => {
        setSavedSuccess(false);
        onClose();
      }, 1200);
    } catch (err: any) {
      setError(err.message || 'שגיאה בשמירת ההגדרות');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 modal-overlay">
      <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[85vh] animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center">
              <SettingsIcon className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">הגדרות אפליקציה ו-AI</h2>
              <p className="text-xs text-slate-500">בחירת גרסת מודל ה-Gemini של גוגל</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition"
          >
            <X className="w-5 h-5" />
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

          {/* Model Selection section */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Cpu className="w-4 h-4 text-amber-600" />
                גרסת מודל Gemini
              </label>
              <span className="text-[11px] text-slate-400">מתעדכן מיידית לכל הפעולות</span>
            </div>

            {/* Presets */}
            <div className="space-y-2">
              {presets.map((preset) => {
                const isSelected = !isCustom && activeModel === preset.id;
                return (
                  <div
                    key={preset.id}
                    onClick={() => {
                      setIsCustom(false);
                      setActiveModel(preset.id);
                    }}
                    className={`p-3.5 rounded-xl border cursor-pointer transition flex items-center justify-between ${
                      isSelected
                        ? 'border-amber-500 bg-amber-50/50 text-amber-950 ring-1 ring-amber-500/30'
                        : 'border-slate-200 hover:border-slate-300 bg-white text-slate-800'
                    }`}
                  >
                    <div>
                      <div className="font-semibold text-sm flex items-center gap-2">
                        {preset.name}
                        {preset.recommended && (
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-200 text-amber-900 font-bold">
                            מומלץ
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-slate-400 font-mono mt-0.5">{preset.id}</div>
                    </div>

                    <div
                      className={`w-5 h-5 rounded-full border flex items-center justify-center ${
                        isSelected
                          ? 'border-amber-500 bg-amber-500 text-white'
                          : 'border-slate-300'
                      }`}
                    >
                      {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                    </div>
                  </div>
                );
              })}

              {/* Custom Model Option */}
              <div
                onClick={() => setIsCustom(true)}
                className={`p-3.5 rounded-xl border cursor-pointer transition ${
                  isCustom
                    ? 'border-amber-500 bg-amber-50/50 text-amber-950 ring-1 ring-amber-500/30'
                    : 'border-slate-200 hover:border-slate-300 bg-white text-slate-800'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <div className="font-semibold text-sm">הזנת גרסה/מודל עתידי ידנית</div>
                    <div className="text-xs text-slate-500">
                      כאשר גוגל תוציא מודלים חדשים (כגון gemini-4.0-flash), תוכל פשוט להקליד כאן את השם
                    </div>
                  </div>
                  <div
                    className={`w-5 h-5 rounded-full border flex items-center justify-center shrink-0 ${
                      isCustom
                        ? 'border-amber-500 bg-amber-500 text-white'
                        : 'border-slate-300'
                    }`}
                  >
                    {isCustom && <Check className="w-3 h-3 stroke-[3]" />}
                  </div>
                </div>

                {isCustom && (
                  <div className="mt-3">
                    <input
                      type="text"
                      value={customModel}
                      onChange={(e) => setCustomModel(e.target.value)}
                      placeholder="למשל: gemini-3.7-flash או gemini-4.0-flash"
                      className="w-full px-3.5 py-2 text-sm bg-white border border-amber-400 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500/20 font-mono"
                      autoFocus
                    />
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Info note */}
          <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/80 flex items-start gap-2.5 text-xs text-slate-600 leading-relaxed">
            <Info className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
            <div>
              <strong>איך זה עובד?</strong> המודל הנבחר משמש הן לחילוץ וקריאת קבצי המתכונים שאתה
              גורר לאפליקציה, והן לעוזר הצ'אט האישי.
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-2.5">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 font-medium text-sm rounded-xl transition"
          >
            ביטול
          </button>
          <button
            onClick={handleSave}
            disabled={loading}
            className="px-5 py-2 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white font-semibold text-sm rounded-xl transition shadow-sm shadow-amber-500/20 flex items-center gap-1.5"
          >
            <Check className="w-4 h-4" />
            <span>{loading ? 'שומר...' : 'שמור הגדרות'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
