import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { settledRenders } from "#runtime/internal.ts";
import { holdRender } from "#runtime/ssr/hold.ts";
import SkipPage from "../dom/fixtures/SkipPage.lusia";
import { host, mount, resetMounts } from "../dom/fixtures/mount.ts";

function setServerRender(on: boolean): void {
  (globalThis as { __LUSIA_SSR__?: boolean }).__LUSIA_SSR__ = on;
}

beforeEach(() => setServerRender(false));

afterEach(() => {
  setServerRender(false);
  resetMounts();
});

describe("<NO_SSR /> on the server", () => {
  test("renders its FALLBACK and not its body", () => {
    setServerRender(true);
    const el = host();
    mount(SkipPage, el);
    expect(el.textContent).toContain("loading");
    expect(el.textContent).not.toContain("editor body");
  });

  test("renders the body in the browser", () => {
    const el = host();
    mount(SkipPage, el);
    expect(el.textContent).toContain("editor body");
    expect(el.textContent).not.toContain("loading");
  });
});

describe("holdRender", () => {
  test("settledRenders waits for a held load, and for loads it starts", async () => {
    const order: string[] = [];
    holdRender(
      new Promise<void>((resolve) =>
        setTimeout(() => {
          order.push("first");
          holdRender(Promise.resolve().then(() => order.push("second")));
          resolve();
        }, 5),
      ),
    );
    await settledRenders();
    expect(order).toEqual(["first", "second"]);
  });
});
