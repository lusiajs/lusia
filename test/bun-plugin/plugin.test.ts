import { afterEach, describe, expect, test } from "bun:test";
import { compile } from "lusiajs/compiler";

const EVENTS_PATH = "./fixtures/Events.lusia";
const EVENTS_FILE = new URL(EVENTS_PATH, import.meta.url).pathname;

type Attached = { detach(): void };
let attached: Attached | null = null;
let target: HTMLElement | null = null;

afterEach(() => {
  // The demo keeps its state in its script, so reset it before the next test.
  if (attached && target) click(target, ".reset");
  attached?.detach();
  attached = null;
  target?.remove();
  target = null;
});

async function attachEvents(): Promise<{ id: string }> {
  const source = await Bun.file(EVENTS_FILE).text();
  const { id } = compile(source, EVENTS_FILE);
  const Events = (await import(EVENTS_PATH)).default as (target: Element) => Attached;
  target = document.createElement("div");
  document.body.append(target);
  attached = Events(target);
  return { id };
}

function click(root: HTMLElement, selector: string, times = 1): void {
  const button = root.querySelector(selector)!;
  for (let i = 0; i < times; i++) button.dispatchEvent(new Event("click"));
}

function textOf(root: HTMLElement, selector: string): string {
  return root.querySelector(selector)!.textContent!.replace(/\s+/g, " ").trim();
}

describe("lusia bun plugin with an Events component", () => {
  test("stamps only the top-level element and injects compiled scss", async () => {
    const { id } = await attachEvents();
    expect(target!.querySelector("div")!.classList.contains(`t-${id}`)).toBe(true);
    expect(target!.querySelector(".status")!.classList.contains(`t-${id}`)).toBe(true);
    expect(textOf(target!, ".status")).toBe("Clicked 0 of 5 times.");

    const css = document.querySelector(`style[data-lusia="${id}"]`)!.textContent!;
    expect(css).toContain(`.status.done:where(.t-${id})`);
    expect(css).toContain("color: var(--accent)");
  });

  test("text, partial and whole attributes follow stores", async () => {
    await attachEvents();
    const root = target!;
    const progress = root.querySelector("progress")!;
    const add = root.querySelector(".add")!;
    const reset = root.querySelector(".reset")!;

    expect(textOf(root, ".hint")).toBe("5 left");
    expect(progress.getAttribute("value")).toBe("0");
    expect(reset.hasAttribute("title")).toBe(false);

    click(root, ".add", 3);
    expect(textOf(root, ".status")).toBe("Clicked 3 of 5 times.");
    expect(reset.getAttribute("title")).toBe("Start again");

    click(root, ".add", 2);
    const statusClasses = root.querySelector(".status")!.classList;
    expect(statusClasses.contains("status")).toBe(true);
    expect(statusClasses.contains("done")).toBe(true);
    expect(textOf(root, ".hint")).toBe("Limit reached");
    expect(add.hasAttribute("disabled")).toBe(true);

    click(root, ".reset");
    expect(add.hasAttribute("disabled")).toBe(false);
    expect(textOf(root, ".hint")).toBe("5 left");
  });

  test("detach removes the nodes and stops its listeners", async () => {
    await attachEvents();
    const root = target!;
    const status = root.querySelector(".status")!;
    const add = root.querySelector(".add")!;
    attached!.detach();
    attached = null;
    expect(root.childNodes.length).toBe(0);

    add.dispatchEvent(new Event("click"));
    expect(status.textContent).toContain("Clicked 0");
  });
});
