import { groupEnd } from "#compiler/hot/group.ts";
import { lastSignificant, nextSignificant, skipCode } from "./mask.ts";
import { isKeyName } from "./key.ts";
import { typeDeclarationEnd } from "./type-skip.ts";

export interface PropRule {
  names: ReadonlySet<string>;
  target: string;
}

const WORD = /[\w$]+/y;
const WORD_START = /[A-Za-z_$]/;
const WORD_CHAR = /[\w$]/;
const OBJECT_AFTER = new Set(["(", ",", "=", ":", "[", "?", "+", "-", "*", "%", "!", "&", "|", "^", "~", "<"]);
const KEYWORD_BEFORE_OBJECT = /\b(?:return|yield)$/;

export function rewriteProps(code: string, rule: PropRule): string {
  if (rule.names.size === 0) return code;
  let out = "";
  const brackets: boolean[] = [];
  for (let pos = 0; pos < code.length; ) {
    const ch = code.charAt(pos);
    if (ch === "`") {
      const template = rewriteTemplate(code, pos, rule);
      out += template.text;
      pos = template.end;
      continue;
    }
    const next = skipCode(code, pos);
    if (next !== pos) {
      out += code.slice(pos, next);
      pos = next;
      continue;
    }
    if (WORD_START.test(ch) && !WORD_CHAR.test(code.charAt(pos - 1))) {
      WORD.lastIndex = pos;
      const word = WORD.exec(code)![0];
      const typeEnd = typeDeclarationEnd(code, pos, word);
      if (typeEnd !== -1) {
        out += code.slice(pos, typeEnd);
        pos = typeEnd;
        continue;
      }
      out += wordText(code, pos, word, brackets, rule);
      pos += word.length;
      continue;
    }
    trackBracket(code, pos, brackets);
    out += ch;
    pos++;
  }
  return out;
}

function rewriteTemplate(code: string, start: number, rule: PropRule): { text: string; end: number } {
  let text = "`";
  let pos = start + 1;
  while (pos < code.length && code.charAt(pos) !== "`") {
    if (code.charAt(pos) === "\\") {
      text += code.slice(pos, pos + 2);
      pos += 2;
    } else if (code.startsWith("${", pos)) {
      const close = groupEnd(code, pos + 1) - 1;
      text += `\${${rewriteProps(code.slice(pos + 2, close), rule)}}`;
      pos = close + 1;
    } else {
      text += code.charAt(pos);
      pos++;
    }
  }
  return { text: text + "`", end: pos + 1 };
}

function wordText(code: string, pos: number, word: string, brackets: boolean[], rule: PropRule): string {
  if (!rule.names.has(word) || isPropertyAccess(code, pos)) return word;
  if (isKeyName(code, pos, word)) return word;
  const before = code.charAt(lastSignificant(code, pos));
  const after = code.charAt(nextSignificant(code, pos + word.length));
  const inObject = brackets.at(-1) === true && (before === "{" || before === ",");
  if (inObject && (after === "," || after === "}")) return `${word}: ${rule.target}.${word}`;
  return `${rule.target}.${word}`;
}

function isPropertyAccess(code: string, pos: number): boolean {
  const index = lastSignificant(code, pos);
  if (code.charAt(index) !== ".") return false;
  return code.slice(index - 2, index + 1) !== "...";
}

function trackBracket(code: string, pos: number, brackets: boolean[]): void {
  const ch = code.charAt(pos);
  if (ch === "(" || ch === "[") brackets.push(false);
  else if (ch === "{") brackets.push(opensObject(code, pos));
  else if (ch === ")" || ch === "]" || ch === "}") brackets.pop();
}

function opensObject(code: string, pos: number): boolean {
  const index = lastSignificant(code, pos);
  if (OBJECT_AFTER.has(code.charAt(index))) return true;
  return KEYWORD_BEFORE_OBJECT.test(code.slice(Math.max(0, index - 10), index + 1));
}
