import { findClosing, previousChar, skipWhitespace } from "./text-scan.ts";

export type SymbolKind = "function" | "const" | "class" | "interface" | "type" | "enum";

const MAX_SIGNATURE = 160;
const TYPE_BRACE_BEFORE = ":|&<,([=?";

export function declarationSignature(
  source: string,
  masked: string,
  kind: SymbolKind,
  start: number,
  nameEnd: number,
): string {
  return formatSignature(source.slice(start, signatureEnd(masked, kind, nameEnd)));
}

function signatureEnd(masked: string, kind: SymbolKind, from: number): number {
  switch (kind) {
    case "function": {
      const open = masked.indexOf("(", from);
      if (open === -1) return from;
      return findFunctionEnd(masked, findClosing(masked, open, "(", ")") + 1);
    }
    case "const":
      return findValueEnd(masked, from);
    case "class": {
      const end = findBodyStart(masked, from);
      return cutImplements(masked, from, end);
    }
    case "interface":
    case "enum":
      return findBodyStart(masked, from);
    case "type":
      return findTypeEnd(masked, from);
  }
}

function findFunctionEnd(masked: string, from: number): number {
  let angle = 0;
  let index = from;
  while (index < masked.length) {
    const char = masked[index];
    if (char === "<") angle++;
    else if (char === ">") angle = Math.max(0, angle - 1);
    else if (char === ";" && angle === 0) return index;
    else if (char === "{" && angle === 0) {
      if (isTypeBrace(masked, index)) {
        index = skipBrace(masked, index);
        continue;
      }
      return index;
    }
    index++;
  }
  return masked.length;
}

function findValueEnd(masked: string, from: number): number {
  let pos = skipWhitespace(masked, from);
  if (masked[pos] === "!") pos = skipWhitespace(masked, pos + 1);
  if (masked[pos] !== ":") return from;
  let angle = 0;
  for (let index = pos + 1; index < masked.length; index++) {
    const char = masked[index];
    if (char === "<") angle++;
    else if (char === ">") angle = Math.max(0, angle - 1);
    else if (angle === 0 && char === ";") return index;
    else if (angle === 0 && char === "=" && masked[index + 1] !== ">") return index;
  }
  return masked.length;
}

function findBodyStart(masked: string, from: number): number {
  let parens = 0;
  let angle = 0;
  for (let index = from; index < masked.length; index++) {
    const char = masked[index];
    if (char === "(") parens++;
    else if (char === ")") parens = Math.max(0, parens - 1);
    else if (char === "<") angle++;
    else if (char === ">") angle = Math.max(0, angle - 1);
    else if (char === "{" && parens === 0 && angle === 0) return index;
    else if (char === ";" && parens === 0 && angle === 0) return index;
  }
  return masked.length;
}

function findTypeEnd(masked: string, from: number): number {
  let angle = 0;
  for (let index = from; index < masked.length; index++) {
    const char = masked[index];
    if (char === "<") angle++;
    else if (char === ">") angle = Math.max(0, angle - 1);
    else if (angle === 0 && (char === "=" || char === ";")) return index;
  }
  return masked.length;
}

function cutImplements(masked: string, from: number, end: number): number {
  const match = /\simplements\b/.exec(masked.slice(from, end));
  return match ? from + match.index : end;
}

function isTypeBrace(masked: string, index: number): boolean {
  return TYPE_BRACE_BEFORE.includes(previousChar(masked, index));
}

function skipBrace(masked: string, start: number): number {
  return findClosing(masked, start, "{", "}") + 1;
}

function formatSignature(text: string): string {
  const collapsed = text.replace(/\s+/g, " ").trim();
  return collapsed.length > MAX_SIGNATURE ? `${collapsed.slice(0, MAX_SIGNATURE)}…` : collapsed;
}
