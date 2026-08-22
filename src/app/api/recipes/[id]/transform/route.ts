import { NextRequest, NextResponse } from 'next/server';
import { prisma, ensureDatabaseSchema } from '@/lib/prisma';
import { transformRecipeWithAI } from '@/lib/gemini';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await ensureDatabaseSchema();
    const { id } = await params;
    const body = await req.json().catch(() => ({}));
    const { goal = 'high-protein', customInstructions, previousSuggestions, modelOverride } = body;

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

    let instructions: string[] = [];
    try {
      instructions = JSON.parse(recipe.instructions);
    } catch {
      instructions = recipe.instructions ? [recipe.instructions] : [];
    }

    // Call AI transformer without modifying database
    const transformation = await transformRecipeWithAI(
      {
        title: recipe.title,
        description: recipe.description,
        servings: recipe.servings,
        ingredients,
        instructions,
        notes: recipe.notes,
        caloriesPerServing: recipe.caloriesPerServing,
        proteinGrams: recipe.proteinGrams,
        carbsGrams: recipe.carbsGrams,
        fatGrams: recipe.fatGrams,
        fiberGrams: recipe.fiberGrams,
      },
      goal,
      {
        customInstructions,
        previousSuggestions,
        modelOverride,
      }
    );

    return NextResponse.json({
      success: true,
      originalRecipe: {
        id: recipe.id,
        title: recipe.title,
        caloriesPerServing: recipe.caloriesPerServing,
        proteinGrams: recipe.proteinGrams,
        carbsGrams: recipe.carbsGrams,
        fatGrams: recipe.fatGrams,
      },
      transformation,
    });
  } catch (error: any) {
    console.error('Error transforming recipe with AI:', error);
    return NextResponse.json(
      { error: `שגיאה בהתאמת המתכון: ${error.message || error}` },
      { status: 500 }
    );
  }
}
