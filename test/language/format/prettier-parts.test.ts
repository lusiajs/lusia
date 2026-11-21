import { describe, expect, test } from "bun:test";
import { prettierParts, type PrettierLike } from "#language/format/prettier-parts.ts";

interface Call {
  code: string;
  options: Record<string, unknown>;
}

function fakePrettier(plugins?: readonly unknown[]): { prettier: PrettierLike; calls: Call[] } {
  const calls: Call[] = [];
  const prettier: PrettierLike = {
    format: async (code, options) => {
      calls.push({ code, options });
      return `${code}\n`;
    },
    plugins,
  };
  return { prettier, calls };
}

describe("prettierParts", () => {
  test("each part formats with its own parser and keeps the config", async () => {
    const { prettier, calls } = fakePrettier();
    const { parts } = prettierParts(async () => prettier, { printWidth: 80 });

    expect(await parts.script("const a = 1;")).toBe("const a = 1;");
    expect(await parts.style(".a { color: red; }", true)).toBe(".a { color: red; }");
    expect(await parts.style(".a { color: red; }", false)).toBe(".a { color: red; }");
    expect(calls.map((call) => [call.options.parser, call.options.printWidth])).toEqual([
      ["typescript", 80],
      ["css", 80],
      ["scss", 80],
    ]);
  });

  test("an empty part is blank and does not load Prettier", async () => {
    let loads = 0;
    const { parts } = prettierParts(async () => {
      loads++;
      return fakePrettier().prettier;
    });

    expect(await parts.script("  \n")).toBe("");
    expect(await parts.style("", false)).toBe("");
    expect(loads).toBe(0);
  });

  test("plugin options only go to Prettier that has plugins", async () => {
    const browser = fakePrettier([{ name: "html" }]);
    const { parts } = prettierParts(async () => browser.prettier);
    await parts.script("const a = 1;");
    expect(browser.calls[0]?.options.plugins).toEqual([{ name: "html" }]);

    const node = fakePrettier();
    const nodeParts = prettierParts(async () => node.prettier).parts;
    await nodeParts.script("const a = 1;");
    expect("plugins" in (node.calls[0]?.options ?? {})).toBe(false);
  });

  test("markup protects expressions and flow tags, then puts them back", async () => {
    const { prettier, calls } = fakePrettier();
    const { parts } = prettierParts(async () => prettier);
    const markup = '<p class="a {name}"><IF when={ok}>Hi {name}</IF></p>';

    expect(await parts.markup(markup)).toBe(markup);
    expect(calls[0]?.options.parser).toBe("html");
    expect(calls[0]?.code).not.toContain("{name}");
    expect(calls[0]?.code).not.toContain("<IF");
  });
});

describe("prettierParts section indent", () => {
  test("uses tabs, the tab width, or nothing", async () => {
    const { prettier } = fakePrettier();
    const load = async () => prettier;
    expect(prettierParts(load, { useTabs: true }).parts.sectionIndent).toBe("\t");
    expect(prettierParts(load, { tabWidth: 4 }).parts.sectionIndent).toBe("    ");
    expect(prettierParts(load, {}).parts.sectionIndent).toBe("  ");
    expect(prettierParts(load, { useTabs: true }, false).parts.sectionIndent).toBe("");
  });
});
