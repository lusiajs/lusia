import { describe, expect, test } from "bun:test";
import { decodeEntities } from "#compiler/template/scan/entities.ts";

describe("decodeEntities", () => {
  test("decodes named references", () => {
    expect(decodeEntities("&amp; &lt; &gt; &quot; &#39; &apos; &nbsp;")).toBe(
      `& < > " ' '  `,
    );
  });

  test("decodes decimal and hex numeric references", () => {
    expect(decodeEntities("&#65;&#x42;&#X43;&#x1F600;")).toBe("ABC\u{1F600}");
  });

  test("decodes each reference once", () => {
    expect(decodeEntities("&amp;lt;")).toBe("&lt;");
  });

  test("leaves unknown and out-of-range references as written", () => {
    expect(decodeEntities("&unknown; &#x110000; &amp")).toBe("&unknown; &#x110000; &amp");
  });
});
