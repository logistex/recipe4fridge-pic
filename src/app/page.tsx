import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { AppNav } from "@/components/AppNav";

export default async function Home() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return (
      <div className="theme-page" data-app-theme="apricot">
        <main className="container">
          <h1>recipe4fridge_pic</h1>
          <p className="page-subtitle" style={{ marginBottom: 20 }}>
            냉장고 사진 한 장으로 오늘 만들 수 있는 레시피를 찾아드려요.
          </p>
          <div style={{ display: "flex", gap: 10 }}>
            <Link href="/login" className="btn btn-primary">
              로그인
            </Link>
            <Link href="/signup" className="btn btn-outline">
              회원가입
            </Link>
          </div>
        </main>
      </div>
    );
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("theme, is_admin")
    .eq("id", user.id)
    .maybeSingle();
  const theme = profile?.theme ?? "apricot";

  // 세션이 하나도 없으면(=처음 온 사용자로 간주) 사용법을 짧게 안내한다.
  const { count: sessionCount } = await supabase
    .from("fridge_sessions")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id);

  return (
    <div className="theme-page" data-app-theme={theme}>
      <div className="container">
        <AppNav isAdmin={profile?.is_admin} email={user.email} />
        <h1>recipe4fridge_pic</h1>
        <p className="page-subtitle" style={{ marginBottom: 20 }}>
          <strong style={{ color: "var(--app-text)" }}>{user.email}</strong>님으로 로그인되어 있어요.
        </p>

        {!sessionCount && (
          <div className="card" style={{ marginBottom: 16 }}>
            <p style={{ fontWeight: 700, marginBottom: 6 }}>이렇게 사용해보세요</p>
            <p style={{ fontSize: 13, color: "var(--app-muted)", marginBottom: 10 }}>
              냉장고에 뭐가 있는지는 아는데 뭘 만들지 모르겠을 때, 사진 한 장으로 AI가 레시피를 추천해드려요.
            </p>
            <ol style={{ fontSize: 13, paddingLeft: 18, margin: 0, display: "flex", flexDirection: "column", gap: 4 }}>
              <li>냉장고 사진을 최대 3장 올려요</li>
              <li>AI가 찾아낸 재료를 확인하고 고쳐요</li>
              <li>선호 조건에 맞는 레시피 3개를 추천받아요</li>
            </ol>
          </div>
        )}

        <div className="card" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <Link href="/upload" className="btn btn-primary btn-block">
            냉장고 사진으로 레시피 찾기
          </Link>
          <Link href="/sessions" className="btn btn-outline btn-block">
            이전 재료로 다시 추천받기
          </Link>
        </div>
      </div>
    </div>
  );
}
