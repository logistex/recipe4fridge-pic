// 재료 인식/레시피 생성처럼 실제 API 호출로 오래 걸리는 작업이 진행 중임을
// 텍스트만으로는 약하게 전달되어서, 회전하는 원형 스피너를 함께 보여준다.
export function Spinner({ size = 14 }: { size?: number }) {
  return (
    <span
      aria-hidden="true"
      className="spinner"
      style={{
        width: size,
        height: size,
        borderWidth: Math.max(2, Math.round(size / 6)),
      }}
    />
  );
}
