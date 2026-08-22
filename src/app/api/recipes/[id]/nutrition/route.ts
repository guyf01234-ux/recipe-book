import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { estimateRecipeNutrition } from '@/lib/gemini';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json().catch(() => ({}));
    const { modelOverride } = body;

    const recipe = await prisma.recipe.findUnique({
      where: { id },
    });

    if (!recipe) {
      return NextResponse.json({ error: 'Recipe not found' }, { status: 404 });
    }

    let ingredients: string[] = [];
    try {
      ingredients = JSON.parse(recipe.ingredients);
    } catch {
      ingredients = recipe.ingredients ? [recipe.ingredients] : [];
    }

    const nutrition = await estimateRecipeNutrition(
      recipe.title,
      ingredients,
      recipe.servings,
      modelOverride
    );

    const updated = await prisma.recipe.update({
      where: { id },
      data: {
        caloriesPerServing: nutrition.caloriesPerServing,
        proteinGrams: nutrition.proteinGrams,
        carbsGrams: nutrition.carbsGrams,
        fatGrams: nutrition.fatGrams,
        fiberGrams: nutrition.fiberGrams,
      },
      include: {
        categories: {
          include: {
            category: true,
          },
        },
      },
    });

    return NextResponse.json({
      success: true,
      nutrition,
      recipe: {
        ...updated,
        ingredients: JSON.parse(updated.ingredients),
        instructions: JSON.parse(updated.instructions),
      },
    });
  } catch (error: any) {
    console.error('Error estimating recipe nutrition:', error);
    return NextResponse.json(
      { error: `שגיאה בחישוב ערכים תזונתיים: ${error.message || error}` },
      { status: 500 }
    );
  }
}
