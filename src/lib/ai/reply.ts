const DEFAULT_AI_REPLY =
  '편지를 읽으면서 당신이 얼마나 애쓰고 있는지 느껴졌어요. 지금의 마음이 쉽게 정리되지 않아도 괜찮아요. 이렇게 솔직하게 적어낸 것만으로도 이미 충분히 용기 있는 일이에요. 오늘은 스스로를 조금 덜 몰아붙이고, 작은 숨을 고르듯 천천히 지나가도 됩니다. 당신의 마음은 소중하고, 지금의 고민도 언젠가 당신을 더 단단하게 만들어줄 거예요. 저는 당신이 잘 버텨내고 있다고 말해주고 싶어요.';

type OpenAIResponse = {
  output_text?: string;
  output?: Array<{
    content?: Array<{
      text?: string;
    }>;
  }>;
};

function extractOutputText(data: OpenAIResponse) {
  if (typeof data.output_text === 'string' && data.output_text.trim()) {
    return data.output_text.trim();
  }

  const text = data.output
    ?.flatMap((item) => item.content ?? [])
    .map((content) => content.text)
    .filter((value): value is string => typeof value === 'string')
    .join('\n')
    .trim();

  return text || null;
}

export async function generateAiLetterReply(letterContent: string) {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    return DEFAULT_AI_REPLY;
  }

  try {
    const response = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL || 'gpt-4.1-mini',
        max_output_tokens: 420,
        input: [
          {
            role: 'system',
            content:
              '너는 청소년 사용자의 익명 편지에 답장하는 따뜻한 친구야. 사용자의 고민을 판단하거나 훈계하지 말고, 공감, 위로, 격려, 응원, 칭찬을 중심으로 한국어 답장을 써. 의료/법률/위험 상황을 단정하지 말고, 위험이 느껴질 때는 믿을 만한 어른이나 전문가에게 도움을 요청하라고 부드럽게 권해. 답장은 5~8문장, 편지체로 자연스럽게 작성해.',
          },
          {
            role: 'user',
            content: `사용자가 쓴 편지:\n${letterContent}`,
          },
        ],
      }),
    });

    if (!response.ok) {
      return DEFAULT_AI_REPLY;
    }

    const data = (await response.json()) as OpenAIResponse;
    return extractOutputText(data) || DEFAULT_AI_REPLY;
  } catch {
    return DEFAULT_AI_REPLY;
  }
}
