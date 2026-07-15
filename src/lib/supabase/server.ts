import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

// 서버 컴포넌트/서버 함수에서 Supabase에 접속할 때 쓰는 클라이언트.
// 로그인 세션 쿠키를 읽고 갱신하기 위해 Next.js의 cookies()와 연결한다.
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // 서버 컴포넌트 렌더링 중에는 쿠키를 쓸 수 없다(Next.js 제약).
            // 미들웨어에서 세션을 갱신해주면 이 catch는 무시해도 된다.
          }
        },
      },
    }
  );
}
