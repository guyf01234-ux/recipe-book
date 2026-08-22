import { NextRequest, NextResponse } from 'next/server';
import { prisma, ensureDatabaseSchema } from '@/lib/prisma';
import { findMatchingCategoryIds } from '@/lib/hebrewSearch';

export async function GET(req: NextRequest) {
  try {
    await ensureDatabaseSchema();
    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search')?.trim();
    const categoryId = searchParams.get('categoryId');

    const whereClause: any = {};

    // Filter by category
    if (categoryId && categoryId !== 'all') {
      if (categoryId === 'uncategorized') {
        whereClause.categories = {
          none: {},
        };
      } else {
        whereClause.categories = {
          some: {
            categoryId: categoryId,
          },
        };
      }
    }

    // Filter by search query (title, ingredients, notes, description, AND matching categories)
    if (search) {
      // Find matching category IDs based on spelling variants, aliases, and normalizer
      const allCategories = await prisma.category.findMany({ select: { id: true, name: true } });
      const matchedCategoryIds = findMatchingCategoryIds(search, allCategories);

      const orConditions: any[] = [
        { title: { contains: search } },
        { ingredients: { contains: search } },
        { description: { contains: search } },
        { notes: { contains: search } },
      ];

      if (matchedCategoryIds.length > 0) {
        orConditions.push({
          categories: {
            some: {
              categoryId: {
                in: matchedCategoryIds,
              },
            },
          },
        });
      }

      whereClause.OR = orConditions;
    }

    const recipes = await prisma.recipe.findMany({
      where: whereClause,
      orderBy: { createdAt: 'desc' },
      include: {
        categories: {
          include: {
            category: true,
          },
        },
      },
    });

    // Format ingredients and instructions from JSON string to arrays
    const formattedRecipes = recipes.map((recipe) => {
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

      return {
        ...recipe,
        ingredients: parsedIngredients,
        instructions: parsedInstructions,
      };
    });

    return NextResponse.json(formattedRecipes);
  } catch (error: any) {
    console.error('Error fetching recipes:', error);
    return NextResponse.json(
      { error: 'Failed to fetch recipes' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    await ensureDatabaseSchema();
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

    const recipe = await prisma.recipe.create({
      data: {
        title: title.trim(),
        description: description?.trim() || null,
        servings: servings?.trim() || null,
        prepTime: prepTime?.trim() || null,
        cookTime: cookTime?.trim() || null,
        ingredients: ingredientsJson,
        instructions: instructionsJson,
        notes: notes?.trim() || null,
        sourceFile: sourceFile?.trim() || null,
        rawContent: rawContent !== undefined ? rawContent : null,
        caloriesPerServing: typeof caloriesPerServing === 'number' ? caloriesPerServing : null,
        proteinGrams: typeof proteinGrams === 'number' ? proteinGrams : null,
        carbsGrams: typeof carbsGrams === 'number' ? carbsGrams : null,
        fatGrams: typeof fatGrams === 'number' ? fatGrams : null,
        fiberGrams: typeof fiberGrams === 'number' ? fiberGrams : null,
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

    return NextResponse.json(
      {
        ...recipe,
        ingredients: JSON.parse(recipe.ingredients),
        instructions: JSON.parse(recipe.instructions),
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('Error creating recipe:', error);
    return NextResponse.json(
      { error: 'Failed to create recipe' },
      { status: 500 }
    );
  }
}
