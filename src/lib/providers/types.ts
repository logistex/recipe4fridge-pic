export type DetectedIngredient = {
  name: string;
  quantityText?: string;
};

export interface VisionProvider {
  id: string;
  label: string;
  detectIngredients(imageUrls: string[]): Promise<DetectedIngredient[]>;
}

export type RecipePreferences = {
  cuisine?: string | null;
  spiceLevel?: string | null;
  difficulty?: string | null;
  timeLimit?: string | null;
};

export type RecipeResult = {
  title: string;
  ingredients: string[];
  steps: string[];
  estTimeMinutes: number;
};

export interface TextProvider {
  id: string;
  label: string;
  recommendRecipes(input: {
    ingredients: string[];
    preferences: RecipePreferences;
    count: number;
  }): Promise<RecipeResult[]>;
}
