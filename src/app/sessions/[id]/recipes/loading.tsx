import { Spinner } from "@/components/Spinner";

// 이 라우트의 최초 진입 시 서버에서 자동으로 레시피를 생성하는데(실제 API는 최대
// 1분 가까이 걸릴 수 있음), 그동안 Next.js가 이 파일을 자동으로 보여준다.
// 프로필/테마 정보를 아직 몰라서 특정 테마 색은 못 쓰고, 무난한 스타일만 사용한다.
export default function RecipesLoading() {
  return (
    <div
      style={{
        maxWidth: 480,
        margin: "80px auto",
        textAlign: "center",
        color: "#666",
        fontSize: 14,
      }}
    >
      <div style={{ marginBottom: 16 }}>
        <Spinner size={28} />
      </div>
      <p>레시피를 생성하고 있어요...</p>
      <p style={{ fontSize: 12, color: "#999", marginTop: 4 }}>
        실제 AI API를 호출 중이라 최대 1분 정도 걸릴 수 있어요.
      </p>
    </div>
  );
}
