export interface Category {
  id: string;
  name: string;
  color?: string | null;
  createdAt?: string;
  _count?: {
    recipes: number;
  };
}

export interface Recipe {
  id: string;
  title: string;
  description?: string | null;
  servings?: string | null;
  prepTime?: string | null;
  cookTime?: string | null;
  ingredients: string[]; // parsed JSON array
  instructions: string[]; // parsed JSON array
  notes?: string | null;
  sourceFile?: string | null;
  rawContent?: string | null;
  caloriesPerServing?: number | null;
  proteinGrams?: number | null;
  carbsGrams?: number | null;
  fatGrams?: number | null;
  fiberGrams?: number | null;
  createdAt: string;
  updatedAt: string;
  categories?: {
    category: Category;
  }[];
}

export interface ParsedRecipe {
  title: string;
  description?: string;
  servings?: string;
  prepTime?: string;
  cookTime?: string;
  ingredients: string[];
  instructions: string[];
  notes?: string;
  suggestedCategory?: string;
  rawContent?: string;
  caloriesPerServing?: number | null;
  proteinGrams?: number | null;
  carbsGrams?: number | null;
  fatGrams?: number | null;
  fiberGrams?: number | null;
}

export interface NutritionSettings {
  highProteinMin: number; // e.g. 25 grams
  lowCalorieMax: number;  // e.g. 400 calories
  lowCarbMax: number;     // e.g. 15 grams
  highFiberMin: number;   // e.g. 6 grams
}

export const DEFAULT_NUTRITION_SETTINGS: NutritionSettings = {
  highProteinMin: 25,
  lowCalorieMax: 400,
  lowCarbMax: 15,
  highFiberMin: 6,
};

export interface AppSettings {
  geminiModel: string;
  nutritionSettings?: NutritionSettings;
}
