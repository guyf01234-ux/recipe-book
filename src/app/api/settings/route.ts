import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { DEFAULT_MODEL, PRESET_MODELS } from '@/lib/gemini';

export async function GET() {
  try {
    const setting = await prisma.appSetting.findUnique({
      where: { key: 'geminiModel' },
    });

    const activeModel = setting?.value || process.env.GEMINI_MODEL || DEFAULT_MODEL;

    return NextResponse.json({
      model: activeModel,
      presetModels: PRESET_MODELS,
    });
  } catch (error: any) {
    console.error('Error fetching settings:', error);
    return NextResponse.json(
      { error: 'Failed to fetch settings' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { model } = body;

    if (!model || typeof model !== 'string' || model.trim() === '') {
      return NextResponse.json(
        { error: 'Invalid model name' },
        { status: 400 }
      );
    }

    const updated = await prisma.appSetting.upsert({
      where: { key: 'geminiModel' },
      update: { value: model.trim() },
      create: { key: 'geminiModel', value: model.trim() },
    });

    return NextResponse.json({
      success: true,
      model: updated.value,
    });
  } catch (error: any) {
    console.error('Error saving settings:', error);
    return NextResponse.json(
      { error: 'Failed to save settings' },
      { status: 500 }
    );
  }
}
