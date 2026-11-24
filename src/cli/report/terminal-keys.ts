const KEY_NAMES = new Map<string, string>([
  ["\x1b[A", "up"],
  ["\x1b[B", "down"],
  ["\x1b[C", "right"],
  ["\x1b[D", "left"],
  ["\x1b[5~", "pageup"],
  ["\x1b[6~", "pagedown"],
  ["\t", "tab"],
  ["\x1b[Z", "shift-tab"],
  ["\r", "enter"],
  ["\x1b", "escape"],
  ["\x03", "ctrl-c"],
]);

const LETTER = /^[a-z]$/;

/** The name of one raw key chunk from the terminal, or undefined for keys the report ignores. */
export function keyName(data: string): string | undefined {
  const named = KEY_NAMES.get(data);
  if (named !== undefined) return named;
  return LETTER.test(data) ? data : undefined;
}
