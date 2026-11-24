import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { bindEach, type RowRender } from "#runtime/dom/blocks/each.ts";
import { TEXT_MARKER } from "#runtime/markers.ts";
import { variable, type Variable } from "#runtime/variable/variable.ts";
import Groups from "../fixtures/Groups.lusia";
import Rows from "../fixtures/Rows.lusia";
import UpdateRows from "../fixtures/UpdateRows.lusia";
import { resetVariable, state, type Item } from "../fixtures/state.ts";
import { resetUpdateState, updateState, type Row } from "../fixtures/update-state.ts";
import { click, host, mount, resetMounts, unmount } from "../fixtures/mount.ts";

beforeEach(resetVariable);
afterEach(resetMounts);

function items(...titles: string[]): Item[] {
  return titles.map((title, id) => ({ id: id + 1, title }));
}

function rowTexts(root: ParentNode): string[] {
  return [...root.querySelectorAll(".row")].map((el) => el.textContent ?? "");
}

function textRow(indexed: boolean): RowRender {
  return (item, index, cleanups) => {
    const fragment = document.createDocumentFragment();
    const li = document.createElement("li");
    li.textContent = String((item.peek() as Item).title);
    fragment.append(li);
    if (index) {
      const marker = document.createTextNode("");
      fragment.append(marker);
      cleanups.push(() => marker.remove());
    }
    return fragment;
  };
}

describe("EACH in a component", () => {
  test("renders one row per item with its index", () => {
    const el = host();
    state.items.value = items("a", "b");
    mount(Rows, el);
    expect(rowTexts(el)).toEqual(["0:a", "1:b"]);
  });

  test("adding and removing items keeps the other rows", () => {
    const el = host();
    const list = items("a", "b", "c");
    state.items.value = list;
    mount(Rows, el);
    const [first, , third] = el.querySelectorAll(".row");

    state.items.value = [list[0]!, list[2]!];
    expect(rowTexts(el)).toEqual(["0:a", "1:c"]);
    expect(el.querySelectorAll(".row")[0]).toBe(first!);
    expect(el.querySelectorAll(".row")[1]).toBe(third!);

    state.items.value = [{ id: 9, title: "z" }, list[0]!, list[2]!];
    expect(rowTexts(el)).toEqual(["0:z", "1:a", "2:c"]);
  });

  test("reversing keeps the same row nodes and updates their index", () => {
    const el = host();
    const list = items("a", "b", "c", "d");
    state.items.value = list;
    mount(Rows, el);
    const before = [...el.querySelectorAll(".row")];

    state.items.value = [...list].reverse();
    expect(rowTexts(el)).toEqual(["0:d", "1:c", "2:b", "3:a"]);
    const after = [...el.querySelectorAll(".row")];
    expect(after).toEqual([before[3]!, before[2]!, before[1]!, before[0]!]);
  });

  test("a row whose key has a new object is kept and shows the new item", () => {
    const el = host();
    state.items.value = items("a");
    mount(Rows, el);
    const before = el.querySelector(".row");

    state.items.value = [{ id: 1, title: "renamed" }];
    expect(rowTexts(el)).toEqual(["0:renamed"]);
    expect(el.querySelector(".row")).toBe(before!);
  });

  test("clicking a row reads its item", () => {
    const el = host();
    state.items.value = items("a", "b");
    mount(Rows, el);
    (el.querySelectorAll(".row")[1] as HTMLElement).dispatchEvent(new Event("click"));
    expect(state.picked.value).toBe(2);
  });

  test("detaching removes every row", () => {
    const el = host();
    state.items.value = items("a", "b");
    const instance = mount(Rows, el);
    unmount(instance);
    expect(el.querySelectorAll(".row").length).toBe(0);
    expect(el.childNodes.length).toBe(0);
  });

  test("nested EACH, IF and a component work together", () => {
    const el = host();
    state.groups.value = [
      { name: "x", open: true, items: ["one", "two"] },
      { name: "y", open: false, items: ["hidden"] },
    ];
    mount(Groups, el);
    expect(el.querySelectorAll(".group").length).toBe(2);
    expect([...el.querySelectorAll(".tag")].map((t) => t.textContent)).toEqual(["one", "two"]);

    state.groups.value = [{ name: "y", open: true, items: ["hidden"] }];
    expect([...el.querySelectorAll(".tag")].map((t) => t.textContent)).toEqual(["hidden"]);
  });
});

