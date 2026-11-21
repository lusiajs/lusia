import { afterEach, describe, expect, test } from "bun:test";
import { compile } from "lusiajs/compiler";
import { host, mount, resetMounts } from "../fixtures/mount.ts";
import Child from "./fixtures/Child.lusia";
import Host from "./fixtures/Host.lusia";
import Other from "./fixtures/Other.lusia";
import Parent from "./fixtures/Parent.lusia";
import Plain from "./fixtures/Plain.lusia";

afterEach(resetMounts);

async function idOf(name: string): Promise<string> {
  const file = new URL(`./fixtures/${name}.lusia`, import.meta.url).pathname;
  return compile(await Bun.file(file).text(), file).id;
}

function classesOf(root: ParentNode, selector: string): string[] {
  return [...root.querySelector(selector)!.classList];
}

const PARENT = await idOf("Parent");
const CHILD = await idOf("Child");
const LEAF = await idOf("Leaf");
const OTHER = await idOf("Other");
const scoped = (id: string) => `_l${id}`;
const tree = (id: string) => `_t${id}`;

describe("own elements", () => {
  test("carry the scoped and tree classes of their component", () => {
    const root = mount(Parent).root;
    expect(classesOf(root, ".own")).toEqual(expect.arrayContaining([scoped(PARENT), tree(PARENT)]));
  });

  test("keep the data-l root attribute out of the markup", () => {
    const root = mount(Parent).root;
    expect(root.querySelector(".own")!.hasAttribute("data-l")).toBe(false);
  });

  test("a component without styles adds no classes", () => {
    const root = mount(Plain).root;
    expect(classesOf(root, ".plain")).toEqual(["plain"]);
  });
});

describe("child components", () => {
  test("the child root carries the parent tree class but not the parent scoped class", () => {
    const root = mount(Parent).root;
    const classes = classesOf(root, ".child");
    expect(classes).toContain(tree(PARENT));
    expect(classes).not.toContain(scoped(PARENT));
    expect(classes).toContain(tree(CHILD));
  });

  test("a grandchild carries both ancestor tree classes and its own", () => {
    const root = mount(Parent).root;
    const classes = classesOf(root, ".leaf");
    expect(classes).toEqual(expect.arrayContaining([tree(PARENT), tree(CHILD), tree(LEAF)]));
    expect(classes).not.toContain(scoped(PARENT));
  });

  test("a component without styles passes the tree classes through", () => {
    const root = mount(Parent).root;
    expect(classesOf(root, ".plain").sort()).toEqual(["plain", tree(PARENT), tree(CHILD)].sort());
  });

  test("a dynamic class keeps the inherited tree classes", () => {
    const root = mount(Parent).root;
    const classes = classesOf(root, ".tone");
    expect(classes).toEqual(expect.arrayContaining(["tone", "warm", tree(PARENT), tree(CHILD)]));
  });
});

describe("slot content and html", () => {
  test("slot content belongs to the parent, so it carries the parent's classes only", () => {
    const root = mount(Parent).root;
    const classes = classesOf(root, ".slot-item");
    expect(classes).toEqual(expect.arrayContaining([scoped(PARENT), tree(PARENT)]));
    expect(classes).not.toContain(tree(CHILD));
  });

  test("html inserted by a binding gets the owner's classes", () => {
    const root = mount(Parent).root;
    expect(classesOf(root, ".raw")).toEqual(expect.arrayContaining([scoped(PARENT), tree(PARENT)]));
  });
});

describe("one child under two parents", () => {
  test("each parent chain reaches the child on its own", () => {
    const root = mount(Parent).root;
    const otherRoot = mount(Other).root;
    expect(classesOf(root, ".child")).toContain(tree(PARENT));
    expect(classesOf(root, ".child")).not.toContain(tree(OTHER));
    expect(classesOf(otherRoot, ".child")).toContain(tree(OTHER));
    expect(classesOf(otherRoot, ".child")).not.toContain(tree(PARENT));
  });

  test("mounting the same parent again gives the same classes", () => {
    const first = mount(Parent).root;
    const second = mount(Parent).root;
    expect(classesOf(second, ".child")).toEqual(classesOf(first, ".child"));
  });
});

describe("attach", () => {
  test("a component attached into a styled element inherits its tree classes", async () => {
    const HOST = await idOf("Host");
    const root = mount(Host).root;
    expect(classesOf(root, ".child")).toEqual(expect.arrayContaining([tree(HOST), tree(CHILD)]));
    expect(classesOf(root, ".leaf")).toEqual(expect.arrayContaining([tree(HOST), tree(LEAF)]));
    expect(classesOf(root, ".child")).not.toContain(scoped(HOST));
  });

  test("only real tree classes of the target are inherited, not user classes", async () => {
    const PARENT_ID = await idOf("Parent");
    const target = host();
    target.className = `t-title _tOTHER _t${PARENT_ID}`;
    const root = mount(Child, target).root;
    const classes = classesOf(root, ".child");
    expect(classes).toContain(tree(PARENT_ID));
    expect(classes).not.toContain("t-title");
    expect(classes).not.toContain("_tOTHER");
  });
});
