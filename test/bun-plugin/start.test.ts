import { describe, expect, test } from "bun:test";
import { startModule, withStartTag } from "#bun-plugin/start.ts";

describe("startModule", () => {
  test("starts each page by its route key, in config order", () => {
    expect(
      startModule({ "/": "/app/src/pages/Home.lusia", "/user/:id": "/app/src/pages/User.lusia" }),
    ).toBe(
      'import { startRoutes } from "lusiajs/internal";\n' +
        'startRoutes({ "/": () => import("/app/src/pages/Home.lusia"), ' +
        '"/user/:id": () => import("/app/src/pages/User.lusia") }, document.body);\n',
    );
  });
});

describe("withStartTag", () => {
  test("adds the start script before </body>", () => {
    expect(withStartTag("<body><p>hi</p></body>")).toBe(
      '<body><p>hi</p><script type="module" src="lusia:start"></script></body>',
    );
  });

  test("keeps the rest of the page as it is", () => {
    expect(withStartTag("<html><BODY></BODY></html>")).toBe(
      '<html><BODY><script type="module" src="lusia:start"></script></BODY></html>',
    );
  });
});
