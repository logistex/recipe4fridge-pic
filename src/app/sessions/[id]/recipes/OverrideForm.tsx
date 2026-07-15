import { redirect } from "next/navigation";
import { requestRecipes } from "@/lib/fridge/actions";

type Defaults = {
  cuisine_override: string | null;
  spice_override: string | null;
  difficulty_override: string | null;
  time_override: string | null;
  text_provider: string | null;
} | null;

type ProviderOption = { id: string; label: string };

export function OverrideForm({
  sessionId,
  defaults,
  providers,
  defaultProviderId,
}: {
  sessionId: string;
  defaults: Defaults;
  providers: ProviderOption[];
  defaultProviderId: string;
}) {
  async function submitOverride(formData: FormData) {
    "use server";
    const result = await requestRecipes(sessionId, {
      cuisine: formData.get("cuisine")?.toString() || null,
      spiceLevel: formData.get("spice")?.toString() || null,
      difficulty: formData.get("difficulty")?.toString() || null,
      timeLimit: formData.get("time")?.toString() || null,
      textProviderId: formData.get("textProvider")?.toString() || null,
    });
    if (result?.error) {
      redirect(`/sessions/${sessionId}/recipes?error=${encodeURIComponent(result.error)}`);
    }
    redirect(`/sessions/${sessionId}/recipes`);
  }

  return (
    <form action={submitOverride} className="pref-bar">
      <select name="cuisine" defaultValue={defaults?.cuisine_override ?? ""}>
        <option value="">요리 종류(기본값)</option>
        <option value="korean">한식</option>
        <option value="western">양식</option>
        <option value="chinese">중식</option>
        <option value="japanese">일식</option>
      </select>
      <select name="spice" defaultValue={defaults?.spice_override ?? ""}>
        <option value="">매운맛(기본값)</option>
        <option value="none">안 매움</option>
        <option value="medium">보통</option>
        <option value="hot">매움</option>
      </select>
      <select name="difficulty" defaultValue={defaults?.difficulty_override ?? ""}>
        <option value="">난이도(기본값)</option>
        <option value="easy">쉬움</option>
        <option value="medium">보통</option>
        <option value="hard">어려움</option>
      </select>
      <select name="time" defaultValue={defaults?.time_override ?? ""}>
        <option value="">시간(기본값)</option>
        <option value="under_15">15분 이내</option>
        <option value="under_30">30분 이내</option>
        <option value="no_limit">제한 없음</option>
      </select>
      <select name="textProvider" defaultValue={defaults?.text_provider ?? defaultProviderId}>
        {providers.map((p) => (
          <option key={p.id} value={p.id}>
            {p.label}
          </option>
        ))}
      </select>
      <button type="submit">이번만 다르게 추천받기</button>
    </form>
  );
}
