import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { IngredientEditor } from "./IngredientEditor";

export default async function IngredientsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

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
    <main style={{ maxWidth: 480, margin: "60px auto", fontFamily: "system-ui" }}>
      <h1 style={{ fontSize: 22 }}>인식된 재료</h1>
      <p style={{ color: "#666", fontSize: 14 }}>
        틀린 부분은 고치고, 빠진 재료는 추가해주세요.
      </p>

      <IngredientEditor sessionId={id} initialIngredients={ingredients ?? []} />

      <Link
        href={`/sessions/${id}/recipes`}
        style={{
          display: "inline-block",
          marginTop: 24,
          padding: "10px 16px",
          border: "1px solid #333",
          borderRadius: 6,
        }}
      >
        레시피 추천 받기
      </Link>
    </main>
  );
}
