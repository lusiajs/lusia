const NAMED_ENTITIES = new Map([
  ["amp", "&"],
  ["lt", "<"],
  ["gt", ">"],
  ["quot", '"'],
  ["apos", "'"],
  ["nbsp", " "],
]);

const REFERENCE = /&(#[xX][0-9a-fA-F]+|#[0-9]+|[a-zA-Z]+);/g;
const MAX_CODE_POINT = 0x10ffff;

/** Replaces HTML character references (`&amp;`, `&#39;`, `&#x41;`) with the characters they stand for. */
export function decodeEntities(text: string): string {
  return text.replace(REFERENCE, (match, body: string) => {
    if (body.startsWith("#")) return decodeNumeric(body, match);
    return NAMED_ENTITIES.get(body) ?? match;
  });
}

function decodeNumeric(body: string, match: string): string {
  const hex = body[1] === "x" || body[1] === "X";
  const code = Number.parseInt(body.slice(hex ? 2 : 1), hex ? 16 : 10);
  return code <= MAX_CODE_POINT ? String.fromCodePoint(code) : match;
}
