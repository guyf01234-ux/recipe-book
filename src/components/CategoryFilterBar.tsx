'use client';

import React from 'react';
import { Search, FolderKanban, X, SlidersHorizontal } from 'lucide-react';
import { Category } from '@/types';

interface CategoryFilterBarProps {
  categories: Category[];
  selectedCategory: string;
  onSelectCategory: (id: string) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onOpenCategoryManager: () => void;
  totalRecipesCount: number;
}

export const CategoryFilterBar: React.FC<CategoryFilterBarProps> = ({
  categories,
  selectedCategory,
  onSelectCategory,
  searchQuery,
  onSearchChange,
  onOpenCategoryManager,
  totalRecipesCount,
}) => {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm space-y-4">
      {/* Search and Manage Row */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
        {/* Search input */}
        <div className="relative flex-1">
          <div className="absolute inset-y-0 right-0 pr-3.5 flex items-center pointer-events-none text-slate-400">
            <Search className="w-5 h-5" />
          </div>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="חיפוש מתכון לפי שם, מצרכים או הערות..."
            className="w-full pr-11 pl-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition text-sm"
          />
          {searchQuery && (
            <button
              onClick={() => onSearchChange('')}
              className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400 hover:text-slate-600"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Manage Categories Button */}
        <button
          onClick={onOpenCategoryManager}
          className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 hover:text-slate-900 font-medium text-sm transition shrink-0"
        >
          <FolderKanban className="w-4 h-4 text-slate-500" />
          <span>ניהול קטגוריות</span>
        </button>
      </div>

      {/* Category Pills Bar */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 pt-0.5 no-scrollbar">
        {/* All Recipes */}
        <button
          onClick={() => onSelectCategory('all')}
          className={`px-3.5 py-1.5 rounded-xl text-sm font-medium transition whitespace-nowrap flex items-center gap-1.5 ${
            selectedCategory === 'all'
              ? 'bg-amber-500 text-white shadow-sm shadow-amber-500/20'
              : 'bg-slate-100 text-slate-600 hover:bg-slate-200/80 hover:text-slate-900'
          }`}
        >
          <span>כל המתכונים</span>
          <span
            className={`text-xs px-1.5 py-0.2 rounded-full ${
              selectedCategory === 'all'
                ? 'bg-amber-600 text-white'
                : 'bg-slate-200 text-slate-600'
            }`}
          >
            {totalRecipesCount}
          </span>
        </button>

        {/* Uncategorized */}
        <button
          onClick={() => onSelectCategory('uncategorized')}
          className={`px-3.5 py-1.5 rounded-xl text-sm font-medium transition whitespace-nowrap flex items-center gap-1.5 ${
            selectedCategory === 'uncategorized'
              ? 'bg-amber-500 text-white shadow-sm shadow-amber-500/20'
              : 'bg-slate-100 text-slate-600 hover:bg-slate-200/80 hover:text-slate-900'
          }`}
        >
          <span>ללא קטגוריה</span>
        </button>

        {/* Dynamic Categories */}
        {categories.map((cat) => {
          const isSelected = selectedCategory === cat.id;
          const count = cat._count?.recipes ?? 0;
          return (
            <button
              key={cat.id}
              onClick={() => onSelectCategory(cat.id)}
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
