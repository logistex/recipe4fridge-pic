import type { VisionProvider, DetectedIngredient } from "./types";

// 실제 비전 API 대신 그럴듯한 재료 세트를 돌아가며 반환하는 목(mock) 구현.
// 실제 OpenRouter 비전 모델로 교체할 때는 이 파일과 같은 형태로 VisionProvider를 구현해
// src/lib/providers/index.ts의 registry에 추가하면 된다.
const SAMPLE_SETS: DetectedIngredient[][] = [
  [
    { name: "감자", quantityText: "3개" },
    { name: "양파", quantityText: "1개" },
    { name: "대파", quantityText: "2대" },
    { name: "계란", quantityText: "4개" },
  ],
  [
    { name: "두부", quantityText: "1모" },
    { name: "고추장", quantityText: "약간" },
    { name: "애호박", quantityText: "1개" },
    { name: "당근", quantityText: "1개" },
  ],
  [
    { name: "김치", quantityText: "1포기" },
    { name: "돼지고기", quantityText: "200g" },
    { name: "양파", quantityText: "1개" },
    { name: "대파", quantityText: "1대" },
  ],
];

export const mockVisionProvider: VisionProvider = {
  id: "mock-vision-basic",
  label: "Mock 비전 · 기본 (테스트용, 무료 · 빠름)",
  async detectIngredients(imageUrls) {
    await new Promise((resolve) => setTimeout(resolve, 500));
    const seed = imageUrls.reduce((sum, url) => sum + url.length, 0);
    return SAMPLE_SETS[seed % SAMPLE_SETS.length];
  },
};
