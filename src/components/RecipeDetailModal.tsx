'use client';

import React, { useState, useEffect } from 'react';
import {
  X,
  Clock,
  Users,
  Utensils,
  CheckSquare,
  Square,
  Edit,
  Trash2,
  FileText,
  Sparkles,
  Printer,
  Flame,
  Copy,
  Check,
  BookOpen,
  AlignLeft,
  RotateCcw,
  Plus,
  Minus,
} from 'lucide-react';
import { Recipe } from '@/types';
import { extractBaseServings, scaleIngredientsList } from '@/lib/recipeScaler';

interface RecipeDetailModalProps {
  recipe: Recipe | null;
  isOpen: boolean;
  onClose: () => void;
  onEdit: (recipe: Recipe) => void;
  onDelete: (id: string) => Promise<void>;
  onAskAIAboutRecipe?: (recipe: Recipe) => void;
}

export const RecipeDetailModal: React.FC<RecipeDetailModalProps> = ({
  recipe,
  isOpen,
  onClose,
  onEdit,
  onDelete,
  onAskAIAboutRecipe,
}) => {
  const [activeTab, setActiveTab] = useState<'formatted' | 'raw'>('formatted');
  const [checkedIngredients, setCheckedIngredients] = useState<Record<number, boolean>>({});
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [copiedRaw, setCopiedRaw] = useState(false);

  // Dynamic Serving Scaler (Non-persistent local state)
  const baseServings = recipe ? extractBaseServings(recipe.servings) : 4;
  const [targetServings, setTargetServings] = useState<number>(baseServings);

  // Reset target servings whenever modal opens or recipe changes
  useEffect(() => {
    if (recipe) {
      setTargetServings(extractBaseServings(recipe.servings));
      setCheckedIngredients({});
    }
  }, [recipe?.id, recipe?.servings]);

  if (!isOpen || !recipe) return null;

  const isScaled = targetServings !== baseServings;
  const multiplier = targetServings / (baseServings || 4);
  const displayedIngredients = isScaled
    ? scaleIngredientsList(recipe.ingredients, multiplier)
    : recipe.ingredients;

  const handleDecreaseServings = () => {
    setTargetServings((prev) => Math.max(1, prev - 1));
  };

  const handleIncreaseServings = () => {
    setTargetServings((prev) => Math.min(100, prev + 1));
  };

  const handleResetServings = () => {
    setTargetServings(baseServings);
  };

  const toggleIngredient = (idx: number) => {
    setCheckedIngredients((prev) => ({
      ...prev,
      [idx]: !prev[idx],
    }));
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await onDelete(recipe.id);
      onClose();
    } finally {
      setIsDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleCopyRaw = () => {
    if (recipe.rawContent) {
      navigator.clipboard.writeText(recipe.rawContent);
      setCopiedRaw(true);
      setTimeout(() => setCopiedRaw(false), 2000);
    }
  };

  const categories = recipe.categories?.map((c) => c.category) || [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 modal-overlay">
      <div className="bg-white rounded-2xl w-full max-w-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-150">
        {/* Top Header */}
        <div className="px-6 py-3.5 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
          <div className="flex items-center gap-2">
            <button
              onClick={() => onEdit(recipe)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 transition"
            >
              <Edit className="w-3.5 h-3.5 text-slate-500" />
              <span>ערוך מתכון</span>
            </button>

            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 transition"
              title="הדפסת מתכון"
            >
              <Printer className="w-3.5 h-3.5 text-slate-500" />
              <span>הדפסה</span>
            </button>

            {onAskAIAboutRecipe && (
              <button
                onClick={() => onAskAIAboutRecipe(recipe)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium text-purple-700 bg-purple-50 border border-purple-200 hover:bg-purple-100 transition"
              >
                <Sparkles className="w-3.5 h-3.5 text-purple-600" />
                <span>שאל את ה-AI על מתכון זה</span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition"
              title="מחק מתכון"
            >
              <Trash2 className="w-4 h-4" />
            </button>

            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Delete Confirmation Banner */}
        {showDeleteConfirm && (
          <div className="bg-red-50 border-b border-red-200 p-4 flex items-center justify-between text-xs text-red-900">
            <span>האם אתה בטוח שברצונך למחוק את המתכון "{recipe.title}"?</span>
            <div className="flex items-center gap-2">
              <button
                onClick={handleDelete}
                disabled={isDeleting}
                className="px-3 py-1 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition"
              >
                {isDeleting ? 'מוחק...' : 'כן, מחק'}
              </button>
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="px-3 py-1 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300 transition"
              >
                ביטול
              </button>
            </div>
          </div>
        )}

        {/* Tab Switcher Bar */}
        <div className="px-6 pt-3 bg-white border-b border-slate-200 flex items-center gap-2">
          <button
            onClick={() => setActiveTab('formatted')}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-semibold border-b-2 transition ${
              activeTab === 'formatted'
                ? 'border-amber-500 text-amber-900 bg-amber-50/50 rounded-t-xl'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            <Utensils className="w-4 h-4" />
            <span>מתכון מעוצב (AI)</span>
          </button>

          <button
            onClick={() => setActiveTab('raw')}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-semibold border-b-2 transition ${
              activeTab === 'raw'
                ? 'border-amber-500 text-amber-900 bg-amber-50/50 rounded-t-xl'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>טקסט מקורי מהקובץ</span>
            {recipe.rawContent && (
              <span className="text-[10px] px-1.5 py-0.2 bg-slate-100 text-slate-600 rounded-md font-normal">
                מדויק
              </span>
            )}
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {activeTab === 'formatted' ? (
            /* TAB 1: FORMATTED STRUCTURED RECIPE */
            <>
              {/* Title and metadata */}
              <div>
                <div className="flex flex-wrap items-center gap-2 mb-2">
                  {categories.length > 0 ? (
                    categories.map((cat) => (
                      <span
                        key={cat.id}
                        className="px-3 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-900 border border-amber-200"
                      >
                        {cat.name}
                      </span>
                    ))
                  ) : (
                    <span className="px-3 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-500">
                      ללא קטגוריה
                    </span>
                  )}

                  {recipe.sourceFile && (
                    <span className="flex items-center gap-1 text-xs text-slate-500 bg-slate-100 px-2.5 py-1 rounded-lg">
                      <FileText className="w-3.5 h-3.5 text-slate-400" />
                      קובץ מקור: {recipe.sourceFile}
                    </span>
                  )}
                </div>

                <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 mb-2">
                  {recipe.title}
                </h1>

                {recipe.description && (
                  <p className="text-slate-600 text-sm sm:text-base leading-relaxed">
                    {recipe.description}
                  </p>
                )}
              </div>

              {/* Quick info row with Dynamic Servings Stepper */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-4 bg-amber-50/50 rounded-2xl border border-amber-100 text-sm">
                {recipe.prepTime && (
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
                      <Clock className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-[11px] text-slate-500">זמן הכנה</div>
                      <div className="font-semibold text-slate-800">{recipe.prepTime}</div>
                    </div>
                  </div>
                )}

                {recipe.cookTime && (
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-orange-100 text-orange-700 flex items-center justify-center shrink-0">
                      <Flame className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-[11px] text-slate-500">זמן בישול/אפייה</div>
                      <div className="font-semibold text-slate-800">{recipe.cookTime}</div>
                    </div>
                  </div>
                )}

                {/* Servings Stepper Card */}
                <div className="flex items-center justify-between gap-2 bg-white/80 p-2 rounded-xl border border-amber-200/70 sm:col-span-1">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-8 h-8 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center shrink-0">
                      <Users className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-[11px] text-slate-500 truncate">סועדים / מנות</div>
                      <div className="font-semibold text-slate-900 text-xs truncate">
                        {recipe.servings || `${baseServings} מנות`}
                      </div>
                    </div>
                  </div>

                  {/* Stepper controls */}
                  <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg shrink-0">
                    <button
                      onClick={handleDecreaseServings}
                      className="w-6 h-6 rounded-md bg-white hover:bg-slate-200 text-slate-700 flex items-center justify-center shadow-xs transition"
                      title="הפחת כמות מנות"
                    >
                      <Minus className="w-3 h-3" />
                    </button>
                    <input
                      type="number"
                      min={1}
                      max={100}
                      value={targetServings}
                      onChange={(e) => {
                        const val = parseInt(e.target.value, 10);
                        if (!isNaN(val) && val >= 1) setTargetServings(val);
                      }}
                      className="w-8 text-center text-xs font-bold bg-transparent border-0 p-0 focus:outline-none text-slate-900"
                    />
                    <button
                      onClick={handleIncreaseServings}
                      className="w-6 h-6 rounded-md bg-white hover:bg-slate-200 text-slate-700 flex items-center justify-center shadow-xs transition"
                      title="הגדל כמות מנות"
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Revert to original quantities banner (Appears when scaled) */}
              {isScaled && (
                <div className="p-3 bg-amber-100/70 border border-amber-300 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-2.5 animate-in fade-in slide-in-from-top-2 duration-200 shadow-xs">
                  <div className="flex items-center gap-2 text-xs text-amber-950 font-medium">
                    <Sparkles className="w-4 h-4 text-amber-600 shrink-0" />
                    <span>
                      כמויות המצרכים מותאמות כעת ל-<strong>{targetServings} סועדים</strong> (במקור: {recipe.servings || `${baseServings} מנות`}).
                    </span>
                  </div>

                  <button
                    onClick={handleResetServings}
                    className="px-3 py-1.5 bg-white hover:bg-amber-50 text-amber-900 text-xs font-bold rounded-xl border border-amber-300 transition flex items-center gap-1.5 shrink-0 shadow-sm"
                  >
                    <RotateCcw className="w-3.5 h-3.5 text-amber-700" />
                    <span>חזור לכמויות המקוריות</span>
                  </button>
                </div>
              )}

              {/* Ingredients & Instructions Grid */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                {/* Ingredients column */}
                <div className="md:col-span-5 space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                    <div className="flex items-center gap-2">
                      <h2 className="text-base font-bold text-slate-900 flex items-center gap-1.5">
                        <Utensils className="w-4 h-4 text-amber-600" />
                        <span>מצרכים ({displayedIngredients.length})</span>
                      </h2>
                      {isScaled && (
                        <span className="text-[10px] bg-amber-200/80 text-amber-900 px-2 py-0.5 rounded-full font-bold">
                          {targetServings} מנות
                        </span>
                      )}
                    </div>
                    <span className="text-[11px] text-slate-400">סמן תוך כדי עבודה</span>
                  </div>

                  <div className="space-y-1.5">
                    {displayedIngredients.map((ing, idx) => {
                      const isChecked = Boolean(checkedIngredients[idx]);
                      return (
                        <div
                          key={idx}
                          onClick={() => toggleIngredient(idx)}
                          className={`flex items-start gap-2.5 p-2 rounded-xl cursor-pointer transition text-sm ${
                            isChecked
                              ? 'bg-slate-100/80 text-slate-400 line-through'
                              : isScaled
                              ? 'hover:bg-amber-50/70 text-slate-900 font-medium'
                              : 'hover:bg-amber-50/60 text-slate-800'
                          }`}
                        >
                          <button className="mt-0.5 shrink-0 text-amber-600">
                            {isChecked ? (
                              <CheckSquare className="w-4 h-4 text-emerald-600" />
                            ) : (
                              <Square className="w-4 h-4 text-slate-300" />
                            )}
                          </button>
                          <span className="leading-snug">{ing}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Instructions column */}
                <div className="md:col-span-7 space-y-3">
                  <div className="border-b border-slate-200 pb-2">
                    <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                      <Flame className="w-4 h-4 text-amber-600" />
                      אופן ההכנה ({recipe.instructions.length} שלבים)
                    </h2>
                  </div>

                  <div className="space-y-3">
                    {recipe.instructions.map((step, idx) => (
                      <div
                        key={idx}
                        className="flex items-start gap-3 p-3 rounded-2xl bg-slate-50 border border-slate-100"
                      >
                        <div className="w-6 h-6 rounded-full bg-amber-500 text-white font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                          {idx + 1}
                        </div>
                        <p className="text-sm text-slate-800 leading-relaxed flex-1">{step}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Notes / Tips */}
              {recipe.notes && (
                <div className="p-4 bg-purple-50/60 border border-purple-100 rounded-2xl text-sm">
                  <div className="font-bold text-purple-900 flex items-center gap-1.5 mb-1.5">
                    <Sparkles className="w-4 h-4 text-purple-600" />
                    הערות וטיפים
                  </div>
                  <p className="text-purple-950 text-xs sm:text-sm leading-relaxed whitespace-pre-line">
                    {recipe.notes}
                  </p>
                </div>
              )}
            </>
          ) : (
            /* TAB 2: ORIGINAL RAW PLAIN TEXT */
            <div className="space-y-4">
              <div className="p-4 bg-amber-50/70 border border-amber-200/80 rounded-2xl flex items-center justify-between gap-3 text-xs text-amber-950">
                <div className="flex items-center gap-2">
                  <FileText className="w-5 h-5 text-amber-600 shrink-0" />
                  <div>
                    <div className="font-bold">טקסט גולמי מקורי</div>
                    <div className="text-[11px] text-amber-800">
                      הטקסט המדויק כפי שנשמר בקובץ המקורי (ללא עיבוד AI).
                    </div>
                  </div>
                </div>

                {recipe.rawContent && (
                  <button
                    onClick={handleCopyRaw}
                    className="px-3 py-1.5 bg-white hover:bg-amber-100 text-amber-900 rounded-xl font-medium border border-amber-300 transition flex items-center gap-1.5 shadow-sm"
                  >
                    {copiedRaw ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                        <span>הועתק!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>העתק טקסט</span>
                      </>
                    )}
                  </button>
                )}
              </div>

              <div className="p-5 bg-slate-50 border border-slate-200 rounded-2xl font-mono text-xs leading-relaxed whitespace-pre-wrap text-slate-800 overflow-x-auto">
                {recipe.rawContent || 'אין תוכן גולמי זמין עבור מתכון זה.'}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
