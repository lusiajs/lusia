import { describe, expect, test } from "bun:test";
import { assemblePage } from "#cli/build/ssr/page.ts";

const SOURCE = `<!doctype html>
<html lang="en">
  <head>
    <title>Start</title>
    <script type="module" src="/app.js"></script>
  </head>
  <body>
    <script type="module" src="/start.js"></script>
  </body>
</html>`;

describe("assemblePage", () => {
  test("puts the rendered head and body in place and keeps the built scripts", () => {
    const html = assemblePage({
      source: SOURCE,
      head: "<title>Home</title>",
      body: "<h1>Hi</h1>",
      styleIds: ["a1", "b2"],
      cssName: "lusia-abc12345.css",
    });
    expect(html).toContain("<title>Home</title>");
    expect(html).not.toContain("<title>Start</title>");
    expect(html).toContain('<script type="module" src="/app.js"></script>');
    expect(html).toContain("<h1>Hi</h1>");
    expect(html).toContain('<script type="module" src="/start.js"></script>');
    expect(html.indexOf("<h1>Hi</h1>")).toBeLessThan(html.indexOf("/start.js"));
  });

  test("the kept scripts load from the site root, so a nested route finds them", () => {
    const html = assemblePage({
      source:
        '<html><head><script type="module" src="./chunk.js"></script></head><body></body></html>',
      head: "",
      body: "",
      styleIds: [],
    });
    expect(html).toContain('src="/chunk.js"');
    expect(html).not.toContain("./chunk.js");
  });

  test("sets the style ids and links the shared CSS file", () => {
    const html = assemblePage({
      source: SOURCE,
      head: "",
      body: "",
      styleIds: ["a1", "b2"],
      cssName: "lusia-abc12345.css",
    });
    expect(html).toContain('data-lusia-styles="a1 b2"');
    expect(html).toContain('<link rel="stylesheet" href="/lusia-abc12345.css" data-lusia-ssr>');
    expect(html).toContain('<html lang="en" data-lusia-styles');
  });

  test("leaves out the link when there is no CSS", () => {
    const html = assemblePage({ source: SOURCE, head: "", body: "", styleIds: [] });
    expect(html).not.toContain("stylesheet");
    expect(html).toContain('data-lusia-styles=""');
  });
});
