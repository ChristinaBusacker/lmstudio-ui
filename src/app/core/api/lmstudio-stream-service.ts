import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ChatStreamEvent, UUID } from '../models/chat.models';
import { AuthService } from './auth-service';

@Injectable({ providedIn: 'root' })
export class LmstudioStreamService {
  constructor(private auth: AuthService) {}

  streamChat(body: any): Observable<ChatStreamEvent> {
    return new Observable<ChatStreamEvent>((observer) => {
      const controller = new AbortController();
      const token = this.auth.getToken();

      fetch('/api/lmstudio/chat/stream', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      })
        .then(async (res) => {
          if (!res.ok || !res.body) {
            throw new Error(`HTTP ${res.status}`);
          }

          const reader = res.body.getReader();
          const decoder = new TextDecoder();

          let buffer = '';
          while (true) {
            const { value, done } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });

            let idx: number;
            while ((idx = buffer.indexOf('\n\n')) >= 0) {
              const frame = buffer.slice(0, idx);
              buffer = buffer.slice(idx + 2);

              const ev = this.parseSseFrame(frame);
              if (ev) observer.next(ev);
            }
          }

          observer.complete();
        })
        .catch((err) => observer.error(err));

      return () => controller.abort();
    });
  }

  private parseSseFrame(frame: string): ChatStreamEvent | null {
    const lines = frame.split('\n');
    const eventType = lines
      .find((l) => l.startsWith('event:'))
      ?.slice(6)
      .trim();
    const dataLine = lines
      .find((l) => l.startsWith('data:'))
      ?.slice(5)
      .trim();

    if (!eventType) return null;

    if (eventType === 'done') return { type: 'done' };

    if (!dataLine) return null;

    try {
      const data = JSON.parse(dataLine);

      switch (eventType) {
        case 'meta':
          return {
            type: 'meta',
            conversationId: data.conversationId as UUID,
            createdUserMessageIds: (data.createdUserMessageIds ?? []) as UUID[],
          };
        case 'delta':
          return { type: 'delta', text: String(data.text ?? '') };
        case 'reasoning_delta':
          return { type: 'reasoning_delta', text: String(data.text ?? '') };
        case 'final':
          return {
            type: 'final',
            createdAssistantMessageId: data.createdAssistantMessageId as UUID,
          };
        case 'error':
          return { type: 'error', message: String(data.message ?? 'Unknown error') };
        default:
          return null;
      }
    } catch {
      return { type: 'error', message: 'Invalid SSE payload' };
    }
  }
}
