'use client';

import React, { useState, useRef } from 'react';
import {
  X,
  UploadCloud,
  FileText,
  FolderUp,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Plus,
  Trash2,
  Utensils,
  Flame,
  Clock,
  Users,
  Loader2,
  Eye,
  Check,
  RotateCcw,
  Layers,
} from 'lucide-react';
import { Category, ParsedRecipe } from '@/types';

interface DropZoneModalProps {
  isOpen: boolean;
  onClose: () => void;
  categories: Category[];
  onRecipeSaved: () => void;
}

interface BatchItem {
  id: string;
  file: File;
  name: string;
  status: 'pending' | 'processing' | 'done' | 'error';
  parsedRecipe?: ParsedRecipe;
  selectedCategoryIds: string[];
  errorMessage?: string;
  saved?: boolean;
}

const SUPPORTED_EXTENSIONS = ['.docx', '.pdf', '.txt', '.md', '.jpg', '.jpeg', '.png', '.webp'];

export const DropZoneModal: React.FC<DropZoneModalProps> = ({
  isOpen,
  onClose,
  categories,
  onRecipeSaved,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [batchItems, setBatchItems] = useState<BatchItem[]>([]);
  const [isProcessingBatch, setIsProcessingBatch] = useState(false);
  const [previewItem, setPreviewItem] = useState<BatchItem | null>(null);
  const [globalCategoryId, setGlobalCategoryId] = useState<string>('');
  const [savingAll, setSavingAll] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const isSupportedFile = (name: string) => {
    const lower = name.toLowerCase();
    return SUPPORTED_EXTENSIONS.some((ext) => lower.endsWith(ext));
  };

  const handleFilesAdded = (files: File[]) => {
    const validFiles = files.filter((f) => isSupportedFile(f.name));
    if (validFiles.length === 0) return;

    const newItems: BatchItem[] = validFiles.map((file) => ({
      id: `${file.name}-${Date.now()}-${Math.random()}`,
      file,
      name: file.name,
      status: 'pending',
      selectedCategoryIds: globalCategoryId ? [globalCategoryId] : [],
    }));

    setBatchItems((prev) => [...prev, ...newItems]);
    // Auto-start processing
    startBatchProcessing([...batchItems, ...newItems]);
  };

  const startBatchProcessing = async (items: BatchItem[]) => {
    setIsProcessingBatch(true);

    const pending = items.filter((item) => item.status === 'pending');
    // Process with concurrency of 2
    const CONCURRENCY = 2;
    let index = 0;

    const processItem = async (item: BatchItem) => {
      // Update status to processing
      setBatchItems((prev) =>
        prev.map((i) => (i.id === item.id ? { ...i, status: 'processing' } : i))
      );

      try {
        const formData = new FormData();
        formData.append('file', item.file);

        const res = await fetch('/api/parse-file', {
          method: 'POST',
          body: formData,
        });

        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || 'שגיאה בפענוח');
        }

        const recipe: ParsedRecipe = data.recipe;

        // Determine category
        let catIds: string[] = [];
        if (globalCategoryId) {
          catIds = [globalCategoryId];
        } else if (recipe.suggestedCategory) {
          const matched = categories.find(
            (c) =>
              c.name.toLowerCase() === recipe.suggestedCategory?.toLowerCase() ||
              recipe.suggestedCategory?.toLowerCase().includes(c.name.toLowerCase())
          );
          if (matched) {
            catIds = [matched.id];
          }
        }

        setBatchItems((prev) =>
          prev.map((i) =>
            i.id === item.id
              ? {
                  ...i,
                  status: 'done',
                  parsedRecipe: recipe,
                  selectedCategoryIds: catIds,
                }
              : i
          )
        );
      } catch (err: any) {
        setBatchItems((prev) =>
          prev.map((i) =>
            i.id === item.id
              ? {
                  ...i,
                  status: 'error',
                  errorMessage: err.message || 'שגיאה בפענוח הקובץ',
                }
              : i
          )
        );
      }
    };

    const worker = async () => {
      while (index < pending.length) {
        const current = pending[index++];
        await processItem(current);
      }
    };

    const workers = Array.from({ length: CONCURRENCY }).map(() => worker());
    await Promise.all(workers);
    setIsProcessingBatch(false);
  };

  // Drag and drop handler with folder traversal
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const items = e.dataTransfer.items;
    const collectedFiles: File[] = [];

    if (items && items.length > 0) {
      const readEntry = async (entry: any) => {
        if (!entry) return;
        if (entry.isFile) {
          const file: File = await new Promise((resolve) => entry.file(resolve));
          if (isSupportedFile(file.name)) {
            collectedFiles.push(file);
          }
        } else if (entry.isDirectory) {
          const dirReader = entry.createReader();
          const entries: any[] = await new Promise((resolve) => {
            dirReader.readEntries(resolve);
          });
          for (const childEntry of entries) {
            await readEntry(childEntry);
          }
        }
      };

      const promises = [];
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (item.webkitGetAsEntry) {
          const entry = item.webkitGetAsEntry();
          if (entry) promises.push(readEntry(entry));
        } else if (item.kind === 'file') {
          const file = item.getAsFile();
          if (file && isSupportedFile(file.name)) {
            collectedFiles.push(file);
          }
        }
      }
      await Promise.all(promises);
    } else if (e.dataTransfer.files) {
      for (let i = 0; i < e.dataTransfer.files.length; i++) {
        collectedFiles.push(e.dataTransfer.files[i]);
      }
    }

    if (collectedFiles.length > 0) {
      handleFilesAdded(collectedFiles);
    }
  };

  const handleSingleSave = async (item: BatchItem) => {
    if (!item.parsedRecipe || !item.parsedRecipe.title.trim()) return;

    const payload = {
      title: item.parsedRecipe.title.trim(),
      description: item.parsedRecipe.description?.trim() || undefined,
      servings: item.parsedRecipe.servings?.trim() || undefined,
      prepTime: item.parsedRecipe.prepTime?.trim() || undefined,
      cookTime: item.parsedRecipe.cookTime?.trim() || undefined,
      ingredients: item.parsedRecipe.ingredients.filter((i) => i.trim()),
      instructions: item.parsedRecipe.instructions.filter((i) => i.trim()),
      notes: item.parsedRecipe.notes?.trim() || undefined,
      sourceFile: item.name,
      rawContent: item.parsedRecipe.rawContent || undefined,
      categoryIds: item.selectedCategoryIds,
    };

    const res = await fetch('/api/recipes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (res.ok) {
      setBatchItems((prev) =>
        prev.map((i) => (i.id === item.id ? { ...i, saved: true } : i))
      );
      onRecipeSaved();
      if (previewItem?.id === item.id) {
        setPreviewItem(null);
      }
    }
  };

  const handleSaveAll = async () => {
    const readyItems = batchItems.filter((i) => i.status === 'done' && !i.saved);
    if (readyItems.length === 0) return;

    setSavingAll(true);
    try {
      for (const item of readyItems) {
        await handleSingleSave(item);
      }
      onRecipeSaved();
    } finally {
      setSavingAll(false);
    }
  };

  const handleRemoveItem = (id: string) => {
    setBatchItems((prev) => prev.filter((i) => i.id !== id));
    if (previewItem?.id === id) {
      setPreviewItem(null);
    }
  };

  const handleRetryItem = (item: BatchItem) => {
    const updated = batchItems.map((i) =>
      i.id === item.id ? { ...i, status: 'pending' as const, errorMessage: undefined } : i
    );
    setBatchItems(updated);
    startBatchProcessing(updated);
  };

  const handleResetAll = () => {
    setBatchItems([]);
    setPreviewItem(null);
    setIsProcessingBatch(false);
  };

  const doneCount = batchItems.filter((i) => i.status === 'done').length;
  const savedCount = batchItems.filter((i) => i.saved).length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 modal-overlay">
      <div className="bg-white rounded-2xl w-full max-w-4xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center">
              <UploadCloud className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">ייבוא קבצים ותיקיות מתכונים</h2>
              <p className="text-xs text-slate-500">
                ייבוא קובץ בודד, מספר קבצים בבת אחת, או תיקייה שלמה מ-Google Drive / המחשב
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              handleResetAll();
              onClose();
            }}
            className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          {/* Top Drop & Upload Area */}
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`border-2 border-dashed rounded-2xl p-6 text-center transition flex flex-col items-center justify-center gap-3 ${
              isDragging
                ? 'border-amber-500 bg-amber-50/60 scale-[0.99]'
                : 'border-slate-300 hover:border-amber-400 hover:bg-amber-50/20'
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept=".docx,.pdf,.txt,.md,.jpg,.jpeg,.png,.webp"
              onChange={(e) => {
                if (e.target.files) handleFilesAdded(Array.from(e.target.files));
              }}
              className="hidden"
            />

            <input
              ref={folderInputRef}
              type="file"
              // @ts-ignore
              webkitdirectory=""
              directory=""
              multiple
              onChange={(e) => {
                if (e.target.files) handleFilesAdded(Array.from(e.target.files));
              }}
              className="hidden"
            />

            <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-600 flex items-center justify-center">
              <UploadCloud className="w-6 h-6" />
            </div>

            <div>
              <p className="text-sm font-bold text-slate-800">
                גרור לכאן קבצי מתכונים או תיקייה שלמה
              </p>
              <p className="text-xs text-slate-500 mt-0.5">
                תומך בקבצי Word (.docx), קבצי PDF, מסמכי Google Docs שיוצאו, קבצי טקסט ותמונות
              </p>
            </div>

            {/* Upload Buttons */}
            <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white font-medium text-xs rounded-xl transition flex items-center gap-1.5 shadow-sm shadow-amber-500/20"
              >
                <FileText className="w-3.5 h-3.5" />
                <span>בחר קבצים (אחד או יותר)</span>
              </button>

              <button
                type="button"
                onClick={() => folderInputRef.current?.click()}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-medium text-xs rounded-xl transition flex items-center gap-1.5 shadow-sm"
              >
                <FolderUp className="w-3.5 h-3.5" />
                <span>בחר תיקייה שלמה</span>
              </button>
            </div>
          </div>

          {/* Batch Progress Bar & Controls */}
          {batchItems.length > 0 && (
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-sm text-slate-900">
                    תור פענוח מתכונים ({batchItems.length} קבצים)
                  </span>
                  {isProcessingBatch && (
                    <span className="flex items-center gap-1 text-xs text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full font-medium">
                      <Loader2 className="w-3 h-3 animate-spin" />
                      מפענח עם Gemini...
                    </span>
                  )}
                </div>

                {/* Bulk Actions */}
                <div className="flex items-center gap-2">
                  {/* Default Category Selector */}
                  <select
                    value={globalCategoryId}
                    onChange={(e) => {
                      const val = e.target.value;
                      setGlobalCategoryId(val);
                      if (val) {
                        setBatchItems((prev) =>
                          prev.map((item) => ({
                            ...item,
                            selectedCategoryIds: [val],
                          }))
                        );
                      }
                    }}
                    className="text-xs bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 text-slate-700 focus:outline-none focus:ring-1 focus:ring-amber-500"
                  >
                    <option value="">שיוך קטגוריה אוטומטי (לפי AI)</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        שייך הכל ל: {c.name}
                      </option>
                    ))}
                  </select>

                  <button
                    onClick={handleResetAll}
                    className="text-xs text-slate-400 hover:text-slate-600 px-2 py-1"
                  >
                    נקה תור
                  </button>
                </div>
              </div>

              {/* Progress bar */}
              <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
                <div
                  className="bg-amber-500 h-full transition-all duration-300"
                  style={{
                    width: `${(doneCount / batchItems.length) * 100}%`,
                  }}
                />
              </div>

              {/* File list items */}
              <div className="divide-y divide-slate-200/70 max-h-60 overflow-y-auto bg-white rounded-xl border border-slate-200">
                {batchItems.map((item) => {
                  return (
                    <div
                      key={item.id}
                      className="p-3 flex items-center justify-between gap-3 text-xs hover:bg-slate-50 transition"
                    >
                      {/* File details & Status */}
                      <div className="flex items-center gap-2.5 min-w-0 flex-1">
                        <div className="w-7 h-7 rounded-lg bg-slate-100 flex items-center justify-center shrink-0">
                          {item.status === 'processing' ? (
                            <Loader2 className="w-4 h-4 text-amber-600 animate-spin" />
                          ) : item.status === 'done' ? (
                            item.saved ? (
                              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                            ) : (
                              <Check className="w-4 h-4 text-amber-600" />
                            )
                          ) : item.status === 'error' ? (
                            <AlertCircle className="w-4 h-4 text-red-500" />
                          ) : (
                            <Clock className="w-4 h-4 text-slate-400" />
                          )}
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="font-semibold text-slate-900 truncate">
                            {item.parsedRecipe?.title || item.name}
                          </div>
                          <div className="text-[11px] text-slate-400 flex items-center gap-2">
                            <span>{item.name}</span>
                            {item.status === 'done' && item.parsedRecipe?.suggestedCategory && (
                              <span className="text-amber-700 bg-amber-50 px-1.5 py-0.2 rounded border border-amber-200/50">
                                {item.parsedRecipe.suggestedCategory}
                              </span>
                            )}
                            {item.errorMessage && (
                              <span className="text-red-600 font-medium">
                                {item.errorMessage}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Actions per item */}
                      <div className="flex items-center gap-1.5 shrink-0">
                        {item.status === 'done' && (
                          <>
                            {item.saved ? (
                              <span className="text-[11px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md font-medium border border-emerald-200">
                                נשמר לספר
                              </span>
                            ) : (
                              <>
                                <button
                                  onClick={() => setPreviewItem(item)}
                                  className="px-2 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center gap-1 font-medium"
                                  title="צפייה ועריכה"
                                >
                                  <Eye className="w-3 h-3" />
                                  <span>ערוך</span>
                                </button>

                                <button
                                  onClick={() => handleSingleSave(item)}
                                  className="px-2.5 py-1 rounded-lg bg-amber-500 hover:bg-amber-600 text-white font-medium shadow-sm"
                                >
                                  שמור
                                </button>
                              </>
                            )}
                          </>
                        )}

                        {item.status === 'error' && (
                          <button
                            onClick={() => handleRetryItem(item)}
                            className="px-2 py-1 rounded-lg bg-red-50 hover:bg-red-100 text-red-700 font-medium flex items-center gap-1"
                          >
                            <RotateCcw className="w-3 h-3" />
                            <span>נסה שוב</span>
                          </button>
                        )}

                        <button
                          onClick={() => handleRemoveItem(item.id)}
                          className="p-1 text-slate-400 hover:text-red-600 rounded"
                          title="הסר מהרשימה"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Individual Recipe Preview/Edit Modal Layer */}
          {previewItem && previewItem.parsedRecipe && (
            <div className="p-5 bg-amber-50/40 border-2 border-amber-300 rounded-2xl space-y-4">
              <div className="flex items-center justify-between border-b border-amber-200 pb-2">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-amber-600" />
                  <span className="font-bold text-sm text-slate-900">
                    תצוגה מקדימה ועריכה: {previewItem.name}
                  </span>
                </div>
                <button
                  onClick={() => setPreviewItem(null)}
                  className="text-xs text-slate-500 hover:text-slate-800"
                >
                  סגור תצוגה מקדימה
                </button>
              </div>

              {/* Title */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">שם המתכון</label>
                <input
                  type="text"
                  value={previewItem.parsedRecipe.title}
                  onChange={(e) => {
                    const updated = { ...previewItem.parsedRecipe!, title: e.target.value };
                    setBatchItems((prev) =>
                      prev.map((i) =>
                        i.id === previewItem.id ? { ...i, parsedRecipe: updated } : i
                      )
                    );
                    setPreviewItem({ ...previewItem, parsedRecipe: updated });
                  }}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-900"
                />
              </div>

              {/* Timing and Servings */}
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">הכנה</label>
                  <input
                    type="text"
                    value={previewItem.parsedRecipe.prepTime || ''}
                    onChange={(e) => {
                      const updated = { ...previewItem.parsedRecipe!, prepTime: e.target.value };
                      setBatchItems((prev) =>
                        prev.map((i) =>
                          i.id === previewItem.id ? { ...i, parsedRecipe: updated } : i
                        )
                      );
                      setPreviewItem({ ...previewItem, parsedRecipe: updated });
                    }}
                    className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">בישול</label>
                  <input
                    type="text"
                    value={previewItem.parsedRecipe.cookTime || ''}
                    onChange={(e) => {
                      const updated = { ...previewItem.parsedRecipe!, cookTime: e.target.value };
                      setBatchItems((prev) =>
                        prev.map((i) =>
                          i.id === previewItem.id ? { ...i, parsedRecipe: updated } : i
                        )
                      );
                      setPreviewItem({ ...previewItem, parsedRecipe: updated });
                    }}
                    className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">מנות</label>
                  <input
                    type="text"
                    value={previewItem.parsedRecipe.servings || ''}
                    onChange={(e) => {
                      const updated = { ...previewItem.parsedRecipe!, servings: e.target.value };
                      setBatchItems((prev) =>
                        prev.map((i) =>
                          i.id === previewItem.id ? { ...i, parsedRecipe: updated } : i
                        )
                      );
                      setPreviewItem({ ...previewItem, parsedRecipe: updated });
                    }}
                    className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs"
                  />
                </div>
              </div>

              {/* Categories */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  שיוך לקטגוריה
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {categories.map((cat) => {
                    const isSelected = previewItem.selectedCategoryIds.includes(cat.id);
                    return (
                      <button
                        type="button"
                        key={cat.id}
                        onClick={() => {
                          const newIds = isSelected
                            ? previewItem.selectedCategoryIds.filter((id) => id !== cat.id)
                            : [...previewItem.selectedCategoryIds, cat.id];
                          setBatchItems((prev) =>
                            prev.map((i) =>
                              i.id === previewItem.id
                                ? { ...i, selectedCategoryIds: newIds }
                                : i
                            )
                          );
                          setPreviewItem({ ...previewItem, selectedCategoryIds: newIds });
                        }}
                        className={`px-2.5 py-1 rounded-lg text-xs font-medium border ${
                          isSelected
                            ? 'bg-amber-500 text-white border-amber-600'
                            : 'bg-white text-slate-600 border-slate-200'
                        }`}
                      >
                        {cat.name}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Save this item */}
              <div className="flex justify-end pt-2">
                <button
                  onClick={() => handleSingleSave(previewItem)}
                  className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold rounded-xl shadow-sm"
                >
                  שמור מתכון זה לספר
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        {batchItems.length > 0 && (
          <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
            <div className="text-xs text-slate-500">
              <span>
                {doneCount} מתוך {batchItems.length} פוענחו
              </span>
              {savedCount > 0 && <span> • {savedCount} כבר נשמרו</span>}
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleResetAll}
                className="px-4 py-2 bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 font-medium text-xs rounded-xl transition"
              >
                סגור ונקה
              </button>

              <button
                onClick={handleSaveAll}
                disabled={savingAll || doneCount === 0 || doneCount === savedCount}
                className="px-6 py-2.5 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white font-bold text-sm rounded-xl transition flex items-center gap-2 shadow-md shadow-amber-500/20"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>
                  {savingAll
                    ? 'שומר את כל המתכונים...'
                    : `שמור את כל המתכונים שפוענחו (${doneCount - savedCount})`}
                </span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
