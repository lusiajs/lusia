import { afterEach, describe, expect, test } from "bun:test";
import { attach, type Instance } from "lusiajs";
import { createTarget } from "../cells.ts";
import { on } from "./on.ts";
import { SETTLE_MS } from "./main.ts";
import Toggle from "./Toggle.lusia";

// Small enough to check behaviour quickly. The stress page measures with TOGGLES from main.ts.
const TEST_TOGGLES = 200;

let instance: Instance | null = null;
let target: HTMLElement | null = null;

afterEach(async () => {
  await instance?.detach();
  target?.remove();
  instance = null;
  target = null;
  on.value = false;
});

function mount(): HTMLElement {
  target = createTarget("div");
  instance = attach(Toggle, target);
  return target;
}

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

describe("IF with many toggles", () => {
  test("showing the branch adds the badge, hiding it removes it after the OUT animation", async () => {
    const root = mount();
    on.value = true;
    expect(root.querySelectorAll(".badge").length).toBe(1);

    on.value = false;
    expect(root.querySelectorAll(".badge").length).toBe(1);
    await wait(SETTLE_MS);
    expect(root.querySelectorAll(".badge").length).toBe(0);
  });

  test(`toggling ${TEST_TOGGLES} times leaves no badge once the leaves finish`, async () => {
    const root = mount();
    for (let i = 0; i < TEST_TOGGLES; i++) on.value = !on.value;
    expect(on.value).toBe(false);

    await wait(SETTLE_MS);
    expect(root.querySelectorAll(".badge").length).toBe(0);
  });
});
