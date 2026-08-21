import { GoogleGenAI } from '@google/genai';
import { prisma } from './prisma';
import { ParsedRecipe } from '@/types';

// Default model - current active Google models
export const DEFAULT_MODEL = 'gemini-3.7-flash';

// Fallback models in case of high demand (503/429) or retired models (404)
export const FALLBACK_MODELS = [
  'gemini-3.7-flash',
  'gemini-3.5-flash-lite',
  'gemini-3.1-pro-preview',
];

// Available suggested models
export const PRESET_MODELS = [
  { id: 'gemini-3.7-flash', name: 'Gemini 3.7 Flash (מומלץ - הדגם העדכני ביותר)', recommended: true },
  { id: 'gemini-3.5-flash-lite', name: 'Gemini 3.5 Flash-Lite (סופר מהיר וחסכוני)' },
  { id: 'gemini-3.1-pro-preview', name: 'Gemini 3.1 Pro (חשיבה עמוקה)' },
];

export async function getActiveGeminiModel(): Promise<string> {
  try {
    const setting = await prisma.appSetting.findUnique({
      where: { key: 'geminiModel' },
    });
    if (setting?.value && setting.value.trim() !== '') {
      const val = setting.value.trim();
      // If old deprecated 2.5 model is in database, upgrade to 3.7
      if (val.includes('2.5') || val.includes('2.0') || val.includes('1.5')) {
        await prisma.appSetting.update({
          where: { key: 'geminiModel' },
          data: { value: DEFAULT_MODEL },
        });
        return DEFAULT_MODEL;
      }
      return val;
    }
  } catch (err) {
    console.warn('Could not read model from DB, using fallback:', err);
  }
  return process.env.GEMINI_MODEL || DEFAULT_MODEL;
}

export function getGeminiClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not configured in environment variables');
  }
  return new GoogleGenAI({ apiKey });
}

async function generateWithFallback(
  ai: GoogleGenAI,
  primaryModel: string,
  generateParams: { contents: any; config?: any }
) {
  // Build list of models to try
  const modelsToTry = [
    primaryModel,
    ...FALLBACK_MODELS.filter((m) => m !== primaryModel),
  ];
  let lastError: any = null;

  for (const model of modelsToTry) {
    try {
      const response = await ai.models.generateContent({
        model: model,
        ...generateParams,
      });
      return response;
    } catch (err: any) {
      lastError = err;
      const isRetryableError =
        err?.status === 503 ||
        err?.status === 429 ||
        err?.status === 404 ||
        err?.message?.includes('high demand') ||
        err?.message?.includes('no longer available') ||
        err?.message?.includes('Resource has been exhausted') ||
        err?.message?.includes('NOT_FOUND') ||
        err?.message?.includes('UNAVAILABLE');

      if (isRetryableError) {
        console.warn(`Model ${model} failed (${err.message || err.status}), attempting fallback...`);
        continue;
      }
      throw err;
    }
  }

  throw lastError;
}

