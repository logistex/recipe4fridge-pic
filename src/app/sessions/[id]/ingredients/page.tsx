import { notFound, redirect } from "next/navigation";
import { getCurrentUserAndProfile } from "@/lib/profile/get-current-profile";
import { AppNav } from "@/components/AppNav";
import { SubmitButton } from "@/components/SubmitButton";
import { requestRecipes } from "@/lib/fridge/actions";
import { textProviders, DEFAULT_TEXT_PROVIDER } from "@/lib/providers";
import { IngredientEditor } from "./IngredientEditor";

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
  const { supabase, profile } = await getCurrentUserAndProfile();

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

  return (
    <div className="theme-page" data-app-theme={profile.theme}>
      <div className="container">
        <AppNav isAdmin={profile.is_admin} />
        <h1>인식된 재료</h1>
        <p className="page-subtitle">틀린 부분은 고치고, 빠진 재료는 추가해주세요.</p>

        <IngredientEditor sessionId={id} initialIngredients={ingredients ?? []} />

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
          <label className="field-label">선호 조건 (선택하지 않으면 설정의 기본값을 사용해요)</label>
          <div className="pref-bar" style={{ margin: "0 0 16px", background: "var(--app-bg)" }}>
            <select name="cuisine" defaultValue="">
              <option value="">요리 종류(기본값)</option>
              <option value="korean">한식</option>
              <option value="western">양식</option>
              <option value="chinese">중식</option>
              <option value="japanese">일식</option>
            </select>
            <select name="spice" defaultValue="">
              <option value="">매운맛(기본값)</option>
              <option value="none">안 매움</option>
              <option value="medium">보통</option>
              <option value="hot">매움</option>
            </select>
            <select name="difficulty" defaultValue="">
              <option value="">난이도(기본값)</option>
              <option value="easy">쉬움</option>
              <option value="medium">보통</option>
              <option value="hard">어려움</option>
            </select>
            <select name="time" defaultValue="">
              <option value="">시간(기본값)</option>
              <option value="under_15">15분 이내</option>
              <option value="under_30">30분 이내</option>
              <option value="no_limit">제한 없음</option>
            </select>
          </div>

          <label className="field-label">레시피 추천에 쓸 텍스트 API</label>
          <select name="textProvider" defaultValue={DEFAULT_TEXT_PROVIDER} style={{ width: "100%", marginBottom: 16 }}>
            {Object.values(textProviders).map((p) => (
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
