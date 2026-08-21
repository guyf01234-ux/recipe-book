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
} from 'lucide-react';

export default function Home() {
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [showBookIntro, setShowBookIntro] = useState(true);

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

  const fetchRecipes = useCallback(async () => {
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
      }
    } catch (err) {
      console.error('Error loading recipes:', err);
    } finally {
      setLoading(false);
    }
  }, [searchQuery, selectedCategory]);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchRecipes();
    }, 200);
    return () => clearTimeout(timer);
  }, [fetchRecipes]);

  const handleRefreshAll = () => {
    fetchCategories();
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
        recipeCount={recipes.length}
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
        {/* Category & Search Filter Bar */}
        <CategoryFilterBar
          categories={categories}
          selectedCategory={selectedCategory}
          onSelectCategory={setSelectedCategory}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          onOpenCategoryManager={() => setIsCategoryManagerOpen(true)}
          totalRecipesCount={recipes.length}
        />

        {/* Recipe Grid / Empty States */}
        {loading ? (
          <div className="py-20 text-center space-y-3">
            <RefreshCw className="w-8 h-8 text-amber-500 animate-spin mx-auto" />
            <p className="text-sm font-medium text-slate-500">טוען את ספר המתכונים...</p>
          </div>
        ) : recipes.length === 0 ? (
          searchQuery || selectedCategory !== 'all' ? (
            /* No search results */
            <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center max-w-lg mx-auto space-y-4 shadow-sm">
              <div className="w-14 h-14 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto">
                <Search className="w-7 h-7" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900">לא נמצאו מתכונים מתאימים</h3>
                <p className="text-xs text-slate-500 mt-1">
                  נסה לשנות את מונח החיפוש או לבחור קטגוריה אחרת
                </p>
              </div>
              <button
                onClick={() => {
                  setSearchQuery('');
                  setSelectedCategory('all');
                }}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium text-xs rounded-xl transition"
              >
                נקה סינון וחיפוש
              </button>
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
