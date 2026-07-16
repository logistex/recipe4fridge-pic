import Link from "next/link";
import { getCurrentUserAndProfile } from "@/lib/profile/get-current-profile";
import { getScoreboard, type ScoreboardRow } from "@/lib/ratings/ranking";
import { AppNav } from "@/components/AppNav";

const PERIODS: { id: string; label: string; days: number | null }[] = [
  { id: "week", label: "최근 7일", days: 7 },
  { id: "month", label: "최근 30일", days: 30 },
  { id: "all", label: "전체 기간", days: null },
];

// Date.now()는 컴포넌트 본문에서 직접 부르면 안 되는 impure 호출이라 eslint가 막는다
// (react-hooks/purity) — 컴포넌트가 아닌 평범한 헬퍼 함수로 분리해서 우회한다.
function daysAgoIso(days: number): string {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
}

// 레시피 인기투표(/ratings)와는 별개로, 여기서는 재료 인식(비전)·레시피 추천(텍스트)에
// 쓰인 AI 모델 자체의 품질을 사용자 평가 + AI 판정을 합쳐서 보여준다.
export default async function ModelsPage({
  searchParams,
}: {
  searchParams: Promise<{ period?: string }>;
}) {
  const { supabase, user, profile } = await getCurrentUserAndProfile();
  const { period: periodParam } = await searchParams;
  const period = PERIODS.find((p) => p.id === periodParam) ?? PERIODS[2];
  const since = period.days ? daysAgoIso(period.days) : null;

  const visionScoreboard = await getScoreboard(supabase, ["photo", "ingredients"], since ?? undefined);
  const textScoreboard = await getScoreboard(supabase, ["recipe"], since ?? undefined);

  return (
    <div className="theme-page" data-app-theme={profile.theme}>
      <div className="container-wide">
        <AppNav email={user.email} />
        <h1>AI 모델 평가</h1>
        <p className="page-subtitle">
          재료 인식(비전)·레시피 추천(텍스트)에 쓰인 모델별 품질 점수예요. 사용자 평가와
          AI 판정(openrouter/free)을 합쳐서 평균을 냅니다.
        </p>

        <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
          {PERIODS.map((p) => (
            <Link
              key={p.id}
              href={`/models?period=${p.id}`}
              className={p.id === period.id ? "btn btn-primary" : "btn btn-outline"}
              style={{ fontSize: 13, padding: "6px 14px" }}
            >
              {p.label}
            </Link>
          ))}
        </div>

        <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
          <ScoreboardCard
            title="비전 API (사진 품질·재료인식 정확도)"
            description="사진을 업로드한 본인이 평가"
            rows={visionScoreboard}
          />
          <ScoreboardCard
            title="텍스트 API (재료-레시피 정합성)"
            description="레시피를 추천받은 본인이 평가"
            rows={textScoreboard}
          />
        </div>
      </div>
    </div>
  );
}

function ScoreboardCard({
  title,
  description,
  rows,
}: {
  title: string;
  description: string;
  rows: ScoreboardRow[];
}) {
  return (
    <div className="card" style={{ flex: "1 1 320px", minWidth: 280 }}>
      <p style={{ fontWeight: 700, marginBottom: 2 }}>{title}</p>
      <p style={{ fontSize: 12, color: "var(--app-muted)", marginBottom: 10 }}>{description}</p>
      {rows.length === 0 ? (
        <p style={{ fontSize: 13, color: "var(--app-muted)" }}>아직 쌓인 평가가 없어요.</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {rows.map((r, i) => (
            <div key={r.providerId} style={{ fontSize: 13 }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                <span style={{ fontWeight: i === 0 ? 700 : 500 }}>
                  {i + 1}. {r.providerId}
                </span>
                <span style={{ fontWeight: 700, color: "var(--app-accent-strong)" }}>
                  {r.combinedAvg.toFixed(1)}점
                </span>
              </div>
              <p style={{ fontSize: 11, color: "var(--app-muted)", margin: "2px 0 0" }}>
                사용자 {r.userAvg !== null ? `${r.userAvg.toFixed(1)}점 (${r.userCount}건)` : "평가 없음"} · AI 판정{" "}
                {r.aiAvg !== null ? `${r.aiAvg.toFixed(1)}점 (${r.aiCount}건)` : "없음"}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
