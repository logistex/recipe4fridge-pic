"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getVisionProvider, getTextProvider } from "@/lib/providers";

// 짧은 시간에 같은 작업(사진 업로드, 레시피 요청)을 과도하게 반복하지 못하게 막는 간단한 rate limit.
// 무료 API 한도/비용 남용 방지 목적 (docs/PRD.md 8.1).
async function assertUnderRateLimit(
  supabase: Awaited<ReturnType<typeof createClient>>,
  table: "fridge_sessions" | "recipe_requests",
  userId: string,
  windowMinutes: number,
  maxCount: number
) {
  const since = new Date(Date.now() - windowMinutes * 60 * 1000).toISOString();
  const { count, error } = await supabase
    .from(table)
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .gte("created_at", since);
  if (error) throw new Error(error.message);
  if ((count ?? 0) >= maxCount) {
    throw new Error(
      `너무 많이 요청하셨어요. ${windowMinutes}분 후에 다시 시도해주세요.`
    );
  }
}

export async function createFridgeSession(input: {
  sessionId: string;
  images: { path: string; originalSizeBytes: number; resized: boolean }[];
  visionProviderId?: string;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  await assertUnderRateLimit(supabase, "fridge_sessions", user.id, 10, 5);

  const visionProvider = getVisionProvider(input.visionProviderId);

  const { error: sessionError } = await supabase.from("fridge_sessions").insert({
    id: input.sessionId,
    user_id: user.id,
    vision_provider: visionProvider.id,
  });
  if (sessionError) throw new Error(sessionError.message);

  const imageRows = input.images.map((img, i) => ({
    session_id: input.sessionId,
    image_url: img.path,
    original_size_bytes: img.originalSizeBytes,
    resized: img.resized,
    display_order: i,
  }));
  const { error: imagesError } = await supabase.from("fridge_images").insert(imageRows);
  if (imagesError) throw new Error(imagesError.message);

  const detected = await visionProvider.detectIngredients(
    input.images.map((img) => img.path)
  );
  const ingredientRows = detected.map((d) => ({
    session_id: input.sessionId,
    name: d.name,
    quantity_text: d.quantityText ?? null,
    is_user_edited: false,
  }));
  const { error: ingredientsError } = await supabase
    .from("detected_ingredients")
    .insert(ingredientRows);
  if (ingredientsError) throw new Error(ingredientsError.message);

  redirect(`/sessions/${input.sessionId}/ingredients`);
}

export async function addIngredient(
  sessionId: string,
  input: { name: string; quantityText?: string }
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { error } = await supabase.from("detected_ingredients").insert({
    session_id: sessionId,
    name: input.name,
    quantity_text: input.quantityText || null,
    is_user_edited: true,
  });
  if (error) throw new Error(error.message);
  revalidatePath(`/sessions/${sessionId}/ingredients`);
}

export async function updateIngredient(
  id: string,
  sessionId: string,
  input: { name: string; quantityText?: string }
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { error } = await supabase
    .from("detected_ingredients")
    .update({
      name: input.name,
      quantity_text: input.quantityText || null,
      is_user_edited: true,
    })
    .eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath(`/sessions/${sessionId}/ingredients`);
}

export async function deleteIngredient(id: string, sessionId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { error } = await supabase.from("detected_ingredients").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath(`/sessions/${sessionId}/ingredients`);
}

export type RecipeOverrides = {
  cuisine?: string | null;
  spiceLevel?: string | null;
  difficulty?: string | null;
  timeLimit?: string | null;
  textProviderId?: string | null;
};

export async function requestRecipes(sessionId: string, overrides: RecipeOverrides) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  await assertUnderRateLimit(supabase, "recipe_requests", user.id, 10, 10);

  const norm = (v?: string | null) => (v ? v : null);
  const cuisine = norm(overrides.cuisine);
  const spiceLevel = norm(overrides.spiceLevel);
  const difficulty = norm(overrides.difficulty);
  const timeLimit = norm(overrides.timeLimit);

  const { data: ingredientRows } = await supabase
    .from("detected_ingredients")
    .select("name")
    .eq("session_id", sessionId);
  const ingredients = (ingredientRows ?? []).map((row) => row.name);

  const { data: profile } = await supabase
    .from("profiles")
    .select("cuisine_type, spice_level, difficulty, time_limit")
    .eq("id", user.id)
    .maybeSingle();

  const preferences = {
    cuisine: cuisine ?? profile?.cuisine_type ?? null,
    spiceLevel: spiceLevel ?? profile?.spice_level ?? null,
    difficulty: difficulty ?? profile?.difficulty ?? null,
    timeLimit: timeLimit ?? profile?.time_limit ?? null,
  };

  const textProvider = getTextProvider(overrides.textProviderId);
  const results = await textProvider.recommendRecipes({
    ingredients,
    preferences,
    count: 3,
  });

  const { data: request, error: requestError } = await supabase
    .from("recipe_requests")
    .insert({
      session_id: sessionId,
      user_id: user.id,
      text_provider: textProvider.id,
      cuisine_override: cuisine,
      spice_override: spiceLevel,
      difficulty_override: difficulty,
      time_override: timeLimit,
      requested_count: 3,
    })
    .select("id")
    .single();
  if (requestError) throw new Error(requestError.message);

  const recipeRows = results.map((r) => ({
    request_id: request.id,
    title: r.title,
    ingredients_json: r.ingredients,
    steps_json: r.steps,
    est_time_minutes: r.estTimeMinutes,
  }));
  const { error: recipesError } = await supabase.from("recipes").insert(recipeRows);
  if (recipesError) throw new Error(recipesError.message);
  // 호출하는 쪽(더 보기 / 조건 재요청 폼)에서 redirect()로 새로고침을 보장하므로
  // 여기서는 revalidatePath를 호출하지 않는다 (렌더링 중 호출 시 Next.js가 에러를 던짐).
}

export async function setRecipeFeedback(recipeId: string, reaction: "like" | "dislike") {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { error } = await supabase
    .from("recipe_feedback")
    .upsert(
      { recipe_id: recipeId, user_id: user.id, reaction },
      { onConflict: "recipe_id,user_id" }
    );
  if (error) throw new Error(error.message);
}

export async function toggleSaveRecipe(recipeId: string, save: boolean) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  if (save) {
    const { error } = await supabase
      .from("saved_recipes")
      .insert({ user_id: user.id, recipe_id: recipeId });
    if (error) throw new Error(error.message);
  } else {
    const { error } = await supabase
      .from("saved_recipes")
      .delete()
      .eq("user_id", user.id)
      .eq("recipe_id", recipeId);
    if (error) throw new Error(error.message);
  }
}
