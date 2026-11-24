import { describe, expect, test } from "bun:test";
import {
  semanticTokens,
  TOKEN_MODIFIERS,
  TOKEN_TYPES,
  type SemanticToken,
} from "../../src/editor/semantic-tokens.ts";

const CONSTRUCTS = `<script>
  import Badge from "./badge.lusia";
  const value = EVENT.X;
</script>
<IF cond={ON.VIEW}>
  <Badge onclick={go} on:click={go} bind-value={v} animate={{ on: ON.VIEW }} />
  <EACH items as=item index=i key={item.id}>
    <p>{EASE.STYLE.CUBIC} {SCREEN.WIDTH} {EDGE.TOP} {PRESET.X}</p>
  </EACH>
  <FOR from=0 to={3} step=1>{i}</FOR>
  <ELSE>
  </ELSE>
  <CONTENT />
  <HTML>{raw}</HTML>
  <FALLBACK>x</FALLBACK>
  <NOLAZY><Badge /></NOLAZY>
</IF>
<style>
  .card { color: red; }
</style>
`;

function sourceLine(source: string, line: number): string {
  return (source.split("\n")[line] ?? "").replace(/\r$/, "");
}

function tokenText(source: string, token: SemanticToken): string {
  return sourceLine(source, token.line).slice(token.character, token.character + token.length);
}

function texts(source: string): [string, string][] {
  return semanticTokens(source).map((token) => [tokenText(source, token), token.type]);
}

const POSITION_SOURCE = `<IF cond>
  <button onclick={go}>x</button>
</IF>
`;

describe("semantic tokens", () => {
  test("exports the legend in order", () => {
    expect(TOKEN_TYPES).toEqual([
      "keyword",
      "decorator",
      "event",
      "parameter",
      "class",
      "enumMember",
    ]);
    expect(TOKEN_MODIFIERS).toEqual(["readonly"]);
  });

  test("colors every construct in order", () => {
    expect(texts(CONSTRUCTS)).toEqual([
      ["IF", "keyword"],
      ["VIEW", "enumMember"],
      ["Badge", "class"],
      ["on", "decorator"],
      ["click", "event"],
      ["on:", "decorator"],
      ["click", "event"],
      ["bind-value", "decorator"],
      ["animate", "decorator"],
      ["VIEW", "enumMember"],
      ["EACH", "keyword"],
      ["as", "parameter"],
      ["index", "parameter"],
      ["key", "parameter"],
      ["STYLE", "enumMember"],
      ["CUBIC", "enumMember"],
      ["WIDTH", "enumMember"],
      ["TOP", "enumMember"],
      ["X", "enumMember"],
      ["EACH", "keyword"],
      ["FOR", "keyword"],
      ["from", "parameter"],
      ["to", "parameter"],
      ["step", "parameter"],
      ["FOR", "keyword"],
      ["ELSE", "keyword"],
      ["ELSE", "keyword"],
      ["CONTENT", "keyword"],
      ["HTML", "keyword"],
      ["HTML", "keyword"],
      ["FALLBACK", "keyword"],
      ["FALLBACK", "keyword"],
      ["NOLAZY", "keyword"],
      ["Badge", "class"],
      ["NOLAZY", "keyword"],
      ["IF", "keyword"],
    ]);
  });

  test("marks enum members readonly and nothing else", () => {
    for (const token of semanticTokens(CONSTRUCTS)) {
      expect(token.modifiers).toEqual(token.type === "enumMember" ? ["readonly"] : []);
    }
  });

  test("reports exact 0-based positions", () => {
    expect(semanticTokens(POSITION_SOURCE)).toEqual([
      { line: 0, character: 1, length: 2, type: "keyword", modifiers: [] },
      { line: 1, character: 10, length: 2, type: "decorator", modifiers: [] },
      { line: 1, character: 12, length: 5, type: "event", modifiers: [] },
      { line: 2, character: 2, length: 2, type: "keyword", modifiers: [] },
    ]);
  });

  test("positions stay right in a CRLF file", () => {
    const crlf = POSITION_SOURCE.replaceAll("\n", "\r\n");
    expect(semanticTokens(crlf)).toEqual(semanticTokens(POSITION_SOURCE));
  });

  test("emits nothing inside script and style", () => {
    const source = `<script>
  import Badge from "./badge.lusia";
  const html = "<IF>{EVENT.X}";
</script>
<style>
  <Badge onclick="x"> .card { color: red; } EASE.X
</style>
`;
    expect(semanticTokens(source)).toEqual([]);
  });
});