describe("EACH rows updated by a new item object", () => {
  beforeEach(resetUpdateState);

  function row(id: number, title: string, tags: string[] = [], done = false): Row {
    return { id, title, tags, done };
  }

  function names(root: ParentNode): string[] {
    return [...root.querySelectorAll(".name")].map((el) => el.textContent ?? "");
  }

  test("the same key keeps the row element and updates text and attributes", () => {
    const el = host();
    updateState.rows.value = [row(1, "a")];
    mount(UpdateRows, el);
    const before = el.querySelector<HTMLElement>(".row");

    updateState.rows.value = [row(1, "b")];
    const after = el.querySelector<HTMLElement>(".row")!;
    expect(after).toBe(before!);
    expect(names(el)).toEqual(["b"]);
    expect(after.getAttribute("title")).toBe("b");
  });

  test("a child component is not created again and gets the new prop", () => {
    const el = host();
    updateState.rows.value = [row(1, "a")];
    mount(UpdateRows, el);

    updateState.rows.value = [row(1, "b")];
    expect(updateState.attaches.peek()).toBe(1);
    expect(el.querySelector(".stamp")!.textContent).toBe("b");
  });

  test("a click handler reports the new title after the item updates", () => {
    const el = host();
    updateState.rows.value = [row(1, "a")];
    mount(UpdateRows, el);

    updateState.rows.value = [row(1, "b")];
    click(el, ".row");
    expect(updateState.picked.peek()).toBe("b");
  });

  test("a nested EACH follows updates of the outer and the inner item", () => {
    const el = host();
    updateState.rows.value = [row(1, "a", ["x", "y"])];
    mount(UpdateRows, el);
    const nestedText = () => [...el.querySelectorAll(".nested")].map((n) => n.textContent);
    expect(nestedText()).toEqual(["a/x", "a/y"]);

    updateState.rows.value = [row(1, "b", ["x", "y"])];
    expect(nestedText()).toEqual(["b/x", "b/y"]);

    updateState.rows.value = [row(1, "b", ["z"])];
    expect(nestedText()).toEqual(["b/z"]);
  });

  test("an expression with a same-name local still works and updates", () => {
    const el = host();
    updateState.rows.value = [row(1, "a", ["x", "y"])];
    mount(UpdateRows, el);
    expect(el.querySelector(".upper")!.textContent).toBe("X,Y");

    updateState.rows.value = [row(1, "a", ["z"])];
    expect(el.querySelector(".upper")!.textContent).toBe("Z");
  });

  test("an IF test that reads the item flips when the item updates", () => {
    const el = host();
    updateState.rows.value = [row(1, "a", [], false)];
    mount(UpdateRows, el);
    expect(el.querySelector(".done")).toBeNull();

    updateState.rows.value = [row(1, "a", [], true)];
    expect(el.querySelector(".done")).not.toBeNull();

    updateState.rows.value = [row(1, "a", [], false)];
    expect(el.querySelector(".done")).toBeNull();
  });

  test("removal and reorder by key move rows and drop the removed one", () => {
    const el = host();
    updateState.rows.value = [row(1, "a"), row(2, "b"), row(3, "c")];
    mount(UpdateRows, el);
    const [first, , third] = el.querySelectorAll(".row");

    updateState.rows.value = [row(3, "c"), row(1, "a2")];
    expect(names(el)).toEqual(["c", "a2"]);
    const after = el.querySelectorAll(".row");
    expect(after[0]).toBe(third!);
    expect(after[1]).toBe(first!);
  });
});

