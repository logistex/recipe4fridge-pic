import type { TextProvider, RecipeResult } from "./types";
import { chatJsonWithFallback, OpenRouterError } from "./openrouter-client";

// 1순위 모델은 환경변수로 지정 가능, 나머지는 자동 대체(fallback) 후보 (docs/PRD.md 7.1).
const PRIMARY_MODEL =
  process.env.OPENROUTER_TEXT_MODEL || "meta-llama/llama-3.3-70b-instruct:free";
const FALLBACK_MODELS = [
  "meta-llama/llama-3.1-8b-instruct:free",
  "qwen/qwen-2.5-72b-instruct:free",
  "google/gemini-2.0-flash-exp:free",
];
const MODEL_CANDIDATES = [PRIMARY_MODEL, ...FALLBACK_MODELS];

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

function validateRecipes(data: unknown, count: number): RecipeResult[] {
  if (!Array.isArray(data)) {
    throw new OpenRouterError("텍스트 API 응답 형식이 예상과 달라요.");
  }
  return data
    .filter((r): r is Record<string, unknown> => !!r && typeof (r as { title?: unknown }).title === "string")
    .slice(0, count)
    .map((r) => ({
      title: r.title as string,
      ingredients: Array.isArray(r.ingredients) ? (r.ingredients as string[]) : [],
      steps: Array.isArray(r.steps) ? (r.steps as string[]) : [],
      estTimeMinutes: typeof r.estTimeMinutes === "number" ? r.estTimeMinutes : 20,
    }));
}

export const openRouterTextProvider: TextProvider = {
  id: "openrouter-text",
  label: `OpenRouter · ${PRIMARY_MODEL} (실제 API, 무료 티어, 실패 시 자동 대체)`,
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

    const { result } = await chatJsonWithFallback<RecipeResult[]>(
      MODEL_CANDIDATES,
      [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      (data) => validateRecipes(data, count)
    );
    return result;
  },
};
