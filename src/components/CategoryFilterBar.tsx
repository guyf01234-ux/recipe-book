'use client';

import React, { useState, useRef, useEffect } from 'react';
import {
  Search,
  FolderKanban,
  X,
  Sparkles,
  Loader2,
  ChevronDown,
  Cpu,
  Check,
  Plus,
  Info,
} from 'lucide-react';
import { Category, NutritionSettings, DEFAULT_NUTRITION_SETTINGS } from '@/types';
import { getNutritionFilterDefinitions } from '@/lib/nutrition';

export const AI_SEARCH_MODELS = [
  { id: 'gemini-3.7-flash', name: 'Gemini 3.7 Flash', label: 'מהיר וחכם (ברירת מחדל)', recommended: true },
  { id: 'gemini-3.5-flash-lite', name: 'Gemini 3.5 Flash-Lite', label: 'סופר מהיר וחסכוני' },
  { id: 'gemini-3.1-pro-preview', name: 'Gemini 3.1 Pro', label: 'חשיבה מעמיקה' },
];

interface CategoryFilterBarProps {
  categories: Category[];
  selectedCategory: string;
  onSelectCategory: (id: string) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onOpenCategoryManager: () => void;
  totalRecipesCount: number;
  onTriggerAISearch?: (model: string) => void;
  isAISearching?: boolean;
  isAISearchActive?: boolean;
  onClearAISearch?: () => void;
  selectedAIModel: string;
  onSelectAIModel: (model: string) => void;
  nutritionFilter?: string | null;
  onSelectNutritionFilter?: (filterId: string | null) => void;
  nutritionSettings?: NutritionSettings;
  nutritionCounts?: {
    highProtein: number;
    lowCalorie: number;
    lowCarb: number;
  };
}

