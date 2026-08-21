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
}

export interface AppSettings {
  geminiModel: string;
}
