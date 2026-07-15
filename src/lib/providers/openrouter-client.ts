// OpenRouter(https://openrouter.ai) 공용 호출 헬퍼.
// API 키는 서버 환경변수(OPENROUTER_API_KEY)로만 보관하고 클라이언트에는 절대 노출하지 않는다 (docs/PRD.md 7장).

type ChatContentPart =
  | { type: "text"; text: string }
  | { type: "image_url"; image_url: { url: string } };

type ChatMessage = {
  role: "system" | "user";
  content: string | ChatContentPart[];
};

export class OpenRouterError extends Error {}

async function callOpenRouter(model: string, messages: ChatMessage[]): Promise<string> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    throw new OpenRouterError("OPENROUTER_API_KEY가 설정되지 않았어요. 서버 환경변수를 확인해주세요.");
  }

  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "HTTP-Referer": process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
      "X-Title": "recipe4fridge_pic",
    },
    body: JSON.stringify({
      model,
      messages,
      temperature: 0.4,
    }),
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new OpenRouterError(
      `OpenRouter 호출에 실패했어요 (${response.status}). 무료 한도를 초과했거나 모델을 쓸 수 없는 상태일 수 있어요.` +
        (detail ? ` 상세: ${detail.slice(0, 200)}` : "")
    );
  }

  const data = await response.json();
  const content = data?.choices?.[0]?.message?.content;
  if (typeof content !== "string" || !content.trim()) {
    throw new OpenRouterError("OpenRouter 응답이 비어 있어요.");
  }
  return content;
}

// 모델 응답이 ```json ... ``` 코드블록으로 감싸져 오는 경우가 많아 벗겨내고 JSON.parse 한다.
export function parseJsonResponse<T>(raw: string): T {
  const stripped = raw
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/```\s*$/i, "")
    .trim();
  try {
    return JSON.parse(stripped) as T;
  } catch {
    throw new OpenRouterError("OpenRouter 응답을 이해하지 못했어요 (JSON 형식이 아니에요).");
  }
}

export async function chatJson<T>(model: string, messages: ChatMessage[]): Promise<T> {
  const raw = await callOpenRouter(model, messages);
  return parseJsonResponse<T>(raw);
}

export type { ChatMessage, ChatContentPart };
