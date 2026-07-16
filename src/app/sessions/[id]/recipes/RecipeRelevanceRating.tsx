"use client";

import { useState, useTransition } from "react";
import { rateRecipeRelevance } from "@/lib/fridge/actions";

// 좋아요/싫어요(레시피 인기투표)와는 별개로, "이 레시피들이 보유 재료를 얼마나 잘
// 활용했는지"를 텍스트 모델 품질 평가용으로 따로 받는다. 배치(요청) 단위로 한 번만 평가한다.
export function RecipeRelevanceRating({
  requestId,
  initialScore,
}: {
  requestId: string;
  initialScore: number | null;
}) {
  const [score, setScore] = useState(initialScore);
  const [, startTransition] = useTransition();

  function rate(next: number) {
    setScore(next);
    startTransition(async () => {
      await rateRecipeRelevance(requestId, next);
    });
  }

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14, flexWrap: "wrap" }}>
      <span style={{ fontSize: 12, color: "var(--app-muted)", fontWeight: 600 }}>
        보유 재료를 잘 활용한 레시피였나요? (AI 모델 평가용)
      </span>
      <div style={{ display: "flex", gap: 4 }}>
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => rate(n)}
            aria-label={`${n}점`}
            aria-pressed={score === n}
            className="icon-btn"
            style={{
              width: 26,
              height: 26,
              fontSize: 11,
              background: score !== null && n <= score ? "var(--app-accent)" : "var(--app-bg)",
              color: score !== null && n <= score ? "var(--app-accent-ink)" : "var(--app-muted)",
              borderColor: score !== null && n <= score ? "var(--app-accent)" : "var(--app-line)",
            }}
          >
            {n}
          </button>
        ))}
      </div>
    </div>
  );
}
