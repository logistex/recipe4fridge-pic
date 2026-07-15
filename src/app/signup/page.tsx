import Link from "next/link";
import { signUpWithPassword, signInWithGoogle } from "@/lib/supabase/actions";

export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <main style={{ maxWidth: 360, margin: "80px auto", fontFamily: "system-ui" }}>
      <h1 style={{ fontSize: 22 }}>회원가입</h1>

      {error && (
        <p style={{ color: "crimson", fontSize: 14 }}>{decodeURIComponent(error)}</p>
      )}

      <form action={signUpWithPassword} style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 16 }}>
        <input name="email" type="email" placeholder="이메일" required autoComplete="email" style={{ padding: 10 }} />
        <input
          name="password"
          type="password"
          placeholder="비밀번호 (8자 이상)"
          required
          minLength={8}
          autoComplete="new-password"
          style={{ padding: 10 }}
        />
        <button type="submit" style={{ padding: 10, cursor: "pointer" }}>
          가입하기
        </button>
      </form>

      <form action={signInWithGoogle} style={{ marginTop: 10 }}>
        <button type="submit" style={{ width: "100%", padding: 10, cursor: "pointer" }}>
          Google로 계속하기
        </button>
      </form>

      <p style={{ fontSize: 14, marginTop: 16 }}>
        이미 계정이 있나요? <Link href="/login">로그인</Link>
      </p>
    </main>
  );
}
