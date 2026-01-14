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
  assistantReasoning?: string | null;
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

  /**
   * Splits out <think>...</think> blocks from model output.
   * Returns content without think blocks + extracted reasoning.
   */
  private splitThinkTags(input: string): { content: string; reasoning: string | null } {
    if (!input.includes('<think>')) {
      return { content: input.trim(), reasoning: null };
    }

    let content = '';
    let reasoning = '';
    let rest = input;

    while (rest.length) {
      const open = rest.indexOf('<think>');
      if (open === -1) {
        content += rest;
        break;
      }

      content += rest.slice(0, open);
      rest = rest.slice(open + '<think>'.length);

      const close = rest.indexOf('</think>');
      if (close === -1) {
        // no closing tag => treat remainder as reasoning
        reasoning += rest;
        rest = '';
        break;
      }

      reasoning += rest.slice(0, close);
      rest = rest.slice(close + '</think>'.length);
    }

    const c = content.trim();
    const r = reasoning.trim();
    return { content: c, reasoning: r.length ? r : null };
  }

  private extractAssistantText(raw: any): string | null {
    const c0 = raw?.choices?.[0];
    if (!c0) return null;

    const msgContent = c0?.message?.content;
    if (typeof msgContent === 'string' && msgContent.trim().length) return msgContent;

    const deltaContent = c0?.delta?.content;
    if (typeof deltaContent === 'string' && deltaContent.trim().length) return deltaContent;

    const text = c0?.text;
    if (typeof text === 'string' && text.trim().length) return text;

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

  private extractAssistantReasoning(raw: any): string | null {
    const c0 = raw?.choices?.[0];
    if (!c0) return null;

    const msgReasoning = c0?.message?.reasoning;
    if (typeof msgReasoning === 'string' && msgReasoning.trim().length) return msgReasoning;

    const deltaReasoning = c0?.delta?.reasoning;
    if (typeof deltaReasoning === 'string' && deltaReasoning.trim().length) return deltaReasoning;

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

    // Raw content/reasoning from provider
    const assistantTextRaw = this.extractAssistantText(raw);
    const assistantReasoningRaw = this.extractAssistantReasoning(raw);

    // Some models embed reasoning in content using <think> tags.
    // We split that out to keep a clean assistantText.
    let assistantText: string | null = null;
    let assistantReasoning: string | null = assistantReasoningRaw ?? null;

    if (assistantTextRaw && assistantTextRaw.trim().length) {
      const split = this.splitThinkTags(assistantTextRaw);
      assistantText = split.content.length ? split.content : null;

      // Merge extracted reasoning with provider reasoning, if both exist
      if (split.reasoning) {
        assistantReasoning = assistantReasoning
          ? `${assistantReasoning}\n${split.reasoning}`.trim()
          : split.reasoning;
      }
    }

    return { assistantText, assistantReasoning, raw };
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

    // --- <think>...</think> parser state ---
    let mode: 'content' | 'reasoning' = 'content';
    let carry = ''; // holds partial tag fragments across deltas

    const emitContent = (text: string) => {
      if (!text) return;
      fullText += text;
      params.send('delta', { text });
    };

    const emitReasoning = (text: string) => {
      if (!text) return;
      fullReasoning += text;
      params.send('reasoning_delta', { text });
    };

    const handleModelTextChunk = (chunk: string) => {
      // Prepend leftover fragment from last chunk
      let s = carry + chunk;
      carry = '';

      while (s.length) {
        const openIdx = s.indexOf('<think>');
        const closeIdx = s.indexOf('</think>');

        if (mode === 'content') {
          if (openIdx === -1) {
            // No open tag in this chunk. But we might have a partial "<think" at the end.
            const partialIdx = s.lastIndexOf('<');
            if (partialIdx !== -1 && '<think>'.startsWith(s.slice(partialIdx))) {
              emitContent(s.slice(0, partialIdx));
              carry = s.slice(partialIdx);
              return;
            }

            emitContent(s);
            return;
          }

          // emit content before <think>
          emitContent(s.slice(0, openIdx));

          // consume <think> and switch mode
          s = s.slice(openIdx + '<think>'.length);
          mode = 'reasoning';
          continue;
        }

        // mode === 'reasoning'
        if (closeIdx === -1) {
          // Might have partial "</think>" at end
          const partialIdx = s.lastIndexOf('<');
          if (partialIdx !== -1 && '</think>'.startsWith(s.slice(partialIdx))) {
            emitReasoning(s.slice(0, partialIdx));
            carry = s.slice(partialIdx);
            return;
          }

          emitReasoning(s);
          return;
        }

        // emit reasoning before </think>
        emitReasoning(s.slice(0, closeIdx));

        // consume </think> and switch mode
        s = s.slice(closeIdx + '</think>'.length);
        mode = 'content';
      }
    };

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

            console.log(json);

            const deltaContent =
              json?.choices?.[0]?.delta?.content ?? json?.choices?.[0]?.message?.content ?? null;

            const deltaReasoning =
              json?.choices?.[0]?.delta?.reasoning ??
              json?.choices?.[0]?.message?.reasoning ??
              null;

            // 1) If provider provides structured reasoning deltas, use them.
            if (typeof deltaReasoning === 'string' && deltaReasoning.length) {
              emitReasoning(deltaReasoning);
            }

            // 2) Some models embed reasoning in-band using <think> tags inside content deltas.
            if (typeof deltaContent === 'string' && deltaContent.length) {
              handleModelTextChunk(deltaContent);
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

    // Flush remaining carry (if model ended mid-tag)
    if (carry.length) {
      if (mode !== 'content') {
        emitReasoning(carry);
      } else {
        emitContent(carry);
      }
      carry = '';
    }

    return { fullText, fullReasoning };
  }

  async generateTitle(params: {
    userText: string;
    assistantText: string;
    model?: string;
  }): Promise<string | null> {
    const { assistantText, userText } = params;

    const res = await this.chat({
      model: params.model,
      temperature: 0,
      messages: [
        {
          role: 'system',
          content:
            'Generate a short conversation title in 2–3 words. No quotes, no Markdown, no emojis, no trailing punctuation. Output only the title.',
        },
        { role: 'user', content: `User: ${userText}\nAssistant: ${assistantText}` },
      ],
    });

    const raw = (res.assistantText ?? '').trim();
    if (!raw.length) return null;

    // Extra safety: split think tags even here (chat() already does, but belt & suspenders)
    const { content } = this.splitThinkTags(raw);

    const cleaned = this.sanitizeTitle(content);
    return cleaned.length ? cleaned : null;
  }

  sanitizeTitle(input: string): string {
    let s = input
      // defensive: remove any leftover think blocks
      .replace(/<think>[\s\S]*?<\/think>/gi, '')
      .replace(/[`*_>#]/g, '')
      .replace(/^["'“”‘’]+|["'“”‘’]+$/g, '')
      .replace(/\s+/g, ' ')
      .trim();

    s = s.replace(/[.!?:;,]+$/g, '').trim();

    const words = s.split(' ').filter(Boolean);
    if (words.length > 3) s = words.slice(0, 3).join(' ');
    return s;
  }
}
