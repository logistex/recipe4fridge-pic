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
    // 같은 세션에서 이미 추천했던 레시피 제목들 — 중복/유사 추천을 피하도록
    // 텍스트 API 프롬프트에 "이미 추천했으니 피하라"로 전달한다.
    previousTitles?: string[];
  }): Promise<RecipeResult[]>;
}
