import { describe, expect, test } from "bun:test";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { readConfig } from "#cli/args/config.ts";
import { parseCommand } from "#cli/args/args.ts";
import { animateConfigFromNames } from "#runtime/animate/options/config-names.ts";

const CONFIG_INDEX = new URL("../../../src/config/index.ts", import.meta.url).pathname;

function appFolder(): string {
  return mkdtempSync(join(tmpdir(), "lusia-config-"));
}

function appWith(json: string): string {
  const dir = appFolder();
  writeFileSync(join(dir, "lusia.config.json"), json);
  return dir;
}

function appWithTs(source: string): string {
  const dir = appFolder();
  writeFileSync(join(dir, "lusia.config.ts"), source);
  return dir;
}

describe("readConfig", () => {
  test("a missing file means no settings", async () => {
    expect(await readConfig(appFolder())).toEqual({});
  });

  test("reads every known key", async () => {
    const config = await readConfig(
      appWith(
        JSON.stringify({
          $schema: "./node_modules/lusia/config.schema.json",
          outdir: "out",
          minify: false,
          routes: ["/guide"],
          dev: { port: 4000 },
          lazy: { mode: "all", prefetch: "view" },
          lint: { rules: { "unused-import": "off", "unknown-prop": "error" } },
        }),
      ),
    );
    expect(config).toEqual({
      outdir: "out",
      minify: false,
      routes: ["/guide"],
      dev: { port: 4000 },
      lazy: { mode: "all", prefetch: "view" },
      lint: { rules: { "unused-import": "off", "unknown-prop": "error" } },
    });
  });

  test("a JSON file with animate names loads the values", async () => {
    const config = await readConfig(
      appWith(JSON.stringify({ animate: { duration: 500, midway: { turn: "SMOOTH" } } })),
    );
    expect(config.animate).toEqual(
      animateConfigFromNames({ duration: 500, midway: { turn: "SMOOTH" } }),
    );
  });

  test("a TS file passes the animate values through", async () => {
    const config = await readConfig(
      appWithTs(
        `import { defineConfig } from "${CONFIG_INDEX}";\n` +
          `export default defineConfig({ outdir: "out", animate: { duration: 500, view: { amount: 0.5 } } });\n`,
      ),
    );
    expect(config.outdir).toBe("out");
    expect(config.animate).toMatchObject({ duration: 500, view: { amount: 0.5 } });
  });

  test("a TS file without a default export is rejected", async () => {
    await expect(readConfig(appWithTs("export const animate = {};\n"))).rejects.toThrow(
      "lusia.config.ts: export the config as default",
    );
  });

  test("a TS file and a JSON file together are rejected", async () => {
    const dir = appWith("{}");
    writeFileSync(join(dir, "lusia.config.ts"), "export default {};\n");
    await expect(readConfig(dir)).rejects.toThrow(
      "lusia.config.ts and lusia.config.json both exist, use one config file",
    );
  });

  test("an unknown animate key is rejected with a hint", async () => {
    await expect(readConfig(appWith('{ "animate": { "durtion": 300 } }'))).rejects.toThrow(
      'lusia.config.json: unknown key "durtion" in "animate"',
    );
    await expect(readConfig(appWith('{ "animate": { "durtion": 300 } }'))).rejects.toThrow(
      'Did you mean "duration"?',
    );
  });

  test("a bad animate value is rejected and the message names the file", async () => {
    await expect(
      readConfig(appWith('{ "animate": { "view": { "amount": 1.5 } } }')),
    ).rejects.toThrow(/^lusia\.config\.json: .*amount/);
  });

  test("a bad animate value in a TS file names the TS file", async () => {
    await expect(
      readConfig(appWithTs("export default { animate: { view: { amount: 1.5 } } };\n")),
    ).rejects.toThrow(/^lusia\.config\.ts: .*amount/);
  });
});

