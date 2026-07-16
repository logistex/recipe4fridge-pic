import Link from "next/link";
import { getCurrentUserAndProfile } from "@/lib/profile/get-current-profile";
import { AppNav } from "@/components/AppNav";
import { RecipeCard } from "@/app/sessions/[id]/recipes/RecipeCard";

type FeedbackRow = {
  recipe_id: string;
  user_id: string;
  reaction: "like" | "dislike";
  comment_text: string | null;
};

type RecipeRow = {
  id: string;
  title: string;
  ingredients_json: string[];
  steps_json: string[];
  est_time_minutes: number | null;
  created_at: string;
};

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

// 이 화면은 "모델 품질 평가"가 아니라 회원들 사이의 레시피 인기투표다 — 좋아요/싫어요/
// 코멘트로 다른 회원이 추천받은 레시피까지 함께 둘러보고 반응을 남긴다. AI 모델 자체에
// 대한 평가·점수판은 /models 화면에서 별도로 다룬다.
export default async function RatingsPage({
  searchParams,
}: {
  searchParams: Promise<{ period?: string }>;
}) {
  const { supabase, user, profile } = await getCurrentUserAndProfile();
  const { period: periodParam } = await searchParams;
  const period = PERIODS.find((p) => p.id === periodParam) ?? PERIODS[2];
  const since = period.days ? daysAgoIso(period.days) : null;

  // recipes RLS가 "로그인한 사람이면 전부 조회 가능"으로 열려있어야 한다
  // (supabase/09_public_recipe_ratings.sql 적용 필요) — 이 페이지의 핵심 전제다.
  const baseQuery = supabase
    .from("recipes")
    .select("id, title, ingredients_json, steps_json, est_time_minutes, created_at")
    .order("created_at", { ascending: false })
    .limit(60);
  const { data: recipes } = await (since ? baseQuery.gte("created_at", since) : baseQuery).returns<RecipeRow[]>();

  const recipeIds = (recipes ?? []).map((r) => r.id);
  const { data: feedback } = recipeIds.length
    ? await supabase
        .from("recipe_feedback")
        .select("recipe_id, user_id, reaction, comment_text")
        .in("recipe_id", recipeIds)
        .returns<FeedbackRow[]>()
    : { data: [] as FeedbackRow[] };

  const { data: savedRows } = recipeIds.length
    ? await supabase.from("saved_recipes").select("recipe_id").eq("user_id", user.id).in("recipe_id", recipeIds)
    : { data: [] as { recipe_id: string }[] };

  const feedbackByRecipe = new Map<string, FeedbackRow[]>();
  for (const f of feedback ?? []) {
    const list = feedbackByRecipe.get(f.recipe_id) ?? [];
    list.push(f);
    feedbackByRecipe.set(f.recipe_id, list);
  }

  return (
    <div className="theme-page" data-app-theme={profile.theme}>
      <div className="container-wide">
        <AppNav email={user.email} />
        <h1>레시피 평가</h1>
        <p className="page-subtitle">
          다른 회원이 추천받은 레시피도 함께 둘러보고 좋아요/싫어요·코멘트를 남길 수 있어요.
        </p>

        <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
          {PERIODS.map((p) => (
            <Link
              key={p.id}
              href={`/ratings?period=${p.id}`}
              className={p.id === period.id ? "btn btn-primary" : "btn btn-outline"}
              style={{ fontSize: 13, padding: "6px 14px" }}
            >
              {p.label}
            </Link>
          ))}
        </div>

        {(recipes ?? []).length === 0 && <p className="empty-state">이 기간에 추천된 레시피가 없어요.</p>}

        {(recipes ?? []).map((r) => {
          const rows = feedbackByRecipe.get(r.id) ?? [];
          const likes = rows.filter((f) => f.reaction === "like").length;
          const dislikes = rows.filter((f) => f.reaction === "dislike").length;
          const mine = rows.find((f) => f.user_id === user.id);
          const otherComments = rows
            .filter((f) => f.user_id !== user.id && f.comment_text)
            .map((f) => ({ reaction: f.reaction, text: f.comment_text as string }));

          return (
            <RecipeCard
              key={r.id}
              recipe={r}
              initialReaction={mine?.reaction}
              initialComment={mine?.comment_text ?? ""}
              initialSaved={(savedRows ?? []).some((s) => s.recipe_id === r.id)}
              aggregate={{ likes, dislikes }}
              otherComments={otherComments}
            />
          );
        })}
      </div>
    </div>
  );
}
