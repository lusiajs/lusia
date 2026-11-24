import type { Values } from "#compiler/errors/create.ts";
import {
  hasItemKey,
  isKeyframesKey,
  ITEM_KEYS,
  KEYFRAMES_HINT,
  KEYFRAMES_NAME,
  OLD_ITEM_KEYS,
  OPTION_KEYS_BY_ON,
  SPELLING_HINT,
  unknownKeyValues,
} from "#runtime/animate/options/keys.ts";
import { objectEntries, listItems, skipSpace, type Entry } from "./literals.ts";
import type { ScriptRange } from "./script-range.ts";

/** A key the runtime rejects. `offset` is in the source, and `code` and `values` fill its error. */
export interface UnknownKey {
  offset: number;
  key: string;
  code: "L2054" | "L2055" | "L2012" | "L2083";
  values: Values;
}

const IDENTIFIER = /[A-Za-z_$][\w$]*/y;
const ON_MEMBER = /\bON\.([A-Za-z_]+)/y;
const MAX_DEPTH = 8;

export class KeyScan {
  private readonly found: UnknownKey[] = [];

  constructor(
    private readonly source: string,
    private readonly script: ScriptRange,
  ) {}

  /** The value is keyframes, an item, an array of them, or a name for one of those. */
  value(start: number, depth: number): UnknownKey[] {
    this.visitValue(start, depth);
    return this.found;
  }

  private visitValue(start: number, depth: number): void {
    if (depth > MAX_DEPTH) return;
    const at = skipSpace(this.source, start);
    const ch = this.source.charAt(at);
    if (ch === "{") this.visitObject(at, depth);
    else if (ch === "[")
      for (const item of listItems(this.source, at)) this.visitValue(item.from, depth + 1);
    else this.followName(at, depth, (declared) => this.visitValue(declared, depth + 1));
  }

  /** A `style` value is always keyframes, even when its keys look like an item. */
  private visitKeyframes(start: number, depth: number): void {
    if (depth > MAX_DEPTH) return;
    const at = skipSpace(this.source, start);
    if (this.source.charAt(at) === "{") this.checkKeyframes(at);
    else this.followName(at, depth, (declared) => this.visitKeyframes(declared, depth + 1));
  }

  private visitObject(open: number, depth: number): void {
    const entries = objectEntries(this.source, open);
    if (hasItemKey(entries.map((entry) => entry.key))) this.checkItem(entries, depth);
    else this.checkKeyframeEntries(entries);
  }

  private checkKeyframes(open: number): void {
    this.checkKeyframeEntries(objectEntries(this.source, open));
  }

  private checkKeyframeEntries(entries: Entry[]): void {
    for (const entry of entries) {
      if (isKeyframesKey(entry.key)) continue;
      if (entry.key === "default") {
        this.add(entry, "L2083", {});
        continue;
      }
      const values = unknownKeyValues(entry.key, [KEYFRAMES_NAME], KEYFRAMES_HINT);
      this.add(entry, "L2054", values);
    }
  }

  private checkItem(entries: Entry[], depth: number): void {
    const trigger = triggerOf(this.source, entries);
    for (const entry of entries) {
      if (OLD_ITEM_KEYS.includes(entry.key)) continue;
      if (!ITEM_KEYS.includes(entry.key)) {
        this.add(entry, "L2055", unknownKeyValues(entry.key, ITEM_KEYS, SPELLING_HINT));
      } else if (entry.key === "play" && entry.valueOffset !== undefined) {
        this.visitKeyframes(entry.valueOffset, depth + 1);
      } else if (
        entry.key === "options" &&
        entry.valueOffset !== undefined &&
        trigger !== undefined
      ) {
        this.checkOptions(entry.valueOffset, trigger);
      }
    }
  }

  private checkOptions(start: number, trigger: string): void {
    const at = skipSpace(this.source, start);
    if (this.source.charAt(at) !== "{") return;
    const allowed = OPTION_KEYS_BY_ON[trigger] ?? [];
    for (const entry of objectEntries(this.source, at)) {
      if (!allowed.includes(entry.key)) {
        this.add(entry, "L2012", unknownKeyValues(entry.key, allowed, SPELLING_HINT));
      }
    }
  }

  /** Calls `visit` with the start of the script value that `start` names, when it names one. */
  private followName(start: number, depth: number, visit: (declared: number) => void): void {
    if (depth > MAX_DEPTH) return;
    IDENTIFIER.lastIndex = start;
    const match = IDENTIFIER.exec(this.source);
    if (!match) return;
    const after = skipSpace(this.source, start + match[0].length);
    if (this.source.charAt(after) === "." || this.source.charAt(after) === "(") return;
    const declared = this.declarationOf(match[0]);
    if (declared !== undefined) visit(declared);
  }

  /** The index where the value of `const name = ...` starts in the script, if the script declares it. */
  private declarationOf(name: string): number | undefined {
    const text = this.source.slice(this.script.from, this.script.to);
    const pattern = new RegExp(`\\b(?:const|let|var)\\s+${name.replace(/\$/g, "\\$")}\\s*=\\s*`);
    const match = pattern.exec(text);
    return match === null ? undefined : this.script.from + match.index + match[0].length;
  }

  private add(entry: Entry, code: UnknownKey["code"], values: Values): void {
    this.found.push({ offset: entry.keyOffset, key: entry.key, code, values });
  }
}

/** The ON member name of the item's `on` value, such as "VIEW". */
function triggerOf(source: string, entries: Entry[]): string | undefined {
  const on = entries.find((entry) => entry.key === "on");
  if (on?.valueOffset === undefined) return undefined;
  ON_MEMBER.lastIndex = on.valueOffset;
  return ON_MEMBER.exec(source)?.[1];
}