export async function parseRecipeWithGemini(
  rawText: string,
  fileName?: string,
  modelOverride?: string
): Promise<ParsedRecipe> {
  const ai = getGeminiClient();
  const model = modelOverride || (await getActiveGeminiModel());

  const prompt = `
אתה שף מומחה ועוזר דיגיטלי לספר מתכונים בעברית.
קיבלת תוכן גולמי של מסמך/קובץ מתכון (שם קובץ מקורי: ${fileName || 'לא צוין'}).

עליך לחלץ את פרטי המתכון ולספק אך ורק אובייקט JSON תקין (ללא markdown, ללא \`\`\`json) עם השדות הבאים:
{
  "title": "שם המתכון בעברית (ברור וקצר)",
  "description": "תיאור קצר של המתכון או פתיח (אם קיים, אחרת null)",
  "servings": "כמות מנות (למשל: '4-6 מנות' או 'תבנית 24')",
  "prepTime": "זמן הכנה (למשל: '20 דקות')",
  "cookTime": "זמן בישול/אפייה (למשל: '45 דקות')",
  "ingredients": [
    "רשימת מצרכים כמערך של מחרוזות בעברית עם כמויות ומידות מדויקות",
    "לדוגמה: 2 כוסות קמח לבן",
    "1 כפית אבקת אפייה"
  ],
  "instructions": [
    "שלבי ההכנה כמערך של מחרוזות בעברית בסדר כרונולוגי ברור",
    "שלב 1: לחמם תנור ל-180 מעלות",
    "שלב 2: בקערה לערבב את החומרים היבשים"
  ],
  "notes": "הערות השף, טיפים לשדרוג או תחליפים (אם קיימים)",
  "suggestedCategory": "הצעת קטגוריה מתאימה בעברית מילה אחת או שתיים (למשל: 'איטלקי', 'אסייתי', 'עוגות וקינוחים', 'עיקריות', 'מרקים', 'סלטים', 'מאפים')"
}

הנה תוכן המסמך:
---
${rawText}
---
`;

  try {
    const response = await generateWithFallback(ai, model, {
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
      },
    });

    const responseText = response.text || '';
    const cleaned = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
    const parsed = JSON.parse(cleaned) as ParsedRecipe;

    return {
      title: parsed.title || fileName?.replace(/\.[^/.]+$/, '') || 'מתכון ללא שם',
      description: parsed.description || undefined,
      servings: parsed.servings || undefined,
      prepTime: parsed.prepTime || undefined,
      cookTime: parsed.cookTime || undefined,
      ingredients: Array.isArray(parsed.ingredients) ? parsed.ingredients : [],
      instructions: Array.isArray(parsed.instructions) ? parsed.instructions : [],
      notes: parsed.notes || undefined,
      suggestedCategory: parsed.suggestedCategory || undefined,
    };
  } catch (error: any) {
    console.error('Gemini parsing error:', error);
    throw new Error(`שגיאה בפענוח המתכון באמצעות ה-AI: ${error.message || error}`);
  }
}

export async function chatWithRecipeAI(
  userMessage: string,
  history: { role: 'user' | 'model'; text: string }[] = [],
  recipesSummary: string,
  useWebSearch: boolean = false,
  modelOverride?: string
): Promise<string> {
  const ai = getGeminiClient();
  const model = modelOverride || (await getActiveGeminiModel());

  const systemInstruction = `
אתה שף ועוזר בישול אישי חכם ואדיב בעברית עבור אפליקציית "ספר המתכונים שלי".
יש לך גישה לרשימת המתכונים השמורים של המשתמש.

הנה רשימת המתכונים השמורים של המשתמש:
---
${recipesSummary || 'עדיין אין מתכונים שמורים באפליקציה.'}
---

הנחיות:
1. ענה תמיד בעברית טבעית, חמה ומקצועית, תוך שימוש בכיווניות מימין לשמאל.
2. אם המשתמש שואל מה להכין לפי מצרכים שיש לו בבית, בדוק תחילה אילו מתכונים מהאוסף שלו מתאימים והצע אותם.
3. אם המשתמש שואל שאלות כלליות על בישול, תחליפי מצרכים, או מבקש מתכון חדש שלא באוסף שלו, ספק תשובה עשירה, מפורטת ומדויקת.
4. השתמש בעיצוב Markdown יפה וקריא (הדגשות, רשימות עם תבליטים ומספור).
`;

  const contents: any[] = [];
  contents.push({
    role: 'user',
    parts: [{ text: `${systemInstruction}\n\nהנה שאלת המשתמש:\n${userMessage}` }],
  });

  const config: any = {};
  if (useWebSearch) {
    config.tools = [{ googleSearch: {} }];
  }

  try {
    const response = await generateWithFallback(ai, model, {
      contents: contents,
      config: config,
    });

    return response.text || 'לא התקבלה תשובה מ-Gemini';
  } catch (error: any) {
    console.error('Gemini chat error:', error);
    throw new Error(`AI Chat error: ${error.message || error}`);
  }
}
