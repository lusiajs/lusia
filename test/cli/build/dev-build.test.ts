import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { cp, mkdir, mkdtemp, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { buildDev } from "#cli/build/dev-build.ts";
import { chooseUpdate, RELOAD } from "#cli/dev/update.ts";

const FIXTURE = new URL("../fixtures/app", import.meta.url).pathname;
const REPO = new URL("../../../", import.meta.url).pathname;
const BROKEN_GREETING = [
  "<script>",
  'import { ACTIVE } from "lusiajs";',
  "console.log(ACTIVE);",
  "</script>",
  "<p>x</p>",
  "",
].join("\n");

let workRoot: string;
let broken: string;

beforeAll(async () => {
  workRoot = await mkdtemp(join(tmpdir(), "lusia-dev-build-"));
  broken = join(workRoot, "broken");
  await cp(FIXTURE, broken, {
    recursive: true,
    filter: (source) => !source.includes("node_modules"),
  });
  await mkdir(join(broken, "node_modules"));
  await symlink(REPO, join(broken, "node_modules", "lusiajs"), "dir");
  await writeFile(join(broken, "src/Greeting.lusia"), BROKEN_GREETING);
});

afterAll(async () => {
  await rm(workRoot, { recursive: true, force: true });
});

describe("buildDev", () => {
  test("a failed build gives one formatted message with the location, code, hint and summary", async () => {
    const result = await buildDev(broken, { mode: "smart", prefetch: "idle" });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.messages).toHaveLength(1);
    const text = result.messages[0]!;
    expect(text).toContain(
      'Greeting.lusia:2:10 - error L3001: "ACTIVE" is not exported by "lusiajs"',
    );
    expect(text).toContain("hint: ACTIVE was renamed to ON.");
    expect(text).toContain("Build failed: 1 error");
  });
});

describe("buildDev changes", () => {
  let app: string;
  let GREETING: string;

  beforeAll(async () => {
    GREETING = await Bun.file(join(FIXTURE, "src/Greeting.lusia")).text();
    app = await mkdtemp(join(tmpdir(), "lusia-dev-changes-"));
    await cp(FIXTURE, app, {
      recursive: true,
      filter: (source) => !source.includes("node_modules"),
    });
    await mkdir(join(app, "node_modules"));
    await symlink(REPO, join(app, "node_modules", "lusiajs"), "dir");
  });

  afterAll(async () => {
    await rm(app, { recursive: true, force: true });
  });

  test("a style-only edit is a css update, and the build reports its steps", async () => {
    expect((await buildDev(app, { mode: "smart", prefetch: "idle" })).ok).toBe(true);
    await writeFile(join(app, "src/Greeting.lusia"), GREETING.replace("rebeccapurple", "tomato"));
    const result = await buildDev(app, { mode: "smart", prefetch: "idle" });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.changes).toEqual([
      expect.objectContaining({ kind: "style", css: expect.stringContaining("tomato") }),
    ]);
    expect(chooseUpdate(["src/Greeting.lusia"], result.changes)).toMatchObject({ kind: "styles" });
    expect(result.steps.bundle).toBeGreaterThanOrEqual(0);
    expect(result.steps.compile).toBeDefined();
  });

  test("a script edit is a code change, so the component is hot swapped", async () => {
    await writeFile(
      join(app, "src/Greeting.lusia"),
      GREETING.replace("Hello from the fixture", "Changed text"),
    );
    const result = await buildDev(app, { mode: "smart", prefetch: "idle" });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.changes).toEqual([expect.objectContaining({ kind: "code" })]);
    expect(chooseUpdate(["src/Greeting.lusia"], result.changes)).toMatchObject({
      kind: "hot",
      paths: [expect.stringContaining("Greeting.lusia")],
    });
  });

  test("a change to a plain .ts file still reloads the page", () => {
    expect(chooseUpdate(["src/main.ts"], [])).toBe(RELOAD);
  });
});
