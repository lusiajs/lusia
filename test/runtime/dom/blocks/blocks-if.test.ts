import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { bindIf } from "#runtime/dom/blocks/if.ts";
import { TEXT_MARKER } from "#runtime/markers.ts";
import { variable } from "#runtime/variable/variable.ts";
import Branches from "../fixtures/Branches.lusia";
import { resetVariable, state } from "../fixtures/state.ts";
import { host, mount, resetMounts, unmount } from "../fixtures/mount.ts";

beforeEach(resetVariable);
afterEach(resetMounts);

function labels(root: ParentNode): string[] {
  return [...root.querySelectorAll(".branch")].map((el) => el.textContent ?? "");
}

describe("IF, ELSEIF and ELSE", () => {
  test("shows the first branch whose test is true", () => {
    const el = host();
    mount(Branches, el);
    expect(labels(el)).toEqual(["A"]);

    state.mode.value = "b";
    expect(labels(el)).toEqual(["B"]);

    state.mode.value = "c";
    expect(labels(el)).toEqual(["other"]);
  });

  test("removes the old branch nodes when switching", () => {
    const el = host();
    mount(Branches, el);
    state.mode.value = "b";
    expect(el.querySelectorAll("p").length).toBe(1);
  });

  test("detaching removes the shown branch", () => {
    const el = host();
    const instance = mount(Branches, el);
    unmount(instance);
    expect(el.childNodes.length).toBe(0);
  });

  test("a block with no true branch shows nothing", () => {
    const marker = document.createComment(TEXT_MARKER);
    const parent = document.createElement("div");
    parent.append(marker);
    const cond = variable(false);
    const cleanups: Array<() => void> = [];
    bindIf(
      marker,
      [{ test: () => cond.value, render: () => document.createDocumentFragment() }],
      cleanups,
      [],
    );
    expect(parent.childNodes.length).toBe(1);
    for (const cleanup of cleanups) cleanup();
  });
});

describe("IF leave animations", () => {
  test("the old branch is removed only after its leave finishes", async () => {
    const marker = document.createComment(TEXT_MARKER);
    const parent = document.createElement("div");
    parent.append(marker);
    const mode = variable("a");
    let finishOld!: () => void;
    const oldLeave = new Promise<void>((resolve) => (finishOld = resolve));
    const cleanups: Array<() => void> = [];
    const leaves: Array<() => Promise<void>> = [];

    bindIf(
      marker,
      [
        {
          test: () => mode.value === "a",
          render: (_cleanups, branchLeaves) => {
            const fragment = document.createDocumentFragment();
            fragment.append(document.createElement("i"));
            branchLeaves.push(() => oldLeave);
            return fragment;
          },
        },
        {
          render: () => {
            const f = document.createDocumentFragment();
            f.append(document.createElement("b"));
            return f;
          },
        },
      ],
      cleanups,
      leaves,
    );

    mode.value = "b";
    expect(parent.querySelector("i")).not.toBeNull();
    expect(parent.querySelector("b")).not.toBeNull();

    finishOld();
    await oldLeave;
    await Promise.resolve();
    expect(parent.querySelector("i")).toBeNull();
    expect(parent.querySelector("b")).not.toBeNull();

    for (const cleanup of cleanups) cleanup();
  });

  test("a parent's detach waits for the shown branch's leave", async () => {
    const marker = document.createComment(TEXT_MARKER);
    const parent = document.createElement("div");
    parent.append(marker);
    let finish!: () => void;
    const pending = new Promise<void>((resolve) => (finish = resolve));
    const cleanups: Array<() => void> = [];
    const leaves: Array<() => Promise<void>> = [];
    bindIf(
      marker,
      [
        {
          render: (_cleanups, branchLeaves) => {
            const fragment = document.createDocumentFragment();
            fragment.append(document.createElement("i"));
            branchLeaves.push(() => pending);
            return fragment;
          },
        },
      ],
      cleanups,
      leaves,
    );

    let done = false;
    const detached = Promise.all(leaves.map((leave) => leave())).then(() => (done = true));
    await Promise.resolve();
    expect(done).toBe(false);
    finish();
    await detached;
    expect(done).toBe(true);
    for (const cleanup of cleanups) cleanup();
  });
});
