import { openRouterVisionProvider } from "./openrouter-vision";
import { openRouterTextProvider } from "./openrouter-text";
import type { VisionProvider, TextProvider } from "./types";

// 무료 API가 여러 개 붙을 걸 대비한 registry (docs/PRD.md 7장).
// 실제 제공처를 추가할 때는 구현 파일을 만들고 아래 두 객체에 등록하면 된다.
//
// mock-vision*.ts / mock-text*.ts는 OpenRouter API 키가 없던 개발 초기에 전체 파이프라인을
// 먼저 완성하기 위해 만든 가짜(하드코딩) 구현이라, 실사용자용 선택 목록에서는 뺐다.
// 파일 자체는 지우지 않고 남겨뒀다 — 수업에서 "가짜 로직 vs 실제 API 호출"을 비교해서
// 설명할 때 코드로 직접 보여줄 수 있다.
export const visionProviders: Record<string, VisionProvider> = {
  [openRouterVisionProvider.id]: openRouterVisionProvider,
};

export const textProviders: Record<string, TextProvider> = {
  [openRouterTextProvider.id]: openRouterTextProvider,
};

export const DEFAULT_VISION_PROVIDER = openRouterVisionProvider.id;
export const DEFAULT_TEXT_PROVIDER = openRouterTextProvider.id;

export function getVisionProvider(id?: string | null): VisionProvider {
  return (id && visionProviders[id]) || visionProviders[DEFAULT_VISION_PROVIDER];
}

export function getTextProvider(id?: string | null): TextProvider {
  return (id && textProviders[id]) || textProviders[DEFAULT_TEXT_PROVIDER];
}

export type { VisionProvider, TextProvider } from "./types";
export type { DetectedIngredient, RecipeResult, RecipePreferences } from "./types";
