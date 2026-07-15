import { notFound, redirect } from "next/navigation";
import { getCurrentUserAndProfile } from "@/lib/profile/get-current-profile";
import { requestRecipes } from "@/lib/fridge/actions";
import { textProviders, DEFAULT_TEXT_PROVIDER } from "@/lib/providers";
import { AppNav } from "@/components/AppNav";
import { SubmitButton } from "@/components/SubmitButton";
import { RecipeCard } from "./RecipeCard";
import { OverrideForm } from "./OverrideForm";

// 실제 텍스트 API(OpenRouter)는 여러 무료 모델을 순서대로 재시도할 수 있어
// 기본 서버리스 함수 시간제한보다 오래 걸릴 수 있다 (docs/PRD.md 7.1).
export const maxDuration = 60;

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

  let { data: latestRequest } = await supabase
    .from("recipe_requests")
    .select("id, cuisine_override, spice_override, difficulty_override, time_override, text_provider")
    .eq("session_id", id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  let generationError: string | null = null;

  if (!latestRequest) {
    const result = await requestRecipes(id, {});
    if (result?.error) {
      generationError = result.error;
    } else {
      const { data: fresh } = await supabase
        .from("recipe_requests")
        .select("id, cuisine_override, spice_override, difficulty_override, time_override, text_provider")
        .eq("session_id", id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      latestRequest = fresh;
    }
  }

  const { data: recipes } = latestRequest
    ? await supabase
        .from("recipes")
        .select("id, title, ingredients_json, steps_json, est_time_minutes")
        .eq("request_id", latestRequest.id)
        .order("created_at", { ascending: true })
    : { data: [] as { id: string; title: string; ingredients_json: string[]; steps_json: string[]; est_time_minutes: number | null }[] };

  const recipeIds = (recipes ?? []).map((r) => r.id);
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
      <div style={{ maxWidth: 480, margin: "0 auto" }}>
        <AppNav isAdmin={profile.is_admin} />
        <h1>레시피 추천</h1>
        <p style={{ color: "var(--app-muted)", fontSize: 13 }}>
          이번 요청에 한해서만 조건을 바꿔 다시 받아볼 수 있어요.
        </p>

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

        {(recipes ?? []).map((r) => (
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
