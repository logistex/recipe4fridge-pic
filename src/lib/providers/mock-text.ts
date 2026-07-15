import type { TextProvider, RecipeResult } from "./types";

// 실제 텍스트 생성 API 대신, 보유 재료와 겹치는 정도로 점수를 매겨 레시피를 고르는 목(mock) 구현.
// 실제 OpenRouter 텍스트 모델로 교체할 때는 이 파일과 같은 형태로 TextProvider를 구현해
// src/lib/providers/index.ts의 registry에 추가하면 된다.
export type RecipeTemplate = RecipeResult & { requiredAny: string[] };

export const RECIPE_BANK: RecipeTemplate[] = [
  {
    title: "감자채볶음덮밥",
    ingredients: ["감자", "양파", "식용유", "소금"],
    steps: ["감자와 양파를 얇게 채썬다", "팬에 기름을 두르고 중불에 볶는다", "밥 위에 올려 완성"],
    estTimeMinutes: 15,
    requiredAny: ["감자", "양파"],
  },
  {
    title: "두부고추장찌개",
    ingredients: ["두부", "고추장", "대파", "물"],
    steps: ["냄비에 물과 고추장을 풀어 끓인다", "두부와 대파를 넣고 5분 더 끓인다"],
    estTimeMinutes: 20,
    requiredAny: ["두부", "고추장"],
  },
  {
    title: "감자달걀볶음",
    ingredients: ["감자", "계란", "소금"],
    steps: ["감자를 채썰어 팬에 볶는다", "계란을 풀어 함께 볶아 완성"],
    estTimeMinutes: 10,
    requiredAny: ["감자", "계란"],
  },
  {
    title: "애호박당근볶음",
    ingredients: ["애호박", "당근", "식용유"],
    steps: ["애호박과 당근을 채썬다", "팬에 볶아 완성"],
    estTimeMinutes: 12,
    requiredAny: ["애호박", "당근"],
  },
  {
    title: "김치돼지고기볶음",
    ingredients: ["김치", "돼지고기", "양파"],
    steps: ["돼지고기를 먼저 볶는다", "김치와 양파를 넣고 함께 볶는다"],
    estTimeMinutes: 18,
    requiredAny: ["김치", "돼지고기"],
  },
  {
    title: "대파계란볶음밥",
    ingredients: ["대파", "계란", "밥"],
    steps: ["대파를 기름에 볶아 향을 낸다", "계란과 밥을 넣고 볶아 완성"],
    estTimeMinutes: 10,
    requiredAny: ["대파", "계란"],
  },
];

export const mockTextProvider: TextProvider = {
  id: "mock-text-balanced",
  label: "Mock 텍스트 · 균형 (테스트용, 재료 일치 우선)",
  async recommendRecipes({ ingredients, count }) {
    await new Promise((resolve) => setTimeout(resolve, 700));
    const owned = new Set(ingredients);
    const ranked = [...RECIPE_BANK].sort(
      (a, b) =>
        b.requiredAny.filter((i) => owned.has(i)).length -
        a.requiredAny.filter((i) => owned.has(i)).length
    );
    return ranked.slice(0, count).map(({ requiredAny: _requiredAny, ...recipe }) => recipe);
  },
};
