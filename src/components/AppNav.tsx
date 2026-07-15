import Link from "next/link";
import { signOut } from "@/lib/supabase/actions";

export function AppNav({ isAdmin }: { isAdmin?: boolean }) {
  return (
    <nav className="app-nav">
      <Link href="/" className="app-nav-brand">
        recipe4fridge_pic
      </Link>
      <Link href="/upload">사진 업로드</Link>
      <Link href="/sessions">재료 기록</Link>
      <Link href="/saved">저장한 레시피</Link>
      <Link href="/settings">설정</Link>
      {isAdmin && <Link href="/admin">관리자</Link>}
      <form action={signOut} style={{ marginLeft: "auto" }}>
        <button type="submit" className="btn-ghost">
          로그아웃
        </button>
      </form>
    </nav>
  );
}
