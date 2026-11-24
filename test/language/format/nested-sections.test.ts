import { describe, expect, test } from "bun:test";
import { formatLusia } from "#language/format/format.ts";
import { loadPrettier, partsFor } from "#cli/format/format-parts.ts";

const parts = partsFor(await loadPrettier(), {});

const source = `<div class="tile">
<IF {SCREEN.PHONE}>
<style>
.tile { padding: 8px; }
</style>
<ELSE>
<style>.tile { padding: 24px; }</style>
</IF>
</div>

<style>
.tile { color: red; }
</style>
`;

describe("<style> inside a flow block", () => {
  test("is formatted inside its branch at the branch indent", async () => {
    const formatted = await formatLusia(source, parts);
    expect(formatted).toContain(
      "  <IF {SCREEN.PHONE}>\n    <style>\n      .tile {\n        padding: 8px;\n      }\n    </style>\n  <ELSE>",
    );
    expect(formatted).toContain(
      "    <style>\n      .tile {\n        padding: 24px;\n      }\n    </style>\n  </IF>\n</div>",
    );
  });

  test("a top-level style stays its own block", async () => {
    const formatted = await formatLusia(source, parts);
    expect(formatted).toEndWith("</div>\n\n<style>\n  .tile {\n    color: red;\n  }\n</style>\n");
  });

  test("formatting twice gives the same text", async () => {
    const once = await formatLusia(source, parts);
    expect(await formatLusia(once, parts)).toBe(once);
  });
});
