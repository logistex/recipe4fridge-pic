"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { resizeImage } from "@/lib/image-resize";
import { createFridgeSession } from "@/lib/fridge/actions";

type ProviderOption = { id: string; label: string };

export function UploadForm({
  userId,
  providers,
  defaultProviderId,
}: {
  userId: string;
  providers: ProviderOption[];
  defaultProviderId: string;
}) {
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [status, setStatus] = useState<"idle" | "uploading" | "error">("idle");
  const [error, setError] = useState<string | null>(null);
  const [visionProviderId, setVisionProviderId] = useState(defaultProviderId);

  function handleFiles(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = Array.from(e.target.files ?? []).slice(0, 3);
    setFiles(selected);
    setPreviews(selected.map((f) => URL.createObjectURL(f)));
  }

  async function handleSubmit() {
    if (files.length === 0) return;
    setStatus("uploading");
    setError(null);

    let sessionId: string;
    let uploaded: { path: string; originalSizeBytes: number; resized: boolean }[];

    try {
      const supabase = createClient();
      sessionId = crypto.randomUUID();
      uploaded = [];

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const { blob, resized } = await resizeImage(file);
        const path = `${userId}/${sessionId}/${i}.jpg`;
        const { error: uploadError } = await supabase.storage
          .from("fridge-images")
          .upload(path, blob, { contentType: "image/jpeg" });
        if (uploadError) throw uploadError;
        uploaded.push({ path, originalSizeBytes: file.size, resized });
      }
    } catch (err) {
      setStatus("error");
      setError(err instanceof Error ? err.message : "업로드 중 오류가 발생했어요.");
      return;
    }

    // rate limit/API 실패 같은 "예상 가능한" 실패는 throw 대신 {error}로 돌아온다.
    // 성공하면 redirect()가 서버 액션 내부에서 발생하는데, 이건 Next.js가 특수한
    // 예외로 던져서 처리하는 방식이라 try 안에서 호출해도 정상적으로 페이지 이동된다.
    // 네트워크 오류·서버 타임아웃처럼 예상 못한 실패까지 잡아서, 버튼이
    // "업로드 중..."에 멈춰있지 않고 에러 문구를 보여주도록 한다.
    try {
      const result = await createFridgeSession({ sessionId, images: uploaded, visionProviderId });
      if (result?.error) {
        setStatus("error");
        setError(result.error);
      }
    } catch (err) {
      // 여기로 잡히는 에러는 항상 "예상 못한" 실패다 (예상 가능한 실패는 이미
      // createFridgeSession이 {error}로 정상 반환한다). 이 시점의 에러 메시지는
      // "An unexpected response was received from the server." 같은 Next.js
      // 내부 기술 문구라 사용자에게 그대로 보여주면 안 된다 — 콘솔에만 남기고
      // 화면에는 항상 우리 문구를 보여준다.
      console.error("createFridgeSession 예상치 못한 실패:", err);
      setStatus("error");
      setError(
        "서버 응답이 너무 오래 걸리거나 일시적인 오류가 발생했어요. 잠시 후 다시 시도해주세요. 계속되면 다른 비전 API를 선택해보세요."
      );
    }
  }

  return (
    <div className="card" style={{ marginTop: 20 }}>
      <div style={{ marginBottom: 14 }}>
        <label className="field-label">식재료 인식에 쓸 비전 API</label>
        <select
          value={visionProviderId}
          onChange={(e) => setVisionProviderId(e.target.value)}
          style={{ width: "100%" }}
        >
          {providers.map((p) => (
            <option key={p.id} value={p.id}>
              {p.label}
            </option>
          ))}
        </select>
      </div>

      <label className="field-label">냉장고 사진</label>
      <input type="file" accept="image/*" multiple onChange={handleFiles} style={{ width: "100%" }} />

      {previews.length > 0 && (
        <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
          {previews.map((src, i) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              key={i}
              src={src}
              alt={`업로드 미리보기 ${i + 1}`}
              width={100}
              height={100}
              style={{ objectFit: "cover", borderRadius: 10, border: "1px solid var(--app-line)" }}
            />
          ))}
        </div>
      )}

      {error && <p style={{ color: "var(--app-error)", fontSize: 14, marginTop: 12 }}>{error}</p>}

      {status === "uploading" && (
        <p style={{ color: "var(--app-muted)", fontSize: 12, marginTop: 8 }}>
          실제 AI API를 호출 중이라 최대 1분 정도 걸릴 수 있어요.
        </p>
      )}

      <button
        type="button"
        onClick={handleSubmit}
        disabled={files.length === 0 || status === "uploading"}
        className="btn-primary btn-block"
        style={{ marginTop: 16 }}
      >
        {status === "uploading" ? "업로드 중..." : "업로드하고 재료 인식하기"}
      </button>
    </div>
  );
}
