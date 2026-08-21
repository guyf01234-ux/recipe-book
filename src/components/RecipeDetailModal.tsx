'use client';

import React, { useState } from 'react';
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
} from 'lucide-react';
import { Recipe } from '@/types';

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

  if (!isOpen || !recipe) return null;

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

              {/* Quick info row */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-4 bg-amber-50/50 rounded-2xl border border-amber-100 text-sm">
                {recipe.prepTime && (
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center">
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
                    <div className="w-8 h-8 rounded-xl bg-orange-100 text-orange-700 flex items-center justify-center">
                      <Flame className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-[11px] text-slate-500">זמן בישול/אפייה</div>
                      <div className="font-semibold text-slate-800">{recipe.cookTime}</div>
                    </div>
                  </div>
                )}

                {recipe.servings && (
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center">
                      <Users className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-[11px] text-slate-500">כמות מנות</div>
                      <div className="font-semibold text-slate-800">{recipe.servings}</div>
                    </div>
                  </div>
                )}
              </div>

              {/* Ingredients & Instructions Grid */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                {/* Ingredients column */}
                <div className="md:col-span-5 space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                    <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                      <Utensils className="w-4 h-4 text-amber-600" />
                      מצרכים ({recipe.ingredients.length})
                    </h2>
                    <span className="text-[11px] text-slate-400">סמן תוך כדי עבודה</span>
                  </div>

                  <div className="space-y-1.5">
                    {recipe.ingredients.map((ing, idx) => {
                      const isChecked = Boolean(checkedIngredients[idx]);
                      return (
                        <div
                          key={idx}
                          onClick={() => toggleIngredient(idx)}
                          className={`flex items-start gap-2.5 p-2 rounded-xl cursor-pointer transition text-sm ${
                            isChecked
                              ? 'bg-slate-100/80 text-slate-400 line-through'
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
                    <strong>טקסט מקורי ללא שינוי:</strong> זהו הטקסט המדויק כפי שחולץ מהקובץ המקורי{' '}
                    {recipe.sourceFile ? `(${recipe.sourceFile})` : ''}.
                  </div>
                </div>

                {recipe.rawContent && (
                  <button
                    onClick={handleCopyRaw}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-white border border-amber-300 text-amber-900 hover:bg-amber-100/50 font-medium transition shrink-0"
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

              {recipe.rawContent ? (
                <div className="bg-stone-50 text-slate-800 rounded-2xl border border-stone-200 p-6 shadow-sm overflow-x-auto max-h-[55vh] overflow-y-auto">
                  <div
                    className="font-sans text-sm sm:text-base leading-relaxed sm:leading-loose whitespace-pre-wrap select-text text-slate-800"
                    dir="rtl"
                    style={{ wordBreak: 'break-word' }}
                  >
                    {recipe.rawContent}
                  </div>
                </div>
              ) : (
                <div className="p-10 text-center text-slate-400 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
                  <FileText className="w-8 h-8 mx-auto text-slate-300" />
                  <p className="text-sm">
                    למתכון זה אין טקסט מקור שמור (הוזן ידנית או נוצר ללא קובץ).
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
