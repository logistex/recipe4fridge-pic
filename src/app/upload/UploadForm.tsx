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

    // redirect()가 내부에서 발생하므로 try/catch 밖에서 호출한다.
    await createFridgeSession({ sessionId, images: uploaded, visionProviderId });
  }

  return (
    <div style={{ marginTop: 20 }}>
      <div style={{ marginBottom: 12 }}>
        <label style={{ fontSize: 13, color: "#555", display: "block", marginBottom: 4 }}>
          식재료 인식에 쓸 비전 API
        </label>
        <select
          value={visionProviderId}
          onChange={(e) => setVisionProviderId(e.target.value)}
          style={{ padding: 6, width: "100%" }}
        >
          {providers.map((p) => (
            <option key={p.id} value={p.id}>
              {p.label}
            </option>
          ))}
        </select>
      </div>

      <input type="file" accept="image/*" multiple onChange={handleFiles} />

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
              style={{ objectFit: "cover", borderRadius: 8 }}
            />
          ))}
        </div>
      )}

      {error && <p style={{ color: "crimson", fontSize: 14 }}>{error}</p>}

      <button
        type="button"
        onClick={handleSubmit}
        disabled={files.length === 0 || status === "uploading"}
        style={{ marginTop: 16, padding: 10, cursor: "pointer" }}
      >
        {status === "uploading" ? "업로드 중..." : "업로드하고 재료 인식하기"}
      </button>
    </div>
  );
}
