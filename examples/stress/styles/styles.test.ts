import { describe, expect, test } from "bun:test";
import { attach } from "lusiajs";
import { compile } from "lusiajs/compiler";
import Parent from "./Parent.lusia";

const PARENT_FILE = new URL("./Parent.lusia", import.meta.url).pathname;

describe("tree and scoped rules on the same class", () => {
  test("compiles a tree selector and a scoped selector that stops at child roots", async () => {
    const { css, id } = compile(await Bun.file(PARENT_FILE).text(), PARENT_FILE);
    expect(css).toContain(`.mark:where(.t-${id}) {`);
    expect(css).toContain(`.mark:where(.l-${id}) {`);
  });

  test("the parent's tree rule reaches the attached child, its scoped rule does not", () => {
    const target = document.createElement("div");
    document.body.append(target);
    const instance = attach(Parent, target);
    const childMark = target.querySelector(".child .mark")!;
    const parentMark = target.querySelector(".parent .mark")!;
    expect(getComputedStyle(childMark).outlineColor).toBe("rebeccapurple");
    expect(getComputedStyle(childMark).backgroundColor).not.toBe("lightyellow");
    expect(getComputedStyle(parentMark).backgroundColor).toBe("lightyellow");

    instance.detach();
    target.remove();
  });

  test("the child keeps its own markup and detaches cleanly", () => {
    const target = document.createElement("div");
    document.body.append(target);
    const instance = attach(Parent, target);
    expect(target.querySelector(".slot .child .mark")).not.toBeNull();

    instance.detach();
    expect(target.childNodes.length).toBe(0);
    target.remove();
  });
});
