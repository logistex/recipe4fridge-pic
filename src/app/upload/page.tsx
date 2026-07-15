import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { visionProviders, DEFAULT_VISION_PROVIDER } from "@/lib/providers";
import { UploadForm } from "./UploadForm";

export default async function UploadPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const providerOptions = Object.values(visionProviders).map((p) => ({
    id: p.id,
    label: p.label,
  }));

  return (
    <main style={{ maxWidth: 480, margin: "60px auto", fontFamily: "system-ui" }}>
      <h1 style={{ fontSize: 22 }}>냉장고 사진 업로드</h1>
      <p style={{ color: "#666", fontSize: 14 }}>
        최대 3장까지 업로드할 수 있어요. 큰 사진은 자동으로 축소돼요.
      </p>
      <UploadForm
        userId={user.id}
        providers={providerOptions}
        defaultProviderId={DEFAULT_VISION_PROVIDER}
      />
    </main>
  );
}
