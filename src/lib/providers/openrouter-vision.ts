import type { VisionProvider, DetectedIngredient } from "./types";
import { chatJson } from "./openrouter-client";

// OpenRouter 무료 티어 모델은 라인업이 자주 바뀐다 (docs/PRD.md 7.1).
// 모델을 바꿔야 하면 코드 수정 없이 이 환경변수만 바꾸면 된다.
const MODEL = process.env.OPENROUTER_VISION_MODEL || "qwen/qwen2.5-vl-72b-instruct:free";

const SYSTEM_PROMPT =
  "너는 냉장고 사진을 보고 식재료를 인식하는 도우미다. " +
  "사진에 보이는 식재료 이름과 대략적인 수량을 한국어로 추정해서, " +
  '다른 설명 없이 JSON 배열로만 답해라. 형식: [{"name":"감자","quantityText":"3개"}, ...]. ' +
  "수량을 정확히 알 수 없으면 quantityText를 빈 문자열로 둬도 된다.";

export const openRouterVisionProvider: VisionProvider = {
  id: "openrouter-vision",
  label: `OpenRouter · ${MODEL} (실제 API, 무료 티어)`,
  async detectIngredients(imageUrls) {
    if (imageUrls.length === 0) return [];

    const content = [
      { type: "text" as const, text: "이 냉장고 사진들에서 보이는 식재료를 모두 알려줘." },
      ...imageUrls.map((url) => ({ type: "image_url" as const, image_url: { url } })),
    ];

    const result = await chatJson<DetectedIngredient[]>(MODEL, [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content },
    ]);

    if (!Array.isArray(result)) {
      throw new Error("비전 API 응답 형식이 예상과 달라요.");
    }
    return result
      .filter((item) => item && typeof item.name === "string" && item.name.trim())
      .map((item) => ({
        name: item.name.trim(),
        quantityText: item.quantityText?.trim() || undefined,
      }));
  },
};
