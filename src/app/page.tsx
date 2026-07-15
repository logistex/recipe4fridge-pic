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
      <main style={{ maxWidth: 480, margin: "80px auto", fontFamily: "system-ui" }}>
        <h1>recipe4fridge_pic</h1>
        <p>로그인이 필요해요.</p>
        <p style={{ display: "flex", gap: 12 }}>
          <Link href="/login">로그인</Link>
          <Link href="/signup">회원가입</Link>
        </p>
      </main>
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
      <div style={{ maxWidth: 480, margin: "0 auto" }}>
        <AppNav isAdmin={profile?.is_admin} />
        <h1>recipe4fridge_pic</h1>
        <p>
          <strong>{user.email}</strong>님으로 로그인되어 있어요.
        </p>
        <p>
          <Link href="/upload">냉장고 사진으로 레시피 찾기</Link>
        </p>
      </div>
    </div>
  );
}
