"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function updateProfile(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const norm = (v: FormDataEntryValue | null) => {
    const s = v?.toString();
    return s ? s : null;
  };

  const { error } = await supabase
    .from("profiles")
    .update({
      cuisine_type: norm(formData.get("cuisine")),
      spice_level: norm(formData.get("spice")),
      difficulty: norm(formData.get("difficulty")),
      time_limit: norm(formData.get("time")),
      theme: formData.get("theme")?.toString() || "apricot",
    })
    .eq("id", user.id);
  if (error) throw new Error(error.message);

  redirect("/settings?saved=1");
}
