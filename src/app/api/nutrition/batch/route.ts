import { NextRequest, NextResponse } from 'next/server';
import { prisma, ensureDatabaseSchema } from '@/lib/prisma';
import { estimateRecipeNutrition } from '@/lib/gemini';

export async function GET() {
  try {
    await ensureDatabaseSchema();

    const totalCount = await prisma.recipe.count();
    const missingCount = await prisma.recipe.count({
      where: {
        OR: [
          { caloriesPerServing: null },
          { proteinGrams: null },
        ],
      },
    });

    const calculatedCount = totalCount - missingCount;

    return NextResponse.json({
      totalCount,
      missingCount,
      calculatedCount,
    });
  } catch (error: any) {
    console.error('Error getting nutrition stats:', error);
    return NextResponse.json(
      { error: `Failed to get stats: ${error.message || error}` },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    await ensureDatabaseSchema();

    const body = await req.json().catch(() => ({}));
    const { recipeIds, limit = 3, onlyMissing = true, forceAll = false, offset = 0, modelOverride } = body;

    let recipesToProcess;

    if (Array.isArray(recipeIds) && recipeIds.length > 0) {
      recipesToProcess = await prisma.recipe.findMany({
        where: { id: { in: recipeIds } },
      });
    } else if (forceAll) {
      // Force re-calculating all recipes, ordered by createdAt
      recipesToProcess = await prisma.recipe.findMany({
        skip: offset,
        take: limit,
        orderBy: { createdAt: 'desc' },
      });
    } else {
      // Default: Find recipes needing calculation
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

    const totalCount = await prisma.recipe.count();
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

        // Safe pacing delay between recipes (1.2s) to stay under rate limits
        await new Promise((r) => setTimeout(r, 1200));
      } catch (err: any) {
        console.error(`Error estimating recipe ${recipe.title}:`, err);
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
      totalCount,
      nextOffset: forceAll ? offset + recipesToProcess.length : 0,
      hasMore: forceAll ? offset + recipesToProcess.length < totalCount : remainingMissing > 0,
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
