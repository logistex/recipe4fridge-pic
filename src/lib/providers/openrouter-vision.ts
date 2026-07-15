import type { VisionProvider, DetectedIngredient } from "./types";
import { chatJsonWithFallback, OpenRouterError } from "./openrouter-client";

// OpenRouter 무료 티어 모델은 라인업이 자주 바뀐다 (docs/PRD.md 7.1).
// 1순위 모델을 환경변수로 지정할 수 있고, 이 목록의 나머지는 자동 대체(fallback) 후보다.
// 1순위 호출이 실패하면(모델 사라짐, 일시 한도 초과 등) 코드 수정 없이 다음 후보로 자동 전환된다.
//
// 2026-07-15 실사용 테스트에서 qwen2.5-vl-72b/32b, gemini-2.0-flash-exp가 전부
// "No endpoints found"(404)로 죽어있던 것을 확인 — 잘 알려진 인기 모델일수록
// 무료 엔드포인트가 먼저 막히는 경향이 있어, 상대적으로 덜 알려진 모델을 앞쪽 우선순위로 배치했다.
// 다만 nvidia nemotron "nano" 계열은 응답은 오지만 같은 재료를 수십 번 반복하는
// 문제가 실제로 확인돼서(작은 모델일수록 반복 루프에 잘 빠짐), 상대적으로 크고
// 검증된 Google Gemma 계열을 1순위로 올리고 nano 계열은 뒤로 내렸다.
// 마지막 openrouter/free는 OpenRouter가 그 순간 살아있는 무료 모델 중 하나를
// 자동으로 골라주는 라우터라 최후의 안전망으로 추가했다 (nvidia rerank/embed VL,
// content-safety, lyria 계열은 채팅형 이미지 인식에 안 맞는 모델이라 후보에서 제외).
const PRIMARY_MODEL =
  process.env.OPENROUTER_VISION_MODEL || "google/gemma-4-26b-a4b-it:free";
const FALLBACK_MODELS = [
  "google/gemma-4-31b-it:free",
  "nvidia/nemotron-nano-12b-v2-vl:free",
  "nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free",
  "openrouter/free",
];
const MODEL_CANDIDATES = [PRIMARY_MODEL, ...FALLBACK_MODELS];

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
  // 다음 fallback 후보로 넘어가게 한다.
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
