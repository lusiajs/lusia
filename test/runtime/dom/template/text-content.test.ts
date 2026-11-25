import { afterEach, describe, expect, test } from "bun:test";
import { variable } from "#runtime/variable/variable.ts";
import TextElements from "../fixtures/TextElements.lusia";
import TextEntities from "../fixtures/TextEntities.lusia";
import { host, mount, resetMounts } from "../fixtures/mount.ts";

afterEach(() => {
  resetMounts();
});

describe("expressions in title and textarea", () => {
  test("a title expression sets the page title and follows its variable", () => {
    const id = variable("a");
    mount(TextElements, host(), { id: () => id.value, note: () => "" });

    expect(document.title).toBe("Post a - Site");

    id.value = "b";

    expect(document.title).toBe("Post b - Site");
  });

  test("a textarea expression sets its value and follows its variable", () => {
    const note = variable("first");
    const el = host();
    mount(TextElements, el, { id: () => "a", note: () => note.value });
    const area = el.querySelector("textarea")!;

    expect(area.value).toBe("first");

    note.value = "second";

    expect(area.value).toBe("second");
  });

  test("character references next to an expression are decoded", () => {
    const id = variable("a");
    const note = variable("x");
    const el = host();
    mount(TextEntities, el, { id: () => id.value, note: () => note.value });

    expect(document.title).toBe("Tom & Jerry a");
    expect(el.querySelector("textarea")!.value).toBe("AB x");

    id.value = "b";

    expect(document.title).toBe("Tom & Jerry b");
  });
});
