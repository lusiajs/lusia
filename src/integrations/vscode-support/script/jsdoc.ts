export function declarationDoc(source: string, index: number): string {
  let end = index;
  while (end > 0) {
    end = trimBack(source, end);
    if (end < 2) return "";
    if (source[end - 1] !== "/" || source[end - 2] !== "*") return "";
    const start = source.lastIndexOf("/*", end - 2);
    if (start === -1) return "";
    const block = source.slice(start, end);
    if (block.startsWith("/**") && block !== "/**/") return jsdocMarkdown(block);
    end = start;
  }
  return "";
}

function trimBack(text: string, end: number): number {
  let pos = end;
  while (pos > 0 && /\s/.test(text[pos - 1] ?? "")) pos--;
  return pos;
}

function jsdocMarkdown(block: string): string {
  const lines = block.slice(3, -2).split("\n").map(cleanDocLine);
  trimBlankLines(lines);
  return renderDocLines(lines);
}

function cleanDocLine(line: string): string {
  return line.replace(/^\s*\*?[ \t]?/, "").replace(/\s+$/, "");
}

function renderDocLines(lines: string[]): string {
  const out: string[] = [];
  let index = 0;
  while (index < lines.length) {
    const line = lines[index] ?? "";
    if (!/^@example\b/.test(line)) {
      out.push(line);
      index++;
      continue;
    }
    const body: string[] = [];
    index++;
    while (index < lines.length && !/^@\w+/.test(lines[index] ?? "")) {
      body.push(lines[index] ?? "");
      index++;
    }
    trimBlankLines(body);
    if (out.length > 0 && out[out.length - 1] !== "") out.push("");
    out.push("```ts", ...body, "```");
  }
  trimBlankLines(out);
  return out.join("\n");
}

function trimBlankLines(lines: string[]): void {
  while (lines.length > 0 && lines[0]?.trim() === "") lines.shift();
  while (lines.length > 0 && lines[lines.length - 1]?.trim() === "") lines.pop();
}
