import type { TextProvider, RecipeResult } from "./types";
import { chatJsonWithFallback, OpenRouterError } from "./openrouter-client";

// OpenRouter 무료 티어 모델은 라인업이 자주 바뀐다 (docs/PRD.md 7.1).
// 화면 드롭다운에는 서로 다른 모델 3개를 사용자가 직접 고를 수 있게 그대로 노출한다
// (하나로 합쳐서 내부적으로만 순서대로 시도하면 사용자가 뭘 쓰고 있는지 알 수 없어서).
//
// 2026-07-15 실사용 테스트에서 llama-3.1-8b/qwen-2.5-72b/gemini-2.0-flash-exp가 이미
// OpenRouter 무료 목록에서 빠져있는 것을 확인 — 잘 알려진 인기 모델일수록 무료
// 엔드포인트가 먼저 막히는 경향이 있어, 상대적으로 덜 알려지고 응답이 빠른 모델을
// 위쪽 순위에 배치했다. nemotron-3-super-120b는 실사용 테스트에서 정상 동작 확인됨.
const CANDIDATES: { id: string; model: string }[] = [
  { id: "openrouter-text-1", model: "nvidia/nemotron-3-super-120b-a12b:free" },
  { id: "openrouter-text-2", model: "qwen/qwen3-next-80b-a3b-instruct:free" },
  { id: "openrouter-text-3", model: "cognitivecomputations/dolphin-mistral-24b-venice-edition:free" },
];

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

function createProvider(id: string, model: string): TextProvider {
  // 고른 모델 하나가 죽어있을 때를 대비해 openrouter/free(그 순간 살아있는 무료
  // 모델을 OpenRouter가 자동으로 골라주는 라우터)만 최후의 안전망으로 붙여둔다.
  const candidates = model === "openrouter/free" ? [model] : [model, "openrouter/free"];
  return {
    id,
    label: `OpenRouter · ${model} (실제 API, 무료)`,
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
        candidates,
        [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        (data) => validateRecipes(data, count)
      );
      return result;
    },
  };
}

// 1순위 모델만 환경변수로 지정 가능 (2·3순위는 드롭다운 다양성을 위해 고정).
const [first, ...rest] = CANDIDATES;
export const openRouterTextProviders: TextProvider[] = [
  createProvider(first.id, process.env.OPENROUTER_TEXT_MODEL || first.model),
  ...rest.map((c) => createProvider(c.id, c.model)),
];
