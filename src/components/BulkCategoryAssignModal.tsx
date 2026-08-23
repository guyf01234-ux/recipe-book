'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  X,
  Tags,
  Check,
  Plus,
  Search,
  CheckSquare,
  Square,
  FolderPlus,
  Loader2,
  Clock,
  Sparkles,
  ArrowRight,
  Filter,
  Users,
} from 'lucide-react';
import { Recipe, Category } from '@/types';

interface BulkCategoryAssignModalProps {
  isOpen: boolean;
  onClose: () => void;
  categories: Category[];
  onComplete: () => void;
}

export const BulkCategoryAssignModal: React.FC<BulkCategoryAssignModalProps> = ({
  isOpen,
  onClose,
  categories,
  onComplete,
}) => {
  const [allRecipes, setAllRecipes] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Target Category
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('');
  const [showNewCategoryInput, setShowNewCategoryInput] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');

  // Source Filter: 'uncategorized' (default) | 'all' | specific category ID
  const [filterMode, setFilterMode] = useState<string>('uncategorized');
  const [searchQuery, setSearchQuery] = useState('');

  // Selected Recipe IDs
  const [selectedRecipeIds, setSelectedRecipeIds] = useState<Set<string>>(new Set());

  // Assignment Mode: 'add' (keep existing) vs 'replace' (move exclusively)
  const [assignMode, setAssignMode] = useState<'add' | 'replace'>('add');

  useEffect(() => {
    if (isOpen) {
      fetchRecipes();
      setSelectedRecipeIds(new Set());
      setSearchQuery('');
      setFilterMode('uncategorized');
      setShowNewCategoryInput(false);
      setNewCategoryName('');
      setAssignMode('add');
      if (categories.length > 0) {
        setSelectedCategoryId(categories[0].id);
      }
    }
  }, [isOpen, categories]);

  const fetchRecipes = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/recipes');
      if (res.ok) {
        const data = await res.json();
        setAllRecipes(data);
      }
    } catch (err) {
      console.error('Error fetching recipes for bulk assign:', err);
    } finally {
      setLoading(false);
    }
  };

  // Filtered recipes list based on active filter tab & search query
  const filteredRecipes = useMemo(() => {
    return allRecipes.filter((recipe) => {
      // 1. Category Filter
      const recipeCategoryIds = recipe.categories?.map((c) => c.category.id) || [];
      if (filterMode === 'uncategorized') {
        if (recipeCategoryIds.length > 0) return false;
      } else if (filterMode !== 'all') {
        if (!recipeCategoryIds.includes(filterMode)) return false;
      }

      // 2. Search Query Filter
      if (searchQuery.trim()) {
        const q = searchQuery.trim().toLowerCase();
        const matchesTitle = recipe.title.toLowerCase().includes(q);
        const matchesDesc = recipe.description?.toLowerCase().includes(q);
        if (!matchesTitle && !matchesDesc) return false;
      }

      return true;
    });
  }, [allRecipes, filterMode, searchQuery]);

  // Uncategorized count
  const uncategorizedCount = useMemo(() => {
    return allRecipes.filter((r) => !r.categories || r.categories.length === 0).length;
  }, [allRecipes]);

  const handleToggleRecipe = (id: string) => {
    setSelectedRecipeIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleSelectAll = () => {
    const allFilteredIds = filteredRecipes.map((r) => r.id);
    setSelectedRecipeIds(new Set(allFilteredIds));
  };

  const handleDeselectAll = () => {
    setSelectedRecipeIds(new Set());
  };

  const handleSubmit = async () => {
    if (selectedRecipeIds.size === 0) return;
    if (!selectedCategoryId && !newCategoryName.trim()) {
      alert('נא לבחור קטגוריה או להזין שם לקטגוריה חדשה');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/recipes/bulk-category', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipeIds: Array.from(selectedRecipeIds),
          categoryId: showNewCategoryInput ? undefined : selectedCategoryId,
          newCategoryName: showNewCategoryInput ? newCategoryName.trim() : undefined,
          mode: assignMode,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'שגיאה בשיוך קטגוריה');
      }

      onComplete();
      onClose();
    } catch (err: any) {
      console.error('Bulk assign error:', err);
      alert(err.message || 'שגיאה בביצוע השיוך');
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  const targetCategoryName = showNewCategoryInput
    ? newCategoryName.trim() || 'קטגוריה חדשה'
    : categories.find((c) => c.id === selectedCategoryId)?.name || 'בחר קטגוריה';

  const isAllFilteredSelected =
    filteredRecipes.length > 0 &&
    filteredRecipes.every((r) => selectedRecipeIds.has(r.id));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 modal-overlay">
      <div className="bg-white rounded-3xl w-full max-w-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-150">
        {/* Top Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-amber-50 via-orange-50/50 to-amber-50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-500 to-orange-500 text-white flex items-center justify-center shadow-md shadow-orange-500/20">
              <Tags className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-extrabold text-slate-900">
                שיוך מתכונים לקטגוריה במרוכז
              </h2>
              <p className="text-xs text-slate-500">
                סמן מתכונים ושייך אותם לקטגוריה קיימת או חדשה בלחיצה אחת
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1.5 rounded-xl hover:bg-white/80 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-4 overflow-y-auto flex-1 text-slate-800">
          {/* Target Category Selection Panel */}
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
            <div className="flex items-center justify-between text-xs font-bold text-slate-900">
              <span className="flex items-center gap-1.5">
                <FolderPlus className="w-4 h-4 text-amber-600" />
                <span>בחר לאיזו קטגוריה לשייך את המתכונים:</span>
              </span>

              <button
                type="button"
                onClick={() => setShowNewCategoryInput(!showNewCategoryInput)}
                className="text-[11px] text-amber-700 hover:text-amber-900 font-medium flex items-center gap-1"
              >
                {showNewCategoryInput ? 'בחר מקטגוריה קיימת' : '+ יצירת קטגוריה חדשה'}
              </button>
            </div>

            {showNewCategoryInput ? (
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  placeholder="הקלד שם לקטגוריה חדשה (למשל: דגים, לחמים ומאפים...)"
                  className="flex-1 px-3.5 py-2 text-xs bg-white border border-amber-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500/20 text-slate-900 placeholder-slate-400"
                  autoFocus
                />
              </div>
            ) : (
              <select
                value={selectedCategoryId}
                onChange={(e) => setSelectedCategoryId(e.target.value)}
                className="w-full px-3.5 py-2 text-xs bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500/20 text-slate-900 font-medium"
              >
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name} ({cat._count?.recipes ?? 0} מתכונים)
                  </option>
                ))}
              </select>
            )}

            {/* Assignment Mode Options */}
            <div className="pt-2 border-t border-slate-200/80 flex items-center gap-4 text-xs">
              <label className="flex items-center gap-1.5 cursor-pointer text-slate-700">
                <input
                  type="radio"
                  name="assignMode"
                  checked={assignMode === 'add'}
                  onChange={() => setAssignMode('add')}
                  className="text-amber-600 focus:ring-amber-500"
                />
                <span>הוסף לקטגוריה זו (שמור שיוכים קיימים)</span>
              </label>

              <label className="flex items-center gap-1.5 cursor-pointer text-slate-700">
                <input
                  type="radio"
                  name="assignMode"
                  checked={assignMode === 'replace'}
                  onChange={() => setAssignMode('replace')}
                  className="text-amber-600 focus:ring-amber-500"
                />
                <span>העבר בלעדית (נקה קטגוריות קודמות)</span>
              </label>
            </div>
          </div>

          {/* Filter Bar & Search */}
          <div className="space-y-2.5">
            {/* Filter Tabs */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
              <button
                type="button"
                onClick={() => setFilterMode('uncategorized')}
                className={`px-3 py-1.5 rounded-xl font-bold transition shrink-0 flex items-center gap-1.5 border ${
                  filterMode === 'uncategorized'
                    ? 'bg-amber-500 text-white border-amber-600 shadow-xs'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200 border-slate-200'
                }`}
              >
                <span>ללא קטגוריה</span>
                <span
                  className={`text-[11px] px-1.5 py-0.2 rounded-full ${
                    filterMode === 'uncategorized'
                      ? 'bg-white/20 text-white'
                      : 'bg-slate-200 text-slate-600'
                  }`}
                >
                  {uncategorizedCount}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setFilterMode('all')}
                className={`px-3 py-1.5 rounded-xl font-bold transition shrink-0 flex items-center gap-1.5 border ${
                  filterMode === 'all'
                    ? 'bg-amber-500 text-white border-amber-600 shadow-xs'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200 border-slate-200'
                }`}
              >
                <span>כל המתכונים בספר</span>
                <span
                  className={`text-[11px] px-1.5 py-0.2 rounded-full ${
                    filterMode === 'all'
                      ? 'bg-white/20 text-white'
                      : 'bg-slate-200 text-slate-600'
                  }`}
                >
                  {allRecipes.length}
                </span>
              </button>

              {/* Category-specific filters */}
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setFilterMode(cat.id)}
                  className={`px-3 py-1.5 rounded-xl font-medium transition shrink-0 flex items-center gap-1.5 border ${
                    filterMode === cat.id
                      ? 'bg-amber-500 text-white border-amber-600 shadow-xs'
                      : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border-slate-200'
                  }`}
                >
                  <span>{cat.name}</span>
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                      filterMode === cat.id
                        ? 'bg-white/20 text-white'
                        : 'bg-slate-200 text-slate-600'
                    }`}
                  >
                    {cat._count?.recipes ?? 0}
                  </span>
                </button>
              ))}
            </div>

            {/* Search Input & Select All Toolbar */}
            <div className="flex items-center justify-between gap-3 pt-1">
              <div className="relative flex-1">
                <Search className="w-3.5 h-3.5 absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="חיפוש מתכון לפי שם..."
                  className="w-full pr-8 pl-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500/20 text-slate-900 placeholder-slate-400"
                />
              </div>

              <div className="flex items-center gap-2 shrink-0 text-xs">
                <button
                  type="button"
                  onClick={isAllFilteredSelected ? handleDeselectAll : handleSelectAll}
                  className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-medium transition flex items-center gap-1"
                >
                  {isAllFilteredSelected ? (
                    <>
                      <CheckSquare className="w-3.5 h-3.5 text-emerald-600" />
                      <span>נקה הכל</span>
                    </>
                  ) : (
                    <>
                      <Square className="w-3.5 h-3.5 text-slate-400" />
                      <span>בחר הכל ({filteredRecipes.length})</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Scrollable Recipe Checklist */}
          <div className="border border-slate-200 rounded-2xl overflow-hidden divide-y divide-slate-100 max-h-72 overflow-y-auto bg-white">
            {loading ? (
              <div className="p-8 text-center text-slate-400 text-xs flex items-center justify-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin text-amber-500" />
                <span>טוען מתכונים...</span>
              </div>
            ) : filteredRecipes.length === 0 ? (
              <div className="p-8 text-center text-slate-500 text-xs space-y-1">
                <div className="font-bold text-slate-700">לא נמצאו מתכונים בסינון זה</div>
                <p className="text-[11px] text-slate-400">
                  {filterMode === 'uncategorized'
                    ? 'כל המתכונים בספר כבר משויכים לקטגוריות! 🎉'
                    : 'נסה לשנות את הסינון או את מילות החיפוש.'}
                </p>
              </div>
            ) : (
              filteredRecipes.map((recipe) => {
                const isChecked = selectedRecipeIds.has(recipe.id);
                const recipeCategories = recipe.categories?.map((c) => c.category) || [];

                return (
                  <div
                    key={recipe.id}
                    onClick={() => handleToggleRecipe(recipe.id)}
                    className={`p-3 flex items-center justify-between gap-3 cursor-pointer transition select-none ${
                      isChecked ? 'bg-amber-50/70 hover:bg-amber-100/60' : 'hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <button type="button" className="shrink-0 text-amber-600">
                        {isChecked ? (
                          <CheckSquare className="w-4 h-4 text-amber-600" />
                        ) : (
                          <Square className="w-4 h-4 text-slate-300" />
                        )}
                      </button>

                      <div className="min-w-0">
                        <div className="text-xs font-bold text-slate-900 truncate">
                          {recipe.title}
                        </div>
                        <div className="flex items-center gap-2 text-[10px] text-slate-400 mt-0.5">
                          {recipe.prepTime && (
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {recipe.prepTime}
                            </span>
                          )}
                          {recipe.servings && (
                            <span className="flex items-center gap-1">
                              <Users className="w-3 h-3" />
                              {recipe.servings}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Assigned Category Pills */}
                    <div className="flex items-center gap-1 shrink-0 flex-wrap max-w-[200px] justify-end">
                      {recipeCategories.length > 0 ? (
                        recipeCategories.map((c) => (
                          <span
                            key={c.id}
                            className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-600 border border-slate-200"
                          >
                            {c.name}
                          </span>
                        ))
                      ) : (
                        <span className="px-2 py-0.5 rounded-full text-[10px] text-amber-700 bg-amber-50 border border-amber-200 font-medium">
                          ללא קטגוריה
                        </span>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-between bg-slate-50/70">
          <div className="text-xs text-slate-600">
            נבחרו: <strong className="text-amber-700">{selectedRecipeIds.size}</strong> מתכונים
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              disabled={submitting}
              className="px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-800 transition"
            >
              ביטול
            </button>

            <button
              onClick={handleSubmit}
              disabled={submitting || selectedRecipeIds.size === 0}
              className="px-5 py-2.5 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white rounded-xl text-xs font-bold shadow-md transition flex items-center gap-1.5 disabled:opacity-50"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>משייך לקטגוריה...</span>
                </>
              ) : (
                <>
                  <Tags className="w-3.5 h-3.5" />
                  <span>
                    שייך {selectedRecipeIds.size} מתכונים ל-"{targetCategoryName}" 🏷️
                  </span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
