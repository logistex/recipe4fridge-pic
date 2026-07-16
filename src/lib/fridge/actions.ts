"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getVisionProvider, getTextProvider } from "@/lib/providers";
import { judgePhotoAndIngredients, judgeRecipeBatch } from "@/lib/providers/judge";

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

  // 인식이 실패하거나 재료를 못 찾으면, 이미 만들어둔 세션/이미지 row와 스토리지
  // 파일이 빈 기록으로 남지 않도록 정리한다 (fridge_images는 on delete cascade).
  async function cleanupFailedSession() {
    await supabase.from("fridge_sessions").delete().eq("id", input.sessionId);
    await supabase.storage
      .from("fridge-images")
      .remove(input.images.map((img) => img.path));
  }

  let detected;
  let signedUrls: string[] = [];
  try {
    // mock provider는 URL 내용을 안 보지만, 실제 API(OpenRouter 등)는 이미지를 직접 가져와야 하므로
    // 비공개 버킷 경로 대신 짧게 유효한 서명된 URL을 만들어 전달한다.
    signedUrls = await Promise.all(
      input.images.map(async (img) => {
        const { data, error } = await supabase.storage
          .from("fridge-images")
          .createSignedUrl(img.path, 300);
        if (error || !data) throw new Error("이미지 URL을 만들지 못했어요.");
        return data.signedUrl;
      })
    );
    detected = await visionProvider.detectIngredients(signedUrls);
  } catch (err) {
    await cleanupFailedSession();
    return {
      error:
        err instanceof Error
          ? err.message
          : "식재료 인식에 실패했어요. 잠시 후 다시 시도하거나 다른 비전 API를 선택해주세요.",
    };
  }

  if (detected.length === 0) {
    // 재료를 하나도 못 찾았으면 빈 재료 확인 화면으로 보내는 대신, 업로드 화면에서
    // 바로 재시도할 수 있도록 에러로 돌려준다.
    await cleanupFailedSession();
    return {
      error: "사진에서 식재료를 하나도 찾지 못했어요. 더 선명한 사진으로 다시 시도하거나 다른 비전 API를 선택해주세요.",
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

  // 사진/재료인식 품질에 대한 AI 판정은 사용자가 다음 화면으로 넘어간 뒤에(응답을 막지
  // 않고) 백그라운드로 돌린다 — 새로 만든 세션은 public_consent 기본값(true)이라 별도
  // 동의 확인 없이 평가 대상이 된다.
  after(async () => {
    const verdict = await judgePhotoAndIngredients({
      imageUrls: signedUrls,
      ingredientNames: detected.map((d) => d.name),
    });
    if (!verdict) return;
    const { error } = await supabase.from("model_ratings").insert([
      {
        subject_type: "photo",
        session_id: input.sessionId,
        provider_id: visionProvider.id,
        source: "ai_judge",
        user_id: user.id,
        score: verdict.photoScore,
        note: verdict.note ?? null,
      },
      {
        subject_type: "ingredients",
        session_id: input.sessionId,
        provider_id: visionProvider.id,
        source: "ai_judge",
        user_id: user.id,
        score: verdict.ingredientsScore,
        note: verdict.note ?? null,
      },
    ]);
    if (error) console.error("AI 판정 저장 실패(사진/재료인식):", error.message);
  });

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

  // 같은 세션에서 이미 추천했던 레시피 제목들을 모아서, 텍스트 API에 "이미 추천했으니
  // 피하라"고 알려준다 — 재료/조건이 그대로면 모델이 겹치는 레시피를 다시 낼 수 있어서다.
  const { data: pastRequestRows } = await supabase
    .from("recipe_requests")
    .select("id")
    .eq("session_id", sessionId);
  const pastRequestIds = (pastRequestRows ?? []).map((r) => r.id);
  const { data: pastRecipeRows } = pastRequestIds.length
    ? await supabase.from("recipes").select("title").in("request_id", pastRequestIds)
    : { data: [] as { title: string }[] };
  const previousTitles = Array.from(new Set((pastRecipeRows ?? []).map((r) => r.title)));

  const textProvider = getTextProvider(overrides.textProviderId);
  let results;
  try {
    results = await textProvider.recommendRecipes({
      ingredients,
      preferences,
      count: 3,
      previousTitles,
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

  // 레시피 품질에 대한 AI 판정도 응답을 막지 않고 백그라운드로 돌린다.
  after(async () => {
    const verdict = await judgeRecipeBatch({
      ingredientNames: ingredients,
      recipes: results.map((r) => ({ title: r.title, ingredients: r.ingredients, steps: r.steps })),
    });
    if (!verdict) return;
    const { error } = await supabase.from("model_ratings").insert({
      subject_type: "recipe",
      request_id: request.id,
      provider_id: textProvider.id,
      source: "ai_judge",
      user_id: user.id,
      score: verdict.score,
      note: verdict.note ?? null,
    });
    if (error) console.error("AI 판정 저장 실패(레시피):", error.message);
  });
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

export async function rateRecognition(sessionId: string, score: number) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: session } = await supabase
    .from("fridge_sessions")
    .select("vision_provider")
    .eq("id", sessionId)
    .maybeSingle();
  if (!session) return;

  // 같은 사람이 다시 평가하면 이전 것을 지우고 새로 남긴다 (집계에 중복 반영 방지).
  await supabase
    .from("model_ratings")
    .delete()
    .eq("session_id", sessionId)
    .eq("user_id", user.id)
    .eq("subject_type", "ingredients")
    .eq("source", "user");

  const { error } = await supabase.from("model_ratings").insert({
    subject_type: "ingredients",
    session_id: sessionId,
    provider_id: session.vision_provider,
    source: "user",
    user_id: user.id,
    score: Math.max(1, Math.min(5, Math.round(score))),
  });
  if (error) throw new Error(error.message);
  revalidatePath(`/sessions/${sessionId}/ingredients`);
}

// 텍스트 모델(레시피 추천) 평가 — 좋아요/싫어요(레시피 인기투표)와는 별개의 축이다.
// "이 레시피 묶음이 보유 재료를 얼마나 잘 활용했는지"를 추천받은 본인이 배치(요청) 단위로
// 한 번 평가하고, 이 점수가 텍스트 모델 품질 집계에 쓰인다.
export async function rateRecipeRelevance(requestId: string, score: number) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: request } = await supabase
    .from("recipe_requests")
    .select("id, session_id, text_provider")
    .eq("id", requestId)
    .maybeSingle();
  if (!request) return;

  await supabase
    .from("model_ratings")
    .delete()
    .eq("request_id", requestId)
    .eq("user_id", user.id)
    .eq("subject_type", "recipe")
    .eq("source", "user");

  const { error } = await supabase.from("model_ratings").insert({
    subject_type: "recipe",
    request_id: requestId,
    provider_id: request.text_provider,
    source: "user",
    user_id: user.id,
    score: Math.max(1, Math.min(5, Math.round(score))),
  });
  if (error) throw new Error(error.message);
  revalidatePath(`/sessions/${request.session_id}/recipes`);
}

export async function deleteFridgeSession(sessionId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // 스토리지에 남은 사진 파일은 DB row 삭제(on delete cascade)로는 안 지워지니
  // 먼저 경로를 알아내서 같이 지운다.
  const { data: images } = await supabase
    .from("fridge_images")
    .select("image_url")
    .eq("session_id", sessionId);

  // user_id까지 명시적으로 조건에 넣어서, 다른 사람 세션은 지울 수 없도록 한다 (RLS와 별개의 방어선).
  const { error } = await supabase
    .from("fridge_sessions")
    .delete()
    .eq("id", sessionId)
    .eq("user_id", user.id);
  if (error) throw new Error(error.message);

  if (images && images.length > 0) {
    await supabase.storage
      .from("fridge-images")
      .remove(images.map((img) => img.image_url));
  }

  revalidatePath("/sessions");
}
