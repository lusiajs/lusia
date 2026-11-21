import { afterEach, describe, expect, test } from "bun:test";
import { boundAnimateConfig } from "#runtime/animate/options/config-store.ts";
import { clearGlobalConfig } from "#runtime/config/global.ts";
import { SCOPE, setConfig } from "#runtime/config/set-config.ts";
import { host, mount, resetMounts } from "../dom/fixtures/mount.ts";
import GlobalOnAttach from "./fixtures/GlobalOnAttach.lusia";
import GlobalTopLevel from "./fixtures/GlobalTopLevel.lusia";
import Probe from "./fixtures/Probe.lusia";
import TreeInAttach from "./fixtures/TreeInAttach.lusia";

afterEach(() => {
  resetMounts();
  clearGlobalConfig();
});

function animateSpaceOf(el: Element | null): boolean {
  return boundAnimateConfig(el!)?.attach?.animateSpace ?? false;
}

function thrown(run: () => unknown): { code?: string } {
  try {
    run();
  } catch (error) {
    return error as { code?: string };
  }
  throw new Error("expected an error");
}

describe("SCOPE.GLOBAL from onAttach", () => {
  test("affects elements bound afterwards", () => {
    mount(GlobalOnAttach, host());

    const el = host();
    mount(Probe, el);

    expect(animateSpaceOf(el.querySelector(".probe"))).toBe(true);
  });

  test("at the top of a script it throws L2076", () => {
    const error = thrown(() => mount(GlobalTopLevel, host()));

    expect(error.code).toBe("L2076");
  });
});

describe("setConfig reach errors", () => {
  test("TREE inside onAttach throws L2075", () => {
    const error = thrown(() => mount(TreeInAttach, host()));

    expect(error.code).toBe("L2075");
  });

  test("an unknown reach throws L2077", () => {
    const error = thrown(() => setConfig({}, "nearby" as never));

    expect(error.code).toBe("L2077");
  });
});

describe("the scope is fixed at bind", () => {
  test("changing global config does not change an element already bound", () => {
    setConfig({ animate: { attach: { animateSpace: true } } }, SCOPE.GLOBAL);
    const first = host();
    mount(Probe, first);

    setConfig({ animate: { attach: { animateSpace: false } } }, SCOPE.GLOBAL);
    const second = host();
    mount(Probe, second);

    expect(animateSpaceOf(first.querySelector(".probe"))).toBe(true);
    expect(animateSpaceOf(second.querySelector(".probe"))).toBe(false);
  });
});
