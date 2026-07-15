import { getCurrentUserAndProfile } from "@/lib/profile/get-current-profile";
import { visionProviders, DEFAULT_VISION_PROVIDER } from "@/lib/providers";
import { AppNav } from "@/components/AppNav";
import { UploadForm } from "./UploadForm";

export default async function UploadPage() {
  const { user, profile } = await getCurrentUserAndProfile();

  const providerOptions = Object.values(visionProviders).map((p) => ({
    id: p.id,
    label: p.label,
  }));

  return (
    <div className="theme-page" data-app-theme={profile.theme}>
      <div style={{ maxWidth: 480, margin: "0 auto" }}>
        <AppNav isAdmin={profile.is_admin} />
        <h1 style={{ fontSize: 22 }}>냉장고 사진 업로드</h1>
        <p style={{ color: "var(--app-muted)", fontSize: 14 }}>
          최대 3장까지 업로드할 수 있어요. 큰 사진은 자동으로 축소돼요.
        </p>
        <UploadForm
          userId={user.id}
          providers={providerOptions}
          defaultProviderId={DEFAULT_VISION_PROVIDER}
        />
      </div>
    </div>
  );
}