describe("EACH runtime", () => {
  test("duplicate keys are an error", () => {
    const marker = document.createComment(TEXT_MARKER);
    document.createElement("ul").append(marker);
    const list = variable([1, 1]);
    const cleanups: Array<() => void> = [];
    const render: RowRender = () => document.createDocumentFragment();
    expect(() =>
      bindEach(marker, { read: () => list.value, render, indexed: false }, cleanups, []),
    ).toThrow("EACH keys must be unique, but 1 appears twice");
  });

  test("a removed row waits for its leave before its nodes go", async () => {
    const parent = document.createElement("ul");
    const marker = document.createComment(TEXT_MARKER);
    parent.append(marker);
    const list = variable(["a", "b"]);
    const release = new Map<string, () => void>();
    const render: RowRender = (item, _index, _cleanups, leaves) => {
      const fragment = document.createDocumentFragment();
      const li = document.createElement("li");
      li.textContent = String(item.peek());
      fragment.append(li);
      leaves.push(() => new Promise<void>((resolve) => release.set(String(item.peek()), resolve)));
      return fragment;
    };
    const cleanups: Array<() => void> = [];
    bindEach(marker, { read: () => list.value, render, indexed: false }, cleanups, []);

    list.value = ["b"];
    expect(parent.querySelectorAll("li").length).toBe(2);

    release.get("a")!();
    await Promise.resolve();
    await Promise.resolve();
    expect([...parent.querySelectorAll("li")].map((li) => li.textContent)).toEqual(["b"]);
    for (const cleanup of cleanups) cleanup();
  });

  test("an index variable is only created when the row asks for it", () => {
    const parent = document.createElement("ul");
    const marker = document.createComment(TEXT_MARKER);
    parent.append(marker);
    const seen: Array<Variable<number> | undefined> = [];
    const render: RowRender = (item, index, cleanups) => {
      seen.push(index);
      return textRow(index !== undefined)(item, index, cleanups, []);
    };
    const cleanups: Array<() => void> = [];
    bindEach(marker, { read: () => ["a"], render, indexed: false }, cleanups, []);
    expect(seen).toEqual([undefined]);
    for (const cleanup of cleanups) cleanup();
  });

  describe("a row with a pending leave", () => {
    const pendingLeaveRow: RowRender = (item, _index, _cleanups, leaves) => {
      const fragment = document.createDocumentFragment();
      const li = document.createElement("li");
      li.textContent = String(item.peek());
      fragment.append(li);
      leaves.push(() => new Promise<void>(() => {}));
      return fragment;
    };

    function listTexts(parent: ParentNode): string[] {
      return [...parent.querySelectorAll("li")].map((li) => li.textContent ?? "");
    }

    test("the leaving row stays between the kept rows", () => {
      const parent = document.createElement("ul");
      const marker = document.createComment(TEXT_MARKER);
      parent.append(marker);
      const list = variable(["a", "b", "c"]);
      const cleanups: Array<() => void> = [];
      bindEach(
        marker,
        { read: () => list.value, render: pendingLeaveRow, indexed: false },
        cleanups,
        [],
      );
      const [first, second, third] = parent.querySelectorAll("li");

      list.value = ["a", "c"];
      expect(listTexts(parent)).toEqual(["a", "b", "c"]);
      const after = parent.querySelectorAll("li");
      expect(after[0]).toBe(first!);
      expect(after[1]).toBe(second!);
      expect(after[2]).toBe(third!);
      for (const cleanup of cleanups) cleanup();
    });

    test("a new row goes after the last kept row, past the leaving row", () => {
      const parent = document.createElement("ul");
      const marker = document.createComment(TEXT_MARKER);
      parent.append(marker);
      const list = variable(["a", "b", "c"]);
      const cleanups: Array<() => void> = [];
      bindEach(
        marker,
        { read: () => list.value, render: pendingLeaveRow, indexed: false },
        cleanups,
        [],
      );
      list.value = ["a", "c"];

      list.value = ["a", "c", "d"];
      expect(listTexts(parent)).toEqual(["a", "b", "c", "d"]);
      for (const cleanup of cleanups) cleanup();
    });
  });
});
