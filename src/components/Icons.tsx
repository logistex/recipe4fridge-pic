// 좋아요/싫어요/저장 버튼용 작은 인라인 SVG 아이콘. currentColor를 써서 버튼의
// 글자색(테마별 색, active 상태 색)을 그대로 물려받는다 — 이모지는 색을 못 바꾼다.
export function ThumbIcon({ direction }: { direction: "up" | "down" }) {
  return (
    <svg
      width="15"
      height="15"
      viewBox="0 0 24 24"
      aria-hidden="true"
      style={{ transform: direction === "down" ? "scaleY(-1)" : undefined, flexShrink: 0 }}
    >
      <path
        d="M7 10v11H3V10h4zm12.83 1.17A2 2 0 0 0 18.36 10H14l.7-3.5c.1-.5-.02-1.02-.35-1.41L13.34 4 8 9.42V21h9.5a2 2 0 0 0 1.86-1.26l2.4-6a2 2 0 0 0-.13-1.57z"
        fill="currentColor"
      />
    </svg>
  );
}

export function BookmarkIcon({ filled }: { filled?: boolean }) {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" aria-hidden="true" style={{ flexShrink: 0 }}>
      <path
        d="M6 3.5a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1V21l-6-3.4L6 21V3.5z"
        fill={filled ? "currentColor" : "none"}
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
    </svg>
  );
}
