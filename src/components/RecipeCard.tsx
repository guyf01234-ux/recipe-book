'use client';

import React from 'react';
import { Clock, Users, Utensils, FileText, ChevronLeft, Flame } from 'lucide-react';
import { Recipe } from '@/types';

interface RecipeCardProps {
  recipe: Recipe;
  onOpenDetail: (recipe: Recipe) => void;
}

export const RecipeCard: React.FC<RecipeCardProps> = ({ recipe, onOpenDetail }) => {
  const categories = recipe.categories?.map((c) => c.category) || [];
  const ingredientsCount = recipe.ingredients?.length || 0;
  const instructionsCount = recipe.instructions?.length || 0;

  return (
    <div
      onClick={() => onOpenDetail(recipe)}
      className="group bg-white rounded-2xl border border-slate-200/80 hover:border-amber-400/80 shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden flex flex-col cursor-pointer hover:-translate-y-0.5"
    >
      {/* Top Banner with Categories and File Badge */}
      <div className="p-5 pb-3 flex-1 flex flex-col">
        <div className="flex flex-wrap items-center justify-between gap-1.5 mb-2.5">
          <div className="flex flex-wrap gap-1.5">
            {categories.length > 0 ? (
              categories.map((cat) => (
                <span
                  key={cat.id}
                  className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100/80 text-amber-800 border border-amber-200/50"
                >
                  {cat.name}
                </span>
              ))
            ) : (
              <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-500">
                ללא קטגוריה
              </span>
            )}
          </div>

          {recipe.sourceFile && (
            <span
              title={`יובא מהקובץ: ${recipe.sourceFile}`}
              className="flex items-center gap-1 text-[11px] text-slate-400 bg-slate-50 px-2 py-0.5 rounded-md border border-slate-100 max-w-[130px] truncate"
            >
              <FileText className="w-3 h-3 shrink-0" />
              <span className="truncate">{recipe.sourceFile}</span>
            </span>
          )}
        </div>

        {/* Title */}
        <h3 className="text-lg font-bold text-slate-900 group-hover:text-amber-700 transition line-clamp-2 mb-2 leading-snug">
          {recipe.title}
        </h3>

        {/* Description / Notes preview */}
        {recipe.description && (
          <p className="text-xs text-slate-600 line-clamp-2 mb-3 leading-relaxed">
            {recipe.description}
          </p>
        )}

        {/* Time and Servings badges */}
        <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 mt-auto pt-2 border-t border-slate-100">
          {(recipe.prepTime || recipe.cookTime) && (
            <div className="flex items-center gap-1">
              <Clock className="w-3.5 h-3.5 text-amber-500" />
              <span>
                {recipe.prepTime ? `הכנה: ${recipe.prepTime}` : ''}
                {recipe.prepTime && recipe.cookTime ? ' | ' : ''}
                {recipe.cookTime ? `בישול: ${recipe.cookTime}` : ''}
              </span>
            </div>
          )}

          {recipe.servings && (
            <div className="flex items-center gap-1">
              <Users className="w-3.5 h-3.5 text-slate-400" />
              <span>{recipe.servings}</span>
            </div>
          )}
        </div>
      </div>

      {/* Footer Info */}
      <div className="px-5 py-3 bg-slate-50/80 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1">
            <Utensils className="w-3.5 h-3.5 text-slate-400" />
            {ingredientsCount} מצרכים
          </span>
          <span className="flex items-center gap-1">
            <Flame className="w-3.5 h-3.5 text-slate-400" />
            {instructionsCount} שלבים
          </span>
        </div>

        <span className="flex items-center gap-0.5 text-amber-600 font-medium group-hover:translate-x-[-2px] transition">
          צפייה
          <ChevronLeft className="w-4 h-4" />
        </span>
      </div>
    </div>
  );
};
