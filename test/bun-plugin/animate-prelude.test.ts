import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { mkdir, mkdtemp, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { animatePrelude } from "#bun-plugin/animate-prelude.ts";
import { lusia } from "#bun-plugin/index.ts";
import { animateConfigToNames } from "#runtime/animate/options/config-names.ts";
import type { AnimateConfig } from "#runtime/animate/options/config.ts";

const REPO = new URL("../../", import.meta.url).pathname;
const PRELUDE_CALL = "setAnimateConfig(animateConfigFromNames(";
const config: AnimateConfig = { duration: 500, view: { amount: 0.5 } };

let dir: string;

beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), "lusia-prelude-"));
  await mkdir(join(dir, "node_modules"));
  await symlink(REPO, join(dir, "node_modules", "lusiajs"), "dir");
  await writeFile(join(dir, "entry.ts"), 'import "./Card.lusia";\n');
  await writeFile(
    join(dir, "Card.lusia"),
    ["<script>", "const label = 'card';", "</script>", "", "<p>card</p>", ""].join("\n"),
  );
});

afterEach(async () => {
  await rm(dir, { recursive: true, force: true });
});

async function buildOutput(animate?: AnimateConfig): Promise<string> {
  const result = await Bun.build({
    entrypoints: [join(dir, "entry.ts")],
    plugins: [lusia({ dev: true, animate })],
    throw: false,
  });
  if (!result.success) throw new Error(result.logs.map((log) => log.message).join("\n"));
  return result.outputs[0]!.text();
}

function preludeNames(prelude: string): unknown {
  const json = /animateConfigFromNames\((.*)\)\);/.exec(prelude)![1]!;
  return JSON.parse(json);
}

describe("animatePrelude", () => {
  test("is empty when the config has no animate key", () => {
    expect(animatePrelude({})).toBe("");
  });

  test("sets the config with the named JSON of its keys", () => {
    const prelude = animatePrelude(config);
    expect(prelude).toContain(PRELUDE_CALL);
    expect(preludeNames(prelude)).toEqual(animateConfigToNames(config));
  });
});

describe("lusia plugin animate option", () => {
  test("a compiled module carries the prelude when the config has keys", async () => {
    const output = await buildOutput(config);
    expect(output).toContain(PRELUDE_CALL);
  });

  test("a compiled module has no prelude without an animate config", async () => {
    const output = await buildOutput();
    expect(output).not.toContain(PRELUDE_CALL);
  });
});
