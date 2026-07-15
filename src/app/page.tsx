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

  return (
    <div className="theme-page" data-app-theme={theme}>
      <div className="container">
        <AppNav isAdmin={profile?.is_admin} />
        <h1>recipe4fridge_pic</h1>
        <p className="page-subtitle" style={{ marginBottom: 20 }}>
          <strong style={{ color: "var(--app-text)" }}>{user.email}</strong>님으로 로그인되어 있어요.
        </p>
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
