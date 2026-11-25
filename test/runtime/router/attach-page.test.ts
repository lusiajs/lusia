import { afterEach, describe, expect, test } from "bun:test";
import { attachPage } from "#runtime/router/attach-page.ts";
import { fakePage } from "./fake-page.ts";

const log: string[] = [];
let target: HTMLElement | undefined;

afterEach(() => {
  delete document.documentElement.dataset.lusiaSsr;
  document.documentElement.removeAttribute("data-lusia-ssr");
  target?.remove();
  target = undefined;
  log.length = 0;
});

async function prerenderedTarget(): Promise<HTMLElement> {
  document.documentElement.setAttribute("data-lusia-ssr", "");
  target = document.createElement("main");
  target.innerHTML = "<p>built</p>";
  document.body.append(target);
  return target;
}

describe("attachPage", () => {
  test("swaps a page built on the server in with one replaceChildren call", async () => {
    const main = await prerenderedTarget();
    const { default: page } = await fakePage("fresh", log)();
    const seenAtSwap: string[] = [];
    const replaceChildren = main.replaceChildren.bind(main);
    main.replaceChildren = (...nodes: Node[]) => {
      seenAtSwap.push(main.textContent ?? "");
      replaceChildren(...nodes);
    };

    attachPage(page, main);

    expect(seenAtSwap).toEqual(["built"]);
    expect(main.textContent).toBe("fresh");
  });

  test("attaches straight into the target when nothing was built on the server", async () => {
    target = document.createElement("main");
    target.innerHTML = "<p>old</p>";
    document.body.append(target);
    const { default: page } = await fakePage("plain", log)();

    attachPage(page, target);

    expect(target.textContent).toBe("oldplain");
  });
});
