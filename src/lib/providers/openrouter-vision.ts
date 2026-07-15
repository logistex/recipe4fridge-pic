import type { VisionProvider, DetectedIngredient } from "./types";
import { chatJsonWithFallback, OpenRouterError } from "./openrouter-client";

// OpenRouter 무료 티어 모델은 라인업이 자주 바뀐다 (docs/PRD.md 7.1).
// 화면 드롭다운에는 서로 다른 모델 3개를 사용자가 직접 고를 수 있게 그대로 노출한다
// (하나로 합쳐서 내부적으로만 순서대로 시도하면 사용자가 뭘 쓰고 있는지 알 수 없어서).
//
// 2026-07-15 실사용 테스트에서 qwen2.5-vl-72b/32b, gemini-2.0-flash-exp가 전부
// "No endpoints found"(404)로 죽어있던 것을 확인 — 잘 알려진 인기 모델일수록 무료
// 엔드포인트가 먼저 막히는 경향이 있어, 상대적으로 덜 알려지고 응답이 빠른 모델을
// 위쪽 순위에 배치했다. nvidia nemotron "nano" 계열은 같은 재료를 반복하는 문제가
// 확인됐지만(작은 모델일수록 반복 루프에 잘 빠짐), validateIngredients의 반복 감지 +
// 중복 제거로 방어하고 있어 후보에 포함했다.
const CANDIDATES: { id: string; model: string }[] = [
  { id: "openrouter-vision-1", model: "google/gemma-4-26b-a4b-it:free" },
  { id: "openrouter-vision-2", model: "nvidia/nemotron-nano-12b-v2-vl:free" },
  { id: "openrouter-vision-3", model: "google/gemma-4-31b-it:free" },
];

const SYSTEM_PROMPT =
  "너는 냉장고 사진을 보고 식재료를 인식하는 도우미다. " +
  "사진에 보이는 식재료 이름과 대략적인 수량을 한국어로 추정해서, " +
  '다른 설명 없이 JSON 배열로만 답해라. 형식: [{"name":"감자","quantityText":"3개"}, ...]. ' +
  "같은 식재료는 한 번만 적고, 절대 같은 항목을 반복하지 마라. " +
  "수량을 정확히 알 수 없으면 quantityText를 빈 문자열로 둬도 된다.";

const MAX_INGREDIENTS = 20;

function validateIngredients(data: unknown): DetectedIngredient[] {
  if (!Array.isArray(data)) {
    throw new OpenRouterError("비전 API 응답 형식이 예상과 달라요.");
  }
  const raw = data.filter(
    (item): item is { name: string; quantityText?: string } =>
      !!item && typeof item.name === "string" && item.name.trim().length > 0
  );

  // 작은 무료 모델은 가끔 같은 항목을 계속 반복하는 반복 루프에 빠진다.
  // 응답이 길고 이름 종류가 극히 적으면 정상적인 인식 결과가 아니라고 보고
  // openrouter/free 안전망으로 넘어가게 한다.
  const uniqueNames = new Set(raw.map((item) => item.name.trim().toLowerCase()));
  if (raw.length >= 6 && uniqueNames.size <= 2) {
    throw new OpenRouterError("모델이 같은 재료를 반복해서 응답했어요.");
  }

  const seen = new Map<string, DetectedIngredient>();
  for (const item of raw) {
    const key = item.name.trim().toLowerCase();
    if (!seen.has(key)) {
      seen.set(key, { name: item.name.trim(), quantityText: item.quantityText?.trim() || undefined });
    }
  }
  return Array.from(seen.values()).slice(0, MAX_INGREDIENTS);
}

function createProvider(id: string, model: string): VisionProvider {
  // 고른 모델 하나가 죽어있을 때를 대비해 openrouter/free(그 순간 살아있는 무료
  // 모델을 OpenRouter가 자동으로 골라주는 라우터)만 최후의 안전망으로 붙여둔다.
  const candidates = model === "openrouter/free" ? [model] : [model, "openrouter/free"];
  return {
    id,
    label: `OpenRouter · ${model} (실제 API, 무료)`,
    async detectIngredients(imageUrls) {
      if (imageUrls.length === 0) return [];

      const content = [
        { type: "text" as const, text: "이 냉장고 사진들에서 보이는 식재료를 모두 알려줘." },
        ...imageUrls.map((url) => ({ type: "image_url" as const, image_url: { url } })),
      ];

      const { result } = await chatJsonWithFallback<DetectedIngredient[]>(
        candidates,
        [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content },
        ],
        validateIngredients
      );
      return result;
    },
  };
}

// 1순위 모델만 환경변수로 지정 가능 (2·3순위는 드롭다운 다양성을 위해 고정).
const [first, ...rest] = CANDIDATES;
export const openRouterVisionProviders: VisionProvider[] = [
  createProvider(first.id, process.env.OPENROUTER_VISION_MODEL || first.model),
  ...rest.map((c) => createProvider(c.id, c.model)),
];
