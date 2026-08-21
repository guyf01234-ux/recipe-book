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
} from 'lucide-react';
import { Category } from '@/types';

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
}) => {
  const [isModelDropdownOpen, setIsModelDropdownOpen] = useState(false);
  const [customModelInput, setCustomModelInput] = useState('');
  const [isCustomMode, setIsCustomMode] = useState(false);
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

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm space-y-4">
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
                  <span className="hidden sm:inline max-w-[100px] truncate">
                    {activeModelDisplay.replace('Gemini ', '')}
                  </span>
                  <ChevronDown className="w-3 h-3 opacity-75" />
                </button>

                {/* Model Selector Dropdown Menu */}
                {isModelDropdownOpen && (
                  <div className="absolute left-0 mt-2 w-72 bg-white rounded-2xl shadow-2xl border border-slate-200 p-2 z-50 animate-in fade-in zoom-in-95 duration-100 text-slate-800 text-right">
                    <div className="px-3 py-2 border-b border-slate-100 flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                        <Cpu className="w-3.5 h-3.5 text-purple-600" />
                        בחירת מודל Gemini לחיפוש
                      </span>
                      <span className="text-[10px] text-slate-400 font-mono">Future-Proof</span>
                    </div>

                    <div className="py-1 space-y-1">
                      {AI_SEARCH_MODELS.map((model) => {
                        const isSelected = selectedAIModel === model.id;
                        return (
                          <div
                            key={model.id}
                            onClick={() => {
                              onSelectAIModel(model.id);
                              setIsCustomMode(false);
                              setIsModelDropdownOpen(false);
                            }}
                            className={`p-2 rounded-xl cursor-pointer transition flex items-center justify-between text-xs ${
                              isSelected
                                ? 'bg-purple-50 text-purple-950 font-semibold border border-purple-200'
                                : 'hover:bg-slate-50 text-slate-700'
                            }`}
                          >
                            <div>
                              <div className="flex items-center gap-1.5">
                                <span>{model.name}</span>
                                {model.recommended && (
                                  <span className="text-[9px] bg-purple-100 text-purple-700 px-1.5 py-0.2 rounded font-bold">
                                    ברירת מחדל
                                  </span>
                                )}
                              </div>
                              <div className="text-[10px] text-slate-400 font-normal">
                                {model.label}
                              </div>
                            </div>
                            {isSelected && <Check className="w-3.5 h-3.5 text-purple-600" />}
                          </div>
                        );
                      })}

                      {/* Custom Model Input */}
                      <div className="pt-2 border-t border-slate-100 px-1">
                        <div
                          onClick={() => setIsCustomMode(!isCustomMode)}
                          className="text-[11px] text-slate-500 hover:text-purple-600 font-medium cursor-pointer flex items-center justify-between py-1"
                        >
                          <span>הזנת מודל עתידי ידנית...</span>
                          <Plus className="w-3 h-3" />
                        </div>

                        {isCustomMode && (
                          <form onSubmit={handleApplyCustomModel} className="mt-1.5 flex gap-1.5">
                            <input
                              type="text"
                              value={customModelInput}
                              onChange={(e) => setCustomModelInput(e.target.value)}
                              placeholder="למשל: gemini-4.0-flash"
                              className="flex-1 px-2.5 py-1 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-purple-500 font-mono"
                              autoFocus
                            />
                            <button
                              type="submit"
                              className="px-2.5 py-1 bg-purple-600 hover:bg-purple-700 text-white text-xs font-medium rounded-lg transition"
                            >
                              שמור
                            </button>
                          </form>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Manage Categories Button */}
          <button
            onClick={onOpenCategoryManager}
            className="flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 hover:text-slate-900 font-medium text-xs transition shrink-0"
          >
            <FolderKanban className="w-3.5 h-3.5 text-slate-500" />
            <span>ניהול קטגוריות</span>
          </button>
        </div>
      </div>

      {/* Category Pills Bar */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 pt-0.5 no-scrollbar">
        {/* All Recipes */}
        <button
          onClick={() => {
            onSelectCategory('all');
            if (isAISearchActive && onClearAISearch) onClearAISearch();
          }}
          className={`px-3.5 py-1.5 rounded-xl text-sm font-medium transition whitespace-nowrap flex items-center gap-1.5 ${
            selectedCategory === 'all' && !isAISearchActive
              ? 'bg-amber-500 text-white shadow-sm shadow-amber-500/20'
              : 'bg-slate-100 text-slate-600 hover:bg-slate-200/80 hover:text-slate-900'
          }`}
        >
          <span>כל המתכונים</span>
          <span
            className={`text-xs px-1.5 py-0.2 rounded-full ${
              selectedCategory === 'all' && !isAISearchActive
                ? 'bg-amber-600 text-white'
                : 'bg-slate-200 text-slate-600'
            }`}
          >
            {totalRecipesCount}
          </span>
        </button>

        {/* Uncategorized */}
        <button
          onClick={() => {
            onSelectCategory('uncategorized');
            if (isAISearchActive && onClearAISearch) onClearAISearch();
          }}
          className={`px-3.5 py-1.5 rounded-xl text-sm font-medium transition whitespace-nowrap flex items-center gap-1.5 ${
            selectedCategory === 'uncategorized' && !isAISearchActive
              ? 'bg-amber-500 text-white shadow-sm shadow-amber-500/20'
              : 'bg-slate-100 text-slate-600 hover:bg-slate-200/80 hover:text-slate-900'
          }`}
        >
          <span>ללא קטגוריה</span>
        </button>

        {/* Dynamic Categories */}
        {categories.map((cat) => {
          const isSelected = selectedCategory === cat.id && !isAISearchActive;
          const count = cat._count?.recipes ?? 0;
          return (
            <button
              key={cat.id}
              onClick={() => {
                onSelectCategory(cat.id);
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
