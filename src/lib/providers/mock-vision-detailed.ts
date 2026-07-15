import type { VisionProvider, DetectedIngredient } from "./types";

// mock-vision-basic보다 한 항목 더 인식하는 것처럼 보이는 두 번째 목(mock) 구현.
// "여러 무료 API 중 선택 가능"이라는 UI를 검증하기 위한 두 번째 옵션.
const SAMPLE_SETS: DetectedIngredient[][] = [
  [
    { name: "감자", quantityText: "3개" },
    { name: "양파", quantityText: "1개" },
    { name: "대파", quantityText: "2대" },
    { name: "계란", quantityText: "4개" },
    { name: "마늘", quantityText: "약간" },
  ],
  [
    { name: "두부", quantityText: "1모" },
    { name: "고추장", quantityText: "약간" },
    { name: "애호박", quantityText: "1개" },
    { name: "당근", quantityText: "1개" },
    { name: "대파", quantityText: "1대" },
  ],
  [
    { name: "김치", quantityText: "1포기" },
    { name: "돼지고기", quantityText: "200g" },
    { name: "양파", quantityText: "1개" },
    { name: "대파", quantityText: "1대" },
    { name: "두부", quantityText: "반모" },
  ],
];

export const mockVisionDetailedProvider: VisionProvider = {
  id: "mock-vision-detailed",
  label: "Mock 비전 · 정밀 (테스트용, 조금 더 느림)",
  async detectIngredients(imageUrls) {
    await new Promise((resolve) => setTimeout(resolve, 900));
    const seed = imageUrls.reduce((sum, url) => sum + url.length, 0);
    return SAMPLE_SETS[seed % SAMPLE_SETS.length];
  },
};
