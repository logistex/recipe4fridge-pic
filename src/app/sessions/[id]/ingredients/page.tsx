import { notFound, redirect } from "next/navigation";
import { getCurrentUserAndProfile } from "@/lib/profile/get-current-profile";
import { AppNav } from "@/components/AppNav";
import { SubmitButton } from "@/components/SubmitButton";
import { StepIndicator } from "@/components/StepIndicator";
import { requestRecipes } from "@/lib/fridge/actions";
import { textProviders, DEFAULT_TEXT_PROVIDER } from "@/lib/providers";
import { rankProviders, sortByRanking } from "@/lib/ratings/ranking";
import { IngredientEditor } from "./IngredientEditor";
import { RecognitionRating } from "./RecognitionRating";

// 실제 텍스트 API(OpenRouter)는 여러 무료 모델을 순서대로 재시도할 수 있어
// 기본 서버리스 함수 시간제한보다 오래 걸릴 수 있다 (docs/PRD.md 7.1).
export const maxDuration = 60;

export default async function IngredientsPage({
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

  const { data: ingredients } = await supabase
    .from("detected_ingredients")
    .select("id, name, quantity_text")
    .eq("session_id", id)
    .order("name");

  const { data: images } = await supabase
    .from("fridge_images")
    .select("image_url, display_order")
    .eq("session_id", id)
    .order("display_order");

  const photoUrls = (
    await Promise.all(
      (images ?? []).map(async (img) => {
        const { data } = await supabase.storage.from("fridge-images").createSignedUrl(img.image_url, 300);
        return data?.signedUrl ?? null;
      })
    )
  ).filter((url): url is string => !!url);

  const { data: myRating } = await supabase
    .from("model_ratings")
    .select("score")
    .eq("session_id", id)
    .eq("user_id", user.id)
    .eq("subject_type", "ingredients")
    .eq("source", "user")
    .maybeSingle();

  // 레시피 품질 평가(사용자 좋아요/싫어요 + AI 판정)가 충분히 쌓인 텍스트 모델은
  // 점수 높은 순으로 위쪽에, 기본 선택값도 그 모델로 자동 반영한다.
  const textRanking = await rankProviders(supabase, ["recipe"]);
  const sortedTextProviders = sortByRanking(Object.values(textProviders), textRanking);
  const defaultTextProviderId = sortedTextProviders[0]?.id ?? DEFAULT_TEXT_PROVIDER;

  return (
    <div className="theme-page" data-app-theme={profile.theme}>
      <div className="container">
        <AppNav email={user.email} />
        <StepIndicator current={2} />
        <h1>인식된 재료</h1>
        <p className="page-subtitle">틀린 부분은 고치고, 빠진 재료는 추가해주세요.</p>

        {photoUrls.length > 0 && (
          <div style={{ display: "flex", gap: 10, marginBottom: 16, flexWrap: "wrap" }}>
            {photoUrls.map((url, i) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                key={i}
                src={url}
                alt={`업로드한 냉장고 사진 ${i + 1}`}
                width={180}
                height={180}
                style={{ objectFit: "cover", borderRadius: 12, border: "1px solid var(--app-line)" }}
              />
            ))}
          </div>
        )}

        <IngredientEditor sessionId={id} initialIngredients={ingredients ?? []} />

        <RecognitionRating sessionId={id} initialScore={myRating?.score ?? null} />

        {errorParam && (
          <p style={{ color: "var(--app-error)", fontSize: 13, marginTop: 8 }}>
            {decodeURIComponent(errorParam)}
          </p>
        )}

        <form
          action={async (formData: FormData) => {
            "use server";
            const textProviderId = formData.get("textProvider")?.toString() || null;
            const result = await requestRecipes(id, {
              textProviderId,
              cuisine: formData.get("cuisine")?.toString() || null,
              spiceLevel: formData.get("spice")?.toString() || null,
              difficulty: formData.get("difficulty")?.toString() || null,
              timeLimit: formData.get("time")?.toString() || null,
            });
            if (result?.error) {
              redirect(`/sessions/${id}/ingredients?error=${encodeURIComponent(result.error)}`);
            }
            redirect(`/sessions/${id}/recipes`);
          }}
          className="card"
          style={{ marginTop: 24 }}
        >
          <label className="field-label">
            선호 조건 (설정에 저장해둔 값이 기본으로 선택돼요 — 이번 요청만 다르게 바꿀 수 있어요)
          </label>
          <div className="pref-bar" style={{ margin: "0 0 16px", background: "var(--app-bg)" }}>
            <select name="cuisine" defaultValue={profile.cuisine_type ?? ""}>
              <option value="">선호 없음</option>
              <option value="korean">한식</option>
              <option value="western">양식</option>
              <option value="chinese">중식</option>
              <option value="japanese">일식</option>
            </select>
            <select name="spice" defaultValue={profile.spice_level ?? ""}>
              <option value="">선호 없음</option>
              <option value="none">안 매움</option>
              <option value="medium">보통</option>
              <option value="hot">매움</option>
            </select>
            <select name="difficulty" defaultValue={profile.difficulty ?? ""}>
              <option value="">선호 없음</option>
              <option value="easy">쉬움</option>
              <option value="medium">보통</option>
              <option value="hard">어려움</option>
            </select>
            <select name="time" defaultValue={profile.time_limit ?? ""}>
              <option value="">선호 없음</option>
              <option value="under_15">15분 이내</option>
              <option value="under_30">30분 이내</option>
              <option value="no_limit">제한 없음</option>
            </select>
          </div>

          <label className="field-label">레시피 추천에 쓸 텍스트 API</label>
          <select name="textProvider" defaultValue={defaultTextProviderId} style={{ width: "100%", marginBottom: 16 }}>
            {sortedTextProviders.map((p) => (
              <option key={p.id} value={p.id}>
                {p.label}
              </option>
            ))}
          </select>

          <SubmitButton
            pendingLabel="레시피를 생성하고 있어요... (최대 1분 정도 걸릴 수 있어요)"
            className="btn-primary btn-block"
          >
            레시피 추천 받기
          </SubmitButton>
        </form>
      </div>
    </div>
  );
}
