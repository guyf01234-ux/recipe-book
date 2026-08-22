import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { DEFAULT_MODEL, PRESET_MODELS } from '@/lib/gemini';
import { DEFAULT_NUTRITION_SETTINGS, NutritionSettings } from '@/types';

export async function GET() {
  try {
    const modelSetting = await prisma.appSetting.findUnique({
      where: { key: 'geminiModel' },
    });

    const nutritionSetting = await prisma.appSetting.findUnique({
      where: { key: 'nutritionSettings' },
    });

    const activeModel = modelSetting?.value || process.env.GEMINI_MODEL || DEFAULT_MODEL;

    let nutritionSettings: NutritionSettings = DEFAULT_NUTRITION_SETTINGS;
    if (nutritionSetting?.value) {
      try {
        nutritionSettings = {
          ...DEFAULT_NUTRITION_SETTINGS,
          ...JSON.parse(nutritionSetting.value),
        };
      } catch (e) {
        console.warn('Could not parse nutrition settings JSON, using defaults:', e);
      }
    }

    return NextResponse.json({
      model: activeModel,
      presetModels: PRESET_MODELS,
      nutritionSettings,
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
    const { model, nutritionSettings } = body;

    if (model && typeof model === 'string') {
      await prisma.appSetting.upsert({
        where: { key: 'geminiModel' },
        update: { value: model.trim() },
        create: { key: 'geminiModel', value: model.trim() },
      });
    }

    if (nutritionSettings && typeof nutritionSettings === 'object') {
      const sanitized: NutritionSettings = {
        highProteinMin: Number(nutritionSettings.highProteinMin) || DEFAULT_NUTRITION_SETTINGS.highProteinMin,
        lowCalorieMax: Number(nutritionSettings.lowCalorieMax) || DEFAULT_NUTRITION_SETTINGS.lowCalorieMax,
        lowCarbMax: Number(nutritionSettings.lowCarbMax) || DEFAULT_NUTRITION_SETTINGS.lowCarbMax,
        highFiberMin: Number(nutritionSettings.highFiberMin) || DEFAULT_NUTRITION_SETTINGS.highFiberMin,
      };

      await prisma.appSetting.upsert({
        where: { key: 'nutritionSettings' },
        update: { value: JSON.stringify(sanitized) },
        create: { key: 'nutritionSettings', value: JSON.stringify(sanitized) },
      });
    }

    return NextResponse.json({
      success: true,
    });
  } catch (error: any) {
    console.error('Error saving settings:', error);
    return NextResponse.json(
      { error: 'Failed to save settings' },
      { status: 500 }
    );
  }
}
