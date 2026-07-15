import { notFound } from "next/navigation";
import Link from "next/link";
import { getCurrentUserAndProfile } from "@/lib/profile/get-current-profile";
import { AppNav } from "@/components/AppNav";
import { IngredientEditor } from "./IngredientEditor";

export default async function IngredientsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { supabase, profile } = await getCurrentUserAndProfile();

  const { data: session } = await supabase
    .from("fridge_sessions")
    .select("id")
    .eq("id", id)
    .maybeSingle();
  if (!session) notFound();

  const { data: ingredients } = await supabase
    .from("detected_ingredients")
    .select("id, name, quantity_text")
    .eq("session_id", id)
    .order("name");

  return (
    <div className="theme-page" data-app-theme={profile.theme}>
      <div style={{ maxWidth: 480, margin: "0 auto" }}>
        <AppNav isAdmin={profile.is_admin} />
        <h1 style={{ fontSize: 22 }}>인식된 재료</h1>
        <p style={{ color: "var(--app-muted)", fontSize: 14 }}>
          틀린 부분은 고치고, 빠진 재료는 추가해주세요.
        </p>

        <IngredientEditor sessionId={id} initialIngredients={ingredients ?? []} />

        <Link
          href={`/sessions/${id}/recipes`}
          style={{
            display: "inline-block",
            marginTop: 24,
            padding: "10px 16px",
            background: "var(--app-accent)",
            color: "var(--app-accent-ink)",
            borderRadius: 999,
            fontWeight: 700,
          }}
        >
          레시피 추천 받기
        </Link>
      </div>
    </div>
  );
}
