import { beforeAll, beforeEach, describe, expect, test } from "bun:test";
import { startRoutes } from "#runtime/internal.ts";
import { fakePage, resetAddress, setTestUrl, settle } from "./fake-page.ts";

let target: HTMLElement;
let log: string[];
let links: HTMLAnchorElement[] = [];

beforeAll(async () => {
  await setTestUrl();
  target = document.createElement("main");
  document.body.append(target);
  log = [];
  await resetAddress("/");
  await startRoutes({ "/": fakePage("home", log), "/guide": fakePage("guide", log) }, target);
});

beforeEach(async () => {
  await resetAddress("/");
  await settle();
});

function linkTo(href: string, attributes: Record<string, string> = {}): HTMLAnchorElement {
  const link = document.createElement("a");
  link.href = href;
  for (const [name, value] of Object.entries(attributes)) link.setAttribute(name, value);
  document.body.append(link);
  links.push(link);
  return link;
}

// Returns true when the click was not cancelled, so the browser keeps its own behaviour.
function click(link: Element, init: MouseEventInit = {}): boolean {
  return link.dispatchEvent(
    new MouseEvent("click", { bubbles: true, cancelable: true, button: 0, ...init }),
  );
}

describe("link clicks", () => {
  test("a plain click on a same-origin page link navigates", async () => {
    const link = linkTo("/guide");
    expect(click(link)).toBe(false);
    await settle();
    expect(location.pathname).toBe("/guide");
    expect(target.textContent).toBe("guide");
  });

  test("a click on a child of the link navigates", async () => {
    const link = linkTo("/guide");
    link.innerHTML = "<span>Guide</span>";
    expect(click(link.querySelector("span") as HTMLElement)).toBe(false);
    await settle();
    expect(target.textContent).toBe("guide");
  });

  const skipped: [string, string, Record<string, string>, MouseEventInit][] = [
    ["target=_blank", "/guide", { target: "_blank" }, {}],
    ["download", "/guide", { download: "" }, {}],
    ["ctrl key", "/guide", {}, { ctrlKey: true }],
    ["meta key", "/guide", {}, { metaKey: true }],
    ["shift key", "/guide", {}, { shiftKey: true }],
    ["alt key", "/guide", {}, { altKey: true }],
    ["middle button", "/guide", {}, { button: 1 }],
    ["other origin", "https://other.example/guide", {}, {}],
  ];

  for (const [name, href, attributes, init] of skipped) {
    test(`skips a link with ${name}`, async () => {
      const link = linkTo(href, attributes);
      link.addEventListener("click", (event) => event.preventDefault(), { once: true });
      click(link, init);
      await settle();
      expect(location.pathname).toBe("/");
    });
  }

  test("skips a click that an earlier handler already cancelled", async () => {
    const link = linkTo("/guide");
    link.addEventListener("click", (event) => event.preventDefault());
    expect(click(link)).toBe(false);
    await settle();
    expect(location.pathname).toBe("/");
  });

  test("a hash link to the same page only scrolls", async () => {
    const intro = document.createElement("h2");
    intro.id = "intro";
    document.body.append(intro);
    let scrolled = false;
    intro.scrollIntoView = () => {
      scrolled = true;
    };
    const attachesBefore = log.length;
    const link = linkTo("#intro");
    click(link);
    await settle();
    expect(scrolled).toBe(true);
    expect(location.hash).toBe("#intro");
    expect(log.slice(attachesBefore)).toEqual([]);
    intro.remove();
  });
});
