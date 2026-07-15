import type { TextProvider } from "./types";
import { RECIPE_BANK } from "./mock-text";

// mock-text-balanced와 같은 레시피 데이터를 쓰되, "재료 일치도"보다 "조리 시간이 짧은 것"을
// 우선순위로 두는 두 번째 목(mock) 구현. "여러 무료 API 중 선택 가능" UI를 검증하기 위한 옵션.
export const mockTextQuickProvider: TextProvider = {
  id: "mock-text-quick",
  label: "Mock 텍스트 · 빠른 한 그릇 (테스트용, 조리 시간 우선)",
  async recommendRecipes({ ingredients, count }) {
    await new Promise((resolve) => setTimeout(resolve, 500));
    const owned = new Set(ingredients);
    const matching = RECIPE_BANK.filter((r) => r.requiredAny.some((i) => owned.has(i)));
    const pool = matching.length > 0 ? matching : RECIPE_BANK;
    const ranked = [...pool].sort((a, b) => a.estTimeMinutes - b.estTimeMinutes);
    return ranked.slice(0, count).map(({ requiredAny: _requiredAny, ...recipe }) => recipe);
  },
};
