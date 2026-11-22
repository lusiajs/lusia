import { describe, expect, test } from "bun:test";
import { convertOldFlowForm } from "#language/format/old-flow-form.ts";

describe("convertOldFlowForm", () => {
  test("the old chain becomes one IF block with one closing tag", () => {
    const old = "<IF {a}>x</IF>\n<ELSEIF {b}>y</ELSEIF>\n<ELSE>z</ELSE>";
    expect(convertOldFlowForm(old)).toBe("<IF {a}>x\n<ELSEIF {b}>y\n<ELSE>z</IF>");
  });

  test("the old form inside an outer IF keeps the outer closing tag", () => {
    const old = "<IF {a}><IF {b}>x</IF><ELSE>y</ELSE></IF>";
    expect(convertOldFlowForm(old)).toBe("<IF {a}><IF {b}>x<ELSE>y</IF></IF>");
  });

  test("the new form is returned unchanged", () => {
    const next = "<IF {a}><IF {b}>x</IF>\n<ELSE>\ny\n</IF>";
    expect(convertOldFlowForm(next)).toBe(next);
  });
});
