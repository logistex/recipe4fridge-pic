import { getCurrentUserAndProfile } from "@/lib/profile/get-current-profile";
import { AppNav } from "@/components/AppNav";
import { RecipeCard } from "@/app/sessions/[id]/recipes/RecipeCard";

export default async function SavedRecipesPage() {
  const { supabase, user, profile } = await getCurrentUserAndProfile();

  const { data: savedRows } = await supabase
    .from("saved_recipes")
    .select("recipe_id, saved_at")
    .eq("user_id", user.id)
    .order("saved_at", { ascending: false });

  const recipeIds = (savedRows ?? []).map((s) => s.recipe_id);

  const { data: recipes } = recipeIds.length
    ? await supabase
        .from("recipes")
        .select("id, title, ingredients_json, steps_json, est_time_minutes")
        .in("id", recipeIds)
    : { data: [] as { id: string; title: string; ingredients_json: string[]; steps_json: string[]; est_time_minutes: number | null }[] };

  // saved_at 순서를 그대로 유지 (최근 저장한 게 위로)
  const orderedRecipes = recipeIds
    .map((id) => (recipes ?? []).find((r) => r.id === id))
    .filter((r): r is NonNullable<typeof r> => !!r);

  const { data: feedbackRows } = recipeIds.length
    ? await supabase
        .from("recipe_feedback")
        .select("recipe_id, reaction, comment_text")
        .eq("user_id", user.id)
        .in("recipe_id", recipeIds)
    : { data: [] as { recipe_id: string; reaction: string; comment_text: string | null }[] };

  return (
    <div className="theme-page" data-app-theme={profile.theme}>
      <div className="container">
        <AppNav isAdmin={profile.is_admin} />
        <h1>저장한 레시피</h1>
        <p className="page-subtitle">
          &ldquo;저장&rdquo; 버튼을 눌렀던 레시피 목록이에요. 저장 취소하면 이 목록에서 빠져요.
        </p>

        {orderedRecipes.length === 0 && (
          <p className="empty-state">아직 저장한 레시피가 없어요.</p>
        )}

        {orderedRecipes.map((r) => (
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
            initialSaved
          />
        ))}
      </div>
    </div>
  );
}
