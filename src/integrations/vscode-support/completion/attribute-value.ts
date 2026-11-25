import { openTagAt } from "#language/parse/tag.ts";

const OPEN_VALUE = /([\w-]+)\s*=\s*"[^"]*$/;

/** The attribute whose quoted value the cursor is in, such as `tone` in `<Badge tone="|`. */
export function attributeValueNameAt(text: string, offset: number): string | undefined {
  const tag = openTagAt(text, offset);
  if (!tag) return undefined;
  return OPEN_VALUE.exec(text.slice(tag.start, offset))?.[1];
}
