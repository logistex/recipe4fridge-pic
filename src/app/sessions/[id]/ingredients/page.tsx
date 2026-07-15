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
      <div style={{ maxWidth: 480, margin: "0 auto" }}>
        <AppNav isAdmin={profile.is_admin} />
        <h1 style={{ fontSize: 22 }}>인식된 재료</h1>
        <p style={{ color: "var(--app-muted)", fontSize: 14 }}>
          틀린 부분은 고치고, 빠진 재료는 추가해주세요.
        </p>

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
            const result = await requestRecipes(id, { textProviderId });
            if (result?.error) {
              redirect(`/sessions/${id}/ingredients?error=${encodeURIComponent(result.error)}`);
            }
            redirect(`/sessions/${id}/recipes`);
          }}
          style={{ marginTop: 24 }}
        >
          <label style={{ fontSize: 13, color: "var(--app-muted)", display: "block", marginBottom: 4 }}>
            레시피 추천에 쓸 텍스트 API
          </label>
          <select
            name="textProvider"
            defaultValue={DEFAULT_TEXT_PROVIDER}
            style={{
              padding: 8,
              borderRadius: 8,
              border: "1px solid var(--app-line)",
              background: "var(--app-surface)",
              color: "var(--app-text)",
              width: "100%",
              maxWidth: 360,
              marginBottom: 12,
            }}
          >
            {Object.values(textProviders).map((p) => (
              <option key={p.id} value={p.id}>
                {p.label}
              </option>
            ))}
          </select>

          <SubmitButton
            pendingLabel="레시피를 생성하고 있어요... (최대 1분 정도 걸릴 수 있어요)"
            style={{
              display: "inline-block",
              padding: "10px 16px",
              background: "var(--app-accent)",
              color: "var(--app-accent-ink)",
              border: "none",
              borderRadius: 999,
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            레시피 추천 받기
          </SubmitButton>
        </form>
      </div>
    </div>
  );
}
