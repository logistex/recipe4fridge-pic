import { createClient } from "@/lib/supabase/server";

// 평가 개수가 너무 적은 모델이 우연히 좋은(또는 나쁜) 점수 한두 개로 순위가 요동치지
// 않도록, 이 개수 이상 쌓여야만 실제로 우선순위에 반영한다.
const MIN_SAMPLES = 5;

type Ranking = Map<string, { avg: number; count: number }>;

// subject_type별로 provider_id 기준 평균 점수(사용자 평가 + AI 판정 합산)를 계산한다.
export async function rankProviders(
  supabase: Awaited<ReturnType<typeof createClient>>,
  subjectTypes: ("photo" | "ingredients" | "recipe")[],
  since?: string
): Promise<Ranking> {
  const query = supabase.from("model_ratings").select("provider_id, score").in("subject_type", subjectTypes);
  const { data } = await (since ? query.gte("created_at", since) : query);

  const byProvider = new Map<string, number[]>();
  for (const row of data ?? []) {
    const list = byProvider.get(row.provider_id) ?? [];
    list.push(row.score);
    byProvider.set(row.provider_id, list);
  }

  const result: Ranking = new Map();
  for (const [providerId, scores] of byProvider) {
    result.set(providerId, {
      avg: scores.reduce((a, b) => a + b, 0) / scores.length,
      count: scores.length,
    });
  }
  return result;
}

export type ScoreboardRow = {
  providerId: string;
  userAvg: number | null;
  userCount: number;
  aiAvg: number | null;
  aiCount: number;
  combinedAvg: number;
  combinedCount: number;
};

// /ratings 화면에 보여줄 모델별 점수판 — 사용자 평가와 AI 판정을 구분해서 보여주고,
// 합산 평균 높은 순으로 정렬한다.
export async function getScoreboard(
  supabase: Awaited<ReturnType<typeof createClient>>,
  subjectTypes: ("photo" | "ingredients" | "recipe")[],
  since?: string
): Promise<ScoreboardRow[]> {
  const query = supabase.from("model_ratings").select("provider_id, score, source").in("subject_type", subjectTypes);
  const { data } = await (since ? query.gte("created_at", since) : query);

  const byProvider = new Map<string, { user: number[]; ai: number[] }>();
  for (const row of data ?? []) {
    const entry = byProvider.get(row.provider_id) ?? { user: [], ai: [] };
    if (row.source === "user") entry.user.push(row.score);
    else entry.ai.push(row.score);
    byProvider.set(row.provider_id, entry);
  }

  const avg = (arr: number[]) => (arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : null);

  return Array.from(byProvider.entries())
    .map(([providerId, { user, ai }]) => {
      const combined = [...user, ...ai];
      return {
        providerId,
        userAvg: avg(user),
        userCount: user.length,
        aiAvg: avg(ai),
        aiCount: ai.length,
        combinedAvg: avg(combined) ?? 0,
        combinedCount: combined.length,
      };
    })
    .sort((a, b) => b.combinedAvg - a.combinedAvg);
}

// 평가가 MIN_SAMPLES개 이상 쌓인 항목만 점수순으로 위로 올리고, 나머지는 원래 순서를
// 그대로 유지한다 (Array.prototype.sort는 안정 정렬이라 동점/미평가 항목의 상대 순서가 보존된다).
export function sortByRanking<T extends { id: string }>(items: T[], ranking: Ranking): T[] {
  return [...items].sort((a, b) => {
    const ra = ranking.get(a.id);
    const rb = ranking.get(b.id);
    const aRanked = !!ra && ra.count >= MIN_SAMPLES;
    const bRanked = !!rb && rb.count >= MIN_SAMPLES;
    if (aRanked && bRanked) return rb!.avg - ra!.avg;
    if (aRanked && !bRanked) return -1;
    if (!aRanked && bRanked) return 1;
    return 0;
  });
}
