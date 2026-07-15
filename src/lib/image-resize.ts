// 업로드 전 브라우저에서 이미지를 축소하는 유틸 (docs/PRD.md 5.3).
// 긴 변 기준 1600px, JPEG 품질 0.82로 축소한다.
export async function resizeImage(
  file: File,
  maxDim = 1600,
  quality = 0.82
): Promise<{ blob: Blob; resized: boolean }> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, maxDim / Math.max(bitmap.width, bitmap.height));
  const resized = scale < 1;
  const width = Math.round(bitmap.width * scale);
  const height = Math.round(bitmap.height * scale);

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("캔버스를 생성할 수 없어요.");
  ctx.drawImage(bitmap, 0, 0, width, height);

  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error("이미지 축소에 실패했어요."))),
      "image/jpeg",
      quality
    );
  });

  return { blob, resized };
}
