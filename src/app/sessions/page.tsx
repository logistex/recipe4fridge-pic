import Link from "next/link";
import { getCurrentUserAndProfile } from "@/lib/profile/get-current-profile";
import { AppNav } from "@/components/AppNav";
import { DeleteSessionButton } from "./DeleteSessionButton";

const dateFormatter = new Intl.DateTimeFormat("ko-KR", {
  month: "long",
  day: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

export default async function SessionsPage() {
  const { supabase, user, profile } = await getCurrentUserAndProfile();

  const { data: sessions } = await supabase
    .from("fridge_sessions")
    .select("id, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(30);

  const sessionIds = (sessions ?? []).map((s) => s.id);
  const { data: allIngredients } = sessionIds.length
    ? await supabase.from("detected_ingredients").select("session_id, name").in("session_id", sessionIds)
    : { data: [] as { session_id: string; name: string }[] };

  const ingredientsBySession = new Map<string, string[]>();
  for (const ing of allIngredients ?? []) {
    const list = ingredientsBySession.get(ing.session_id) ?? [];
    list.push(ing.name);
    ingredientsBySession.set(ing.session_id, list);
  }

  return (
    <div className="theme-page" data-app-theme={profile.theme}>
      <div className="container">
        <AppNav isAdmin={profile.is_admin} email={user.email} />
        <h1>이전 재료로 다시 추천받기</h1>
        <p className="page-subtitle">
          예전에 인식했던 재료로 바로 새 레시피를 받아볼 수 있어요. 사진을 다시 올릴 필요 없어요.
        </p>

        {(sessions ?? []).length === 0 && (
          <p className="empty-state">
            아직 업로드한 냉장고 사진이 없어요.
            <br />
            <Link href="/upload" style={{ fontWeight: 700 }}>
              첫 사진 업로드하러 가기
            </Link>
          </p>
        )}

        <div className="session-list">
          {(sessions ?? []).map((s) => {
            const names = ingredientsBySession.get(s.id) ?? [];
            const preview =
              names.length === 0
                ? "인식된 재료 없음"
                : names.length <= 3
                  ? names.join(", ")
                  : `${names.slice(0, 3).join(", ")} 외 ${names.length - 3}개`;

            return (
              <div key={s.id} className="card session-card">
                <Link
                  href={`/sessions/${s.id}/ingredients`}
                  style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flex: 1, textDecoration: "none", color: "inherit" }}
                >
                  <div>
                    <div className="session-card-date">{dateFormatter.format(new Date(s.created_at))}</div>
                    <div className="session-card-ingredients">{preview}</div>
                  </div>
                  <span className="session-card-arrow">→</span>
                </Link>
                <DeleteSessionButton sessionId={s.id} />
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
