import { describe, expect, test } from "bun:test";
import { mergeConfig } from "#runtime/config/merge.ts";
import { EASE } from "#runtime/animate/modes/modes.ts";
import { MIDWAY } from "#runtime/animate/modes/midway-modes.ts";

describe("mergeConfig", () => {
  test("a plain value in the layer replaces the base value", () => {
    expect(mergeConfig({ animate: { duration: 300 } }, { animate: { duration: 200 } })).toEqual({
      animate: { duration: 200 },
    });
  });

  test("a key the layer does not set keeps the base value", () => {
    expect(
      mergeConfig({ animate: { duration: 300, delay: 10 } }, { animate: { duration: 200 } }),
    ).toEqual({ animate: { duration: 200, delay: 10 } });
  });

  test("ease merges per part: a style-only layer keeps the base ease", () => {
    const merged = mergeConfig(
      { animate: { ease: [EASE.STYLE.QUART, EASE.OUT] } },
      { animate: { ease: [EASE.STYLE.CUBIC] } },
    );
    expect(merged.animate?.ease).toEqual([EASE.STYLE.CUBIC, EASE.OUT]);
  });

  test("ease merges per part: an ease-only layer keeps the base style", () => {
    const merged = mergeConfig(
      { animate: { ease: [EASE.STYLE.CUBIC, EASE.IN] } },
      { animate: { ease: [EASE.OUT] } },
    );
    expect(merged.animate?.ease).toEqual([EASE.STYLE.CUBIC, EASE.OUT]);
  });

  test("ease with both parts in the layer replaces both", () => {
    const merged = mergeConfig(
      { animate: { ease: [EASE.STYLE.CUBIC, EASE.IN] } },
      { animate: { ease: [EASE.STYLE.QUAD, EASE.OUT] } },
    );
    expect(merged.animate?.ease).toEqual([EASE.STYLE.QUAD, EASE.OUT]);
  });

  test("ease in the layer alone is taken as it is", () => {
    expect(mergeConfig({}, { animate: { ease: [EASE.IN] } }).animate?.ease).toEqual([EASE.IN]);
  });

  test("nested objects merge per inner key", () => {
    const merged = mergeConfig(
      { animate: { attach: { animateSpace: true }, midway: { play: MIDWAY.SKIP } } },
      { animate: { attach: { animateSpace: false }, midway: { turnDuration: 90 } } },
    );
    expect(merged.animate?.attach).toEqual({ animateSpace: false });
    expect(merged.animate?.midway).toEqual({ play: MIDWAY.SKIP, turnDuration: 90 });
  });

  test("lazy merges per key", () => {
    expect(mergeConfig({ lazy: { prefetch: "idle" } }, { lazy: { prefetch: "view" } })).toEqual({
      lazy: { prefetch: "view" },
    });
    expect(mergeConfig({ lazy: { prefetch: "idle" } }, {})).toEqual({ lazy: { prefetch: "idle" } });
  });

  test("an empty layer returns the base values", () => {
    expect(mergeConfig({ animate: { duration: 300 } }, {})).toEqual({
      animate: { duration: 300 },
    });
  });

  test("does not change either input", () => {
    const base = { animate: { ease: [EASE.STYLE.QUART, EASE.OUT], attach: { a: 1 } } } as const;
    const layer = { animate: { ease: [EASE.STYLE.CUBIC], attach: { b: 2 } } } as const;
    mergeConfig(base as never, layer as never);
    expect(base.animate.ease).toEqual([EASE.STYLE.QUART, EASE.OUT]);
    expect(base.animate.attach).toEqual({ a: 1 });
    expect(layer.animate.ease).toEqual([EASE.STYLE.CUBIC]);
    expect(layer.animate.attach).toEqual({ b: 2 });
  });
});
