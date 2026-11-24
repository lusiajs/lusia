import { describe, expect, test } from "bun:test";
import { RELOAD_PATH, withHotReload } from "#cli/dev/hot-reload.ts";

describe("withHotReload", () => {
  test("injects the reload client before </body>", () => {
    const html = withHotReload("<body><p>hi</p></body>");
    expect(html.indexOf("<script>")).toBeLessThan(html.indexOf("</body>"));
    expect(html).toContain(RELOAD_PATH);
  });

  test("keeps $ patterns in the page as they are", () => {
    const html = withHotReload("<body>$& $1</body>");
    expect(html.startsWith("<body>$& $1<script>")).toBe(true);
  });

  test("appends the client when there is no body tag", () => {
    expect(withHotReload("<p>hi</p>").startsWith("<p>hi</p><script>")).toBe(true);
  });

  test("reports browser errors and rejections to the dev server", () => {
    const html = withHotReload("<body></body>");
    expect(html).toContain('addEventListener("error", reportWindowError)');
    expect(html).toContain('addEventListener("unhandledrejection", reportRejection)');
    expect(html).toContain('type: "browser-error"');
  });
});
