import { GoogleGenAI } from '@google/genai';
import { prisma } from './prisma';
import { ParsedRecipe } from '@/types';

// Default model - current active Google models
export const DEFAULT_MODEL = 'gemini-3.7-flash';

// Fallback models with active free tier quotas
export const FALLBACK_MODELS = [
  'gemini-3.7-flash',
  'gemini-3.5-flash-lite',
];

// Available suggested models
export const PRESET_MODELS = [
  { id: 'gemini-3.7-flash', name: 'Gemini 3.7 Flash (מומלץ - הדגם העדכני ביותר)', recommended: true },
  { id: 'gemini-3.5-flash-lite', name: 'Gemini 3.5 Flash-Lite (סופר מהיר וחסכוני - מומלץ לכמויות גדולות)' },
  { id: 'gemini-3.1-pro-preview', name: 'Gemini 3.1 Pro (חשיבה עמוקה - דורש חשבון Pay-As-You-Go)' },
];

export async function getActiveGeminiModel(): Promise<string> {
  try {
    const setting = await prisma.appSetting.findUnique({
      where: { key: 'geminiModel' },
    });
    if (setting?.value && setting.value.trim() !== '') {
      const val = setting.value.trim();
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

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function robustJsonParse<T = any>(jsonStr: string): T {
  try {
    return JSON.parse(jsonStr);
  } catch (e) {
    let fixed = jsonStr.replace(/([\u0590-\u05FF])"([\u0590-\u05FF])/g, "$1'$2");
    fixed = fixed.replace(/([\u0590-\u05FF])"(?!\s*[,:\]\}])/g, "$1'$2");
    fixed = fixed.replace(/(?<![:\[,]\s*)"([\u0590-\u05FF])/g, "'$1");

    try {
      return JSON.parse(fixed);
    } catch (e2) {
      const extractArray = (key: string): string[] => {
        const match = jsonStr.match(new RegExp(`"${key}"\\s*:\\s*\\[([\\s\\S]*?)\\]`));
        if (!match) return [];
        return match[1]
          .split('\n')
          .map((line) =>
            line
              .trim()
              .replace(/^"/, '')
              .replace(/",?$/, '')
              .replace(/\\"/g, '"')
              .trim()
          )
          .filter(Boolean);
      };

      const extractString = (key: string): string => {
        const match = jsonStr.match(new RegExp(`"${key}"\\s*:\\s*"([\\s\\S]*?)(?<!\\\\)"`));
        return match ? match[1] : '';
      };

      const extractNumber = (key: string): number | undefined => {
        const match = jsonStr.match(new RegExp(`"${key}"\\s*:\\s*([0-9]+(?:\\.[0-9]+)?)`));
        return match ? parseFloat(match[1]) : undefined;
      };

      return {
        title: extractString('title'),
        description: extractString('description'),
        servings: extractString('servings'),
        prepTime: extractString('prepTime'),
        cookTime: extractString('cookTime'),
        ingredients: extractArray('ingredients'),
        instructions: extractArray('instructions'),
        notes: extractString('notes'),
        suggestedCategory: extractString('suggestedCategory'),
        caloriesPerServing: extractNumber('caloriesPerServing'),
        proteinGrams: extractNumber('proteinGrams'),
        carbsGrams: extractNumber('carbsGrams'),
        fatGrams: extractNumber('fatGrams'),
        fiberGrams: extractNumber('fiberGrams'),
      } as unknown as T;
    }
  }
}

async function generateWithFallback(
  ai: GoogleGenAI,
  primaryModel: string,
  generateParams: { contents: any; config?: any }
) {
  const modelsToTry = [
    primaryModel,
    ...FALLBACK_MODELS.filter((m) => m !== primaryModel),
  ];
  let lastError: any = null;

  for (const model of modelsToTry) {
    for (let attempt = 0; attempt < 4; attempt++) {
      try {
        const response = await ai.models.generateContent({
          model: model,
          ...generateParams,
        });
        return response;
      } catch (err: any) {
        lastError = err;
        const errStr = String(err?.message || '') + String(err?.status || '');
        const isRateLimit =
          err?.status === 429 ||
          errStr.includes('429') ||
          errStr.includes('RESOURCE_EXHAUSTED') ||
          errStr.includes('Quota exceeded') ||
          errStr.includes('rate-limits');

        if (isRateLimit && attempt < 3) {
          // Exponential backoff: 3s, 6s, 12s + jitter
          const waitTime = Math.min(15000, Math.pow(2, attempt) * 3000 + Math.random() * 1000);
          console.warn(`[Gemini API] Rate limit (429) on ${model}, waiting ${(waitTime / 1000).toFixed(1)}s before retry (attempt ${attempt + 1}/4)...`);
          await sleep(waitTime);
          continue;
        }

        const isRetryableError =
          isRateLimit ||
          err?.status === 503 ||
          err?.status === 404 ||
          errStr.includes('503') ||
          errStr.includes('high demand') ||
          errStr.includes('no longer available') ||
          errStr.includes('NOT_FOUND') ||
          errStr.includes('UNAVAILABLE');

        if (isRetryableError) {
          console.warn(`[Gemini API] Model ${model} failed, switching to next fallback model...`);
          break;
        }
        throw err;
      }
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
אתה שף מומחה ותזונאי דיגיטלי לספר מתכונים בעברית.
קיבלת תוכן גולמי של מסמך/קובץ מתכון (שם קובץ מקורי: ${fileName || 'לא צוין'}).

עליך לחלץ את פרטי המתכון ולהעריך את הערכים התזונתיים למנה אחת (לסועד בודד).
החזר אך ורק אובייקט JSON תקין (ללא markdown, ללא \`\`\`json) עם השדות הבאים:
{
  "title": "שם המתכון בעברית (ברור וקצר)",
  "description": "תיאור קצר של המתכון או פתיח (אם קיים, אחרת null)",
  "servings": "כמות מנות (למשל: '4-6 מנות' או 'תבנית 24')",
  "prepTime": "זמן הכנה (למשל: '20 דקות')",
  "cookTime": "זמן בישול/אפייה (למשל: '45 דקות')",
  "ingredients": [
    "רשימת מצרכים כמערך של מחרוזות בעברית עם כמויות ומידות מדויקות"
  ],
  "instructions": [
    "שלבי ההכנה כמערך של מחרוזות בעברית בסדר כרונולוגי ברור"
  ],
  "notes": "הערות השף, טיפים לשדרוג או תחליפים (אם קיימים)",
  "suggestedCategory": "הצעת קטגוריה מתאימה בעברית מילה אחת או שתיים (למשל: 'איטלקי', 'אסייתי', 'עוגות וקינוחים', 'עיקריות', 'מרקים', 'סלטים', 'מאפים')",
  "caloriesPerServing": 450,
  "proteinGrams": 32,
  "carbsGrams": 24,
  "fatGrams": 16,
  "fiberGrams": 4
}

חשוב מאוד:
1. אם יש במצרכים או בהוראות גרשיים עבריים או קיצורים (כמו תפו"א, ק"ג, ס"מ), השתמש בגרש בודד (') כדי לשמור על תקינות מחרוזות ה-JSON!
2. הערכים התזונתיים (caloriesPerServing, proteinGrams, carbsGrams, fatGrams, fiberGrams) חייבים להיות מספרים בלבד המייצגים את הערך למנה אחת (סועד בודד).
3. אם כמות המנות לא צוינה, חשב לפי 4 מנות בסיס.

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

    const text = response.text || '';
    const cleaned = text.replace(/```json/g, '').replace(/```/g, '').trim();
    const parsed = robustJsonParse<ParsedRecipe>(cleaned);

    return {
      title: parsed.title || '',
      description: parsed.description || '',
      servings: parsed.servings || '',
      prepTime: parsed.prepTime || '',
      cookTime: parsed.cookTime || '',
      ingredients: Array.isArray(parsed.ingredients) ? parsed.ingredients : [],
      instructions: Array.isArray(parsed.instructions) ? parsed.instructions : [],
      notes: parsed.notes || '',
      suggestedCategory: parsed.suggestedCategory || '',
      caloriesPerServing: typeof parsed.caloriesPerServing === 'number' ? Math.round(parsed.caloriesPerServing) : null,
      proteinGrams: typeof parsed.proteinGrams === 'number' ? Math.round(parsed.proteinGrams * 10) / 10 : null,
      carbsGrams: typeof parsed.carbsGrams === 'number' ? Math.round(parsed.carbsGrams * 10) / 10 : null,
      fatGrams: typeof parsed.fatGrams === 'number' ? Math.round(parsed.fatGrams * 10) / 10 : null,
      fiberGrams: typeof parsed.fiberGrams === 'number' ? Math.round(parsed.fiberGrams * 10) / 10 : null,
    };
  } catch (error: any) {
    console.error('Gemini parsing error:', error);
    throw new Error(`Failed to parse recipe with AI: ${error.message || error}`);
  }
}

/**
 * Dedicated nutrition estimator for existing recipes.
 */
export async function estimateRecipeNutrition(
  title: string,
  ingredients: string[],
  servings?: string | null,
  modelOverride?: string
): Promise<{
  caloriesPerServing: number;
  proteinGrams: number;
  carbsGrams: number;
  fatGrams: number;
  fiberGrams: number;
}> {
  const ai = getGeminiClient();
  const model = modelOverride || (await getActiveGeminiModel());

  const prompt = `
אתה תזונאי קליני ושף מומחה.
הערך את הערכים התזונתיים הממוצעים למנה אחת (סועד בודד) עבור המתכון הבא:

שם המתכון: ${title}
כמות מנות: ${servings || 'לא צוין (הנח 4 מנות)'}

מצרכים:
${ingredients.map((i, idx) => `${idx + 1}. ${i}`).join('\n')}

החזר אך ורק אובייקט JSON תקין (ללא markdown) במבנה הבא עם מספרים שלמים או עשרוניים בלבד:
{
  "caloriesPerServing": 450,
  "proteinGrams": 32,
  "carbsGrams": 24,
  "fatGrams": 16,
  "fiberGrams": 4
}
`;

  try {
    const response = await generateWithFallback(ai, model, {
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
      },
    });

    const text = response.text || '';
    const cleaned = text.replace(/```json/g, '').replace(/```/g, '').trim();
    const parsed = robustJsonParse<any>(cleaned);

    return {
      caloriesPerServing: typeof parsed.caloriesPerServing === 'number' ? Math.round(parsed.caloriesPerServing) : 0,
      proteinGrams: typeof parsed.proteinGrams === 'number' ? Math.round(parsed.proteinGrams * 10) / 10 : 0,
      carbsGrams: typeof parsed.carbsGrams === 'number' ? Math.round(parsed.carbsGrams * 10) / 10 : 0,
      fatGrams: typeof parsed.fatGrams === 'number' ? Math.round(parsed.fatGrams * 10) / 10 : 0,
      fiberGrams: typeof parsed.fiberGrams === 'number' ? Math.round(parsed.fiberGrams * 10) / 10 : 0,
    };
  } catch (error: any) {
    console.error('Nutrition estimation error:', error);
    throw new Error(`Failed to estimate nutrition: ${error.message || error}`);
  }
}

export async function askGeminiChef(
  question: string,
  currentRecipeContext?: string,
  modelOverride?: string
): Promise<string> {
  const ai = getGeminiClient();
  const model = modelOverride || (await getActiveGeminiModel());

  const prompt = `
אתה שף מקצועי, חם, אוהב ומלא ידע בספר המתכונים המשפחתי "ספר המתכונים של שמוליק פייגנבוים".
ענה תמיד בעברית טבעית, חמה, קולחת ומזמינה.
${currentRecipeContext ? `הנה המתכון שהמשתמש צופה בו כרגע:\n${currentRecipeContext}\n` : ''}
שאלה של המשתמש:
${question}
`;

  try {
    const response = await generateWithFallback(ai, model, {
      contents: prompt,
    });

    return response.text || 'מצטער, לא הצלחתי לעבד את התשובה. אנא נסה שוב.';
  } catch (error: any) {
    console.error('Gemini Chef error:', error);
    throw new Error(`שגיאה בתקשורת עם שף ה-AI: ${error.message || error}`);
  }
}

export async function chatWithRecipeAI(
  message: string,
  history: Array<{ role: 'user' | 'model'; parts: Array<{ text: string }> }>,
  recipesSummary: string,
  useWebSearch: boolean = false,
  modelOverride?: string
): Promise<string> {
  const ai = getGeminiClient();
  const model = modelOverride || (await getActiveGeminiModel());

  const systemInstruction = `
אתה שף מומחה ועוזר קולי דיגיטלי לספר המתכונים המשפחתי "ספר המתכונים של שמוליק פייגנבוים".
ענה תמיד בעברית בלבד.
היה מסביר פנים, מקצועי, יצירתי, חם ונעים.
הנה רשימת כל המתכונים הקיימים בספר המשפחתי כרגע:
---
${recipesSummary}
---
אם המשתמש שואל על מתכונים בספר, השתמש ברשימה זו.
אם הוא שואל שאלות בישול כלליות או המרות, ענה מתוך הידע הקולינרי שלך.
`;

  const contents = [
    ...history,
    {
      role: 'user' as const,
      parts: [{ text: message }],
    },
  ];

  const config: any = {
    systemInstruction,
  };

  if (useWebSearch) {
    config.tools = [{ googleSearch: {} }];
  }

  try {
    const response = await generateWithFallback(ai, model, {
      contents,
      config,
    });

    return response.text || 'לא התקבלה תשובה מ-Gemini.';
  } catch (error: any) {
    console.error('chatWithRecipeAI error:', error);
    throw error;
  }
}
