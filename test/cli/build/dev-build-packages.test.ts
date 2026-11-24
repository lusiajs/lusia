import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { mkdir, mkdtemp, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { openBuildCache } from "#cli/build/build-cache.ts";
import { cacheOf } from "#cli/args/settings.ts";
import { buildDev } from "#cli/build/dev-build.ts";

const REPO = new URL("../../../", import.meta.url).pathname;
const LAZY = { mode: "smart", prefetch: "idle" } as const;

let app: string;

async function writePackage(name: string, value: string): Promise<void> {
  const folder = join(app, "node_modules", name);
  await mkdir(folder, { recursive: true });
  await writeFile(join(folder, "package.json"), JSON.stringify({ name, main: "index.js" }));
  await writeFile(join(folder, "index.js"), `export const value = "${value}";\n`);
}

// The bindings are used, since TypeScript drops an import that nothing uses.
async function writeMain(imports: string[]): Promise<void> {
  const lines = imports.map((name, index) => `import { value as v${index} } from "${name}";`);
  const used = imports.map((_, index) => `v${index}`).join(", ");
  await writeFile(join(app, "main.ts"), `${lines.join("\n")}\nconsole.log(${used});\n`);
}

beforeAll(async () => {
  app = await mkdtemp(join(tmpdir(), "lusia-packages-"));
  await mkdir(join(app, "node_modules"));
  await symlink(REPO, join(app, "node_modules", "lusiajs"), "dir");
  await writeFile(join(app, "bun.lock"), "lock");
  await writeFile(
    join(app, "index.html"),
    '<!doctype html><html><head></head><body><script type="module" src="./main.ts"></script></body></html>\n',
  );
  await writePackage("tiny-pkg", "tiny");
  await writePackage("other-pkg", "other");
  await writeMain(["tiny-pkg"]);
});

afterAll(async () => {
  await rm(app, { recursive: true, force: true });
});

async function develop() {
  return buildDev(app, await openBuildCache(app, "development", cacheOf({}, false)), LAZY);
}

async function htmlText(result: Awaited<ReturnType<typeof develop>>): Promise<string> {
  if (!result.ok) throw new Error(result.messages.join("\n"));
  return result.assets.get("index.html")!.text();
}

describe("buildDev with separate packages", () => {
  test("the first build bundles the package and maps it in the import map", async () => {
    const result = await develop();
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.packagesBundled).toBe(true);
    expect(result.report.packages).toEqual({ status: "bundled", count: 1 });
    const html = await htmlText(result);
    expect(html).toContain('"tiny-pkg":"/__lusia/packages/tiny-pkg.js"');
    expect(result.assets.has("__lusia/packages/tiny-pkg.js")).toBe(true);
  });

  test("the next build reuses the saved bundle", async () => {
    const result = await develop();
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.packagesBundled).toBe(false);
    expect(result.report.packages).toEqual({ status: "cached", count: 1 });
  });

  test("a new package import bundles the packages again", async () => {
    await writeMain(["tiny-pkg", "other-pkg"]);
    const result = await develop();
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.packagesBundled).toBe(true);
    expect(await htmlText(result)).toContain('"other-pkg":"/__lusia/packages/other-pkg.js"');
  });

  test("with packages off, the packages are inline and nothing is mapped", async () => {
    const settings = { styles: true, modules: true, packages: false };
    const result = await buildDev(app, await openBuildCache(app, "development", settings), LAZY);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.report.packages).toBeUndefined();
    expect(await htmlText(result)).not.toContain("/__lusia/packages/");
  });
});
