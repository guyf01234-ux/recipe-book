'use client';

import React, { useState } from 'react';
import { X, Plus, Edit2, Trash2, Check, AlertCircle, FolderPlus } from 'lucide-react';
import { Category } from '@/types';

interface CategoryManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  categories: Category[];
  onRefresh: () => void;
}

export const CategoryManagerModal: React.FC<CategoryManagerModalProps> = ({
  isOpen,
  onClose,
  categories,
  onRefresh,
}) => {
  const [newCategoryName, setNewCategoryName] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCategoryName.trim()) return;

    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newCategoryName.trim() }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'שגיאה ביצירת קטגוריה');
      }

      setNewCategoryName('');
      onRefresh();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleStartEdit = (cat: Category) => {
    setEditingId(cat.id);
    setEditingName(cat.name);
    setError(null);
  };

  const handleSaveEdit = async (id: string) => {
    if (!editingName.trim()) return;

    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/categories/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: editingName.trim() }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'שגיאה בעדכון קטגוריה');
      }

      setEditingId(null);
      setEditingName('');
      onRefresh();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteCategory = async (id: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/categories/${id}`, {
        method: 'DELETE',
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'שגיאה במחיקת קטגוריה');
      }

      setDeletingId(null);
      onRefresh();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 modal-overlay">
      <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[85vh] animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center font-bold">
              <FolderPlus className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">ניהול קטגוריות</h2>
              <p className="text-xs text-slate-500">הוספה, עריכה ומחיקה של קטגוריות מתכונים</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5 overflow-y-auto flex-1">
          {/* Info banner */}
          <div className="p-3 bg-amber-50 rounded-xl border border-amber-200/60 flex items-start gap-2.5 text-xs text-amber-900">
            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <span>
              <strong>שימו לב:</strong> מחיקת קטגוריה <strong>לא תמחק</strong> את המתכונים
              המשויכים אליה, אלא רק תסיר את השיוך של הקטגוריה הזו מהם.
            </span>
          </div>

          {error && (
            <div className="p-3 bg-red-50 text-red-700 rounded-xl text-xs border border-red-200">
              {error}
            </div>
          )}

          {/* Add Category Form */}
          <form onSubmit={handleCreateCategory} className="flex gap-2">
            <input
              type="text"
              value={newCategoryName}
              onChange={(e) => setNewCategoryName(e.target.value)}
              placeholder="שם קטגוריה חדשה (למשל: איטלקי, קינוחים...)"
              className="flex-1 px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition"
            />
            <button
              type="submit"
              disabled={loading || !newCategoryName.trim()}
              className="px-4 py-2.5 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white font-medium text-sm rounded-xl transition flex items-center gap-1.5 shrink-0 shadow-sm shadow-amber-500/20"
            >
              <Plus className="w-4 h-4" />
              <span>הוסף</span>
            </button>
          </form>

          {/* Category List */}
          <div className="space-y-2">
            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              קטגוריות קיימות ({categories.length})
            </h3>

            {categories.length === 0 ? (
              <div className="text-center py-6 text-slate-400 text-sm">
                עדיין אין קטגוריות. צור את הקטגוריה הראשונה למעלה!
              </div>
            ) : (
              <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden">
                {categories.map((cat) => {
                  const isEditing = editingId === cat.id;
                  const isDeleting = deletingId === cat.id;
                  const count = cat._count?.recipes ?? 0;

                  return (
                    <div
                      key={cat.id}
                      className="p-3 bg-white hover:bg-slate-50 flex items-center justify-between gap-3 transition"
                    >
                      {isEditing ? (
                        <div className="flex items-center gap-2 flex-1">
                          <input
                            type="text"
                            value={editingName}
                            onChange={(e) => setEditingName(e.target.value)}
                            className="flex-1 px-2.5 py-1.5 text-sm bg-white border border-amber-400 rounded-lg focus:outline-none"
                            autoFocus
                          />
                          <button
                            onClick={() => handleSaveEdit(cat.id)}
                            disabled={loading || !editingName.trim()}
                            className="p-1.5 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition"
                            title="שמור שינוי"
                          >
                            <Check className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setEditingId(null)}
                            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-200 transition"
                            title="ביטול"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ) : isDeleting ? (
                        <div className="flex items-center justify-between w-full bg-red-50 p-2 rounded-lg text-xs text-red-800">
                          <span>למחוק את "{cat.name}"? ({count} מתכונים יישארו)</span>
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => handleDeleteCategory(cat.id)}
                              disabled={loading}
                              className="px-2 py-1 bg-red-600 text-white rounded font-medium hover:bg-red-700 transition"
                            >
                              כן, מחק
                            </button>
                            <button
                              onClick={() => setDeletingId(null)}
                              className="px-2 py-1 bg-slate-200 text-slate-700 rounded hover:bg-slate-300 transition"
                            >
                              ביטול
                            </button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-sm text-slate-800">{cat.name}</span>
                            <span className="text-xs px-2 py-0.5 bg-slate-100 text-slate-500 rounded-full">
                              {count} מתכונים
                            </span>
                          </div>

                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => handleStartEdit(cat)}
                              className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition"
                              title="ערוך שם"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => setDeletingId(cat.id)}
                              className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                              title="מחק קטגוריה"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-100 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 font-medium text-sm rounded-xl transition"
          >
            סגור
          </button>
        </div>
      </div>
    </div>
  );
};
