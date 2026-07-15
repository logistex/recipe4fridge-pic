"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getVisionProvider, getTextProvider } from "@/lib/providers";

// 짧은 시간에 같은 작업(사진 업로드, 레시피 요청)을 과도하게 반복하지 못하게 막는 간단한 rate limit.
// 무료 API 한도/비용 남용 방지 목적 (docs/PRD.md 8.1).
// throw 하지 않고 boolean을 반환한다 — 호출하는 쪽에서 사용자에게 친절한 안내를 보여줄 수 있도록.
async function isRateLimited(
  supabase: Awaited<ReturnType<typeof createClient>>,
  table: "fridge_sessions" | "recipe_requests",
  userId: string,
  windowMinutes: number,
  maxCount: number
): Promise<boolean> {
  const since = new Date(Date.now() - windowMinutes * 60 * 1000).toISOString();
  const { count, error } = await supabase
    .from(table)
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .gte("created_at", since);
  if (error) throw new Error(error.message);
  return (count ?? 0) >= maxCount;
}

export async function createFridgeSession(input: {
  sessionId: string;
  images: { path: string; originalSizeBytes: number; resized: boolean }[];
  visionProviderId?: string;
}): Promise<{ error: string } | void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  if (await isRateLimited(supabase, "fridge_sessions", user.id, 10, 5)) {
    return { error: "짧은 시간에 너무 많이 업로드하셨어요. 10분 후에 다시 시도해주세요." };
  }

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

  // mock provider는 URL 내용을 안 보지만, 실제 API(OpenRouter 등)는 이미지를 직접 가져와야 하므로
  // 비공개 버킷 경로 대신 짧게 유효한 서명된 URL을 만들어 전달한다.
  const signedUrls = await Promise.all(
    input.images.map(async (img) => {
      const { data, error } = await supabase.storage
        .from("fridge-images")
        .createSignedUrl(img.path, 300);
      if (error || !data) throw new Error("이미지 URL을 만들지 못했어요.");
      return data.signedUrl;
    })
  );

  let detected;
  try {
    detected = await visionProvider.detectIngredients(signedUrls);
  } catch (err) {
    return {
      error:
        err instanceof Error
          ? err.message
          : "식재료 인식에 실패했어요. 잠시 후 다시 시도하거나 다른 비전 API를 선택해주세요.",
    };
  }

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

export async function requestRecipes(
  sessionId: string,
  overrides: RecipeOverrides
): Promise<{ error: string } | void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  if (await isRateLimited(supabase, "recipe_requests", user.id, 10, 10)) {
    return { error: "짧은 시간에 너무 많이 요청하셨어요. 10분 후에 다시 시도해주세요." };
  }

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
  let results;
  try {
    results = await textProvider.recommendRecipes({
      ingredients,
      preferences,
      count: 3,
    });
  } catch (err) {
    return {
      error:
        err instanceof Error
          ? err.message
          : "레시피 추천에 실패했어요. 잠시 후 다시 시도하거나 다른 텍스트 API를 선택해주세요.",
    };
  }

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

export async function setRecipeComment(recipeId: string, comment: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // 코멘트는 좋아요/싫어요를 먼저 선택해야 남길 수 있다 (recipe_feedback.reaction은 not null).
  const { error } = await supabase
    .from("recipe_feedback")
    .update({ comment_text: comment || null })
    .eq("recipe_id", recipeId)
    .eq("user_id", user.id);
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
