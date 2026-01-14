export function splitThinkTags(input: string): {
  content: string;
  reasoning: string | null;
} {
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
      reasoning += rest;
      break;
    }

    reasoning += rest.slice(0, close);
    rest = rest.slice(close + '</think>'.length);
  }

  return {
    content: content.trim(),
    reasoning: reasoning.trim() || null,
  };
}
