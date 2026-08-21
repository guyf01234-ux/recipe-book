'use client';

import React, { useState, useEffect } from 'react';
import { X, Plus, Trash2, Save, Utensils, Flame, Sparkles } from 'lucide-react';
import { Recipe, Category } from '@/types';

interface RecipeFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  recipe?: Recipe | null;
  categories: Category[];
  onSaved: () => void;
}

export const RecipeFormModal: React.FC<RecipeFormModalProps> = ({
  isOpen,
  onClose,
  recipe,
  categories,
  onSaved,
}) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [servings, setServings] = useState('');
  const [prepTime, setPrepTime] = useState('');
  const [cookTime, setCookTime] = useState('');
  const [ingredients, setIngredients] = useState<string[]>(['']);
  const [instructions, setInstructions] = useState<string[]>(['']);
  const [notes, setNotes] = useState('');
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (recipe) {
      setTitle(recipe.title || '');
      setDescription(recipe.description || '');
      setServings(recipe.servings || '');
      setPrepTime(recipe.prepTime || '');
      setCookTime(recipe.cookTime || '');
      setIngredients(recipe.ingredients?.length ? recipe.ingredients : ['']);
      setInstructions(recipe.instructions?.length ? recipe.instructions : ['']);
      setNotes(recipe.notes || '');
      setSelectedCategoryIds(recipe.categories?.map((c) => c.category.id) || []);
    } else {
      setTitle('');
      setDescription('');
      setServings('');
      setPrepTime('');
      setCookTime('');
      setIngredients(['']);
      setInstructions(['']);
      setNotes('');
      setSelectedCategoryIds([]);
    }
    setError(null);
  }, [recipe, isOpen]);

  if (!isOpen) return null;

  const handleAddIngredient = () => {
    setIngredients([...ingredients, '']);
  };

  const handleUpdateIngredient = (index: number, val: string) => {
    const updated = [...ingredients];
    updated[index] = val;
    setIngredients(updated);
  };

  const handleRemoveIngredient = (index: number) => {
    if (ingredients.length === 1) {
      setIngredients(['']);
    } else {
      setIngredients(ingredients.filter((_, i) => i !== index));
    }
  };

  const handleAddInstruction = () => {
    setInstructions([...instructions, '']);
  };

  const handleUpdateInstruction = (index: number, val: string) => {
    const updated = [...instructions];
    updated[index] = val;
    setInstructions(updated);
  };

  const handleRemoveInstruction = (index: number) => {
    if (instructions.length === 1) {
      setInstructions(['']);
    } else {
      setInstructions(instructions.filter((_, i) => i !== index));
    }
  };

  const toggleCategory = (catId: string) => {
    setSelectedCategoryIds((prev) =>
      prev.includes(catId) ? prev.filter((id) => id !== catId) : [...prev, catId]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError('נא להזין שם למתכון');
      return;
    }

    setLoading(true);
    setError(null);

    const filteredIngredients = ingredients.map((i) => i.trim()).filter(Boolean);
    const filteredInstructions = instructions.map((i) => i.trim()).filter(Boolean);

    const payload = {
      title: title.trim(),
      description: description.trim() || undefined,
      servings: servings.trim() || undefined,
      prepTime: prepTime.trim() || undefined,
      cookTime: cookTime.trim() || undefined,
      ingredients: filteredIngredients,
      instructions: filteredInstructions,
      notes: notes.trim() || undefined,
      sourceFile: recipe?.sourceFile || undefined,
      rawContent: recipe?.rawContent || undefined,
      categoryIds: selectedCategoryIds,
    };

    try {
      const url = recipe ? `/api/recipes/${recipe.id}` : '/api/recipes';
      const method = recipe ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'שגיאה בשמירת המתכון');
      }

      onSaved();
      onClose();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 modal-overlay">
      <div className="bg-white rounded-2xl w-full max-w-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-900">
            {recipe ? 'עריכת מתכון' : 'הוספת מתכון חדש'}
          </h2>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-6 flex-1">
          {error && (
            <div className="p-3 bg-red-50 text-red-700 rounded-xl text-xs border border-red-200">
              {error}
            </div>
          )}

          {/* Title */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              שם המתכון <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="למשל: לזניה פטריות ותרד"
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition"
              required
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              תיאור קצר / פתיח
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="תיאור קצר של המנה, טעמים או סיפור קטן מאחוריה..."
              rows={2}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition"
            />
          </div>

          {/* Timing and Servings Row */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">זמן הכנה</label>
              <input
                type="text"
                value={prepTime}
                onChange={(e) => setPrepTime(e.target.value)}
                placeholder="למשל: 20 דקות"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">זמן בישול/אפייה</label>
              <input
                type="text"
                value={cookTime}
                onChange={(e) => setCookTime(e.target.value)}
                placeholder="למשל: 45 דקות"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">כמות מנות</label>
              <input
                type="text"
                value={servings}
                onChange={(e) => setServings(e.target.value)}
                placeholder="למשל: 4-6 מנות"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition"
              />
            </div>
          </div>

          {/* Categories Assignment */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              קטגוריות (שיוך אופציונלי)
            </label>
            {categories.length === 0 ? (
              <p className="text-xs text-slate-400">
                עדיין אין קטגוריות מוגדרות. תוכל להוסיף קטגוריות דרך 'ניהול קטגוריות'.
              </p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {categories.map((cat) => {
                  const isSelected = selectedCategoryIds.includes(cat.id);
                  return (
                    <button
                      type="button"
                      key={cat.id}
                      onClick={() => toggleCategory(cat.id)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-medium transition border ${
                        isSelected
                          ? 'bg-amber-500 text-white border-amber-600 shadow-sm shadow-amber-500/20'
                          : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      {cat.name}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Ingredients List */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <Utensils className="w-4 h-4 text-amber-600" />
                מצרכים
              </label>
              <button
                type="button"
                onClick={handleAddIngredient}
                className="text-xs text-amber-600 hover:text-amber-700 font-semibold flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" />
                הוסף מצרך
              </button>
            </div>

            <div className="space-y-2">
              {ingredients.map((ing, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <span className="text-xs text-slate-400 w-5 text-center">{idx + 1}.</span>
                  <input
                    type="text"
                    value={ing}
                    onChange={(e) => handleUpdateIngredient(idx, e.target.value)}
                    placeholder="למשל: 2 כוסות קמח לבן או 1 כפית מלח"
                    className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition"
                  />
                  <button
                    type="button"
                    onClick={() => handleRemoveIngredient(idx)}
                    className="p-2 text-slate-400 hover:text-red-600 rounded-lg hover:bg-red-50 transition"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Instructions List */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <Flame className="w-4 h-4 text-amber-600" />
                שלבי הכנה
              </label>
              <button
                type="button"
                onClick={handleAddInstruction}
                className="text-xs text-amber-600 hover:text-amber-700 font-semibold flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" />
                הוסף שלב
              </button>
            </div>

            <div className="space-y-2">
              {instructions.map((step, idx) => (
                <div key={idx} className="flex items-start gap-2">
                  <span className="text-xs font-bold text-amber-600 w-6 pt-2 text-center">
                    {idx + 1}.
                  </span>
                  <textarea
                    value={step}
                    onChange={(e) => handleUpdateInstruction(idx, e.target.value)}
                    placeholder={`הוראות לשלב ${idx + 1}...`}
                    rows={2}
                    className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition"
                  />
                  <button
                    type="button"
                    onClick={() => handleRemoveInstruction(idx)}
                    className="p-2 text-slate-400 hover:text-red-600 rounded-lg hover:bg-red-50 transition mt-1"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-purple-600" />
              הערות השף, טיפים ותחליפים
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="טיפים לשדרוג, שמירה במקרר, תחליפים פרווה או טבעוניים..."
              rows={2}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition"
            />
          </div>
        </form>

        {/* Footer */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 font-medium text-sm rounded-xl transition"
          >
            ביטול
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="px-5 py-2 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white font-medium text-sm rounded-xl transition flex items-center gap-1.5 shadow-sm shadow-amber-500/20"
          >
            <Save className="w-4 h-4" />
            <span>{loading ? 'שומר מתכון...' : 'שמור מתכון'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
