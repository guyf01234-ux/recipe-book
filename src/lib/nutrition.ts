import { Recipe, NutritionSettings, DEFAULT_NUTRITION_SETTINGS } from '@/types';

export interface NutritionBadge {
  id: 'high-protein' | 'low-calorie' | 'low-carb' | 'high-fiber';
  label: string;
  emoji: string;
  fullLabel: string;
  description: string;
  colorClass: string;
  bgClass: string;
  borderClass: string;
  valueText: string;
}

export function getNutritionBadges(
  recipe: Recipe,
  settings: NutritionSettings = DEFAULT_NUTRITION_SETTINGS
): NutritionBadge[] {
  const badges: NutritionBadge[] = [];

  const calories = recipe.caloriesPerServing;
  const protein = recipe.proteinGrams;
  const carbs = recipe.carbsGrams;
  const fiber = recipe.fiberGrams;

  // 1. High Protein Badge
  if (typeof protein === 'number' && protein >= settings.highProteinMin) {
    badges.push({
      id: 'high-protein',
      label: 'עשיר בחלבון',
      emoji: '💪',
      fullLabel: 'עשיר בחלבון 💪',
      description: `הגדרה: לפחות ${settings.highProteinMin} גרם חלבון למנה (במתכון זה: ${Math.round(protein)} גרם)`,
      colorClass: 'text-emerald-800',
      bgClass: 'bg-emerald-50',
      borderClass: 'border-emerald-200',
      valueText: `${Math.round(protein)}g חלבון`,
    });
  }

  // 2. Low Calorie Badge
  if (typeof calories === 'number' && calories > 0 && calories <= settings.lowCalorieMax) {
    badges.push({
      id: 'low-calorie',
      label: 'דל קלוריות',
      emoji: '🥗',
      fullLabel: 'דל קלוריות 🥗',
      description: `הגדרה: עד ${settings.lowCalorieMax} קלוריות למנה (במתכון זה: ${Math.round(calories)} קק״ל)`,
      colorClass: 'text-amber-800',
      bgClass: 'bg-amber-50',
      borderClass: 'border-amber-200',
      valueText: `${Math.round(calories)} קק״ל`,
    });
  }

  // 3. Low Carb Badge
  if (typeof carbs === 'number' && carbs >= 0 && carbs <= settings.lowCarbMax) {
    badges.push({
      id: 'low-carb',
      label: 'דל פחמימות',
      emoji: '🥑',
      fullLabel: 'דל פחמימות 🥑',
      description: `הגדרה: עד ${settings.lowCarbMax} גרם פחמימות למנה (במתכון זה: ${Math.round(carbs)} גרם)`,
      colorClass: 'text-indigo-800',
      bgClass: 'bg-indigo-50',
      borderClass: 'border-indigo-200',
      valueText: `${Math.round(carbs)}g פחמימות`,
    });
  }

  // 4. High Fiber Badge
  if (typeof fiber === 'number' && fiber >= settings.highFiberMin) {
    badges.push({
      id: 'high-fiber',
      label: 'עשיר בסיבים',
      emoji: '🌾',
      fullLabel: 'עשיר בסיבים 🌾',
      description: `הגדרה: לפחות ${settings.highFiberMin} גרם סיבים למנה (במתכון זה: ${Math.round(fiber)} גרם)`,
      colorClass: 'text-amber-900',
      bgClass: 'bg-orange-50',
      borderClass: 'border-orange-200',
      valueText: `${Math.round(fiber)}g סיבים`,
    });
  }

  return badges;
}

export function getNutritionFilterDefinitions(settings: NutritionSettings = DEFAULT_NUTRITION_SETTINGS) {
  return [
    {
      id: 'high-protein',
      label: 'עשיר בחלבון 💪',
      emoji: '💪',
      thresholdText: `לפחות ${settings.highProteinMin} גרם חלבון למנה`,
      description: `מציג מתכונים המכילים לפחות ${settings.highProteinMin} גרם חלבון לסועד. (ניתן לשינוי בהגדרות)`,
      color: 'emerald',
    },
    {
      id: 'low-calorie',
      label: 'דל קלוריות 🥗',
      emoji: '🥗',
      thresholdText: `עד ${settings.lowCalorieMax} קלוריות למנה`,
      description: `מציג מתכונים המכילים עד ${settings.lowCalorieMax} קלוריות לסועד. (ניתן לשינוי בהגדרות)`,
      color: 'amber',
    },
    {
      id: 'low-carb',
      label: 'דל פחמימות 🥑',
      emoji: '🥑',
      thresholdText: `עד ${settings.lowCarbMax} גרם פחמימות למנה`,
      description: `מציג מתכונים המכילים עד ${settings.lowCarbMax} גרם פחמימות לסועד. (ניתן לשינוי בהגדרות)`,
      color: 'indigo',
    },
  ];
}

export function filterRecipesByNutrition(
  recipes: Recipe[],
  filterId: string | null,
  settings: NutritionSettings = DEFAULT_NUTRITION_SETTINGS
): Recipe[] {
  if (!filterId) return recipes;

  return recipes.filter((recipe) => {
    if (filterId === 'high-protein') {
      return typeof recipe.proteinGrams === 'number' && recipe.proteinGrams >= settings.highProteinMin;
    }
    if (filterId === 'low-calorie') {
      return typeof recipe.caloriesPerServing === 'number' && recipe.caloriesPerServing > 0 && recipe.caloriesPerServing <= settings.lowCalorieMax;
    }
    if (filterId === 'low-carb') {
      return typeof recipe.carbsGrams === 'number' && recipe.carbsGrams >= 0 && recipe.carbsGrams <= settings.lowCarbMax;
    }
    if (filterId === 'high-fiber') {
      return typeof recipe.fiberGrams === 'number' && recipe.fiberGrams >= settings.highFiberMin;
    }
    return true;
  });
}
