import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { boundAnimateConfig } from "#runtime/animate/options/config-store.ts";
import { host, mount, resetMounts } from "../dom/fixtures/mount.ts";
import { late } from "./fixtures/late-state.ts";
import LateParent from "./fixtures/LateParent.lusia";
import OverrideParent from "./fixtures/OverrideParent.lusia";
import ScopedParent from "./fixtures/ScopedParent.lusia";
import SlotParent from "./fixtures/SlotParent.lusia";
import TreeParent from "./fixtures/TreeParent.lusia";

afterEach(resetMounts);

// A bound element captures its animate config. Nothing set means the library default, false.
function animateSpaceOf(el: Element | null): boolean {
  return boundAnimateConfig(el!)?.attach?.animateSpace ?? false;
}

describe("animate ATTACH reads animateSpace from the component scope", () => {
  test("TREE: the parent's own markup and a child component both get animateSpace", () => {
    const el = host();
    mount(TreeParent, el);

    expect(animateSpaceOf(el.querySelector(".own"))).toBe(true);
    expect(animateSpaceOf(el.querySelector(".probe"))).toBe(true);
  });

  test("SCOPED: the parent's own markup gets it, a child component does not", () => {
    const el = host();
    mount(ScopedParent, el);

    expect(animateSpaceOf(el.querySelector(".own"))).toBe(true);
    expect(animateSpaceOf(el.querySelector(".probe"))).toBe(false);
  });

  test("a child that sets animateSpace false overrides the parent", () => {
    const el = host();
    mount(OverrideParent, el);

    expect(animateSpaceOf(el.querySelector(".probe"))).toBe(false);
  });

  test("an EACH row and an IF branch added after mount bind with the component scope", () => {
    late.rows.value = [];
    late.show.value = false;
    const el = host();
    mount(LateParent, el);

    late.rows.value = ["a", "b"];
    late.show.value = true;

    const rows = el.querySelectorAll(".row");
    expect(rows.length).toBe(2);
    for (const row of rows) expect(animateSpaceOf(row)).toBe(true);
    expect(animateSpaceOf(el.querySelector(".branch"))).toBe(true);
  });

  test("slot content uses the SCOPED setting of the parent that wrote it, not the child's", () => {
    const el = host();
    mount(SlotParent, el);

    expect(animateSpaceOf(el.querySelector(".slotted"))).toBe(true);
  });
});

beforeEach(() => {
  late.rows.value = [];
  late.show.value = false;
});
