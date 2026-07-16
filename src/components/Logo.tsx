// "recipe4fridge_pic"은 이제 내부 기술명(패키지명, OpenRouter API 호출 시 X-Title 등)으로만
// 쓰고, 화면에 보이는 브랜드는 "찰칵레시피"로 통일한다 — 냉장고를 "찰칵" 찍으면
// 레시피가 나온다는 핵심 동작을 그대로 이름에 담았다.
export const BRAND_NAME = "찰칵레시피";
export const BRAND_TAGLINE = "냉장고, 찰칵 한 장이면 충분해요";

export function Logo({ size = 24 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      aria-hidden="true"
      style={{ flexShrink: 0 }}
    >
      <rect x="2" y="9" width="28" height="19" rx="5" fill="none" stroke="currentColor" strokeWidth="2.2" />
      <rect x="11" y="4" width="7" height="6" rx="2" fill="currentColor" />
      <circle cx="16" cy="19" r="6" fill="none" stroke="currentColor" strokeWidth="2.2" />
    </svg>
  );
}

export function BrandMark({
  size = 24,
  textSize = 15,
}: {
  size?: number;
  textSize?: number;
}) {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
      <Logo size={size} />
      <span style={{ fontWeight: 800, fontSize: textSize, letterSpacing: "-0.01em" }}>{BRAND_NAME}</span>
    </span>
  );
}
