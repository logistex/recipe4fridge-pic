import type { VisionProvider, DetectedIngredient } from "./types";
import { chatJsonWithFallback, OpenRouterError } from "./openrouter-client";

// OpenRouter 무료 티어 모델은 라인업이 자주 바뀐다 (docs/PRD.md 7.1).
// 1순위 모델을 환경변수로 지정할 수 있고, 이 목록의 나머지는 자동 대체(fallback) 후보다.
// 1순위 호출이 실패하면(모델 사라짐, 일시 한도 초과 등) 코드 수정 없이 다음 후보로 자동 전환된다.
const PRIMARY_MODEL =
  process.env.OPENROUTER_VISION_MODEL || "qwen/qwen2.5-vl-72b-instruct:free";
const FALLBACK_MODELS = [
  "qwen/qwen2.5-vl-32b-instruct:free",
  "meta-llama/llama-3.2-11b-vision-instruct:free",
  "google/gemini-2.0-flash-exp:free",
];
const MODEL_CANDIDATES = [PRIMARY_MODEL, ...FALLBACK_MODELS];

const SYSTEM_PROMPT =
  "너는 냉장고 사진을 보고 식재료를 인식하는 도우미다. " +
  "사진에 보이는 식재료 이름과 대략적인 수량을 한국어로 추정해서, " +
  '다른 설명 없이 JSON 배열로만 답해라. 형식: [{"name":"감자","quantityText":"3개"}, ...]. ' +
  "수량을 정확히 알 수 없으면 quantityText를 빈 문자열로 둬도 된다.";

function validateIngredients(data: unknown): DetectedIngredient[] {
  if (!Array.isArray(data)) {
    throw new OpenRouterError("비전 API 응답 형식이 예상과 달라요.");
  }
  return data
    .filter(
      (item): item is { name: string; quantityText?: string } =>
        !!item && typeof item.name === "string" && item.name.trim().length > 0
    )
    .map((item) => ({
      name: item.name.trim(),
      quantityText: item.quantityText?.trim() || undefined,
    }));
}

export const openRouterVisionProvider: VisionProvider = {
  id: "openrouter-vision",
  label: `OpenRouter · ${PRIMARY_MODEL} (실제 API, 무료 티어, 실패 시 자동 대체)`,
  async detectIngredients(imageUrls) {
    if (imageUrls.length === 0) return [];

    const content = [
      { type: "text" as const, text: "이 냉장고 사진들에서 보이는 식재료를 모두 알려줘." },
      ...imageUrls.map((url) => ({ type: "image_url" as const, image_url: { url } })),
    ];

    const { result } = await chatJsonWithFallback<DetectedIngredient[]>(
      MODEL_CANDIDATES,
      [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content },
      ],
      validateIngredients
    );
    return result;
  },
};
