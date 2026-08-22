import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const recipe = await prisma.recipe.findUnique({
      where: { id },
      include: {
        categories: {
          include: {
            category: true,
          },
        },
      },
    });

    if (!recipe) {
      return NextResponse.json({ error: 'Recipe not found' }, { status: 404 });
    }

    let parsedIngredients: string[] = [];
    let parsedInstructions: string[] = [];

    try {
      parsedIngredients = JSON.parse(recipe.ingredients);
    } catch {
      parsedIngredients = recipe.ingredients ? [recipe.ingredients] : [];
    }

    try {
      parsedInstructions = JSON.parse(recipe.instructions);
    } catch {
      parsedInstructions = recipe.instructions ? [recipe.instructions] : [];
    }

    return NextResponse.json({
      ...recipe,
      ingredients: parsedIngredients,
      instructions: parsedInstructions,
    });
  } catch (error: any) {
    console.error('Error fetching recipe:', error);
    return NextResponse.json(
      { error: 'Failed to fetch recipe' },
      { status: 500 }
    );
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const {
      title,
      description,
      servings,
      prepTime,
      cookTime,
      ingredients,
      instructions,
      notes,
      sourceFile,
      rawContent,
      caloriesPerServing,
      proteinGrams,
      carbsGrams,
      fatGrams,
      fiberGrams,
      categoryIds,
    } = body;

    if (!title || typeof title !== 'string' || title.trim() === '') {
      return NextResponse.json(
        { error: 'Recipe title is required' },
        { status: 400 }
      );
    }

    const ingredientsJson = JSON.stringify(
      Array.isArray(ingredients) ? ingredients.filter((i) => typeof i === 'string' && i.trim() !== '') : []
    );

    const instructionsJson = JSON.stringify(
      Array.isArray(instructions) ? instructions.filter((i) => typeof i === 'string' && i.trim() !== '') : []
    );

    // First delete existing category links if categoryIds provided
    if (Array.isArray(categoryIds)) {
      await prisma.recipeCategory.deleteMany({
        where: { recipeId: id },
      });
    }

    const updated = await prisma.recipe.update({
      where: { id },
      data: {
        title: title.trim(),
        description: description !== undefined ? description?.trim() || null : undefined,
        servings: servings !== undefined ? servings?.trim() || null : undefined,
        prepTime: prepTime !== undefined ? prepTime?.trim() || null : undefined,
        cookTime: cookTime !== undefined ? cookTime?.trim() || null : undefined,
        ingredients: ingredientsJson,
        instructions: instructionsJson,
        notes: notes !== undefined ? notes?.trim() || null : undefined,
        sourceFile: sourceFile !== undefined ? sourceFile?.trim() || null : undefined,
        rawContent: rawContent !== undefined ? rawContent : undefined,
        caloriesPerServing: caloriesPerServing !== undefined ? (typeof caloriesPerServing === 'number' ? caloriesPerServing : null) : undefined,
        proteinGrams: proteinGrams !== undefined ? (typeof proteinGrams === 'number' ? proteinGrams : null) : undefined,
        carbsGrams: carbsGrams !== undefined ? (typeof carbsGrams === 'number' ? carbsGrams : null) : undefined,
        fatGrams: fatGrams !== undefined ? (typeof fatGrams === 'number' ? fatGrams : null) : undefined,
        fiberGrams: fiberGrams !== undefined ? (typeof fiberGrams === 'number' ? fiberGrams : null) : undefined,
        categories: Array.isArray(categoryIds) && categoryIds.length > 0
          ? {
              create: categoryIds.map((catId: string) => ({
                category: {
                  connect: { id: catId },
                },
              })),
            }
          : undefined,
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
      ...updated,
      ingredients: JSON.parse(updated.ingredients),
      instructions: JSON.parse(updated.instructions),
    });
  } catch (error: any) {
    console.error('Error updating recipe:', error);
    return NextResponse.json(
      { error: 'Failed to update recipe' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await prisma.recipe.delete({
      where: { id },
    });

    return NextResponse.json({ success: true, message: 'Recipe deleted successfully' });
  } catch (error: any) {
    console.error('Error deleting recipe:', error);
    return NextResponse.json(
      { error: 'Failed to delete recipe' },
      { status: 500 }
    );
  }
}
