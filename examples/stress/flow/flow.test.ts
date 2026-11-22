import { afterEach, describe, expect, test } from "bun:test";
import { attach, type Instance } from "lusiajs";
import { createTarget } from "../cells.ts";
import { CHAIN_STATES, setChain } from "./chain.ts";
import { CHAIN_BATCH, CHAIN_SWITCHES, chainMatches } from "./chain-run.ts";
import Chain from "./Chain.lusia";
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

describe("IF chain with nested chains", () => {
  let root: HTMLElement | null = null;
  let chain: Instance | null = null;

  afterEach(() => {
    chain?.detach();
    root?.remove();
    chain = null;
    root = null;
    setChain(0);
  });

  test("every flag combination shows exactly its leaves", () => {
    root = createTarget("div");
    chain = attach(Chain, root);
    for (let step = 0; step < CHAIN_STATES; step++) {
      setChain(step);
      expect(chainMatches(root)).toBe(true);
    }
  });

  test(`${CHAIN_SWITCHES} switches keep the DOM right in every batch`, () => {
    root = createTarget("div");
    chain = attach(Chain, root);
    for (let start = 0; start < CHAIN_SWITCHES; start += CHAIN_BATCH) {
      for (let step = start; step < start + CHAIN_BATCH; step++) setChain(step);
      expect(chainMatches(root)).toBe(true);
    }
  });

  test("detaching removes every element the chain made", () => {
    root = createTarget("div");
    chain = attach(Chain, root);
    setChain(5);
    chain.detach();
    chain = null;
    expect(root.querySelectorAll("*").length).toBe(0);
  });
});
