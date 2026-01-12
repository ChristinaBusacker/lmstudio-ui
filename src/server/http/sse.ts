import type express from 'express';

export type SseSend = (event: string, data: unknown) => void;

export type SseContext = {
  send: SseSend;
  end: () => void;
  clientClosed: () => boolean;
  abortSignal: AbortSignal;
};

export function startSse(req: express.Request, res: express.Response): SseContext {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream; charset=utf-8',
    'Cache-Control': 'no-cache, no-transform',
    Connection: 'keep-alive',
  });
  res.flushHeaders?.();

  const send: SseSend = (event, data) => {
    res.write(`event: ${event}\n`);
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  };

  let closed = false;
  const abort = new AbortController();

  // IMPORTANT: SSE is tied to the response connection.
  res.on('close', () => {
    closed = true;
    abort.abort();
  });

  // Rare: request upload aborted mid-body.
  req.on('aborted', () => {
    closed = true;
    abort.abort();
  });

  return {
    send,
    end: () => res.end(),
    clientClosed: () => closed,
    abortSignal: abort.signal,
  };
}
