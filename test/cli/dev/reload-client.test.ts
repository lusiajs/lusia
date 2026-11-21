import { describe, expect, test } from "bun:test";
import { RELOAD_PATH, withReloadClient } from "#cli/dev/reload-client.ts";

describe("withReloadClient", () => {
  test("injects the reload client before </body>", () => {
    const html = withReloadClient("<body><p>hi</p></body>");
    expect(html.indexOf("<script>")).toBeLessThan(html.indexOf("</body>"));
    expect(html).toContain(RELOAD_PATH);
  });

  test("keeps $ patterns in the page as they are", () => {
    const html = withReloadClient("<body>$& $1</body>");
    expect(html.startsWith("<body>$& $1<script>")).toBe(true);
  });

  test("appends the client when there is no body tag", () => {
    expect(withReloadClient("<p>hi</p>").startsWith("<p>hi</p><script>")).toBe(true);
  });
});
