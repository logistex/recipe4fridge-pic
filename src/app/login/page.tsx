import Link from "next/link";
import { signInWithPassword, signInWithGoogle } from "@/lib/supabase/actions";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <div className="theme-page" data-app-theme="apricot">
      <main style={{ maxWidth: 360, margin: "0 auto" }}>
        <h1 style={{ fontSize: 22 }}>로그인</h1>

        {error && (
          <p style={{ color: "var(--app-error)", fontSize: 14 }}>{decodeURIComponent(error)}</p>
        )}

        <form action={signInWithPassword} style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 16 }}>
          <input name="email" type="email" placeholder="이메일" required autoComplete="email" style={{ padding: 10 }} />
          <input name="password" type="password" placeholder="비밀번호" required autoComplete="current-password" style={{ padding: 10 }} />
          <button type="submit" style={{ padding: 10, cursor: "pointer" }}>
            로그인
          </button>
        </form>

        <form action={signInWithGoogle} style={{ marginTop: 10 }}>
          <button type="submit" style={{ width: "100%", padding: 10, cursor: "pointer" }}>
            Google로 로그인
          </button>
        </form>

        <p style={{ fontSize: 14, marginTop: 16 }}>
          계정이 없나요? <Link href="/signup">회원가입</Link>
        </p>
      </main>
    </div>
  );
}
