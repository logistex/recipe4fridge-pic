import { getCurrentUserAndProfile } from "@/lib/profile/get-current-profile";
import { updateProfile } from "@/lib/profile/actions";
import { AppNav } from "@/components/AppNav";

const THEMES = [
  { id: "apricot", label: "달콤 살구" },
  { id: "greens", label: "프레시 그린스" },
  { id: "bakery", label: "선샤인 베이커리" },
];

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ saved?: string }>;
}) {
  const { profile, user } = await getCurrentUserAndProfile();
  const { saved } = await searchParams;

  return (
    <div className="theme-page" data-app-theme={profile.theme}>
      <div className="container">
        <AppNav isAdmin={profile.is_admin} email={user.email} />
        <h1>설정</h1>
        <p className="page-subtitle">
          {user.email}의 기본 선호 조건과 디자인 테마예요. 레시피 추천 화면에서 이번 요청에
          한해 바꿀 수 있는 값과는 별개로, 여기서 바꾸면 앞으로 기본값으로 쓰여요.
        </p>

        {saved && (
          <p style={{ color: "var(--app-accent-strong)", fontSize: 13, fontWeight: 700 }}>
            저장됐어요.
          </p>
        )}

        <form action={updateProfile} className="settings-form">
          <label className="field">요리 종류</label>
          <select name="cuisine" defaultValue={profile.cuisine_type ?? ""}>
            <option value="">선택 안 함</option>
            <option value="korean">한식</option>
            <option value="western">양식</option>
            <option value="chinese">중식</option>
            <option value="japanese">일식</option>
          </select>

          <label className="field">매운맛 선호도</label>
          <select name="spice" defaultValue={profile.spice_level ?? ""}>
            <option value="">선택 안 함</option>
            <option value="none">안 매움</option>
            <option value="medium">보통</option>
            <option value="hot">매움</option>
          </select>

          <label className="field">조리 난이도</label>
          <select name="difficulty" defaultValue={profile.difficulty ?? ""}>
            <option value="">선택 안 함</option>
            <option value="easy">쉬움</option>
            <option value="medium">보통</option>
            <option value="hard">어려움</option>
          </select>

          <label className="field">조리 소요 시간</label>
          <select name="time" defaultValue={profile.time_limit ?? ""}>
            <option value="">선택 안 함</option>
            <option value="under_15">15분 이내</option>
            <option value="under_30">30분 이내</option>
            <option value="no_limit">제한 없음</option>
          </select>

          <label className="field">디자인 테마</label>
          <div style={{ display: "flex", gap: 10 }}>
            {THEMES.map((t) => (
              <label key={t.id} className="theme-option">
                <input type="radio" name="theme" value={t.id} defaultChecked={profile.theme === t.id} />
                <span className="theme-swatch" data-app-theme={t.id}>
                  <span className="dot" />
                  {t.label}
                </span>
              </label>
            ))}
          </div>

          <button type="submit" className="btn-primary" style={{ marginTop: 24 }}>
            저장
          </button>
        </form>
      </div>
    </div>
  );
}
