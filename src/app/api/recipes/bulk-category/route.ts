import { NextRequest, NextResponse } from 'next/server';
import { prisma, ensureDatabaseSchema } from '@/lib/prisma';

export async function POST(req: NextRequest) {
  try {
    await ensureDatabaseSchema();
    const body = await req.json().catch(() => ({}));
    const { recipeIds, categoryId, newCategoryName, mode = 'add' } = body;

    if (!Array.isArray(recipeIds) || recipeIds.length === 0) {
      return NextResponse.json(
        { error: 'חובה לבחור לפחות מתכון אחד לשיוך' },
        { status: 400 }
      );
    }

    let targetCategoryId = categoryId;

    // If creating a new category on the fly
    if (!targetCategoryId && newCategoryName && typeof newCategoryName === 'string') {
      const trimmed = newCategoryName.trim();
      if (trimmed) {
        let cat = await prisma.category.findUnique({
          where: { name: trimmed },
        });
        if (!cat) {
          cat = await prisma.category.create({
            data: { name: trimmed },
          });
        }
        targetCategoryId = cat.id;
      }
    }

    if (!targetCategoryId) {
      return NextResponse.json(
        { error: 'חובה לבחור קטגוריית יעד לשיוך' },
        { status: 400 }
      );
    }

    // Verify category exists
    const category = await prisma.category.findUnique({
      where: { id: targetCategoryId },
    });

    if (!category) {
      return NextResponse.json(
        { error: 'קטגוריית היעד לא נמצאה' },
        { status: 404 }
      );
    }

    // Mode: 'replace' deletes previous categories for these recipes
    if (mode === 'replace') {
      await prisma.recipeCategory.deleteMany({
        where: {
          recipeId: { in: recipeIds },
        },
      });
    }

    // Insert links safely
    let assignedCount = 0;
    for (const recipeId of recipeIds) {
      try {
        await prisma.recipeCategory.upsert({
          where: {
            recipeId_categoryId: {
              recipeId,
              categoryId: targetCategoryId,
            },
          },
          update: {},
          create: {
            recipeId,
            categoryId: targetCategoryId,
          },
        });
        assignedCount++;
      } catch (e) {
        console.warn(`Could not link recipe ${recipeId} to category:`, e);
      }
    }

    return NextResponse.json({
      success: true,
      assignedCount,
      categoryName: category.name,
    });
  } catch (error: any) {
    console.error('Error in bulk category assignment:', error);
    return NextResponse.json(
      { error: `שגיאה בשיוך קטגוריה: ${error.message || error}` },
      { status: 500 }
    );
  }
}
