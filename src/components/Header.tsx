'use client';

import React from 'react';
import { BookOpen, Plus, UploadCloud, Sparkles, Settings as SettingsIcon, ChefHat } from 'lucide-react';

interface HeaderProps {
  recipeCount: number;
  categoryCount: number;
  onOpenAddModal: () => void;
  onOpenImportModal: () => void;
  onOpenAIChat: () => void;
  onOpenSettings: () => void;
  onReopenBook?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  recipeCount,
  categoryCount,
  onOpenAddModal,
  onOpenImportModal,
  onOpenAIChat,
  onOpenSettings,
  onReopenBook,
}) => {
  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 flex flex-wrap items-center justify-between gap-4">
        {/* Logo and Brand */}
        <div className="flex items-center gap-3">
          <button
            onClick={onReopenBook}
            title="לחץ לפתיחת אנימציית הספר"
            className="w-11 h-11 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center text-white shadow-md shadow-orange-500/20 hover:scale-105 transition active:scale-95 cursor-pointer"
          >
            <ChefHat className="w-6 h-6" />
          </button>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
              ספר המתכונים של שמוליק פייגנבוים
              <span className="text-xs px-2 py-0.5 bg-amber-100 text-amber-800 rounded-full font-medium">
                AI Powered
              </span>
            </h1>
            <div className="text-xs text-slate-500 flex items-center gap-2 mt-0.5">
              <span>{recipeCount} מתכונים</span>
              <span>•</span>
              <span>{categoryCount} קטגוריות</span>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center flex-wrap gap-2 sm:gap-3">
          {/* Replay Book Intro */}
          {onReopenBook && (
            <button
              onClick={onReopenBook}
              title="צפה שוב באנימציית פתיחת הספר"
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-amber-50 text-amber-800 border border-amber-200/80 font-medium text-xs hover:bg-amber-100 transition active:scale-95"
            >
              <BookOpen className="w-3.5 h-3.5 text-amber-600" />
              <span className="hidden sm:inline">פתיחת ספר</span>
            </button>
          )}

          {/* AI Assistant Button */}
          <button
            onClick={onOpenAIChat}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-medium text-sm hover:from-purple-700 hover:to-indigo-700 transition shadow-sm shadow-purple-500/20 active:scale-95"
          >
            <Sparkles className="w-4 h-4" />
            <span>שאל את השף AI</span>
          </button>

          {/* Import File Button */}
          <button
            onClick={onOpenImportModal}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-amber-50 text-amber-800 border border-amber-200/80 font-medium text-sm hover:bg-amber-100 transition active:scale-95"
          >
            <UploadCloud className="w-4 h-4 text-amber-600" />
            <span>ייבוא קובץ / גרירה</span>
          </button>

          {/* Add Recipe Button */}
          <button
            onClick={onOpenAddModal}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-900 text-white font-medium text-sm hover:bg-slate-800 transition active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>מתכון חדש</span>
          </button>

          {/* Settings Button */}
          <button
            onClick={onOpenSettings}
            title="הגדרות"
            className="p-2 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition border border-slate-200 active:scale-95"
          >
            <SettingsIcon className="w-5 h-5" />
          </button>
        </div>
      </div>
    </header>
  );
};
