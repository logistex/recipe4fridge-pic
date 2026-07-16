import { redirect } from "next/navigation";
import { getCurrentUserAndProfile } from "@/lib/profile/get-current-profile";
import { AppNav } from "@/components/AppNav";

type FeedbackRow = {
  recipe_id: string;
  reaction: "like" | "dislike";
  comment_text: string | null;
  created_at: string;
  recipes: { title: string } | null;
};

export default async function AdminPage() {
  const { supabase, user, profile } = await getCurrentUserAndProfile();

  // 클라이언트에서 UI만 숨기지 않고, 서버에서 권한을 직접 강제한다 (docs/PRD.md 8.1).
  if (!profile.is_admin) redirect("/");

  const { data: feedback } = await supabase
    .from("recipe_feedback")
    .select("recipe_id, reaction, comment_text, created_at, recipes(title)")
    .order("created_at", { ascending: false })
    .returns<FeedbackRow[]>();

  const byRecipe = new Map<
    string,
    { title: string; likes: number; dislikes: number; comments: { text: string; reaction: string; createdAt: string }[] }
  >();

  for (const f of feedback ?? []) {
    const title = f.recipes?.title ?? "(제목 없음)";
    if (!byRecipe.has(f.recipe_id)) {
      byRecipe.set(f.recipe_id, { title, likes: 0, dislikes: 0, comments: [] });
    }
    const entry = byRecipe.get(f.recipe_id)!;
    if (f.reaction === "like") entry.likes += 1;
    else entry.dislikes += 1;
    if (f.comment_text) {
      entry.comments.push({ text: f.comment_text, reaction: f.reaction, createdAt: f.created_at });
    }
  }

  const rows = Array.from(byRecipe.entries()).sort(
    (a, b) => b[1].likes + b[1].dislikes - (a[1].likes + a[1].dislikes)
  );

  return (
    <div className="theme-page" data-app-theme={profile.theme}>
      <div className="container-wide">
        <AppNav isAdmin={profile.is_admin} email={user.email} />
        <h1>관리자 — 레시피 평가 집계</h1>
        <p className="page-subtitle">
          전체 사용자의 좋아요/싫어요와 코멘트를 레시피별로 모아봤어요. (전체 기간 기준)
        </p>

        {rows.length === 0 && <p className="empty-state">아직 쌓인 평가가 없어요.</p>}

        {rows.map(([recipeId, r]) => (
          <div key={recipeId} className="recipe-card">
            <div className="recipe-card-head">
              <span className="recipe-card-title">{r.title}</span>
              <span className="recipe-card-meta">
                좋아요 {r.likes} · 싫어요 {r.dislikes}
              </span>
            </div>
            {r.comments.length > 0 && (
              <ul style={{ fontSize: 13, color: "var(--app-text)", paddingLeft: 18, marginTop: 8 }}>
                {r.comments.map((c, i) => (
                  <li key={i}>
                    [{c.reaction === "like" ? "좋아요" : "싫어요"}] {c.text}
                  </li>
                ))}
              </ul>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
