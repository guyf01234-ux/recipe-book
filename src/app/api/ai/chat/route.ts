import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { chatWithRecipeAI } from '@/lib/gemini';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { message, history = [], useWebSearch = false, modelOverride } = body;

    if (!message || typeof message !== 'string' || message.trim() === '') {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 });
    }

    // Fetch all recipes to provide as context
    const recipes = await prisma.recipe.findMany({
      include: {
        categories: {
          include: {
            category: true,
          },
        },
      },
    });

    // Build a concise recipe summary for context
    const recipesSummary = recipes
      .map((r, idx) => {
        let ingredients: string[] = [];
        try {
          ingredients = JSON.parse(r.ingredients);
        } catch {
          ingredients = [r.ingredients];
        }
        const cats = r.categories.map((c) => c.category.name).join(', ') || 'ללא קטגוריה';
        return `${idx + 1}. **${r.title}** (קטגוריות: ${cats})
- זמן הכנה: ${r.prepTime || 'לא צוין'}, בישול: ${r.cookTime || 'לא צוין'}, מנות: ${r.servings || 'לא צוין'}
- מצרכים: ${ingredients.slice(0, 8).join(', ')}${ingredients.length > 8 ? ' ועוד...' : ''}`;
      })
      .join('\n\n');

    const reply = await chatWithRecipeAI(
      message.trim(),
      history,
      recipesSummary,
      Boolean(useWebSearch),
      modelOverride || undefined
    );

    return NextResponse.json({ response: reply });
  } catch (error: any) {
    console.error('Error in /api/ai/chat:', error);
    return NextResponse.json(
      { error: `שגיאה במענה מ-Gemini: ${error.message || error}` },
      { status: 500 }
    );
  }
}
