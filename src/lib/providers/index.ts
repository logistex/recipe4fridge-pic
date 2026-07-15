import { mockVisionProvider } from "./mock-vision";
import { mockVisionDetailedProvider } from "./mock-vision-detailed";
import { mockTextProvider } from "./mock-text";
import { mockTextQuickProvider } from "./mock-text-quick";
import type { VisionProvider, TextProvider } from "./types";

// 무료 API가 여러 개 붙을 걸 대비한 registry (docs/PRD.md 7장).
// 실제 제공처를 추가할 때는 구현 파일을 만들고 아래 두 객체에 등록하면 된다.
export const visionProviders: Record<string, VisionProvider> = {
  [mockVisionProvider.id]: mockVisionProvider,
  [mockVisionDetailedProvider.id]: mockVisionDetailedProvider,
};

export const textProviders: Record<string, TextProvider> = {
  [mockTextProvider.id]: mockTextProvider,
  [mockTextQuickProvider.id]: mockTextQuickProvider,
};

export const DEFAULT_VISION_PROVIDER = mockVisionProvider.id;
export const DEFAULT_TEXT_PROVIDER = mockTextProvider.id;

export function getVisionProvider(id?: string | null): VisionProvider {
  return (id && visionProviders[id]) || visionProviders[DEFAULT_VISION_PROVIDER];
}

export function getTextProvider(id?: string | null): TextProvider {
  return (id && textProviders[id]) || textProviders[DEFAULT_TEXT_PROVIDER];
}

export type { VisionProvider, TextProvider } from "./types";
export type { DetectedIngredient, RecipeResult, RecipePreferences } from "./types";
