const STEPS = ["사진 업로드", "재료 확인", "레시피 추천"];

// 업로드→재료확인→레시피추천 3단계 플로우가 독립된 페이지들이 아니라 하나로
// 이어진 마법사(wizard)처럼 느껴지도록, 지금 몇 단계인지 보여준다.
export function StepIndicator({ current }: { current: 1 | 2 | 3 }) {
  return (
    <div style={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: 6, marginBottom: 20 }}>
      {STEPS.map((label, i) => {
        const step = i + 1;
        const active = step === current;
        const done = step < current;
        return (
          <div key={label} style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span
              style={{
                width: 22,
                height: 22,
                borderRadius: "50%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 11,
                fontWeight: 700,
                flexShrink: 0,
                background: active || done ? "var(--app-accent)" : "var(--app-bg)",
                color: active || done ? "var(--app-accent-ink)" : "var(--app-muted)",
                border: active || done ? "none" : "1.5px solid var(--app-line)",
              }}
            >
              {step}
            </span>
            <span
              style={{
                fontSize: 12,
                fontWeight: active ? 700 : 500,
                color: active ? "var(--app-text)" : "var(--app-muted)",
                whiteSpace: "nowrap",
              }}
            >
              {label}
            </span>
            {step < STEPS.length && (
              <span style={{ width: 16, height: 1, background: "var(--app-line)", margin: "0 2px" }} />
            )}
          </div>
        );
      })}
    </div>
  );
}
