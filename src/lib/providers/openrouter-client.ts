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

// Vercel 서버리스 함수는 실행 시간 제한이 있다(요금제에 따라 10~60초 등, docs/PRD.md 7.1).
// 무료 모델은 응답이 느리거나 아예 멈춰있을 때가 있어서, 후보 하나가 시간제한 없이
// 붙잡고 있으면 나머지 fallback 후보를 시도해볼 시간 자체가 사라진다. 그래서 모델 하나당
// 호출 시간을 짧게 제한해 빨리 실패하고 다음 후보로 넘어가게 한다.
const PER_MODEL_TIMEOUT_MS = 10_000;

async function callOpenRouter(model: string, messages: ChatMessage[]): Promise<string> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    throw new OpenRouterError("OPENROUTER_API_KEY가 설정되지 않았어요. 서버 환경변수를 확인해주세요.");
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), PER_MODEL_TIMEOUT_MS);

  let response: Response;
  try {
    response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      signal: controller.signal,
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
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") {
      throw new OpenRouterError(`OpenRouter 응답이 ${PER_MODEL_TIMEOUT_MS / 1000}초 안에 오지 않았어요 (모델: ${model}).`);
    }
    throw err;
  } finally {
    clearTimeout(timeout);
  }

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

// 응답 문자열에서 첫 '['/'{' 부터 마지막으로 짝이 맞는 ']'/'}' 까지만 잘라낸다.
// 지시를 잘 안 따르는 모델은 "여기 결과예요: [...] 도움이 됐길 바라요!"처럼
// 코드블록 밖에 설명 문장을 덧붙이는 경우가 있어서, JSON 부분만 골라내기 위함이다.
function extractJsonSubstring(text: string): string | null {
  const firstArray = text.indexOf("[");
  const firstObject = text.indexOf("{");
  const starts = [firstArray, firstObject].filter((i) => i !== -1);
  if (starts.length === 0) return null;
  const start = Math.min(...starts);
  const closeChar = text[start] === "[" ? "]" : "}";
  const end = text.lastIndexOf(closeChar);
  if (end === -1 || end <= start) return null;
  return text.slice(start, end + 1);
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
    // 코드블록 벗기기만으로 안 되면, 텍스트 안에서 JSON처럼 보이는 부분만 한 번 더 추출해본다.
    const extracted = extractJsonSubstring(stripped);
    if (extracted) {
      try {
        return JSON.parse(extracted) as T;
      } catch {
        // 아래에서 공통으로 에러를 던진다.
      }
    }
    throw new OpenRouterError("OpenRouter 응답을 이해하지 못했어요 (JSON 형식이 아니에요).");
  }
}

export async function chatJson<T>(model: string, messages: ChatMessage[]): Promise<T> {
  const raw = await callOpenRouter(model, messages);
  return parseJsonResponse<T>(raw);
}

// 무료 모델 라인업은 자주 바뀌거나 일시적으로 막힐 수 있다 (docs/PRD.md 7.1).
// models 배열을 앞에서부터 순서대로 시도하다가, 호출/형식 검증 중 하나라도 실패하면
// 다음 후보로 자동으로 넘어간다. 마지막 후보까지 전부 실패해야 에러를 던진다.
export async function chatJsonWithFallback<T>(
  models: string[],
  messages: ChatMessage[],
  validate: (data: unknown) => T
): Promise<{ result: T; model: string }> {
  const candidates = Array.from(new Set(models.filter(Boolean)));
  let lastError: unknown;
  for (const model of candidates) {
    try {
      const raw = await callOpenRouter(model, messages);
      const parsed = parseJsonResponse<unknown>(raw);
      return { result: validate(parsed), model };
    } catch (err) {
      lastError = err;
    }
  }
  throw lastError instanceof Error
    ? lastError
    : new OpenRouterError("사용 가능한 무료 모델을 찾지 못했어요.");
}

export type { ChatMessage, ChatContentPart };
