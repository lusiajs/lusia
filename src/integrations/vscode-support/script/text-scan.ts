const WORD_CHAR = /[\w$]/;

export function maskSource(source: string): string {
  const chars = source.split("");
  let index = 0;
  while (index < source.length) {
    const char = source[index];
    if (char === "/" && source[index + 1] === "/") {
      index = blank(chars, source, index, skipLineComment(source, index));
    } else if (char === "/" && source[index + 1] === "*") {
      index = blank(chars, source, index, skipBlockComment(source, index));
    } else if (char === '"' || char === "'" || char === "`") {
      index = blank(chars, source, index, skipString(source, index));
    } else {
      index++;
    }
  }
  return chars.join("");
}

function blank(chars: string[], source: string, start: number, end: number): number {
  for (let index = start; index < end; index++) {
    if (source[index] !== "\n") chars[index] = " ";
  }
  return end;
}

export function skipString(text: string, start: number): number {
  const quote = text[start];
  let index = start + 1;
  while (index < text.length) {
    const char = text[index];
    if (char === "\\") {
      index += 2;
      continue;
    }
    if (char === quote) return index + 1;
    index++;
  }
  return text.length;
}

export function skipLineComment(text: string, start: number): number {
  const end = text.indexOf("\n", start);
  return end === -1 ? text.length : end;
}

export function skipBlockComment(text: string, start: number): number {
  const end = text.indexOf("*/", start + 2);
  return end === -1 ? text.length : end + 2;
}

export function skipWhitespace(text: string, start: number): number {
  let index = start;
  while (index < text.length && /\s/.test(text[index] ?? "")) index++;
  return index;
}

export function wordAt(text: string, start: number): string {
  if (!isWordChar(text[start])) return "";
  return text.slice(start, readWordEnd(text, start));
}

export function readWordEnd(text: string, start: number): number {
  let end = start;
  while (end < text.length && isWordChar(text[end])) end++;
  return end;
}

export function isWordChar(char: string | undefined): boolean {
  return char !== undefined && WORD_CHAR.test(char);
}

export function findClosing(
  text: string,
  open: number,
  openChar: string,
  closeChar: string,
): number {
  let depth = 0;
  for (let index = open; index < text.length; index++) {
    const char = text[index];
    if (char === openChar) depth++;
    else if (char === closeChar) {
      depth--;
      if (depth === 0) return index;
    }
  }
  return text.length - 1;
}

export function previousChar(text: string, index: number): string {
  let pos = index - 1;
  while (pos >= 0 && /\s/.test(text[pos] ?? "")) pos--;
  return text[pos] ?? "";
}

export function countBraces(masked: string, from: number, to: number, depth: number): number {
  let result = depth;
  for (let index = from; index < to; index++) {
    const char = masked[index];
    if (char === "{") result++;
    else if (char === "}") result = Math.max(0, result - 1);
  }
  return result;
}
