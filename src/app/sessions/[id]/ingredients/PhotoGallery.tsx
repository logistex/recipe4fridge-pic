"use client";

import { useState } from "react";

// 재료 확인 화면에서 원본 사진을 더 크게 보여주고, 클릭하면 화면 전체 크기로 확대해서
// 볼 수 있게 한다 (인식 결과가 맞는지 확인할 때 작은 썸네일만으로는 판단하기 어려워서).
export function PhotoGallery({ urls }: { urls: string[] }) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <>
      <div style={{ display: "flex", gap: 10, marginBottom: 16, flexWrap: "wrap" }}>
        {urls.map((url, i) => (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={i}
            src={url}
            alt={`업로드한 냉장고 사진 ${i + 1} (클릭하면 확대돼요)`}
            width={240}
            height={240}
            onClick={() => setOpenIndex(i)}
            style={{
              objectFit: "cover",
              borderRadius: 12,
              border: "1px solid var(--app-line)",
              cursor: "zoom-in",
            }}
          />
        ))}
      </div>

      {openIndex !== null && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="사진 확대 보기"
          onClick={() => setOpenIndex(null)}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.85)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
            cursor: "zoom-out",
            padding: 24,
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={urls[openIndex]}
            alt={`업로드한 냉장고 사진 ${openIndex + 1} 확대`}
            style={{ maxWidth: "100%", maxHeight: "100%", borderRadius: 8, objectFit: "contain" }}
          />
        </div>
      )}
    </>
  );
}
