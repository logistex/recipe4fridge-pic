import { getCurrentUserAndProfile } from "@/lib/profile/get-current-profile";
import { visionProviders, DEFAULT_VISION_PROVIDER } from "@/lib/providers";
import { rankProviders, sortByRanking } from "@/lib/ratings/ranking";
import { AppNav } from "@/components/AppNav";
import { StepIndicator } from "@/components/StepIndicator";
import { UploadForm } from "./UploadForm";

// 실제 비전 API(OpenRouter)는 여러 무료 모델을 순서대로 재시도할 수 있어
// 기본 서버리스 함수 시간제한보다 오래 걸릴 수 있다 (docs/PRD.md 7.1).
export const maxDuration = 60;

export default async function UploadPage() {
  const { supabase, user, profile } = await getCurrentUserAndProfile();

  // 사진/재료인식 품질 평가(사용자+AI 판정)가 충분히 쌓인 모델은 점수 높은 순으로
  // 드롭다운 위쪽에, 기본 선택값도 그 모델로 자동 반영한다.
  const ranking = await rankProviders(supabase, ["photo", "ingredients"]);
  const providerOptions = sortByRanking(
    Object.values(visionProviders).map((p) => ({ id: p.id, label: p.label })),
    ranking
  );
  const defaultProviderId = providerOptions[0]?.id ?? DEFAULT_VISION_PROVIDER;

  return (
    <div className="theme-page" data-app-theme={profile.theme}>
      <div className="container">
        <AppNav email={user.email} />
        <StepIndicator current={1} />
        <h1>냉장고 사진 업로드</h1>
        <p className="page-subtitle">최대 3장까지 업로드할 수 있어요. 큰 사진은 자동으로 축소돼요.</p>
        <UploadForm
          userId={user.id}
          providers={providerOptions}
          defaultProviderId={defaultProviderId}
        />
      </div>
    </div>
  );
}
