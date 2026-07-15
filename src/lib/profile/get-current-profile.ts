import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type Profile = {
  cuisine_type: string | null;
  spice_level: string | null;
  difficulty: string | null;
  time_limit: string | null;
  theme: string;
  is_admin: boolean;
};

// 로그인 확인 + 현재 프로필(테마 포함)을 함께 가져오는 공용 헬퍼.
// 로그인 안 되어 있으면 /login으로 보낸다.
export async function getCurrentUserAndProfile() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("cuisine_type, spice_level, difficulty, time_limit, theme, is_admin")
    .eq("id", user.id)
    .maybeSingle();

  return {
    supabase,
    user,
    profile: (profile ?? {
      cuisine_type: null,
      spice_level: null,
      difficulty: null,
      time_limit: null,
      theme: "apricot",
      is_admin: false,
    }) as Profile,
  };
}
