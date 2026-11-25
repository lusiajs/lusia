import { expect, test } from "bun:test";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { lazyOptionsFor } from "#bun-plugin/children.ts";

test("a specifier that points at the importer is marked as self", () => {
  const dir = mkdtempSync(join(tmpdir(), "lusia-self-"));
  const file = join(dir, "Folder.lusia");
  writeFileSync(file, "<p>x</p>");
  writeFileSync(join(dir, "Card.lusia"), "<p>y</p>");
  const lazy = lazyOptionsFor(file, { mode: "smart", prefetch: "idle" });
  expect(lazy.childOf("./Folder.lusia").self).toBe(true);
  expect(lazy.childOf("./Card.lusia").self).toBeUndefined();
});
