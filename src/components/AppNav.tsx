import Link from "next/link";
import { signOut } from "@/lib/supabase/actions";

export function AppNav({ isAdmin }: { isAdmin?: boolean }) {
  return (
    <nav
      style={{
        display: "flex",
        flexWrap: "wrap",
        alignItems: "center",
        rowGap: 8,
        columnGap: 14,
        fontSize: 13,
        marginBottom: 20,
        paddingBottom: 12,
        borderBottom: "1px solid var(--app-line)",
        color: "var(--app-muted)",
      }}
    >
      <Link href="/" style={{ fontWeight: 700, color: "var(--app-text)", whiteSpace: "nowrap" }}>
        recipe4fridge_pic
      </Link>
      <Link href="/upload" style={{ whiteSpace: "nowrap" }}>
        사진 업로드
      </Link>
      <Link href="/saved" style={{ whiteSpace: "nowrap" }}>
        저장한 레시피
      </Link>
      <Link href="/settings" style={{ whiteSpace: "nowrap" }}>
        설정
      </Link>
      {isAdmin && (
        <Link href="/admin" style={{ whiteSpace: "nowrap" }}>
          관리자
        </Link>
      )}
      <form action={signOut} style={{ marginLeft: "auto" }}>
        <button
          type="submit"
          style={{
            background: "none",
            border: "none",
            color: "var(--app-muted)",
            cursor: "pointer",
            fontSize: 13,
            padding: 0,
            whiteSpace: "nowrap",
          }}
        >
          로그아웃
        </button>
      </form>
    </nav>
  );
}
