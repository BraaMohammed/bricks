/**
 * Shared SSE parsing helpers for Deep Research streams (the run stream and the
 * clarify chat stream). Payloads are `data: {JSON}\n\n` blocks.
 */

export interface ParsedSseBuffer {
  rest: string;
  payloads: string[];
}

export const parseSseBuffer = (buffer: string): ParsedSseBuffer => {
  const normalized = buffer.replace(/\r\n/g, '\n');
  const payloads: string[] = [];
  let rest = normalized;
  let boundary = rest.indexOf('\n\n');

  while (boundary !== -1) {
    const block = rest.slice(0, boundary);
    rest = rest.slice(boundary + 2);
    const dataLines = block
      .split('\n')
      .filter((line) => line.startsWith('data:'))
      .map((line) => line.slice(5).replace(/^ /, ''));
    if (dataLines.length > 0) {
      payloads.push(dataLines.join('\n'));
    }
    boundary = rest.indexOf('\n\n');
  }

  return { rest, payloads };
};

export const parseSseBlock = (block: string): string | null => {
  const dataLines = block
    .replace(/\r\n/g, '\n')
    .split('\n')
    .filter((line) => line.startsWith('data:'))
    .map((line) => line.slice(5).replace(/^ /, ''));
  return dataLines.length > 0 ? dataLines.join('\n') : null;
};

/**
 * Reads an SSE response body to completion, invoking `onPayload` for each
 * complete `data:` payload. Returns when the stream ends.
 */
export async function consumeSseStream(
  body: ReadableStream<Uint8Array>,
  onPayload: (payload: string) => void,
): Promise<void> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const { rest, payloads } = parseSseBuffer(buffer);
    buffer = rest;
    for (const payload of payloads) {
      onPayload(payload);
    }
  }

  buffer += decoder.decode();
  const tail = parseSseBlock(buffer);
  if (tail) onPayload(tail);
}