export const CategoryFilterBar: React.FC<CategoryFilterBarProps> = ({
  categories,
  selectedCategory,
  onSelectCategory,
  searchQuery,
  onSearchChange,
  onOpenCategoryManager,
  totalRecipesCount,
  onTriggerAISearch,
  isAISearching = false,
  isAISearchActive = false,
  onClearAISearch,
  selectedAIModel,
  onSelectAIModel,
  nutritionFilter = null,
  onSelectNutritionFilter,
  nutritionSettings = DEFAULT_NUTRITION_SETTINGS,
  nutritionCounts,
}) => {
  const [isModelDropdownOpen, setIsModelDropdownOpen] = useState(false);
  const [customModelInput, setCustomModelInput] = useState('');
  const [isCustomMode, setIsCustomMode] = useState(false);
  const [activeTooltip, setActiveTooltip] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsModelDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleApplyCustomModel = (e: React.FormEvent) => {
    e.preventDefault();
    if (customModelInput.trim()) {
      onSelectAIModel(customModelInput.trim());
      setIsModelDropdownOpen(false);
    }
  };

  const activeModelDisplay =
    AI_SEARCH_MODELS.find((m) => m.id === selectedAIModel)?.name || selectedAIModel;

  const nutritionDefs = getNutritionFilterDefinitions(nutritionSettings);

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm space-y-3.5">
      {/* Search and Action Row */}
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center gap-3">
        {/* Search input with search icon and clear */}
        <div className="relative flex-1">
          <div className="absolute inset-y-0 right-0 pr-3.5 flex items-center pointer-events-none text-slate-400">
            <Search className="w-5 h-5" />
          </div>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && onTriggerAISearch && searchQuery.trim()) {
                onTriggerAISearch(selectedAIModel);
              }
            }}
            placeholder="חיפוש מתכון לפי שם, מצרכים, קטגוריה (למשל: אסיאתי, פסטה)..."
            className="w-full pr-11 pl-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition text-sm"
          />
          {searchQuery && (
            <button
              onClick={() => {
                onSearchChange('');
                if (isAISearchActive && onClearAISearch) {
                  onClearAISearch();
                }
              }}
              className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400 hover:text-slate-600"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Right side buttons: AI Search, Model Selector & Category Manager */}
        <div className="flex items-center gap-2 shrink-0 flex-wrap sm:flex-nowrap">
          {/* AI Search Button */}
          {onTriggerAISearch && (
            <div className="flex items-center rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 p-0.5 shadow-sm">
              <button
                type="button"
                onClick={() => onTriggerAISearch(selectedAIModel)}
                disabled={isAISearching || !searchQuery.trim()}
                title="חיפוש סמנטי מבוסס AI המבין הקשר, מצרכים וסגנונות בישול"
                className="flex items-center gap-1.5 px-3.5 py-2 text-white font-medium text-xs rounded-l-none rounded-r-lg hover:bg-white/10 transition disabled:opacity-50"
              >
                {isAISearching ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>מחפש ב-AI...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                    <span>חיפוש AI</span>
                  </>
                )}
              </button>

              {/* Model Dropdown Trigger */}
              <div className="relative border-r border-white/20" ref={dropdownRef}>
                <button
                  type="button"
                  onClick={() => setIsModelDropdownOpen(!isModelDropdownOpen)}
                  title={`מודל AI נוכחי: ${selectedAIModel}`}
                  className="flex items-center gap-1 px-2.5 py-2 text-white/90 hover:text-white hover:bg-white/10 text-[11px] font-mono rounded-r-none rounded-l-lg transition"
                >
                  <Cpu className="w-3 h-3 text-purple-200" />
                  <span className="max-w-[110px] truncate">{activeModelDisplay}</span>
                  <ChevronDown className="w-3 h-3 opacity-70" />
                </button>

                {/* Dropdown Menu */}
                {isModelDropdownOpen && (
                  <div className="absolute left-0 mt-2 w-72 bg-white rounded-2xl shadow-xl border border-slate-200 py-2 z-50 animate-in fade-in zoom-in-95 duration-150 text-slate-800">
                    <div className="px-3 py-1.5 border-b border-slate-100 text-[11px] font-bold text-slate-400">
                      בחירת מודל Gemini לחיפוש AI
                    </div>

                    <div className="py-1">
                      {AI_SEARCH_MODELS.map((m) => {
                        const isSelected = selectedAIModel === m.id;
                        return (
                          <button
                            key={m.id}
                            type="button"
                            onClick={() => {
                              onSelectAIModel(m.id);
                              setIsModelDropdownOpen(false);
                              setIsCustomMode(false);
                            }}
                            className={`w-full px-3 py-2 text-right flex items-center justify-between text-xs hover:bg-slate-50 transition ${
                              isSelected ? 'bg-purple-50/70 text-purple-900 font-bold' : 'text-slate-700'
                            }`}
                          >
                            <div className="flex flex-col">
                              <div className="flex items-center gap-1.5">
                                <span>{m.name}</span>
                                {m.recommended && (
                                  <span className="text-[10px] bg-purple-100 text-purple-700 px-1.5 py-0.2 rounded-full font-normal">
                                    מומלץ
                                  </span>
                                )}
                              </div>
                              <span className="text-[10px] text-slate-400 font-normal">{m.label}</span>
                            </div>
                            {isSelected && <Check className="w-4 h-4 text-purple-600" />}
                          </button>
                        );
                      })}
                    </div>

                    {/* Custom Model Input */}
                    <div className="border-t border-slate-100 pt-2 px-3 pb-1">
                      {!isCustomMode ? (
                        <button
                          type="button"
                          onClick={() => setIsCustomMode(true)}
                          className="text-[11px] text-purple-600 hover:text-purple-800 font-medium flex items-center gap-1"
                        >
                          <Plus className="w-3 h-3" />
                          <span>הזן שם מודל מותאם אישית...</span>
                        </button>
                      ) : (
                        <form onSubmit={handleApplyCustomModel} className="space-y-1.5">
                          <input
                            type="text"
                            value={customModelInput}
                            onChange={(e) => setCustomModelInput(e.target.value)}
                            placeholder="לדוגמה: gemini-3.7-pro"
                            className="w-full px-2.5 py-1 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-purple-500 font-mono"
                          />
                          <div className="flex items-center justify-end gap-1">
                            <button
                              type="button"
                              onClick={() => setIsCustomMode(false)}
                              className="text-[10px] text-slate-400 hover:text-slate-600 px-2 py-0.5"
                            >
                              ביטול
                            </button>
                            <button
                              type="submit"
                              className="text-[10px] bg-purple-600 hover:bg-purple-700 text-white font-medium px-2 py-0.5 rounded"
                            >
                              החל מודל
                            </button>
                          </div>
                        </form>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Category Management Button */}
          <button
            onClick={onOpenCategoryManager}
            className="flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 hover:text-slate-900 font-medium text-xs transition shrink-0"
          >
            <FolderKanban className="w-3.5 h-3.5 text-slate-500" />
            <span>ניהול קטגוריות</span>
          </button>
        </div>
      </div>

      {/* Category and Health Filter Pills Bar */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 pt-0.5 no-scrollbar">
        {/* All Recipes */}
        <button
          onClick={() => {
            onSelectCategory('all');
            if (onSelectNutritionFilter) onSelectNutritionFilter(null);
            if (isAISearchActive && onClearAISearch) onClearAISearch();
          }}
          className={`px-3.5 py-1.5 rounded-xl text-sm font-medium transition whitespace-nowrap flex items-center gap-1.5 ${
            selectedCategory === 'all' && !nutritionFilter && !isAISearchActive
              ? 'bg-amber-500 text-white shadow-sm shadow-amber-500/20'
              : 'bg-slate-100 text-slate-600 hover:bg-slate-200/80 hover:text-slate-900'
          }`}
        >
          <span>כל המתכונים</span>
          <span
            className={`text-xs px-1.5 py-0.2 rounded-full ${
              selectedCategory === 'all' && !nutritionFilter && !isAISearchActive
                ? 'bg-amber-600 text-white'
                : 'bg-slate-200 text-slate-600'
            }`}
          >
            {totalRecipesCount}
          </span>
        </button>

        {/* Nutritional Category Filters (Smart Health Tabs with Definition Tooltips) */}
        {nutritionDefs.map((ndef) => {
          const isSelected = nutritionFilter === ndef.id;
          const count =
            ndef.id === 'high-protein'
              ? nutritionCounts?.highProtein
              : ndef.id === 'low-calorie'
              ? nutritionCounts?.lowCalorie
              : ndef.id === 'low-carb'
              ? nutritionCounts?.lowCarb
              : undefined;

          return (
            <div key={ndef.id} className="relative group/pill shrink-0">
              <button
                type="button"
                onClick={() => {
                  if (onSelectNutritionFilter) {
                    onSelectNutritionFilter(isSelected ? null : ndef.id);
                  }
                  if (isAISearchActive && onClearAISearch) onClearAISearch();
                }}
                className={`px-3.5 py-1.5 rounded-xl text-sm font-medium transition whitespace-nowrap flex items-center gap-1.5 border ${
                  isSelected
                    ? ndef.id === 'high-protein'
                      ? 'bg-emerald-600 text-white border-emerald-700 shadow-sm shadow-emerald-600/20'
                      : ndef.id === 'low-calorie'
                      ? 'bg-amber-600 text-white border-amber-700 shadow-sm shadow-amber-600/20'
                      : 'bg-indigo-600 text-white border-indigo-700 shadow-sm shadow-indigo-600/20'
                    : 'bg-white text-slate-700 hover:bg-slate-50 border-slate-200 shadow-xs'
                }`}
              >
                <span>{ndef.label}</span>
                {typeof count === 'number' && (
                  <span
                    className={`text-xs px-1.5 py-0.2 rounded-full ${
                      isSelected
                        ? 'bg-white/20 text-white'
                        : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    {count}
                  </span>
                )}
              </button>

              {/* Tooltip / Hover Definition Popover */}
              <div className="absolute bottom-full mb-2 right-0 hidden group-hover/pill:flex flex-col w-56 p-2.5 bg-slate-900 text-white text-xs rounded-xl shadow-xl z-50 pointer-events-none animate-in fade-in zoom-in-95 duration-100">
                <div className="font-bold flex items-center gap-1.5 text-amber-300 mb-0.5">
                  <Info className="w-3.5 h-3.5" />
                  <span>{ndef.label}</span>
                </div>
                <div className="text-[11px] text-slate-200 leading-snug">
                  {ndef.description}
                </div>
                <div className="text-[10px] text-slate-400 mt-1 border-t border-slate-800 pt-1">
                  קריטריון נוכחי: {ndef.thresholdText}
                </div>
              </div>
            </div>
          );
        })}

        <div className="w-px h-5 bg-slate-200 shrink-0 mx-0.5" />

        {/* Uncategorized */}
        <button
          onClick={() => {
            onSelectCategory('uncategorized');
            if (onSelectNutritionFilter) onSelectNutritionFilter(null);
            if (isAISearchActive && onClearAISearch) onClearAISearch();
          }}
          className={`px-3.5 py-1.5 rounded-xl text-sm font-medium transition whitespace-nowrap flex items-center gap-1.5 ${
            selectedCategory === 'uncategorized' && !nutritionFilter && !isAISearchActive
              ? 'bg-amber-500 text-white shadow-sm shadow-amber-500/20'
              : 'bg-slate-100 text-slate-600 hover:bg-slate-200/80 hover:text-slate-900'
          }`}
        >
          <span>ללא קטגוריה</span>
        </button>

        {/* Dynamic Categories */}
        {categories.map((cat) => {
          const isSelected = selectedCategory === cat.id && !nutritionFilter && !isAISearchActive;
          const count = cat._count?.recipes ?? 0;
          return (
            <button
              key={cat.id}
              onClick={() => {
                onSelectCategory(cat.id);
                if (onSelectNutritionFilter) onSelectNutritionFilter(null);
                if (isAISearchActive && onClearAISearch) onClearAISearch();
              }}
              className={`px-3.5 py-1.5 rounded-xl text-sm font-medium transition whitespace-nowrap flex items-center gap-1.5 ${
                isSelected
                  ? 'bg-amber-500 text-white shadow-sm shadow-amber-500/20'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200/80 hover:text-slate-900'
              }`}
            >
              <span>{cat.name}</span>
              <span
                className={`text-xs px-1.5 py-0.2 rounded-full ${
                  isSelected ? 'bg-amber-600 text-white' : 'bg-slate-200 text-slate-600'
                }`}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
