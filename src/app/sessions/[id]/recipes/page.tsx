import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requestRecipes } from "@/lib/fridge/actions";
import { textProviders, DEFAULT_TEXT_PROVIDER } from "@/lib/providers";
import { RecipeCard } from "./RecipeCard";
import { OverrideForm } from "./OverrideForm";

export default async function RecipesPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: session } = await supabase
    .from("fridge_sessions")
    .select("id")
    .eq("id", id)
    .maybeSingle();
  if (!session) notFound();

  const { data: profile } = await supabase
    .from("profiles")
    .select("theme")
    .eq("id", user.id)
    .maybeSingle();
  const theme = profile?.theme ?? "apricot";

  let { data: latestRequest } = await supabase
    .from("recipe_requests")
    .select("id, cuisine_override, spice_override, difficulty_override, time_override, text_provider")
    .eq("session_id", id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!latestRequest) {
    await requestRecipes(id, {});
    const { data: fresh } = await supabase
      .from("recipe_requests")
      .select("id, cuisine_override, spice_override, difficulty_override, time_override, text_provider")
      .eq("session_id", id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    latestRequest = fresh;
  }

  const { data: recipes } = await supabase
    .from("recipes")
    .select("id, title, ingredients_json, steps_json, est_time_minutes")
    .eq("request_id", latestRequest!.id)
    .order("created_at", { ascending: true });

  const recipeIds = (recipes ?? []).map((r) => r.id);
  const { data: feedbackRows } = recipeIds.length
    ? await supabase
        .from("recipe_feedback")
        .select("recipe_id, reaction")
        .eq("user_id", user.id)
        .in("recipe_id", recipeIds)
    : { data: [] as { recipe_id: string; reaction: string }[] };
  const { data: savedRows } = recipeIds.length
    ? await supabase.from("saved_recipes").select("recipe_id").eq("user_id", user.id).in("recipe_id", recipeIds)
    : { data: [] as { recipe_id: string }[] };

  return (
    <div className="theme-page" data-app-theme={theme}>
      <div style={{ maxWidth: 480, margin: "0 auto" }}>
        <h1>레시피 추천</h1>
        <p style={{ color: "var(--app-muted)", fontSize: 13 }}>
          이번 요청에 한해서만 조건을 바꿔 다시 받아볼 수 있어요.
        </p>

        <OverrideForm
          sessionId={id}
          defaults={latestRequest}
          providers={Object.values(textProviders).map((p) => ({ id: p.id, label: p.label }))}
          defaultProviderId={DEFAULT_TEXT_PROVIDER}
        />

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
            initialSaved={(savedRows ?? []).some((s) => s.recipe_id === r.id)}
          />
        ))}

        <form action={async () => {
          "use server";
          await requestRecipes(id, {
            cuisine: latestRequest?.cuisine_override,
            spiceLevel: latestRequest?.spice_override,
            difficulty: latestRequest?.difficulty_override,
            timeLimit: latestRequest?.time_override,
            textProviderId: latestRequest?.text_provider,
          });
          redirect(`/sessions/${id}/recipes`);
        }}>
          <button type="submit" className="more-btn">
            다른 레시피 더 보기
          </button>
        </form>
      </div>
    </div>
  );
}
