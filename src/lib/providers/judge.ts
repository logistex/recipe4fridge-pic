import { chatJson } from "./openrouter-client";

// AI 심판 전용 모델. 특정 비전/텍스트 후보를 판정할 때 "같은 계열 모델이 자기 자신을
// 채점"하는 상황을 피하려고, 어떤 후보와도 안 겹치는 openrouter/free(그 순간 살아있는
// 무료 모델을 OpenRouter가 자동으로 골라주는 라우터)를 고정 심판으로 쓴다.
// Claude 같은 유료 API 대신 이걸 쓰기로 한 이유: 이미 있는 무료 연동을 그대로
// 재사용할 수 있고, 판정을 "매번 자동"으로 돌려도 추가 비용이 없다.
const JUDGE_MODEL = "openrouter/free";

function clampScore(n: number): number {
  return Math.max(1, Math.min(5, Math.round(n)));
}

export async function judgePhotoAndIngredients(params: {
  imageUrls: string[];
  ingredientNames: string[];
}): Promise<{ photoScore: number; ingredientsScore: number; note?: string } | null> {
  try {
    const content = [
      {
        type: "text" as const,
        text:
          "너는 냉장고 사진과 AI가 인식한 재료 목록의 품질을 채점하는 심사위원이다. " +
          "① 사진 품질(밝기·초점·구도가 재료를 알아보기 좋은지), " +
          "② 재료 인식 정확도(아래 목록이 사진 속 실제 재료와 얼마나 일치하는지)를 " +
          "각각 1~5점으로 채점해라. 다른 설명 없이 JSON으로만 답해라. " +
          '형식: {"photoScore": 4, "ingredientsScore": 3, "note": "한 줄 이유"}\n' +
          `AI가 인식한 재료 목록: ${params.ingredientNames.join(", ") || "(없음)"}`,
      },
      ...params.imageUrls.map((url) => ({ type: "image_url" as const, image_url: { url } })),
    ];

    const result = await chatJson<{ photoScore: number; ingredientsScore: number; note?: string }>(
      JUDGE_MODEL,
      [{ role: "user", content }]
    );

    if (typeof result.photoScore !== "number" || typeof result.ingredientsScore !== "number") {
      return null;
    }
    return {
      photoScore: clampScore(result.photoScore),
      ingredientsScore: clampScore(result.ingredientsScore),
      note: typeof result.note === "string" ? result.note.slice(0, 300) : undefined,
    };
  } catch (err) {
    // 판정은 어디까지나 부가 기능이라, 실패해도 사용자가 보는 화면에는 영향을 주지 않는다.
    console.error("AI 판정(사진/재료인식) 실패:", err);
    return null;
  }
}

export async function judgeRecipeBatch(params: {
  ingredientNames: string[];
  recipes: { title: string; ingredients: string[]; steps: string[] }[];
}): Promise<{ score: number; note?: string } | null> {
  try {
    const prompt =
      "너는 냉장고 재료로 추천된 레시피 묶음의 품질을 채점하는 심사위원이다. " +
      "보유 재료 활용도, 조리법의 현실성과 일관성을 보고 이 레시피 묶음 전체를 " +
      "1~5점으로 채점해라. 다른 설명 없이 JSON으로만 답해라. " +
      '형식: {"score": 4, "note": "한 줄 이유"}\n' +
      `보유 재료: ${params.ingredientNames.join(", ") || "(없음)"}\n` +
      `추천된 레시피: ${JSON.stringify(params.recipes)}`;

    const result = await chatJson<{ score: number; note?: string }>(JUDGE_MODEL, [
      { role: "user", content: prompt },
    ]);

    if (typeof result.score !== "number") return null;
    return {
      score: clampScore(result.score),
      note: typeof result.note === "string" ? result.note.slice(0, 300) : undefined,
    };
  } catch (err) {
    console.error("AI 판정(레시피) 실패:", err);
    return null;
  }
}
