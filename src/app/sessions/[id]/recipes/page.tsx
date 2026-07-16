import { notFound, redirect } from "next/navigation";
import { getCurrentUserAndProfile } from "@/lib/profile/get-current-profile";
import { requestRecipes } from "@/lib/fridge/actions";
import { textProviders, DEFAULT_TEXT_PROVIDER } from "@/lib/providers";
import { AppNav } from "@/components/AppNav";
import { SubmitButton } from "@/components/SubmitButton";
import { StepIndicator } from "@/components/StepIndicator";
import { RecipeCard } from "./RecipeCard";
import { OverrideForm } from "./OverrideForm";

// 실제 텍스트 API(OpenRouter)는 여러 무료 모델을 순서대로 재시도할 수 있어
// 기본 서버리스 함수 시간제한보다 오래 걸릴 수 있다 (docs/PRD.md 7.1).
export const maxDuration = 60;

const dateFormatter = new Intl.DateTimeFormat("ko-KR", {
  month: "long",
  day: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

type RecipeRow = {
  id: string;
  title: string;
  ingredients_json: string[];
  steps_json: string[];
  est_time_minutes: number | null;
  created_at: string;
};

type RequestRow = {
  id: string;
  created_at: string;
  cuisine_override: string | null;
  spice_override: string | null;
  difficulty_override: string | null;
  time_override: string | null;
  text_provider: string | null;
  recipes: RecipeRow[];
};

export default async function RecipesPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { id } = await params;
  const { error: errorParam } = await searchParams;
  const { supabase, user, profile } = await getCurrentUserAndProfile();

  const { data: session } = await supabase
    .from("fridge_sessions")
    .select("id")
    .eq("id", id)
    .maybeSingle();
  if (!session) notFound();

  const theme = profile.theme;

  // 이번 세션에서 지금까지 추천받은 배치를 전부 최신순으로 가져온다 — 새로 추천받으면
  // 위에, 이전 추천들은 그 아래로 밀려나서 계속 보이도록 하기 위함이다.
  const { data: allRequests } = await supabase
    .from("recipe_requests")
    .select(
      "id, created_at, cuisine_override, spice_override, difficulty_override, time_override, text_provider, recipes(id, title, ingredients_json, steps_json, est_time_minutes, created_at)"
    )
    .eq("session_id", id)
    .order("created_at", { ascending: false })
    .returns<RequestRow[]>();

  const latestRequest = allRequests?.[0] ?? null;

  let generationError: string | null = null;

  if (!latestRequest) {
    const result = await requestRecipes(id, {});
    if (result?.error) {
      generationError = result.error;
    } else {
      // 생성 직후 같은 렌더 안에서 다시 조회하는 대신, 다른 조건 재요청 흐름과 똑같이
      // redirect로 완전히 새로운 요청을 발생시킨다. 방금 만든 recipe_requests/recipes를
      // 안정적으로 반영된 상태에서 읽어오기 위함이다.
      redirect(`/sessions/${id}/recipes`);
    }
  }

  const requests = allRequests ?? [];
  const recipeIds = requests.flatMap((r) => r.recipes.map((recipe) => recipe.id));
  const { data: feedbackRows } = recipeIds.length
    ? await supabase
        .from("recipe_feedback")
        .select("recipe_id, reaction, comment_text")
        .eq("user_id", user.id)
        .in("recipe_id", recipeIds)
    : { data: [] as { recipe_id: string; reaction: string; comment_text: string | null }[] };
  const { data: savedRows } = recipeIds.length
    ? await supabase.from("saved_recipes").select("recipe_id").eq("user_id", user.id).in("recipe_id", recipeIds)
    : { data: [] as { recipe_id: string }[] };

  return (
    <div className="theme-page" data-app-theme={theme}>
      <div className="container">
        <AppNav isAdmin={profile.is_admin} email={user.email} />
        <StepIndicator current={3} />
        <h1>레시피 추천</h1>
        <p className="page-subtitle">이번 요청에 한해서만 조건을 바꿔 다시 받아볼 수 있어요.</p>

        {(generationError || errorParam) && (
          <p style={{ color: "var(--app-error)", fontSize: 13, marginTop: 8 }}>
            {generationError ?? decodeURIComponent(errorParam!)}
          </p>
        )}

        {latestRequest && (
          <OverrideForm
            sessionId={id}
            defaults={latestRequest}
            providers={Object.values(textProviders).map((p) => ({ id: p.id, label: p.label }))}
            defaultProviderId={DEFAULT_TEXT_PROVIDER}
          />
        )}

        {requests.map((req, idx) => (
          <div key={req.id} style={{ marginBottom: 28 }}>
            <p
              style={{
                fontSize: 12,
                fontWeight: 700,
                color: "var(--app-muted)",
                margin: "0 0 10px",
                textTransform: "uppercase",
                letterSpacing: "0.03em",
              }}
            >
              {idx === 0 ? "이번 추천" : `이전 추천 · ${dateFormatter.format(new Date(req.created_at))}`}
            </p>
            {req.recipes
              .slice()
              .sort((a, b) => a.created_at.localeCompare(b.created_at))
              .map((r) => (
                <RecipeCard
                  key={r.id}
                  recipe={r}
                  initialReaction={
                    (feedbackRows ?? []).find((f) => f.recipe_id === r.id)?.reaction as
                      | "like"
                      | "dislike"
                      | undefined
                  }
                  initialComment={(feedbackRows ?? []).find((f) => f.recipe_id === r.id)?.comment_text ?? ""}
                  initialSaved={(savedRows ?? []).some((s) => s.recipe_id === r.id)}
                />
              ))}
          </div>
        ))}

        {latestRequest && (
          <form action={async () => {
            "use server";
            const result = await requestRecipes(id, {
              cuisine: latestRequest?.cuisine_override,
              spiceLevel: latestRequest?.spice_override,
              difficulty: latestRequest?.difficulty_override,
              timeLimit: latestRequest?.time_override,
              textProviderId: latestRequest?.text_provider,
            });
            if (result?.error) {
              redirect(`/sessions/${id}/recipes?error=${encodeURIComponent(result.error)}`);
            }
            redirect(`/sessions/${id}/recipes`);
          }}>
            <SubmitButton
              className="more-btn"
              pendingLabel="레시피를 생성하고 있어요... (최대 1분 정도 걸릴 수 있어요)"
            >
              다른 레시피 더 보기
            </SubmitButton>
          </form>
        )}
      </div>
    </div>
  );
}
