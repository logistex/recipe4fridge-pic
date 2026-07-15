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
      <div
        className="recipe4fridge-spinner"
        style={{
          width: 28,
          height: 28,
          margin: "0 auto 16px",
          borderRadius: "50%",
          border: "3px solid #ddd",
          borderTopColor: "#888",
        }}
      />
      <p>레시피를 생성하고 있어요...</p>
      <p style={{ fontSize: 12, color: "#999", marginTop: 4 }}>
        실제 AI API를 호출 중이라 최대 1분 정도 걸릴 수 있어요.
      </p>
      <style>{`
        .recipe4fridge-spinner { animation: recipe4fridge-spin 0.8s linear infinite; }
        @keyframes recipe4fridge-spin {
          to { transform: rotate(360deg); }
        }
        @media (prefers-reduced-motion: reduce) {
          .recipe4fridge-spinner { animation: none; }
        }
      `}</style>
    </div>
  );
}
