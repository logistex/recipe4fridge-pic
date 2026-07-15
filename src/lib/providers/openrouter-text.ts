import type { TextProvider, RecipeResult } from "./types";
import { chatJson } from "./openrouter-client";

const MODEL = process.env.OPENROUTER_TEXT_MODEL || "meta-llama/llama-3.3-70b-instruct:free";

const CUISINE_LABEL: Record<string, string> = {
  korean: "한식",
  western: "양식",
  chinese: "중식",
  japanese: "일식",
};
const SPICE_LABEL: Record<string, string> = { none: "안 매움", medium: "보통 매움", hot: "매움" };
const DIFFICULTY_LABEL: Record<string, string> = { easy: "쉬움", medium: "보통", hard: "어려움" };
const TIME_LABEL: Record<string, string> = {
  under_15: "15분 이내",
  under_30: "30분 이내",
  no_limit: "시간 제한 없음",
};

export const openRouterTextProvider: TextProvider = {
  id: "openrouter-text",
  label: `OpenRouter · ${MODEL} (실제 API, 무료 티어)`,
  async recommendRecipes({ ingredients, preferences, count }) {
    const prefLines = [
      preferences.cuisine && `요리 종류: ${CUISINE_LABEL[preferences.cuisine] ?? preferences.cuisine}`,
      preferences.spiceLevel && `매운맛: ${SPICE_LABEL[preferences.spiceLevel] ?? preferences.spiceLevel}`,
      preferences.difficulty && `난이도: ${DIFFICULTY_LABEL[preferences.difficulty] ?? preferences.difficulty}`,
      preferences.timeLimit && `조리 시간: ${TIME_LABEL[preferences.timeLimit] ?? preferences.timeLimit}`,
    ]
      .filter(Boolean)
      .join(", ");

    const systemPrompt =
      "너는 냉장고 속 재료로 만들 수 있는 한국 가정식 레시피를 추천하는 도우미다. " +
      "다른 설명 없이 JSON 배열로만 답해라. 형식: " +
      '[{"title":"요리명","ingredients":["재료1","재료2"],"steps":["1단계","2단계"],"estTimeMinutes":15}, ...]';

    const userPrompt =
      `보유 재료: ${ingredients.join(", ") || "(없음)"}\n` +
      (prefLines ? `선호 조건: ${prefLines}\n` : "") +
      `레시피를 정확히 ${count}개 추천해줘. 보유 재료를 최대한 활용하는 레시피로 골라줘.`;

    const result = await chatJson<RecipeResult[]>(MODEL, [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ]);

    if (!Array.isArray(result)) {
      throw new Error("텍스트 API 응답 형식이 예상과 달라요.");
    }
    return result
      .filter((r) => r && typeof r.title === "string")
      .slice(0, count)
      .map((r) => ({
        title: r.title,
        ingredients: Array.isArray(r.ingredients) ? r.ingredients : [],
        steps: Array.isArray(r.steps) ? r.steps : [],
        estTimeMinutes: typeof r.estTimeMinutes === "number" ? r.estTimeMinutes : 20,
      }));
  },
};
