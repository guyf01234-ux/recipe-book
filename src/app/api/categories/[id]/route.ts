import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const { name, color } = body;

    if (!name || typeof name !== 'string' || name.trim() === '') {
      return NextResponse.json(
        { error: 'Category name is required' },
        { status: 400 }
      );
    }

    const trimmedName = name.trim();

    // Check if name is taken by another category
    const existing = await prisma.category.findFirst({
      where: {
        name: trimmedName,
        id: { not: id },
      },
    });

    if (existing) {
      return NextResponse.json(
        { error: 'קטגוריה בשם זה כבר קיימת' },
        { status: 409 }
      );
    }

    const updated = await prisma.category.update({
      where: { id },
      data: {
        name: trimmedName,
        ...(color !== undefined ? { color } : {}),
      },
      include: {
        _count: {
          select: { recipes: true },
        },
      },
    });

    return NextResponse.json(updated);
  } catch (error: any) {
    console.error('Error updating category:', error);
    return NextResponse.json(
      { error: 'Failed to update category' },
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

    // Deleting the category removes the RecipeCategory joins (due to cascade onDelete),
    // while keeping all Recipe records intact.
    await prisma.category.delete({
      where: { id },
    });

    return NextResponse.json({ success: true, message: 'Category deleted successfully' });
  } catch (error: any) {
    console.error('Error deleting category:', error);
    return NextResponse.json(
      { error: 'Failed to delete category' },
      { status: 500 }
    );
  }
}
