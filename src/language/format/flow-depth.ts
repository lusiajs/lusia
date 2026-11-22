const FLOW_OPEN = /<(IF|EACH|FOR)(?=[\s/>])/g;
const FLOW_CLOSE = /<\/(IF|EACH|FOR)\s*>/g;
const EXPRESSION = /\{[^{}]*\}/g;

/** Whether markup ends inside an open `<IF>`, `<EACH>` or `<FOR>` block. */
export function isInsideFlowBlock(markup: string): boolean {
  const tags = markup.replace(EXPRESSION, "");
  return count(tags, FLOW_OPEN) > count(tags, FLOW_CLOSE);
}

function count(text: string, pattern: RegExp): number {
  return text.match(pattern)?.length ?? 0;
}
