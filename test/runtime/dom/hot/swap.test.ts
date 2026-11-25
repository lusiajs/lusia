import { afterAll, afterEach, describe, expect, test } from "bun:test";
import type { Instance } from "lusiajs";
import { swapComponent, swapStyle, type HotComponent } from "lusiajs/internal";
import { removeVersions, sourceFile, version } from "./versions.ts";

declare global {
  var hotLog: string[];
}

const mounted: Instance[] = [];

afterEach(async () => {
  for (const instance of mounted.splice(0)) await instance.detach();
  document.body.innerHTML = "";
});

afterAll(removeVersions);

function mount(component: HotComponent): HTMLElement {
  const target = document.createElement("div");
  document.body.append(target);
  mounted.push(component(target));
  return target;
}

function clickButton(target: HTMLElement): void {
  target.querySelector("button")!.click();
}

const COUNTER = (label: string, extra = ""): string => `
<script>
import { variable } from "lusiajs";
const count = variable(0);
${extra}
function bump() { count.value += 1; }
</script>
<button onclick={bump}>${label}</button>`;

describe("hot swap keeps state", () => {
  test("a variable keeps its value by name and the markup changes in place", async () => {
    const first = await version("KeepValue", COUNTER("{count}"));
    const target = mount(first);
    clickButton(target);
    clickButton(target);
    clickButton(target);
    expect(target.textContent).toBe("3");

    swapComponent(await version("KeepValue", COUNTER("count {count}")));
    expect(target.textContent).toBe("count 3");

    clickButton(target);
    expect(target.textContent).toBe("count 4");
  });

  test("a new variable starts from its initial value and variable.compute recomputes", async () => {
    const first = await version("NewVariable", COUNTER("{count}"));
    const target = mount(first);
    clickButton(target);
    clickButton(target);

    const extra = `const total = variable(10);
const doubled = variable.compute(() => count.value * 2);`;
    const next = `<script>
import { variable } from "lusiajs";
const count = variable(0);
${extra}
function bump() { count.value += 1; }
</script>
<button onclick={bump}>{count} {total} {doubled}</button>`;
    swapComponent(await version("NewVariable", next));
    expect(target.textContent).toBe("2 10 4");
  });

  test("effects of the old instance stop and the new ones run", async () => {
    globalThis.hotLog = [];
    const first = await version(
      "Effects",
      COUNTER(
        "{count}",
        'variable.autoRun(() => { globalThis.hotLog.push("one " + count.value); });',
      ),
    );
    const target = mount(first);
    clickButton(target);
    expect(globalThis.hotLog).toEqual(["one 0", "one 1"]);

    swapComponent(
      await version(
        "Effects",
        COUNTER(
          "{count}",
          'variable.autoRun(() => { globalThis.hotLog.push("two " + count.value); });',
        ),
      ),
    );
    const before = globalThis.hotLog.length;
    clickButton(target);
    expect(globalThis.hotLog.slice(before)).toEqual(["two 2"]);
  });

  test("the swapped instance keeps its place among its siblings", async () => {
    const first = await version("Place", COUNTER("{count}"));
    const target = document.createElement("div");
    target.innerHTML = "<b>before</b>";
    document.body.append(target);
    mounted.push(first(target));

    swapComponent(await version("Place", COUNTER("after {count}")));
    expect(target.children[0]!.tagName).toBe("B");
    expect(target.children[1]!.tagName).toBe("BUTTON");
    expect(target.textContent).toBe("beforeafter 0");
  });

  test("a failing render keeps the old instance on the page", async () => {
    const first = await version("Failing", COUNTER("{count}"));
    const target = mount(first);
    clickButton(target);

    const broken = await version("Failing", COUNTER("{count}", 'throw new Error("boom");'));
    expect(() => swapComponent(broken)).toThrow("boom");
    expect(target.textContent).toBe("1");

    clickButton(target);
    expect(target.textContent).toBe("2");
  });

  test("a detached instance leaves no nodes behind after a swap", async () => {
    const first = await version("Detach", COUNTER("{count}"));
    const target = document.createElement("div");
    document.body.append(target);
    const instance = first(target);

    swapComponent(await version("Detach", COUNTER("x {count}")));
    await instance.detach();
    expect(target.childNodes.length).toBe(0);
  });

  test("a style-only change keeps the same nodes", async () => {
    const first = await version("Style", COUNTER("{count}"));
    const target = mount(first);
    const button = target.querySelector("button");

    const restyled = await version(
      "Style",
      COUNTER("{count}") + "\n<style>button { color: red; }</style>",
    );
    swapStyle(restyled.id, restyled.definition.css);
    expect(target.querySelector("button")).toBe(button);
    const style = document.head.querySelector(`style[data-lusia="${restyled.id}"]`);
    expect(style?.textContent).toContain("red");
  });

  test("children are created again and keep their variables by name", async () => {
    await sourceFile(
      "Child",
      `<script>
import { variable } from "lusiajs";
const ticks = variable(0);
function tick() { ticks.value += 1; }
</script>
<i onclick={tick}>{ticks}</i>`,
    );
    const parent = (markup: string): string => `<script>
import Child from "./Child.lusia";
</script>
${markup}`;

    const first = await version("Parent", parent("<section><Child /></section>"));
    const target = mount(first);
    const child = target.querySelector("i")!;
    child.click();
    child.click();
    expect(target.querySelector("i")!.textContent).toBe("2");

    swapComponent(await version("Parent", parent("<section><p>new</p><Child /></section>")));
    expect(target.querySelector("p")!.textContent).toBe("new");
    expect(target.querySelector("i")!.textContent).toBe("2");
    expect(target.querySelector("i")).not.toBe(child);
  });

  test("CONTENT keeps the parent's children when the component is swapped", async () => {
    const card = (tag: string): string => `<script>
import { props } from "lusiajs";
const { title } = props(class {
  title = "";
});
</script>
<${tag} class="card">{title}<CONTENT /></${tag}>`;
    await sourceFile("SlotCard", card("section"));
    const parent = `<script>
import Card from "./SlotCard.lusia";
import { variable } from "lusiajs";
const count = variable(1);
</script>
<Card title="hi"><b class="kid">{count}</b></Card>`;

    const target = mount(await version("SlotParent", parent));
    expect(target.querySelector("section > b.kid")!.textContent).toBe("1");

    swapComponent(await version("SlotCard", card("article")));
    expect(target.querySelector("article > b.kid")!.textContent).toBe("1");
    expect(target.querySelector("section")).toBeNull();
  });
});
