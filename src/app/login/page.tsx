import Link from "next/link";
import { signInWithPassword, signInWithGoogle } from "@/lib/supabase/actions";
import { BrandMark } from "@/components/Logo";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <div className="theme-page" data-app-theme="apricot">
      <main className="container-narrow">
        <h1 className="brand-hero">
          <BrandMark size={32} textSize={24} />
        </h1>
        <p className="page-subtitle">냉장고 사진으로 레시피를 찾아드려요. 로그인해주세요.</p>

        {error && <p style={{ color: "var(--app-error)", fontSize: 14 }}>{decodeURIComponent(error)}</p>}

        <form
          action={signInWithPassword}
          style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 4 }}
        >
          <input name="email" type="email" placeholder="이메일" required autoComplete="email" />
          <input
            name="password"
            type="password"
            placeholder="비밀번호"
            required
            autoComplete="current-password"
          />
          <button type="submit" className="btn-primary btn-block">
            로그인
          </button>
        </form>

        <form action={signInWithGoogle} style={{ marginTop: 10 }}>
          <button type="submit" className="btn-outline btn-block">
            Google로 로그인
          </button>
        </form>

        <p style={{ fontSize: 14, marginTop: 16, color: "var(--app-muted)" }}>
          계정이 없나요? <Link href="/signup">회원가입</Link>
        </p>
      </main>
    </div>
  );
}
