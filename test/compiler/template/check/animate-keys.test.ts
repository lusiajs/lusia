import { describe, expect, test } from "bun:test";
import { unknownKeysAt } from "#compiler/template/check/animate-keys.ts";
import type { ScriptRange } from "#compiler/template/check/script-range.ts";

/** A script section holding `script`, with the animate value at the first `{{` or `{name}` of `markup`. */
function check(script: string, markup: string) {
  const source = `<script>\n${script}\n</script>\n${markup}`;
  const from = source.indexOf(script);
  const range: ScriptRange = { from, to: from + script.length };
  const start = source.indexOf("animate={") + "animate={".length;
  return unknownKeysAt(source, start, range).map(({ key, code }) => ({ key, code }));
}

describe("unknownKeysAt", () => {
  test("a keyframes key that is not a number or default is unknown", () => {
    const script =
      "const fadeUp = { defaut: [EASE.STYLE.QUART, EASE.OUT], 0: { opacity: 0 }, 1: { opacity: 1 } };";
    expect(check(script, "<div animate={fadeUp}>x</div>")).toEqual([
      { key: "defaut", code: "L2054" },
    ]);
  });

  test("valid keyframes keys give nothing", () => {
    const script =
      "const fade = { default: [EASE.OUT], 0: { opacity: 0 }, 0.5: { opacity: 0.5 }, 1: { opacity: 1 } };";
    expect(check(script, "<div animate={fade}>x</div>")).toEqual([]);
  });

  test("an inline item with a typo in its key is unknown", () => {
    expect(check("", "<div animate={{ style: fade, durtion: 400 }}>x</div>")).toEqual([
      { key: "durtion", code: "L2055" },
    ]);
  });

  test("the keys of more are checked for the trigger in when", () => {
    const markup = "<div animate={{ style: fade, when: WHEN.VIEW, more: { margn: 40 } }}>x</div>";
    expect(check("", markup)).toEqual([{ key: "margn", code: "L2012" }]);
  });

  test("animateSpace is allowed in more for DETACH", () => {
    const markup =
      "<li animate={{ style: fade, when: WHEN.DETACH, more: { animateSpace: true } }}>x</li>";
    expect(check("", markup)).toEqual([]);
  });

  test("keys of an array of items are checked one by one", () => {
    const markup =
      "<div animate={[{ style: a, durtion: 1 }, { style: b, when: WHEN.HOVER }]}>x</div>";
    expect(check("", markup)).toEqual([{ key: "durtion", code: "L2055" }]);
  });

  test("the style of an item is checked as keyframes", () => {
    const script = "const frames = { 0: { opacity: 0 }, 1: { opacity: 1 }, defualt: [EASE.OUT] };";
    expect(check(script, "<div animate={{ style: frames }}>x</div>")).toEqual([
      { key: "defualt", code: "L2054" },
    ]);
  });

  test("a finding points at the key in the source", () => {
    const script = "const fade = { defaut: 1, 0: {}, 1: {} };";
    const source = `<script>\n${script}\n</script>\n<div animate={fade}>x</div>`;
    const from = source.indexOf(script);
    const [found] = unknownKeysAt(source, source.indexOf("fade}"), {
      from,
      to: from + script.length,
    });
    expect(found?.offset).toBe(source.indexOf("defaut"));
    expect(found?.values).toMatchObject({ key: "defaut", tip: "did you mean 'default'?" });
  });
});
