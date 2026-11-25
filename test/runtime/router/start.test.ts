import { beforeAll, beforeEach, describe, expect, test } from "bun:test";
import { PARAMS, PATH } from "#runtime/index.ts";
import { startRoutes } from "#runtime/internal.ts";
import { fakePage, resetAddress, setTestUrl, settle } from "./fake-page.ts";

let target: HTMLElement;
let log: string[];

beforeAll(async () => {
  await setTestUrl();
});

beforeEach(async () => {
  target = document.createElement("main");
  document.body.append(target);
  log = [];
  await resetAddress("/");
});

describe("startRoutes", () => {
  test("shows the page for the address and resolves after it is attached", async () => {
    await startRoutes({ "/": fakePage("home", log) }, target);
    expect(target.textContent).toBe("home");
    expect(log).toEqual(["attach home"]);
  });

  test("setting PATH swaps the page after the old one detaches", async () => {
    await startRoutes({ "/": fakePage("home", log), "/guide": fakePage("guide", log) }, target);
    PATH.value = "/guide";
    await settle();
    expect(target.textContent).toBe("guide");
    expect(location.pathname).toBe("/guide");
    expect(log).toEqual(["attach home", "detach home", "attach guide"]);
  });

  test("a :name page loads, and PARAMS holds its value", async () => {
    await resetAddress("/user/42");
    await startRoutes({ "/user/:id": fakePage("user", log) }, target);
    expect(target.textContent).toBe("user");
    expect(PARAMS.value.id).toBe("42");
  });

  test("the * page shows for an address with no page", async () => {
    await resetAddress("/nope");
    await startRoutes({ "/": fakePage("home", log), "*": fakePage("missing", log) }, target);
    expect(target.textContent).toBe("missing");
  });

  test("with no match and no *, the target stays empty", async () => {
    await startRoutes({ "/": fakePage("home", log) }, target);
    PATH.value = "/nope";
    await settle();
    expect(target.textContent).toBe("");
    expect(log).toEqual(["attach home", "detach home"]);
  });

  test("a newer navigation wins over an older slow load", async () => {
    let release = (): void => {};
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    const pages = {
      "/": fakePage("home", log),
      "/slow": fakePage("slow", log, gate),
      "/fast": fakePage("fast", log),
    };
    await startRoutes(pages, target);
    PATH.value = "/slow";
    PATH.value = "/fast";
    await settle();
    release();
    await settle();
    expect(target.textContent).toBe("fast");
    expect(log).not.toContain("attach slow");
  });

  test("popstate swaps the page to the address the browser went back to", async () => {
    await startRoutes({ "/": fakePage("home", log), "/guide": fakePage("guide", log) }, target);
    history.replaceState(null, "", "/guide");
    window.dispatchEvent(new PopStateEvent("popstate"));
    await settle();
    expect(target.textContent).toBe("guide");
    expect(PATH.value).toBe("/guide");
  });

  test("a hash change on the same page scrolls to the element and keeps the page", async () => {
    await startRoutes({ "/": fakePage("home", log) }, target);
    const intro = document.createElement("h2");
    intro.id = "intro";
    document.body.append(intro);
    let scrolled = false;
    intro.scrollIntoView = () => {
      scrolled = true;
    };
    PATH.value = "/#intro";
    await settle();
    expect(scrolled).toBe(true);
    expect(log).toEqual(["attach home"]);
    intro.remove();
  });
});
