import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { estimateRecipeNutrition } from '@/lib/gemini';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { recipeIds, limit = 10, onlyMissing = true, modelOverride } = body;

    let recipesToProcess;

    if (Array.isArray(recipeIds) && recipeIds.length > 0) {
      recipesToProcess = await prisma.recipe.findMany({
        where: { id: { in: recipeIds } },
      });
    } else {
      // Find recipes needing calculation
      recipesToProcess = await prisma.recipe.findMany({
        where: onlyMissing
          ? {
              OR: [
                { caloriesPerServing: null },
                { proteinGrams: null },
              ],
            }
          : {},
        take: limit,
      });
    }

    const totalMissingCount = await prisma.recipe.count({
      where: {
        OR: [
          { caloriesPerServing: null },
          { proteinGrams: null },
        ],
      },
    });

    const results = [];

    for (const recipe of recipesToProcess) {
      try {
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

        await prisma.recipe.update({
          where: { id: recipe.id },
          data: {
            caloriesPerServing: nutrition.caloriesPerServing,
            proteinGrams: nutrition.proteinGrams,
            carbsGrams: nutrition.carbsGrams,
            fatGrams: nutrition.fatGrams,
            fiberGrams: nutrition.fiberGrams,
          },
        });

        results.push({
          id: recipe.id,
          title: recipe.title,
          status: 'success',
          nutrition,
        });

        // Small pause between recipes to respect Gemini rate limits
        await new Promise((r) => setTimeout(r, 1200));
      } catch (err: any) {
        results.push({
          id: recipe.id,
          title: recipe.title,
          status: 'error',
          error: err.message,
        });
      }
    }

    const remainingMissing = await prisma.recipe.count({
      where: {
        OR: [
          { caloriesPerServing: null },
          { proteinGrams: null },
        ],
      },
    });

    return NextResponse.json({
      processedCount: results.length,
      remainingMissing,
      totalMissingCount,
      results,
    });
  } catch (error: any) {
    console.error('Error in batch nutrition calculation:', error);
    return NextResponse.json(
      { error: `שגיאה בחישוב אצווה: ${error.message || error}` },
      { status: 500 }
    );
  }
}
