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
  Loader2,
  Info,
  Wand2,
  ArrowRight,
  MessageSquare,
  Send,
  CheckCircle2,
} from 'lucide-react';
import { Recipe, NutritionSettings, DEFAULT_NUTRITION_SETTINGS, RecipeTransformation } from '@/types';
import { extractBaseServings, scaleIngredientsList, scaleIngredient } from '@/lib/recipeScaler';
import { getNutritionBadges } from '@/lib/nutrition';

interface RecipeDetailModalProps {
  recipe: Recipe | null;
  isOpen: boolean;
  onClose: () => void;
  onEdit: (recipe: Recipe) => void;
  onDelete: (id: string) => Promise<void>;
  onAskAIAboutRecipe?: (recipe: Recipe) => void;
  onRecipeUpdated?: (updatedRecipe: Recipe) => void;
  nutritionSettings?: NutritionSettings;
}

export const RecipeDetailModal: React.FC<RecipeDetailModalProps> = ({
  recipe,
  isOpen,
  onClose,
  onEdit,
  onDelete,
  onAskAIAboutRecipe,
  onRecipeUpdated,
  nutritionSettings = DEFAULT_NUTRITION_SETTINGS,
}) => {
  const [activeTab, setActiveTab] = useState<'formatted' | 'raw'>('formatted');
  const [checkedIngredients, setCheckedIngredients] = useState<Record<number, boolean>>({});
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [copiedRaw, setCopiedRaw] = useState(false);
  const [isCalculatingNutrition, setIsCalculatingNutrition] = useState(false);
  const [localRecipe, setLocalRecipe] = useState<Recipe | null>(recipe);

  // AI Recipe Goal Transformation (100% in-memory / temporary)
  const [transformation, setTransformation] = useState<RecipeTransformation | null>(null);
  const [isTransforming, setIsTransforming] = useState(false);
  const [showCustomInput, setShowCustomInput] = useState(false);
  const [customGoalText, setCustomGoalText] = useState('');
  const [previousSuggestions, setPreviousSuggestions] = useState<string[]>([]);
  const [showIterationBox, setShowIterationBox] = useState(false);
  const [iterationInput, setIterationInput] = useState('');

  // Dynamic Serving Scaler (Non-persistent local state)
  const baseServings = localRecipe ? extractBaseServings(localRecipe.servings) : 4;
  const [targetServings, setTargetServings] = useState<number>(baseServings);

  // Reset all local states whenever modal opens or recipe changes
  useEffect(() => {
    if (recipe) {
      setLocalRecipe(recipe);
      setTargetServings(extractBaseServings(recipe.servings));
      setCheckedIngredients({});
      setTransformation(null);
      setPreviousSuggestions([]);
      setShowCustomInput(false);
      setShowIterationBox(false);
      setCustomGoalText('');
      setIterationInput('');
    }
  }, [recipe]);

  if (!isOpen || !localRecipe) return null;

  const isScaled = targetServings !== baseServings;
  const multiplier = targetServings / (baseServings || 4);

  // Compute active ingredients (either from transformation or original)
  const rawIngredientsList = transformation
    ? transformation.modifiedIngredients.map((item) => item.text)
    : localRecipe.ingredients;

  const displayedIngredients = isScaled
    ? scaleIngredientsList(rawIngredientsList, multiplier)
    : rawIngredientsList;

  // Active instructions (either from transformation or original)
  const displayedInstructions = transformation
    ? transformation.modifiedInstructions
    : localRecipe.instructions;

  // Active nutrition values (transformed or original)
  const activeCalories = transformation
    ? transformation.caloriesPerServing
    : localRecipe.caloriesPerServing;
  const activeProtein = transformation
    ? transformation.proteinGrams
    : localRecipe.proteinGrams;
  const activeCarbs = transformation
    ? transformation.carbsGrams
    : localRecipe.carbsGrams;
  const activeFat = transformation
    ? transformation.fatGrams
    : localRecipe.fatGrams;

  const handleDecreaseServings = () => {
    setTargetServings((prev) => Math.max(1, prev - 1));
  };

  const handleIncreaseServings = () => {
    setTargetServings((prev) => Math.min(100, prev + 1));
  };

  const handleResetServings = () => {
    setTargetServings(baseServings);
  };

  const handleResetToOriginal = () => {
    setTransformation(null);
    setTargetServings(baseServings);
    setCheckedIngredients({});
    setPreviousSuggestions([]);
    setShowCustomInput(false);
    setShowIterationBox(false);
  };

  const handleApplyGoal = async (goal: string, customText?: string) => {
    if (!localRecipe || isTransforming) return;
    setIsTransforming(true);

    try {
      const res = await fetch(`/api/recipes/${localRecipe.id}/transform`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          goal,
          customInstructions: customText || customGoalText,
          previousSuggestions,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'שגיאה בהתאמת המתכון');

      setTransformation(data.transformation);
      setCheckedIngredients({});

      if (data.transformation.chefExplanation) {
        setPreviousSuggestions((prev) => [
          data.transformation.chefExplanation,
          ...prev.slice(0, 5),
        ]);
      }

      setShowCustomInput(false);
      setShowIterationBox(false);
      setIterationInput('');
    } catch (err: any) {
      console.error('Transform error:', err);
      alert(err.message || 'שגיאה בהתאמת המתכון ב-AI');
    } finally {
      setIsTransforming(false);
    }
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
      await onDelete(localRecipe.id);
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
    if (localRecipe.rawContent) {
      navigator.clipboard.writeText(localRecipe.rawContent);
      setCopiedRaw(true);
      setTimeout(() => setCopiedRaw(false), 2000);
    }
  };

  const handleCalculateNutrition = async () => {
    if (!localRecipe || isCalculatingNutrition) return;
    setIsCalculatingNutrition(true);
    try {
      const res = await fetch(`/api/recipes/${localRecipe.id}/nutrition`, {
        method: 'POST',
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to calculate nutrition');

      setLocalRecipe(data.recipe);
      if (onRecipeUpdated) {
        onRecipeUpdated(data.recipe);
      }
    } catch (err: any) {
      console.error('Error calculating nutrition:', err);
      alert(err.message || 'שגיאה בחישוב הערכים התזונתיים');
    } finally {
      setIsCalculatingNutrition(false);
    }
  };

  const categories = localRecipe.categories?.map((c) => c.category) || [];
  const nutritionBadges = getNutritionBadges(
    {
      ...localRecipe,
      caloriesPerServing: activeCalories,
      proteinGrams: activeProtein,
      carbsGrams: activeCarbs,
      fatGrams: activeFat,
    },
    nutritionSettings
  );

  const hasNutritionData = typeof activeCalories === 'number' && activeCalories > 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 modal-overlay">
      <div className="bg-white rounded-2xl w-full max-w-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-150">
        {/* Top Header */}
        <div className="px-6 py-3.5 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
          <div className="flex items-center gap-2">
            <button
              onClick={() => onEdit(localRecipe)}
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
                onClick={() => onAskAIAboutRecipe(localRecipe)}
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
            <span>האם אתה בטוח שברצונך למחוק את המתכון "{localRecipe.title}"?</span>
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
            {localRecipe.rawContent && (
              <span className="text-[10px] px-1.5 py-0.2 bg-slate-100 text-slate-600 rounded-md font-normal">
                מדויק
              </span>
            )}
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-4.5 flex-1">
          {activeTab === 'formatted' ? (
            /* TAB 1: FORMATTED STRUCTURED RECIPE */
            <>
              {/* Title, Category Badges & Nutrition Badges */}
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

                  {/* Nutrition Badges */}
                  {nutritionBadges.map((badge) => (
                    <span
                      key={badge.id}
                      title={badge.description}
                      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold border transition ${badge.bgClass} ${badge.colorClass} ${badge.borderClass}`}
                    >
                      <span>{badge.emoji}</span>
                      <span>{badge.label}</span>
                      <span className="opacity-75 text-[11px]">({badge.valueText})</span>
                    </span>
                  ))}

                  {localRecipe.sourceFile && (
                    <span className="flex items-center gap-1 text-xs text-slate-500 bg-slate-100 px-2.5 py-1 rounded-lg mr-auto">
                      <FileText className="w-3.5 h-3.5 text-slate-400" />
                      קובץ מקור: {localRecipe.sourceFile}
                    </span>
                  )}
                </div>

                <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 mb-2">
                  {transformation ? transformation.modifiedTitle : localRecipe.title}
                </h1>

                {localRecipe.description && !transformation && (
                  <p className="text-slate-600 text-sm sm:text-base leading-relaxed">
                    {localRecipe.description}
                  </p>
                )}
              </div>

              {/* AI Recipe Goal Modifier Action Bar */}
              <div className="p-3 bg-gradient-to-r from-purple-50 via-indigo-50/60 to-purple-50 rounded-2xl border border-purple-200 space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-purple-950">
                    <Wand2 className="w-4 h-4 text-purple-600" />
                    <span>התאמת מתכון חכמה ב-AI לפי יעדים:</span>
                  </div>
                  {isTransforming && (
                    <span className="text-xs text-purple-700 font-bold flex items-center gap-1">
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>מתאים מתכון ב-AI...</span>
                    </span>
                  )}
                </div>

                {/* Quick Goal Action Buttons */}
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    onClick={() => handleApplyGoal('high-protein')}
                    disabled={isTransforming}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1 border ${
                      transformation?.goal === 'high-protein'
                        ? 'bg-emerald-600 text-white border-emerald-700 shadow-sm'
                        : 'bg-white hover:bg-emerald-50 text-emerald-900 border-emerald-200 hover:border-emerald-300'
                    }`}
                  >
                    <span>💪</span>
                    <span>העשר בחלבון</span>
                  </button>

                  <button
                    onClick={() => handleApplyGoal('low-calorie')}
                    disabled={isTransforming}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1 border ${
                      transformation?.goal === 'low-calorie'
                        ? 'bg-amber-600 text-white border-amber-700 shadow-sm'
                        : 'bg-white hover:bg-amber-50 text-amber-900 border-amber-200 hover:border-amber-300'
                    }`}
                  >
                    <span>🥗</span>
                    <span>הפחת קלוריות</span>
                  </button>

                  <button
                    onClick={() => handleApplyGoal('low-carb')}
                    disabled={isTransforming}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1 border ${
                      transformation?.goal === 'low-carb'
                        ? 'bg-indigo-600 text-white border-indigo-700 shadow-sm'
                        : 'bg-white hover:bg-indigo-50 text-indigo-900 border-indigo-200 hover:border-indigo-300'
                    }`}
                  >
                    <span>🥑</span>
                    <span>דל פחמימות / קטו</span>
                  </button>

                  <button
                    onClick={() => handleApplyGoal('vegetarian')}
                    disabled={isTransforming}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1 border ${
                      transformation?.goal === 'vegetarian'
                        ? 'bg-teal-600 text-white border-teal-700 shadow-sm'
                        : 'bg-white hover:bg-teal-50 text-teal-900 border-teal-200 hover:border-teal-300'
                    }`}
                  >
                    <span>🌱</span>
                    <span>גרסה צמחונית</span>
                  </button>

                  <button
                    onClick={() => setShowCustomInput(!showCustomInput)}
                    disabled={isTransforming}
                    className="px-3 py-1.5 rounded-xl text-xs font-bold bg-white hover:bg-purple-50 text-purple-900 border border-purple-200 hover:border-purple-300 transition flex items-center gap-1"
                  >
                    <span>✨</span>
                    <span>יעד חופשי...</span>
                  </button>
                </div>

                {/* Custom Goal Freeform Input Box */}
                {showCustomInput && (
                  <div className="pt-2 border-t border-purple-200/80 flex items-center gap-2 animate-in fade-in duration-150">
                    <input
                      type="text"
                      value={customGoalText}
                      onChange={(e) => setCustomGoalText(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && customGoalText.trim()) {
                          handleApplyGoal('custom', customGoalText.trim());
                        }
                      }}
                      placeholder="לדוגמה: ללא מוצרי חלב, ללא גלוטן, להוסיף ירקות ירוקים..."
                      className="flex-1 px-3 py-1.5 text-xs bg-white border border-purple-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500/20 text-slate-900 placeholder-slate-400"
                    />
                    <button
                      onClick={() => {
                        if (customGoalText.trim()) {
                          handleApplyGoal('custom', customGoalText.trim());
                        }
                      }}
                      disabled={isTransforming || !customGoalText.trim()}
                      className="px-3.5 py-1.5 bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs rounded-xl transition shadow-xs disabled:opacity-50"
                    >
                      התאם מתכון ✨
                    </button>
                  </div>
                )}
              </div>

              {/* Chef's Explanation & Macro Comparison Card (When Transformed) */}
              {transformation && (
                <div className="p-4 bg-gradient-to-br from-amber-50 to-orange-50/40 rounded-2xl border border-amber-200 text-xs space-y-3 animate-in fade-in slide-in-from-top-2 duration-200 shadow-xs">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-amber-200/70 pb-2.5">
                    <div className="flex items-center gap-2 text-amber-950 font-bold text-sm">
                      <span>👨‍🍳</span>
                      <span>הסבר השף להתאמת המתכון ({transformation.goalLabel})</span>
                    </div>

                    {/* Single-Click Revert Button */}
                    <button
                      onClick={handleResetToOriginal}
                      className="px-3 py-1 bg-white hover:bg-amber-100 text-amber-900 font-bold text-xs rounded-xl border border-amber-300 transition flex items-center gap-1.5 self-start sm:self-auto shadow-xs"
                    >
                      <RotateCcw className="w-3.5 h-3.5 text-amber-700" />
                      <span>חזור למתכון המקורי</span>
                    </button>
                  </div>

                  {/* Explanation text */}
                  <p className="text-amber-950/90 leading-relaxed sm:text-xs text-[11px]">
                    {transformation.chefExplanation}
                  </p>

                  {/* Nutrition Comparison Pill Badges */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
                    {/* Calories */}
                    <div className="bg-white/90 p-2 rounded-xl border border-amber-200 text-center">
                      <div className="text-[10px] text-slate-500">קלוריות למנה</div>
                      <div className="font-extrabold text-amber-700 text-xs flex items-center justify-center gap-1">
                        {localRecipe.caloriesPerServing ? (
                          <>
                            <span className="line-through text-slate-400 font-normal text-[11px]">
                              {Math.round(localRecipe.caloriesPerServing)}
                            </span>
                            <ArrowRight className="w-3 h-3 text-slate-400 rotate-180" />
                          </>
                        ) : null}
                        <span>{transformation.caloriesPerServing} קק״ל</span>
                      </div>
                    </div>

                    {/* Protein */}
                    <div className="bg-white/90 p-2 rounded-xl border border-emerald-200 text-center">
                      <div className="text-[10px] text-slate-500">חלבון למנה</div>
                      <div className="font-extrabold text-emerald-700 text-xs flex items-center justify-center gap-1">
                        {localRecipe.proteinGrams ? (
                          <>
                            <span className="line-through text-slate-400 font-normal text-[11px]">
                              {localRecipe.proteinGrams}g
                            </span>
                            <ArrowRight className="w-3 h-3 text-slate-400 rotate-180" />
                          </>
                        ) : null}
                        <span>{transformation.proteinGrams}g</span>
                      </div>
                    </div>

                    {/* Carbs */}
                    <div className="bg-white/90 p-2 rounded-xl border border-indigo-200 text-center">
                      <div className="text-[10px] text-slate-500">פחמימות למנה</div>
                      <div className="font-extrabold text-indigo-700 text-xs flex items-center justify-center gap-1">
                        {localRecipe.carbsGrams ? (
                          <>
                            <span className="line-through text-slate-400 font-normal text-[11px]">
                              {localRecipe.carbsGrams}g
                            </span>
                            <ArrowRight className="w-3 h-3 text-slate-400 rotate-180" />
                          </>
                        ) : null}
                        <span>{transformation.carbsGrams}g</span>
                      </div>
                    </div>

                    {/* Fats */}
                    <div className="bg-white/90 p-2 rounded-xl border border-orange-200 text-center">
                      <div className="text-[10px] text-slate-500">שומנים למנה</div>
                      <div className="font-extrabold text-orange-700 text-xs flex items-center justify-center gap-1">
                        {localRecipe.fatGrams ? (
                          <>
                            <span className="line-through text-slate-400 font-normal text-[11px]">
                              {localRecipe.fatGrams}g
                            </span>
                            <ArrowRight className="w-3 h-3 text-slate-400 rotate-180" />
                          </>
                        ) : null}
                        <span>{transformation.fatGrams}g</span>
                      </div>
                    </div>
                  </div>

                  {/* Feedback & Iteration Controls */}
                  <div className="pt-2 border-t border-amber-200/70 flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleApplyGoal(transformation.goal)}
                        disabled={isTransforming}
                        className="px-3 py-1.5 bg-white hover:bg-amber-100 text-amber-900 rounded-xl font-bold text-[11px] border border-amber-300 transition flex items-center gap-1"
                        title="בקש מ-Gemini כיוון קולינרי חלופי"
                      >
                        <RotateCcw className="w-3 h-3" />
                        <span>לא אהבתי, הצע אפשרות אחרת 🔄</span>
                      </button>

                      <button
                        onClick={() => setShowIterationBox(!showIterationBox)}
                        className="px-3 py-1.5 bg-white hover:bg-amber-100 text-amber-900 rounded-xl font-bold text-[11px] border border-amber-300 transition flex items-center gap-1"
                      >
                        <MessageSquare className="w-3 h-3" />
                        <span>שדרג עוד / הוסף בקשה...</span>
                      </button>
                    </div>
                  </div>

                  {/* Iteration Prompt Input Box */}
                  {showIterationBox && (
                    <div className="pt-2 flex items-center gap-2 animate-in fade-in duration-150">
                      <input
                        type="text"
                        value={iterationInput}
                        onChange={(e) => setIterationInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && iterationInput.trim()) {
                            handleApplyGoal(transformation.goal, iterationInput.trim());
                          }
                        }}
                        placeholder="הוסף דיוק (למשל: בלי טופו, להפחית עוד שמן, להוסיף יותר עשבי תיבול)..."
                        className="flex-1 px-3 py-1.5 text-xs bg-white border border-amber-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500/20 text-slate-900 placeholder-slate-400"
                      />
                      <button
                        onClick={() => {
                          if (iterationInput.trim()) {
                            handleApplyGoal(transformation.goal, iterationInput.trim());
                          }
                        }}
                        disabled={isTransforming || !iterationInput.trim()}
                        className="px-3.5 py-1.5 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-xl transition shadow-xs disabled:opacity-50"
                      >
                        עדכן ✨
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Quick info row with Dynamic Servings Stepper */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-4 bg-amber-50/50 rounded-2xl border border-amber-100 text-sm">
                {localRecipe.prepTime && (
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
                      <Clock className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-[11px] text-slate-500">זמן הכנה</div>
                      <div className="font-semibold text-slate-800">{localRecipe.prepTime}</div>
                    </div>
                  </div>
                )}

                {localRecipe.cookTime && (
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-orange-100 text-orange-700 flex items-center justify-center shrink-0">
                      <Flame className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-[11px] text-slate-500">זמן בישול/אפייה</div>
                      <div className="font-semibold text-slate-800">{localRecipe.cookTime}</div>
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
                        {localRecipe.servings || `${baseServings} מנות`}
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

              {/* Standard Nutrition Macro Bar (If not transformed or in addition) */}
              {!transformation && (
                <div className="p-3.5 bg-gradient-to-r from-slate-50 to-slate-100/70 rounded-2xl border border-slate-200 text-xs">
                  <div className="flex items-center justify-between gap-2 mb-2.5">
                    <div className="font-bold text-slate-800 flex items-center gap-1.5">
                      <span>🥗</span>
                      <span>ערכים תזונתיים משוערים למנה (סועד בודד)</span>
                    </div>

                    <button
                      onClick={handleCalculateNutrition}
                      disabled={isCalculatingNutrition}
                      className="text-[11px] text-amber-700 hover:text-amber-900 bg-white hover:bg-amber-50 px-2 py-0.5 rounded-lg border border-amber-200 flex items-center gap-1 transition disabled:opacity-50"
                    >
                      {isCalculatingNutrition ? (
                        <>
                          <Loader2 className="w-3 h-3 animate-spin" />
                          <span>מחשב ערכים...</span>
                        </>
                      ) : hasNutritionData ? (
                        <>
                          <RotateCcw className="w-3 h-3" />
                          <span>חשב מחדש ב-AI</span>
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-3 h-3 text-purple-600" />
                          <span>חשב ערכים תזונתיים ✨</span>
                        </>
                      )}
                    </button>
                  </div>

                  {hasNutritionData ? (
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
                      <div className="bg-white p-2 rounded-xl border border-slate-200 shadow-xs">
                        <div className="text-[11px] text-slate-500">קלוריות</div>
                        <div className="text-sm font-extrabold text-amber-600">
                          {Math.round(localRecipe.caloriesPerServing || 0)}{' '}
                          <span className="text-[10px] font-normal text-slate-400">קק״ל</span>
                        </div>
                      </div>

                      <div className="bg-white p-2 rounded-xl border border-slate-200 shadow-xs">
                        <div className="text-[11px] text-slate-500">חלבון</div>
                        <div className="text-sm font-extrabold text-emerald-600">
                          {localRecipe.proteinGrams ?? 0}{' '}
                          <span className="text-[10px] font-normal text-slate-400">גרם</span>
                        </div>
                      </div>

                      <div className="bg-white p-2 rounded-xl border border-slate-200 shadow-xs">
                        <div className="text-[11px] text-slate-500">פחמימות</div>
                        <div className="text-sm font-extrabold text-indigo-600">
                          {localRecipe.carbsGrams ?? 0}{' '}
                          <span className="text-[10px] font-normal text-slate-400">גרם</span>
                        </div>
                      </div>

                      <div className="bg-white p-2 rounded-xl border border-slate-200 shadow-xs">
                        <div className="text-[11px] text-slate-500">שומנים</div>
                        <div className="text-sm font-extrabold text-orange-600">
                          {localRecipe.fatGrams ?? 0}{' '}
                          <span className="text-[10px] font-normal text-slate-400">גרם</span>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-2 text-slate-500 text-xs flex items-center justify-center gap-2">
                      <span>טרם חושבו ערכים תזונתיים עבור מתכון זה.</span>
                      <button
                        onClick={handleCalculateNutrition}
                        disabled={isCalculatingNutrition}
                        className="text-purple-700 underline font-bold"
                      >
                        לחץ לחישוב מיידי
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Revert to original quantities banner (Appears when scaled) */}
              {isScaled && !transformation && (
                <div className="p-3 bg-amber-100/70 border border-amber-300 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-2.5 animate-in fade-in slide-in-from-top-2 duration-200 shadow-xs">
                  <div className="flex items-center gap-2 text-xs text-amber-950 font-medium">
                    <Sparkles className="w-4 h-4 text-amber-600 shrink-0" />
                    <span>
                      כמויות המצרכים מותאמות כעת ל-<strong>{targetServings} סועדים</strong> (במקור:{' '}
                      {localRecipe.servings || `${baseServings} מנות`}).
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
                      {transformation && (
                        <span className="text-[10px] bg-purple-100 text-purple-800 px-2 py-0.5 rounded-full font-bold">
                          גרסה מותאמת
                        </span>
                      )}
                    </div>
                    <span className="text-[11px] text-slate-400">סמן תוך כדי עבודה</span>
                  </div>

                  <div className="space-y-2">
                    {displayedIngredients.map((ing, idx) => {
                      const isChecked = Boolean(checkedIngredients[idx]);
                      const modItem = transformation?.modifiedIngredients?.[idx];
                      const changeType = modItem?.changeType || 'unchanged';

                      return (
                        <div
                          key={idx}
                          onClick={() => toggleIngredient(idx)}
                          className={`flex flex-col p-2.5 rounded-xl cursor-pointer transition text-sm ${
                            isChecked
                              ? 'bg-slate-100/80 text-slate-400 line-through'
                              : changeType === 'added'
                              ? 'bg-emerald-50/70 border border-emerald-200 text-emerald-950 font-medium'
                              : changeType === 'substituted'
                              ? 'bg-blue-50/70 border border-blue-200 text-blue-950 font-medium'
                              : changeType === 'reduced'
                              ? 'bg-amber-50/70 border border-amber-200 text-amber-950 font-medium'
                              : isScaled
                              ? 'hover:bg-amber-50/70 text-slate-900 font-medium'
                              : 'hover:bg-amber-50/60 text-slate-800'
                          }`}
                        >
                          <div className="flex items-start gap-2.5">
                            <button className="mt-0.5 shrink-0 text-amber-600">
                              {isChecked ? (
                                <CheckSquare className="w-4 h-4 text-emerald-600" />
                              ) : (
                                <Square className="w-4 h-4 text-slate-300" />
                              )}
                            </button>
                            <span className="leading-snug flex-1">{ing}</span>

                            {/* Change Type Pills */}
                            {changeType === 'added' && (
                              <span className="text-[10px] px-1.5 py-0.5 bg-emerald-200/80 text-emerald-900 rounded font-bold shrink-0">
                                + הוספה
                              </span>
                            )}
                            {changeType === 'substituted' && (
                              <span className="text-[10px] px-1.5 py-0.5 bg-blue-200/80 text-blue-900 rounded font-bold shrink-0">
                                🔄 תחליף
                              </span>
                            )}
                            {changeType === 'reduced' && (
                              <span className="text-[10px] px-1.5 py-0.5 bg-amber-200/80 text-amber-900 rounded font-bold shrink-0">
                                🟡 הופחת
                              </span>
                            )}
                          </div>

                          {/* Original Text & Explanation */}
                          {changeType === 'substituted' && modItem?.originalText && (
                            <div className="text-[11px] text-blue-800/80 mr-6 mt-1 flex items-center gap-1">
                              <span>במקום:</span>
                              <span className="line-through">{modItem.originalText}</span>
                              {modItem.explanation && (
                                <span className="text-slate-500 font-normal">({modItem.explanation})</span>
                              )}
                            </div>
                          )}

                          {changeType === 'added' && modItem?.explanation && (
                            <div className="text-[11px] text-emerald-800/80 mr-6 mt-1">
                              💡 {modItem.explanation}
                            </div>
                          )}
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
                      אופן ההכנה ({displayedInstructions.length} שלבים)
                    </h2>
                  </div>

                  <div className="space-y-3">
                    {displayedInstructions.map((step, idx) => (
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
              {localRecipe.notes && (
                <div className="p-4 bg-purple-50/60 border border-purple-100 rounded-2xl text-sm">
                  <div className="font-bold text-purple-900 flex items-center gap-1.5 mb-1.5">
                    <Sparkles className="w-4 h-4 text-purple-600" />
                    הערות וטיפים
                  </div>
                  <p className="text-purple-950 text-xs sm:text-sm leading-relaxed whitespace-pre-line">
                    {localRecipe.notes}
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

                {localRecipe.rawContent && (
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
                {localRecipe.rawContent || 'אין תוכן גולמי זמין עבור מתכון זה.'}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
