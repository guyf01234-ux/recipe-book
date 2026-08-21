import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getGeminiClient, getActiveGeminiModel, FALLBACK_MODELS } from '@/lib/gemini';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { query, model: modelOverride } = body;

    if (!query || typeof query !== 'string' || !query.trim()) {
      return NextResponse.json(
        { error: 'Search query is required' },
        { status: 400 }
      );
    }

    const trimmedQuery = query.trim();

    // Fetch all user recipes with categories
    const allRecipes = await prisma.recipe.findMany({
      include: {
        categories: {
          include: {
            category: true,
          },
        },
      },
    });

    if (allRecipes.length === 0) {
      return NextResponse.json({
        matchingRecipeIds: [],
        explanation: 'עדיין אין מתכונים שמורים בספר המתכונים.',
        matchedCount: 0,
        modelUsed: modelOverride || 'default',
      });
    }

    // Build concise representation of user's recipe library for the AI
    const recipesContext = allRecipes.map((r) => {
      let ingredientsList = r.ingredients;
      try {
        const parsed = JSON.parse(r.ingredients);
        if (Array.isArray(parsed)) ingredientsList = parsed.join(', ');
      } catch {}

      const categoryNames = r.categories.map((c) => c.category.name).join(', ') || 'ללא קטגוריה';

      return {
        id: r.id,
        title: r.title,
        categories: categoryNames,
        description: r.description || '',
        ingredients: ingredientsList,
        prepTime: r.prepTime || '',
        cookTime: r.cookTime || '',
        notes: r.notes || '',
      };
    });

    const ai = getGeminiClient();
    const initialModel = modelOverride || (await getActiveGeminiModel());

    const prompt = `
אתה שף מומחה ומנוע חיפוש סמנטי אינטליגנטי עבור אפליקציית "ספר המתכונים".
המשתמש חיפש את השאילתה הבאה בעברית:
"${trimmedQuery}"

להלן רשימת כל המתכונים הקיימים בספר המתכונים של המשתמש:
${JSON.stringify(recipesContext, null, 2)}

משימתך:
1. נתח את כוונת המשתמש (למשל: סגנון בישול, מצרכים ספציפיים, העדפות תזונתיות, מהירות הכנה, מנות עיקריות, מתיקות, חריפות, כשרות, או מילות מפתח נרדפות).
2. בחר מתוך הרשימה אך ורק את המתכונים שמתאימים או עונים בצורה הטובה ביותר לשאילתה של המשתמש. סדר אותם לפי רמת ההתאמה (המתאים ביותר ראשון).
3. נסח הסבר תמציתי, חם ומקצועי בעברית (משפט אחד או שניים) המסביר מדוע נבחרו המתכונים האלו עבור השאילתה.

החזר אך ורק אובייקט JSON תקין (ללא markdown, ללא \`\`\`json) במבנה הבא:
{
  "matchingRecipeIds": ["id_מתכון_1", "id_מתכון_2"],
  "explanation": "הסבר קצר בעברית"
}
`;

    // Try models with fallback
    const modelsToTry = [
      initialModel,
      ...FALLBACK_MODELS.filter((m) => m !== initialModel),
    ];

    let lastError: any = null;
    let successfulModel = initialModel;
    let parsedResult: { matchingRecipeIds: string[]; explanation: string } | null = null;

    for (const model of modelsToTry) {
      try {
        const response = await ai.models.generateContent({
          model: model,
          contents: prompt,
          config: {
            responseMimeType: 'application/json',
          },
        });

        const responseText = response.text || '';
        const cleaned = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
        parsedResult = JSON.parse(cleaned);
        successfulModel = model;
        break;
      } catch (err: any) {
        lastError = err;
        const isRetryable =
          err?.status === 503 ||
          err?.status === 429 ||
          err?.status === 404 ||
          err?.message?.includes('high demand') ||
          err?.message?.includes('no longer available') ||
          err?.message?.includes('NOT_FOUND') ||
          err?.message?.includes('UNAVAILABLE');

        if (isRetryable) {
          console.warn(`AI Search model ${model} failed, trying fallback...`);
          continue;
        }
        throw err;
      }
    }

    if (!parsedResult) {
      throw lastError || new Error('Failed to generate AI search results');
    }

    const matchingIds = Array.isArray(parsedResult.matchingRecipeIds)
      ? parsedResult.matchingRecipeIds.filter((id) => allRecipes.some((r) => r.id === id))
      : [];

    return NextResponse.json({
      matchingRecipeIds: matchingIds,
      explanation: parsedResult.explanation || `נמצאו ${matchingIds.length} מתכונים מתאימים`,
      matchedCount: matchingIds.length,
      modelUsed: successfulModel,
    });
  } catch (error: any) {
    console.error('Error in /api/ai/search:', error);
    return NextResponse.json(
      { error: `שגיאה בחיפוש AI: ${error.message || error}` },
      { status: 500 }
    );
  }
}
