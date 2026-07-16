"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { resizeImage } from "@/lib/image-resize";
import { createFridgeSession } from "@/lib/fridge/actions";
import { Spinner } from "@/components/Spinner";

type ProviderOption = { id: string; label: string };

const MAX_PHOTOS = 3;

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

  // 브라우저 뒤로가기로 이 페이지에 돌아오면, Next.js가 예전 화면(실패했을 때의 에러
  // 문구까지 포함해서)을 캐시에서 그대로 복원해 보여줄 때가 있다 — 실제로는 이미 그
  // 시도가 성공해서 다음 단계로 넘어갔었는데도 옛날 에러가 다시 보이는 원인이다.
  // pageshow의 persisted 플래그로 이런 "캐시에서 복원됨" 상황을 감지해서 초기화한다.
  useEffect(() => {
    function handlePageShow(event: PageTransitionEvent) {
      if (event.persisted) {
        setStatus("idle");
        setError(null);
      }
    }
    window.addEventListener("pageshow", handlePageShow);
    return () => window.removeEventListener("pageshow", handlePageShow);
  }, []);

  // 파일 입력을 다시 열어도 기존에 골라둔 사진은 유지하고, 새로 고른 사진을
  // 이어 붙인다(최대 3장). 같은 input을 반복해서 열 수 있도록 매번 값을 비운다.
  function handleFiles(e: React.ChangeEvent<HTMLInputElement>) {
    const picked = Array.from(e.target.files ?? []);
    e.target.value = "";
    if (picked.length === 0) return;
    setFiles((prev) => {
      const merged = [...prev, ...picked].slice(0, MAX_PHOTOS);
      setPreviews(merged.map((f) => URL.createObjectURL(f)));
      return merged;
    });
  }

  function handleRemove(index: number) {
    setFiles((prev) => {
      const merged = prev.filter((_, i) => i !== index);
      setPreviews(merged.map((f) => URL.createObjectURL(f)));
      return merged;
    });
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
        return;
      }
      setStatus("idle");
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
      <label className="field-label">냉장고 사진 ({files.length}/{MAX_PHOTOS}장)</label>

      {previews.length > 0 && (
        <div style={{ display: "flex", gap: 10, marginBottom: 12, flexWrap: "wrap" }}>
          {previews.map((src, i) => (
            <div key={i} style={{ position: "relative" }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={src}
                alt={`업로드 미리보기 ${i + 1}`}
                width={160}
                height={160}
                style={{ objectFit: "cover", borderRadius: 12, border: "1px solid var(--app-line)" }}
              />
              <button
                type="button"
                onClick={() => handleRemove(i)}
                aria-label={`사진 ${i + 1} 제거`}
                className="icon-btn"
                style={{
                  position: "absolute",
                  top: -8,
                  right: -8,
                  background: "var(--app-surface)",
                  boxShadow: "0 1px 4px rgba(0,0,0,0.15)",
                }}
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}

      {files.length < MAX_PHOTOS && (
        <input type="file" accept="image/*" multiple onChange={handleFiles} style={{ width: "100%" }} />
      )}
      {files.length >= MAX_PHOTOS && (
        <p style={{ color: "var(--app-muted)", fontSize: 12 }}>
          최대 {MAX_PHOTOS}장까지 선택했어요. 다른 사진으로 바꾸려면 먼저 하나를 제거해주세요.
        </p>
      )}

      <div style={{ marginTop: 18 }}>
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

      {error && <p style={{ color: "var(--app-error)", fontSize: 14, marginTop: 12 }}>{error}</p>}

      {status === "uploading" && (
        <p
          style={{
            color: "var(--app-muted)",
            fontSize: 12,
            marginTop: 8,
            display: "flex",
            alignItems: "center",
            gap: 6,
          }}
        >
          <Spinner /> 실제 AI API를 호출 중이라 최대 1분 정도 걸릴 수 있어요.
        </p>
      )}

      <button
        type="button"
        onClick={handleSubmit}
        disabled={files.length === 0 || status === "uploading"}
        className="btn-primary btn-block"
        style={{ marginTop: 16 }}
      >
        {status === "uploading" ? (
          <>
            <Spinner /> 업로드 중...
          </>
        ) : (
          "업로드하고 재료 인식하기"
        )}
      </button>
    </div>
  );
}
