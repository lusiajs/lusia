import { beforeAll, describe, expect, test } from "bun:test";
import { existsSync } from "node:fs";
import { mkdtemp, readFile, readdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { api } from "../../reference/api.ts";
import configSchema from "../../config.schema.json" with { type: "json" };
import { CODES } from "../../src/compiler/errors/codes.ts";
import { generateDocs } from "../../scripts/docs/generate.ts";

const WORDS_THAT_MEAN_A_BUG = ["undefined", "[object Object]"];
const LLMS_LINK = /\]\(([^)\s]+)\)/g;

let firstDir = "";
let secondDir = "";
let writtenFiles: string[] = [];

async function readDoc(outputDir: string, path: string): Promise<string> {
  return readFile(join(outputDir, path), "utf8");
}

// The source text itself may use these words, so a line passes when it is in the source.
function sourceText(): string {
  return JSON.stringify({ api, codes: CODES, schema: configSchema });
}

function isInSource(line: string, source: string): boolean {
  const text = line.replace(/^\s*(- )?/, "");
  return source.includes(JSON.stringify(text).slice(1, -1));
}

beforeAll(async () => {
  firstDir = await mkdtemp(join(tmpdir(), "lusia-docs-a-"));
  secondDir = await mkdtemp(join(tmpdir(), "lusia-docs-b-"));
  writtenFiles = await generateDocs(firstDir);
  await generateDocs(secondDir);
});

describe("generated docs", () => {
  test("writes one api page per entry", async () => {
    const pages = await readdir(join(firstDir, "docs", "api"));
    expect(pages.length).toBe(api.length);
    expect(api.length).toBe(65);
  });

  test("errors.md has a row for every code", async () => {
    const errors = await readDoc(firstDir, "docs/errors.md");
    for (const code of Object.keys(CODES)) {
      expect(errors).toContain(`| ${code} |`);
    }
  });

  test("config.md lists the nested animate.attach.animateSpace option", async () => {
    const config = await readDoc(firstDir, "docs/config.md");
    expect(config).toContain("animate.attach.animateSpace");
  });

  test("every link in llms.txt points to a file that exists", async () => {
    const llms = await readDoc(firstDir, "llms.txt");
    const targets = [...llms.matchAll(LLMS_LINK)].map((match) => match[1] ?? "");
    expect(targets.length).toBeGreaterThan(0);
    for (const target of targets) {
      expect(existsSync(join(firstDir, target))).toBe(true);
    }
  });

  test("two runs produce byte-identical files", async () => {
    for (const path of writtenFiles) {
      const first = await readFile(join(firstDir, path));
      const second = await readFile(join(secondDir, path));
      expect(Buffer.compare(first, second)).toBe(0);
    }
  });

  test("no page has a bug word that the source does not contain", async () => {
    const source = sourceText();
    for (const path of writtenFiles) {
      const lines = (await readDoc(firstDir, path)).split("\n");
      for (const line of lines) {
        const hasBugWord = WORDS_THAT_MEAN_A_BUG.some((word) => line.includes(word));
        if (hasBugWord) expect(isInSource(line, source)).toBe(true);
      }
    }
  });
});
