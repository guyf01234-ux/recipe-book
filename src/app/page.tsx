'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Header,
} from '@/components/Header';
import { CategoryFilterBar } from '@/components/CategoryFilterBar';
import { RecipeCard } from '@/components/RecipeCard';
import { RecipeDetailModal } from '@/components/RecipeDetailModal';
import { RecipeFormModal } from '@/components/RecipeFormModal';
import { DropZoneModal } from '@/components/DropZoneModal';
import { CategoryManagerModal } from '@/components/CategoryManagerModal';
import { AIChatDrawer } from '@/components/AIChatDrawer';
import { SettingsModal } from '@/components/SettingsModal';
import { BookOpeningIntro } from '@/components/BookOpeningIntro';
import { Recipe, Category } from '@/types';
import {
  Plus,
  UploadCloud,
  Sparkles,
  BookOpen,
  Search,
  ChefHat,
  RefreshCw,
  X,
  Cpu,
  ArrowRight,
} from 'lucide-react';

export default function Home() {
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [totalAllRecipesCount, setTotalAllRecipesCount] = useState<number>(0);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [showBookIntro, setShowBookIntro] = useState(true);

  // AI Search State
  const [selectedAIModel, setSelectedAIModel] = useState<string>('gemini-3.7-flash');
  const [isAISearching, setIsAISearching] = useState<boolean>(false);
  const [isAISearchActive, setIsAISearchActive] = useState<boolean>(false);
  const [aiSearchExplanation, setAiSearchExplanation] = useState<string>('');
  const [aiSearchQuery, setAiSearchQuery] = useState<string>('');
  const [aiModelUsed, setAiModelUsed] = useState<string>('');

  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isAIChatOpen, setIsAIChatOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isCategoryManagerOpen, setIsCategoryManagerOpen] = useState(false);
  const [viewingRecipe, setViewingRecipe] = useState<Recipe | null>(null);
  const [editingRecipe, setEditingRecipe] = useState<Recipe | null>(null);
  const [aiInitialPrompt, setAiInitialPrompt] = useState<string>('');

  const fetchCategories = useCallback(async () => {
    try {
      const res = await fetch('/api/categories');
      if (res.ok) {
        const data = await res.json();
        setCategories(data);
      }
    } catch (err) {
      console.error('Error loading categories:', err);
    }
  }, []);

  const fetchTotalCount = useCallback(async () => {
    try {
      const res = await fetch('/api/recipes');
      if (res.ok) {
        const data = await res.json();
        setTotalAllRecipesCount(data.length);
      }
    } catch (err) {
      console.error('Error loading total recipes count:', err);
    }
  }, []);

  const fetchRecipes = useCallback(async () => {
    // If AI search is active, don't override with regular fetch
    if (isAISearchActive) return;

    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (searchQuery.trim()) {
        params.append('search', searchQuery.trim());
      }
      if (selectedCategory && selectedCategory !== 'all') {
        params.append('categoryId', selectedCategory);
      }

      const res = await fetch(`/api/recipes?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setRecipes(data);
        if (!searchQuery.trim() && selectedCategory === 'all') {
          setTotalAllRecipesCount(data.length);
        }
      }
    } catch (err) {
      console.error('Error loading recipes:', err);
    } finally {
      setLoading(false);
    }
  }, [searchQuery, selectedCategory, isAISearchActive]);

  useEffect(() => {
    fetchCategories();
    fetchTotalCount();
  }, [fetchCategories, fetchTotalCount]);

  useEffect(() => {
    if (!isAISearchActive) {
      const timer = setTimeout(() => {
        fetchRecipes();
      }, 200);
      return () => clearTimeout(timer);
    }
  }, [fetchRecipes, isAISearchActive]);

  const handleTriggerAISearch = async (modelToUse?: string) => {
    if (!searchQuery.trim()) return;

    setIsAISearching(true);
    setLoading(true);
    const model = modelToUse || selectedAIModel;

    try {
      // Fetch all recipes to populate from IDs
      const allRes = await fetch('/api/recipes');
      const allData: Recipe[] = allRes.ok ? await allRes.json() : [];

      const res = await fetch('/api/ai/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: searchQuery.trim(), model }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'שגיאה בחיפוש AI');
      }

      const matchedIds: string[] = data.matchingRecipeIds || [];
      // Order recipes by the order returned by AI
      const matchedRecipes = matchedIds
        .map((id) => allData.find((r) => r.id === id))
        .filter((r): r is Recipe => Boolean(r));

      setRecipes(matchedRecipes);
      setAiSearchExplanation(data.explanation || '');
      setAiSearchQuery(searchQuery.trim());
      setAiModelUsed(data.modelUsed || model);
      setIsAISearchActive(true);
    } catch (err: any) {
      console.error('AI Search failed:', err);
      alert(err.message || 'שגיאה בביצוע חיפוש AI');
    } finally {
      setIsAISearching(false);
      setLoading(false);
    }
  };

  const handleClearAISearch = () => {
    setIsAISearchActive(false);
    setAiSearchExplanation('');
    setAiSearchQuery('');
    setAiModelUsed('');
    fetchRecipes();
  };

  const handleRefreshAll = () => {
    setIsAISearchActive(false);
    setAiSearchExplanation('');
    fetchCategories();
    fetchTotalCount();
    fetchRecipes();
  };

  const handleDeleteRecipe = async (id: string) => {
    try {
      const res = await fetch(`/api/recipes/${id}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        if (viewingRecipe?.id === id) {
          setViewingRecipe(null);
        }
        handleRefreshAll();
      }
    } catch (err) {
      console.error('Error deleting recipe:', err);
    }
  };

  const handleEditRecipe = (recipe: Recipe) => {
    setViewingRecipe(null);
    setEditingRecipe(recipe);
  };

  const handleAskAIAboutRecipe = (recipe: Recipe) => {
    setViewingRecipe(null);
    setAiInitialPrompt(`הנה המתכון "${recipe.title}". איך אפשר לשדרג אותו או להכין גרסה מיוחדת שלו?`);
    setIsAIChatOpen(true);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* 3D Antique Book Opening Intro */}
      {showBookIntro && (
        <BookOpeningIntro onComplete={() => setShowBookIntro(false)} />
      )}

      {/* Header */}
      <Header
        recipeCount={totalAllRecipesCount}
        categoryCount={categories.length}
        onOpenAddModal={() => {
          setEditingRecipe(null);
          setIsAddModalOpen(true);
        }}
        onOpenImportModal={() => setIsImportModalOpen(true)}
        onOpenAIChat={() => {
          setAiInitialPrompt('');
          setIsAIChatOpen(true);
        }}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onReopenBook={() => setShowBookIntro(true)}
      />

      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex-1 w-full space-y-6">
        {/* Category & Search Filter Bar with AI Search and Model Selection */}
        <CategoryFilterBar
          categories={categories}
          selectedCategory={selectedCategory}
          onSelectCategory={(catId) => {
            if (isAISearchActive) handleClearAISearch();
            setSelectedCategory(catId);
          }}
          searchQuery={searchQuery}
          onSearchChange={(q) => {
            setSearchQuery(q);
            if (isAISearchActive && !q.trim()) {
              handleClearAISearch();
            }
          }}
          onOpenCategoryManager={() => setIsCategoryManagerOpen(true)}
          totalRecipesCount={totalAllRecipesCount}
          onTriggerAISearch={handleTriggerAISearch}
          isAISearching={isAISearching}
          isAISearchActive={isAISearchActive}
          onClearAISearch={handleClearAISearch}
          selectedAIModel={selectedAIModel}
          onSelectAIModel={setSelectedAIModel}
        />

        {/* Active AI Search Banner */}
        {isAISearchActive && (
          <div className="p-4 bg-gradient-to-r from-purple-50 via-indigo-50 to-purple-50 border border-purple-200 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-sm animate-in fade-in duration-200">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-xl bg-purple-600 text-white flex items-center justify-center shrink-0 shadow-sm">
                <Sparkles className="w-5 h-5" />
              </div>
              <div className="space-y-0.5">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-bold text-sm text-purple-950">
                    תוצאות חיפוש AI חכם עבור: "{aiSearchQuery}"
                  </span>
                  <span className="text-xs px-2 py-0.5 bg-purple-200/80 text-purple-900 rounded-full font-medium">
                    {recipes.length} מתכונים מתאימים
                  </span>
                  {aiModelUsed && (
                    <span className="text-[11px] px-2 py-0.5 bg-white border border-purple-200 text-purple-700 rounded-lg font-mono">
                      מודל: {aiModelUsed}
                    </span>
                  )}
                </div>
                {aiSearchExplanation && (
                  <p className="text-xs text-purple-800 leading-relaxed">
                    {aiSearchExplanation}
                  </p>
                )}
              </div>
            </div>

            <button
              onClick={handleClearAISearch}
              className="px-3 py-1.5 bg-white border border-purple-200 hover:bg-purple-100 text-purple-900 text-xs font-semibold rounded-xl transition flex items-center gap-1.5 self-end sm:self-auto shrink-0 shadow-sm"
            >
              <X className="w-3.5 h-3.5" />
              <span>חזור לחיפוש רגיל</span>
            </button>
          </div>
        )}

        {/* Recipe Grid / Empty States */}
        {loading ? (
          <div className="py-20 text-center space-y-3">
            <RefreshCw className="w-8 h-8 text-amber-500 animate-spin mx-auto" />
            <p className="text-sm font-medium text-slate-500">
              {isAISearching ? 'Gemini מנתח את כל המתכונים שלך...' : 'טוען את ספר המתכונים...'}
            </p>
          </div>
        ) : recipes.length === 0 ? (
          searchQuery || selectedCategory !== 'all' || isAISearchActive ? (
            /* No search results */
            <div className="bg-white rounded-2xl border border-slate-200 p-10 text-center max-w-lg mx-auto space-y-4 shadow-sm">
              <div className="w-14 h-14 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto">
                <Search className="w-7 h-7" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900">
                  {isAISearchActive
                    ? 'לא נמצאו מתכונים שתואמים לבקשה זו'
                    : 'לא נמצאו מתכונים בחיפוש הרגיל'}
                </h3>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                  {isAISearchActive
                    ? 'נסה לנסח את השאילתה במילים אחרות או לחזור לחיפוש הרגיל'
                    : 'רוצה לנסות לחפש בעזרת בינה מלאכותית שתבין את ההקשר והמצרכים?'}
                </p>
              </div>

              <div className="flex items-center justify-center gap-2 pt-1">
                {!isAISearchActive && searchQuery.trim() && (
                  <button
                    onClick={() => handleTriggerAISearch(selectedAIModel)}
                    className="px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-bold text-xs rounded-xl transition shadow-md flex items-center gap-1.5"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                    <span>נסה חיפוש AI חכם ✨</span>
                  </button>
                )}

                <button
                  onClick={() => {
                    setSearchQuery('');
                    setSelectedCategory('all');
                    if (isAISearchActive) handleClearAISearch();
                  }}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium text-xs rounded-xl transition"
                >
                  נקה סינון וחיפוש
                </button>
              </div>
            </div>
          ) : (
            /* Completely Empty State */
            <div className="bg-white rounded-3xl border border-slate-200 p-10 sm:p-14 text-center max-w-2xl mx-auto shadow-sm space-y-6">
              <div className="w-20 h-20 rounded-3xl bg-gradient-to-tr from-amber-500 to-orange-500 text-white flex items-center justify-center mx-auto shadow-lg shadow-amber-500/20">
                <ChefHat className="w-10 h-10" />
              </div>

              <div className="space-y-2">
                <h2 className="text-2xl font-bold text-slate-900">ספר המתכונים שלך עדיין ריק</h2>
                <p className="text-sm text-slate-500 max-w-md mx-auto leading-relaxed">
                  התחל להוסיף את המתכונים שלך על ידי גרירת קבצי Word, PDF, או הזנה ידנית.
                  Gemini יחלץ עבורך אוטומטית את כל המצרכים והשלבים!
                </p>
              </div>

              <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
                <button
                  onClick={() => setIsImportModalOpen(true)}
                  className="w-full sm:w-auto px-5 py-3 rounded-2xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-sm transition shadow-md shadow-amber-500/20 flex items-center justify-center gap-2"
                >
                  <UploadCloud className="w-4 h-4" />
                  <span>ייבוא קובץ ראשון (גרירה)</span>
                </button>

                <button
                  onClick={() => {
                    setEditingRecipe(null);
                    setIsAddModalOpen(true);
                  }}
                  className="w-full sm:w-auto px-5 py-3 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-medium text-sm transition flex items-center justify-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  <span>הזנת מתכון ידנית</span>
                </button>
              </div>
            </div>
          )
        ) : (
          /* Recipe Cards Grid */
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-5">
            {recipes.map((recipe) => (
              <RecipeCard
                key={recipe.id}
                recipe={recipe}
                onOpenDetail={(r) => setViewingRecipe(r)}
              />
            ))}
          </div>
        )}
      </main>

      {/* Detail Modal */}
      <RecipeDetailModal
        recipe={viewingRecipe}
        isOpen={Boolean(viewingRecipe)}
        onClose={() => setViewingRecipe(null)}
        onEdit={handleEditRecipe}
        onDelete={handleDeleteRecipe}
        onAskAIAboutRecipe={handleAskAIAboutRecipe}
      />

      {/* Add / Edit Form Modal */}
      <RecipeFormModal
        isOpen={isAddModalOpen || Boolean(editingRecipe)}
        onClose={() => {
          setIsAddModalOpen(false);
          setEditingRecipe(null);
        }}
        recipe={editingRecipe}
        categories={categories}
        onSaved={handleRefreshAll}
      />

      {/* Drop Zone File Import Modal */}
      <DropZoneModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        categories={categories}
        onRecipeSaved={handleRefreshAll}
      />

      {/* Category Manager Modal */}
      <CategoryManagerModal
        isOpen={isCategoryManagerOpen}
        onClose={() => setIsCategoryManagerOpen(false)}
        categories={categories}
        onRefresh={handleRefreshAll}
      />

      {/* Settings Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
      />

      {/* AI Chat Drawer */}
      <AIChatDrawer
        isOpen={isAIChatOpen}
        onClose={() => setIsAIChatOpen(false)}
        recipes={recipes}
        initialPrompt={aiInitialPrompt}
      />
    </div>
  );
}