describe("config file errors", () => {
  test.each([
    [
      '{ "outdr": "x" }',
      'unknown key "outdr", allowed: $schema, outdir, minify, routes, dev, lazy, lint, format, animate',
    ],
    ['{ "lazy": { "mode": "some" } }', '"lazy.mode" must be one of: smart, all, off'],
    ['{ "lazy": { "prefetch": "soon" } }', '"lazy.prefetch" must be one of: idle, view, none'],
    ['{ "dev": { "port": 70000 } }', '"dev.port" must be a whole number from 0 to 65535'],
    ['{ "dev": { "host": "x" } }', 'unknown key "host" in "dev", allowed: port'],
    ['{ "routes": ["guide"] }', 'invalid route "guide", use a path such as /guide'],
    ['{ "minify": "yes" }', '"minify" must be true or false'],
    ['{ "lint": { "extra": 1 } }', 'unknown key "extra" in "lint", allowed: rules'],
    ['{ "lint": { "rules": [] } }', '"lint.rules" must be an object'],
    [
      '{ "lint": { "rules": { "nope": "warn" } } }',
      'unknown lint rule "nope", allowed: unused-import, props-twice, unknown-prop, empty-expression, style-attribute, animate-keyframes, animate-key, scroll-numeric-line, flow-chain, bind-target',
    ],
    [
      '{ "lint": { "rules": { "unused-import": "info" } } }',
      '"lint.rules.unused-import" must be one of: off, warn, error',
    ],
    ['{ "animate": [] }', '"animate" must be an object'],
    ['{ "animate": { "view": 1 } }', '"animate.view" must be an object'],
    ['{ "animate": { "view": { "amont": 1 } } }', 'unknown key "amont" in "animate.view"'],
    ["[]", "the file must hold a JSON object"],
    ["{ nope", "not valid JSON"],
  ])("%s names the problem", async (text, detail) => {
    await expect(readConfig(appWith(text))).rejects.toThrow(`lusia.config.json: ${detail}`);
  });
});

describe("CLI merge", () => {
  test("the file sets the build options and flags win", async () => {
    const dir = appWith(JSON.stringify({ outdir: "out", minify: false, routes: ["/guide"] }));
    expect(await parseCommand(["build", dir], {})).toMatchObject({
      outdir: join(dir, "out"),
      minify: false,
      routes: ["/guide"],
    });
    expect(
      await parseCommand(["build", dir, "--outdir", "flag", "--routes", "/reference"], {}),
    ).toMatchObject({
      outdir: resolve("flag"),
      routes: ["/reference"],
    });
  });

  test("the file's outdir and the default follow the app folder", async () => {
    const app = appFolder();
    expect(await parseCommand(["build", app], {})).toMatchObject({
      outdir: join(app, "dist"),
    });
    expect(await parseCommand(["build"], {})).toMatchObject({ outdir: resolve("dist") });
  });

  test("the docs app builds into its own folder", async () => {
    const docs = new URL("../../../docs", import.meta.url).pathname;
    expect(await parseCommand(["build", docs], {})).toMatchObject({
      outdir: join(docs, "dist"),
    });
  });

  test("format.indentScriptAndStyle comes from the file", async () => {
    const dir = appWith(JSON.stringify({ format: { indentScriptAndStyle: false } }));
    expect(await parseCommand(["format", dir], {})).toMatchObject({ indentScriptAndStyle: false });
  });

  test("the animate config comes from the file", async () => {
    const dir = appWith(JSON.stringify({ animate: { duration: 500 } }));
    expect(await parseCommand(["build", dir], {})).toMatchObject({
      animate: { duration: 500 },
    });
    expect(await parseCommand(["dev", dir], {})).toMatchObject({
      animate: { duration: 500 },
    });
  });

  test("the lint rules come from the file", async () => {
    const dir = appWith(JSON.stringify({ lint: { rules: { "empty-expression": "off" } } }));
    expect(await parseCommand(["lint", dir], {})).toMatchObject({
      rules: { "empty-expression": "off" },
    });
    expect(await parseCommand(["lint"], {})).toMatchObject({ rules: undefined });
  });

  test("the port comes from the flag, then PORT, then the file, then 3000", async () => {
    const dir = appWith(JSON.stringify({ dev: { port: 4000 } }));
    expect(await parseCommand(["dev", dir], {})).toMatchObject({ port: 4000 });
    expect(await parseCommand(["dev", dir], { PORT: "5000" })).toMatchObject({
      port: 5000,
    });
    expect(await parseCommand(["dev", dir, "--port", "6000"], { PORT: "5000" })).toMatchObject({
      port: 6000,
    });
    expect(await parseCommand(["dev"], {})).toMatchObject({ port: 3000 });
  });
});
