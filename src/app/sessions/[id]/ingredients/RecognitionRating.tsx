"use client";

import { useState, useTransition } from "react";
import { rateRecognition } from "@/lib/fridge/actions";

export function RecognitionRating({
  sessionId,
  initialScore,
}: {
  sessionId: string;
  initialScore: number | null;
}) {
  const [score, setScore] = useState(initialScore);
  const [, startTransition] = useTransition();

  function rate(next: number) {
    setScore(next);
    startTransition(async () => {
      await rateRecognition(sessionId, next);
    });
  }

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16, flexWrap: "wrap" }}>
      <span style={{ fontSize: 13, color: "var(--app-muted)", fontWeight: 600 }}>
        사진과 재료 인식이 정확했나요?
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
              width: 28,
              height: 28,
              fontSize: 12,
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
