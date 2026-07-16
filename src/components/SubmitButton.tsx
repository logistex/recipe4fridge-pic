"use client";

import { useFormStatus } from "react-dom";
import { Spinner } from "./Spinner";

// 실제 API(OpenRouter) 호출은 최대 1분 가까이 걸릴 수 있어서, 버튼이 멈춘 것처럼
// 보이지 않도록 제출 중 상태를 보여준다. useFormStatus는 <form> 안에 있는
// 클라이언트 컴포넌트에서만 쓸 수 있어서, 이 버튼만 별도 컴포넌트로 뺐다.
export function SubmitButton({
  children,
  pendingLabel,
  className,
  style,
}: {
  children: React.ReactNode;
  pendingLabel: string;
  className?: string;
  style?: React.CSSProperties;
}) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className={className} style={style}>
      {pending ? (
        <>
          <Spinner /> {pendingLabel}
        </>
      ) : (
        children
      )}
    </button>
  );
}
