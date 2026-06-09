const DEFAULT_AI_REPLY =
  '편지를 읽으면서 당신이 얼마나 애쓰고 있는지 느껴졌어요. 지금의 마음이 쉽게 정리되지 않아도 괜찮아요. 이렇게 솔직하게 적어낸 것만으로도 이미 충분히 용기 있는 일이에요. 오늘은 스스로를 조금 덜 몰아붙이고, 작은 숨을 고르듯 천천히 지나가도 됩니다. 당신의 마음은 소중하고, 지금의 고민도 언젠가 당신을 더 단단하게 만들어줄 거예요. 저는 당신이 잘 버텨내고 있다고 말해주고 싶어요.';

const SYSTEM_PROMPT =
  '너는 청소년 사용자의 익명 편지에 답장하는 따뜻한 친구야. 사용자의 고민을 판단하거나 훈계하지 말고, 공감, 위로, 격려, 응원, 칭찬을 중심으로 한국어 답장을 써. 의료/법률/위험 상황을 단정하지 말고, 위험이 느껴질 때는 믿을 만한 어른이나 전문가에게 도움을 요청하라고 부드럽게 권해. 답장은 5~8문장, 편지체로 자연스럽게 작성해.';

const USER_PROMPT = (letterContent: string) =>
  `사용자가 쓴 편지:\n${letterContent}`;

type GroqResponse = {
  choices?: Array<{
    message?: {
      content?: string;
    };
  }>;
};

type GeminiResponse = {
  candidates?: Array<{
    content?: {
      parts?: Array<{
        text?: string;
      }>;
    };
  }>;
};

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// 무료 티어 LLM은 429/503(과부하)을 자주 던지므로 짧게 재시도한다.
const RETRYABLE_STATUS = new Set([429, 500, 502, 503, 504]);

async function postWithRetry(
  url: string,
  init: RequestInit,
  attempts = 3,
): Promise<Response | null> {
  for (let i = 0; i < attempts; i += 1) {
    try {
      const response = await fetch(url, init);
      if (response.ok) return response;
      if (!RETRYABLE_STATUS.has(response.status)) return null;
    } catch {
      // 네트워크 오류 → 재시도
    }
    if (i < attempts - 1) await sleep(600 * (i + 1));
  }
  return null;
}

// Groq: OpenAI 호환 Chat Completions API. 무료 티어·지역 제한 없음.
async function generateWithGroq(apiKey: string, letterContent: string) {
  const model = process.env.GROQ_MODEL || 'llama-3.3-70b-versatile';

  const response = await postWithRetry(
    'https://api.groq.com/openai/v1/chat/completions',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        temperature: 0.9,
        max_tokens: 800,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: USER_PROMPT(letterContent) },
        ],
      }),
    },
  );

  if (!response) return null;

  const data = (await response.json()) as GroqResponse;
  return data.choices?.[0]?.message?.content?.trim() || null;
}

// Gemini: 일부 지역에서 무료 티어 limit:0 (결제 필요). Groq 미설정 시 폴백.
async function generateWithGemini(apiKey: string, letterContent: string) {
  // 2.0-flash는 일부 지역에서 무료 한도 0 → 2.5-flash가 무료 티어에서 동작
  const model = process.env.GEMINI_MODEL || 'gemini-2.5-flash';

  const response = await postWithRetry(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
    {
      method: 'POST',
      headers: {
        'x-goog-api-key': apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        system_instruction: {
          parts: [{ text: SYSTEM_PROMPT }],
        },
        contents: [
          {
            role: 'user',
            parts: [{ text: USER_PROMPT(letterContent) }],
          },
        ],
        generationConfig: {
          maxOutputTokens: 1024,
          temperature: 0.9,
          // 2.5 계열의 thinking이 출력 토큰을 소진해 빈 답장이 나오는 것을 방지
          thinkingConfig: { thinkingBudget: 0 },
        },
      }),
    },
  );

  if (!response) return null;

  const data = (await response.json()) as GeminiResponse;
  const text = data.candidates
    ?.flatMap((candidate) => candidate.content?.parts ?? [])
    .map((part) => part.text)
    .filter((value): value is string => typeof value === 'string')
    .join('\n')
    .trim();

  return text || null;
}

export async function generateAiLetterReply(letterContent: string) {
  const groqKey = process.env.GROQ_API_KEY;
  const geminiKey = process.env.GEMINI_API_KEY;

  try {
    if (groqKey) {
      const reply = await generateWithGroq(groqKey, letterContent);
      if (reply) return reply;
    }

    if (geminiKey) {
      const reply = await generateWithGemini(geminiKey, letterContent);
      if (reply) return reply;
    }
  } catch {
    // 네트워크/파싱 오류 시 기본 답장으로 폴백
  }

  return DEFAULT_AI_REPLY;
}
