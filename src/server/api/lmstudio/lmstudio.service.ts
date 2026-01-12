import { env } from '../../config/env.js';

type ChatRole = 'system' | 'user' | 'assistant' | 'tool';

export type ChatMessage = { role: ChatRole; content: string };

export type LmstudioChatParams = {
  model?: string;
  temperature?: number;
  messages: ChatMessage[];
};

export type StreamEvent =
  | { event: 'meta'; data: any }
  | { event: 'delta'; data: { text: string } }
  | { event: 'done'; data: any }
  | { event: 'final'; data: any }
  | { event: 'error'; data: any };

export type LmstudioChatResult = {
  assistantText: string | null;
  raw: unknown;
};

export type StreamSseSend = (event: string, data: unknown) => void;

export type StreamResult = {
  fullText: string;
  fullReasoning: string;
};

function parseSseLines(chunk: string): { events: StreamEvent[]; rest: string } {
  const events: StreamEvent[] = [];

  // split on double newlines, keep remainder
  const parts = chunk.split('\n\n');
  const rest = parts.pop() ?? '';

  for (const p of parts) {
    let eventName: any = null;
    let dataLine: string | null = null;

    for (const line of p.split('\n')) {
      if (line.startsWith('event:')) eventName = line.slice('event:'.length).trim();
      if (line.startsWith('data:')) dataLine = line.slice('data:'.length).trim();
    }

    if (eventName && dataLine != null) {
      try {
        events.push({ event: eventName, data: JSON.parse(dataLine) } as StreamEvent);
      } catch {
        // ignore
      }
    }
  }

  return { events, rest };
}

export class LmstudioService {
  async ping(): Promise<boolean> {
    try {
      const res = await fetch(`${env.LMSTUDIO_BASE_URL}/models`, { method: 'GET' });
      return res.ok;
    } catch {
      return false;
    }
  }

  private extractAssistantText(raw: any): string | null {
    // Chat Completions: choices[0].message.content
    const c0 = raw?.choices?.[0];
    if (!c0) return null;

    // Standard OpenAI chat format
    const msgContent = c0?.message?.content;
    if (typeof msgContent === 'string' && msgContent.trim().length) return msgContent;

    // Some providers put it in delta (rare for non-stream, but can happen)
    const deltaContent = c0?.delta?.content;
    if (typeof deltaContent === 'string' && deltaContent.trim().length) return deltaContent;

    // Some older completion formats
    const text = c0?.text;
    if (typeof text === 'string' && text.trim().length) return text;

    // Sometimes content is an array of parts
    const contentParts = c0?.message?.content;
    if (Array.isArray(contentParts)) {
      const joined = contentParts
        .map((p) => (typeof p === 'string' ? p : p?.text))
        .filter((s) => typeof s === 'string')
        .join('');
      if (joined.trim().length) return joined;
    }

    return null;
  }

  async chat(params: LmstudioChatParams): Promise<LmstudioChatResult> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), env.LMSTUDIO_TIMEOUT_MS);

    const res = await fetch(`${env.LMSTUDIO_BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      signal: controller.signal,
      body: JSON.stringify({
        model: params.model ?? env.LMSTUDIO_MODEL,
        temperature: params.temperature ?? 0.7,
        messages: params.messages,
      }),
    }).finally(() => clearTimeout(timeout));

    if (!res.ok) {
      const details = await res.text().catch(() => '');
      throw new Error(`LM Studio request failed (${res.status}): ${details}`);
    }

    const raw = await res.json();

    const assistantText = this.extractAssistantText(raw);

    return { assistantText, raw };
  }

  async streamChat(params: {
    messages: Array<{ role: string; content: string }>;
    model?: string;
    temperature?: number;
    send: StreamSseSend;
    abortSignal: AbortSignal;
  }): Promise<StreamResult> {
    const lmRes = await fetch(`${env.LMSTUDIO_BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      signal: params.abortSignal,
      body: JSON.stringify({
        model: params.model ?? env.LMSTUDIO_MODEL,
        temperature: params.temperature ?? 0.7,
        messages: params.messages,
        stream: true,
      }),
    });

    if (!lmRes.ok || !lmRes.body) {
      const details = await lmRes.text().catch(() => '');
      params.send('error', { message: 'LM Studio stream failed', status: lmRes.status, details });
      throw new Error(`LM Studio stream failed: ${lmRes.status}`);
    }

    const reader = lmRes.body.getReader();
    const decoder = new TextDecoder('utf-8');

    let buffer = '';
    let fullText = '';
    let fullReasoning = '';

    const processBuffer = () => {
      const frames = buffer.split(/\r?\n\r?\n/);
      buffer = frames.pop() ?? '';

      for (const frame of frames) {
        const lines = frame.split(/\r?\n/).map((l) => l.trim());

        for (const line of lines) {
          if (!line.startsWith('data:')) continue;

          const payload = line.slice('data:'.length).trim();
          if (!payload) continue;

          if (payload === '[DONE]') {
            params.send('done', {});
            continue;
          }

          try {
            const json = JSON.parse(payload);

            const deltaContent =
              json?.choices?.[0]?.delta?.content ?? json?.choices?.[0]?.message?.content ?? null;

            const deltaReasoning =
              json?.choices?.[0]?.delta?.reasoning ??
              json?.choices?.[0]?.message?.reasoning ??
              null;

            if (typeof deltaReasoning === 'string' && deltaReasoning.length) {
              fullReasoning += deltaReasoning;
              params.send('reasoning_delta', { text: deltaReasoning });
            }

            if (typeof deltaContent === 'string' && deltaContent.length) {
              fullText += deltaContent;
              params.send('delta', { text: deltaContent });
            }
          } catch {
            // ignore malformed chunks
          }
        }
      }
    };

    while (true) {
      const { value, done } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      processBuffer();
    }

    if (buffer.length) processBuffer();

    return { fullText, fullReasoning };
  }
}
