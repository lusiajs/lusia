import { describe, expect, test } from "bun:test";
import { relative } from "node:path";
import { compile } from "#compiler/index.ts";

const FILE = `${process.cwd()}/test/compiler/Dim.lusia`;
const WHERE = relative(process.cwd(), FILE);

describe("<head> option", () => {
  test("a component with a head passes it as the head option", () => {
    const { code } = compile("<head><title>{a}</title></head>\n<p>x</p>", FILE);
    expect(code).toContain("__host.head = ");
    expect(code).toContain("function __renderHead(");
    expect(code).toContain('export default __defineComponent("');
    expect(code).toMatch(/__render, \{ head: __renderHead \}\);/);
  });

  test("a component without a head has no head option", () => {
    const { code } = compile("<p>x</p>", FILE);
    expect(code).not.toContain("__renderHead");
    expect(code).toMatch(/__render\);$/m);
  });
});

describe("compile dev option", () => {
  test("dev keeps a source map that points at the .lusia file", () => {
    const { code, map } = compile("<script>\nlet a = 1;\n</script>\n<p>{a}</p>", FILE, {
      dev: true,
    });
    expect(JSON.parse(map).sources).toEqual([FILE]);
    expect(code).toContain("__unwrap((a))");
    expect(code).not.toContain("/*@");
  });

  test("without dev the code has no location strings", () => {
    const { code } = compile("<script>\nlet a = 1;\n</script>\n<p>{a}</p>", FILE);
    expect(code).toContain("__unwrap((a))");
    expect(code).not.toContain("Dim.lusia:");
  });

  test("dev registers the component and wraps its variables for hot swap", () => {
    const { code } = compile(
      "<script>\nconst count = variable(0);\n</script>\n<p>{count}</p>",
      FILE,
      {
        dev: true,
      },
    );
    expect(code).toContain('__hotVariable("count", variable(0))');
    expect(code).toContain(`export default __hotComponent("`);
    expect(code).toContain('} from "lusiajs/internal";');
  });

  test("prod output has no hot code", () => {
    const { code } = compile(
      "<script>\nconst count = variable(0);\n</script>\n<p>{count}</p>",
      FILE,
    );
    expect(code).not.toContain("__hot");
    expect(code).not.toContain("hotComponent");
    expect(code).not.toContain("hotVariable");
    expect(code).toContain("const count = variable(0);");
    expect(code).toContain(`export default __defineComponent("`);
  });

  test("dev passes the animate location as the last argument of __animate", () => {
    const { code } = compile(
      "<script>\nconst fade = 1;\n</script>\n<div animate={fade}>x</div>",
      FILE,
      { dev: true },
    );
    const call = /__animate\(.*, "([^"]+)"\);/.exec(code);
    expect(call?.[1]).toBe(`${WHERE}:4:15`);
  });

  test("dev gives the location of a bad keyframes key in the script", () => {
    const source =
      "<script>\nconst fadeUp = { defaut: 1, 0: {}, 1: {} };\n</script>\n<div animate={fadeUp}>x</div>";
    const { code } = compile(source, FILE, { dev: true });
    expect(code).toContain(`{ "defaut": "${WHERE}:2:18" }`);
  });

  test("without dev no key locations are generated", () => {
    const source =
      "<script>\nconst fadeUp = { defaut: 1, 0: {}, 1: {} };\n</script>\n<div animate={fadeUp}>x</div>";
    expect(compile(source, FILE).code).not.toContain('defaut": "');
  });
});
