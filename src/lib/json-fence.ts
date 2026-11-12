// Some models wrap a structured answer in a markdown code fence even when asked
// for bare JSON. This unwraps exactly that and nothing else: the whole reply
// must be one fenced block, optionally tagged "json". Prose before or after the
// fence, or prose inside it, is left alone so the caller still rejects it.
const WHOLE_REPLY_IS_ONE_FENCE = /^\s*```(?:json)?[ \t]*\r?\n?([\s\S]*?)\r?\n?[ \t]*```\s*$/i;

export function unwrapJsonFence(content: string): string {
  const match = WHOLE_REPLY_IS_ONE_FENCE.exec(content);
  // More than one fence (or a fence inside the block) is not "one fenced block".
  if (!match || match[1].includes("```")) return content;
  return match[1].trim();
}
