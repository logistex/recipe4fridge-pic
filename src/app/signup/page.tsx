import Link from "next/link";
import { signUpWithPassword, signInWithGoogle } from "@/lib/supabase/actions";

export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <div className="theme-page" data-app-theme="apricot">
      <main className="container-narrow">
        <h1>회원가입</h1>
        <p className="page-subtitle">냉장고 사진으로 레시피를 찾아드려요.</p>

        {error && <p style={{ color: "var(--app-error)", fontSize: 14 }}>{decodeURIComponent(error)}</p>}

        <form
          action={signUpWithPassword}
          style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 4 }}
        >
          <input name="email" type="email" placeholder="이메일" required autoComplete="email" />
          <input
            name="password"
            type="password"
            placeholder="비밀번호 (8자 이상)"
            required
            minLength={8}
            autoComplete="new-password"
          />
          <button type="submit" className="btn-primary btn-block">
            가입하기
          </button>
        </form>

        <form action={signInWithGoogle} style={{ marginTop: 10 }}>
          <button type="submit" className="btn-outline btn-block">
            Google로 계속하기
          </button>
        </form>

        <p style={{ fontSize: 14, marginTop: 16, color: "var(--app-muted)" }}>
          이미 계정이 있나요? <Link href="/login">로그인</Link>
        </p>
      </main>
    </div>
  );
}
