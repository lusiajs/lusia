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
  test("a keyframes key that is not a number or ease is unknown", () => {
    const script =
      "const fadeUp = { eas: [EASE.STYLE.QUART, EASE.OUT], 0: { opacity: 0 }, 1: { opacity: 1 } };";
    expect(check(script, "<div animate={fadeUp}>x</div>")).toEqual([{ key: "eas", code: "L2054" }]);
  });

  test("the old default key is reported as renamed to ease", () => {
    const script =
      "const fadeUp = { default: [EASE.STYLE.QUART, EASE.OUT], 0: { opacity: 0 }, 1: { opacity: 1 } };";
    expect(check(script, "<div animate={fadeUp}>x</div>")).toEqual([
      { key: "default", code: "L2083" },
    ]);
  });

  test("valid keyframes keys give nothing", () => {
    const script =
      "const fade = { ease: [EASE.OUT], 0: { opacity: 0 }, 0.5: { opacity: 0.5 }, 1: { opacity: 1 } };";
    expect(check(script, "<div animate={fade}>x</div>")).toEqual([]);
  });

  test("an inline item with a typo in its key is unknown", () => {
    expect(check("", "<div animate={{ play: fade, durtion: 400 }}>x</div>")).toEqual([
      { key: "durtion", code: "L2055" },
    ]);
  });

  test("the keys of options are checked for the trigger in on", () => {
    const markup = "<div animate={{ play: fade, on: ON.VIEW, options: { margn: 40 } }}>x</div>";
    expect(check("", markup)).toEqual([{ key: "margn", code: "L2012" }]);
  });

  test("animateSpace is allowed in options for DETACH", () => {
    const markup =
      "<li animate={{ play: fade, on: ON.DETACH, options: { animateSpace: true } }}>x</li>";
    expect(check("", markup)).toEqual([]);
  });

  test("keys of an array of items are checked one by one", () => {
    const markup = "<div animate={[{ play: a, durtion: 1 }, { play: b, on: ON.HOVER }]}>x</div>";
    expect(check("", markup)).toEqual([{ key: "durtion", code: "L2055" }]);
  });

  test("the play of an item is checked as keyframes", () => {
    const script = "const frames = { 0: { opacity: 0 }, 1: { opacity: 1 }, defualt: [EASE.OUT] };";
    expect(check(script, "<div animate={{ play: frames }}>x</div>")).toEqual([
      { key: "defualt", code: "L2054" },
    ]);
  });

  test("the old item keys style, when and more are not reported as typos", () => {
    expect(check("", "<div animate={{ style: fade, when: ON.VIEW }}>x</div>")).toEqual([]);
  });

  test("a finding points at the key in the source", () => {
    const script = "const fade = { eas: 1, 0: {}, 1: {} };";
    const source = `<script>\n${script}\n</script>\n<div animate={fade}>x</div>`;
    const from = source.indexOf(script);
    const [found] = unknownKeysAt(source, source.indexOf("fade}"), {
      from,
      to: from + script.length,
    });
    expect(found?.offset).toBe(source.indexOf("eas:"));
    expect(found?.values).toMatchObject({ key: "eas", tip: "did you mean 'ease'?" });
  });
});
