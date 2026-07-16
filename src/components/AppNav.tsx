import Link from "next/link";
import { signOut } from "@/lib/supabase/actions";

export function AppNav({ isAdmin, email }: { isAdmin?: boolean; email?: string | null }) {
  return (
    <nav className="app-nav">
      <Link href="/" className="app-nav-brand">
        recipe4fridge_pic
      </Link>
      <Link href="/upload">사진 업로드</Link>
      <Link href="/sessions">이전 재료</Link>
      <Link href="/saved">저장한 레시피</Link>
      <Link href="/settings">설정</Link>
      {isAdmin && <Link href="/admin">관리자</Link>}
      <div className="app-nav-user">
        {email && <span className="app-nav-email">{email}</span>}
        <form action={signOut}>
          <button type="submit" className="btn-ghost">
            로그아웃
          </button>
        </form>
      </div>
    </nav>
  );
}
