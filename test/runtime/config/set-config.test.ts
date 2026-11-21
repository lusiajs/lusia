import { afterEach, describe, expect, test } from "bun:test";
import { setAnimateConfig } from "#runtime/animate/options/config.ts";
import { clearGlobalConfig, globalConfig } from "#runtime/config/global.ts";
import { setConfig, SCOPE } from "#runtime/config/set-config.ts";
import { APP_SCOPE, inScope, renderingScope, type Scope } from "#runtime/config/scope.ts";
import { resolveConfig } from "#runtime/config/resolve.ts";

afterEach(() => {
  clearGlobalConfig();
  setAnimateConfig({});
});

function thrown(run: () => unknown): { code?: string; message: string; hint?: string } {
  try {
    run();
  } catch (error) {
    return error as { code?: string; message: string; hint?: string };
  }
  throw new Error("expected an error");
}

/** Simulates a component script run: the scope is set while `run` executes. */
function inComponent(run: () => void, scope: Scope = APP_SCOPE): Scope {
  let captured: Scope = scope;
  inScope(scope, () => {
    run();
    captured = renderingScope() ?? scope;
  });
  return captured;
}

describe("setConfig validation", () => {
  test("an unknown top key names the allowed keys", () => {
    const error = thrown(() => setConfig({ speed: 2 } as never, SCOPE.GLOBAL));
    expect(error.code).toBe("L2071");
    expect(error.message).toBe('setConfig has an unknown key "speed", use animate or lazy');
  });

  test("a build-only key says it belongs in lusia.config", () => {
    for (const key of ["outdir", "minify", "routes", "dev", "lint", "format"]) {
      const error = thrown(() => setConfig({ [key]: true } as never, SCOPE.GLOBAL));
      expect(error.code, key).toBe("L2072");
      expect(error.message).toBe(`setConfig key "${key}" is build-only`);
      expect(error.hint).toContain("lusia.config");
    }
  });

  test("lazy.mode is build-only", () => {
    const error = thrown(() => setConfig({ lazy: { mode: "split" } } as never, SCOPE.GLOBAL));
    expect(error.code).toBe("L2072");
    expect(error.message).toBe('setConfig key "lazy.mode" is build-only');
  });

  test("lazy takes only prefetch", () => {
    const error = thrown(() => setConfig({ lazy: { other: 1 } } as never, SCOPE.GLOBAL));
    expect(error.code).toBe("L2073");
    expect(error.message).toBe('setConfig lazy has an unknown key "other", use prefetch');
  });

  test("lazy.prefetch takes idle, view or none", () => {
    expect(() => setConfig({ lazy: { prefetch: "idle" } }, SCOPE.GLOBAL)).not.toThrow();
    const error = thrown(() => setConfig({ lazy: { prefetch: "hover" } } as never, SCOPE.GLOBAL));
    expect(error.code).toBe("L2074");
    expect(error.message).toBe("setConfig lazy.prefetch must be idle, view or none, got hover");
  });

  test("a bad animate value uses the lusia.config animate checks", () => {
    expect(thrown(() => setConfig({ animate: { duraton: 5 } } as never, SCOPE.GLOBAL)).code).toBe(
      "L2066",
    );
    expect(() => setConfig({ animate: { duration: -1 } }, SCOPE.GLOBAL)).toThrow();
    expect(globalConfig()).toEqual({});
  });

  test("a rejected call changes nothing", () => {
    expect(() => setConfig({ animate: { duration: 900 }, speed: 1 } as never, SCOPE.GLOBAL)).toThrow();
    expect(globalConfig()).toEqual({});
  });
});

describe("SCOPED and TREE outside a component script", () => {
  test("TREE throws with the fix", () => {
    const error = thrown(() => setConfig({ animate: { duration: 200 } }));
    expect(error.code).toBe("L2075");
    expect(error.message).toBe("setConfig with SCOPE.TREE must run at the top of a component script");
    expect(error.hint).toContain("SCOPE.GLOBAL inside onAttach");
  });

  test("SCOPED throws and names SCOPE.SCOPED", () => {
    const error = thrown(() => setConfig({ animate: { duration: 200 } }, SCOPE.SCOPED));
    expect(error.code).toBe("L2075");
    expect(error.message).toContain("SCOPE.SCOPED");
  });
});

describe("GLOBAL inside a component script", () => {
  test("throws with the fix", () => {
    const error = thrown(() =>
      inComponent(() => setConfig({ animate: { duration: 200 } }, SCOPE.GLOBAL)),
    );
    expect(error.code).toBe("L2076");
    expect(error.message).toBe(
      "setConfig with SCOPE.GLOBAL cannot run at the top of a component script",
    );
    expect(globalConfig()).toEqual({});
  });
});

describe("TREE and SCOPED inside a component script", () => {
  test("TREE updates the own and inherited layers", () => {
    const scope = inComponent(() => setConfig({ animate: { duration: 200 } }, SCOPE.TREE));
    expect(scope.own.animate?.duration).toBe(200);
    expect(scope.inherited.animate?.duration).toBe(200);
  });

  test("SCOPED updates the own layer only", () => {
    const scope = inComponent(() => setConfig({ animate: { duration: 200 } }, SCOPE.SCOPED));
    expect(scope.own.animate?.duration).toBe(200);
    expect(scope.inherited.animate?.duration).toBeUndefined();
  });

  test("the default reach is TREE", () => {
    const scope = inComponent(() => setConfig({ lazy: { prefetch: "view" } }));
    expect(scope.inherited.lazy?.prefetch).toBe("view");
  });

  test("a child starts from its parent's inherited layers, not the parent's SCOPED ones", () => {
    const parent = inComponent(() => {
      setConfig({ animate: { duration: 200 } }, SCOPE.TREE);
      setConfig({ animate: { delay: 50 } }, SCOPE.SCOPED);
    });
    expect(parent.inherited.animate).toEqual({ duration: 200 });
    expect(parent.own.animate).toEqual({ duration: 200, delay: 50 });
  });
});

describe("resolveConfig order", () => {
  test("lusia.config is the lowest layer, then GLOBAL, then the component scope", () => {
    setAnimateConfig({ duration: 100, delay: 10 });
    setConfig({ animate: { duration: 200 } }, SCOPE.GLOBAL);
    const scope = inComponent(() => setConfig({ animate: { duration: 300 } }, SCOPE.TREE));
    expect(resolveConfig(APP_SCOPE).animate?.duration).toBe(200);
    expect(resolveConfig(scope).animate).toEqual({ duration: 300, delay: 10 });
  });
});
