"use client";

import { useTransition } from "react";
import { deleteFridgeSession } from "@/lib/fridge/actions";

export function DeleteSessionButton({ sessionId }: { sessionId: string }) {
  const [isPending, startTransition] = useTransition();

  function handleClick() {
    if (!window.confirm("이 세션 기록을 삭제할까요? 인식된 재료와 추천받은 레시피가 모두 사라지고, 되돌릴 수 없어요.")) {
      return;
    }
    startTransition(async () => {
      await deleteFridgeSession(sessionId);
    });
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={isPending}
      aria-label="이 세션 기록 삭제"
      title="세션 기록 삭제"
      className="icon-btn"
    >
      ×
    </button>
  );
}
