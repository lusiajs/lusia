import { describe, expect, test } from "bun:test";
import { api } from "#reference/api.ts";
import { PRESET } from "#runtime/animate/options/presets.ts";

const KINDS = new Set(["function", "type", "markup", "style", "value"]);
const GROUPS = new Set([
  "basics",
  "reactivity",
  "events",
  "flow",
  "components",
  "styling",
  "motion",
]);

const presetMemberNames = () =>
  api.find((entry) => entry.id === "preset")?.members?.map((member) => member.name) ?? [];

describe("reference api table", () => {
  test("ids are unique url-safe anchors", () => {
    const ids = api.map((entry) => entry.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const id of ids) expect(id).toMatch(/^[a-z-]+$/);
  });

  test("every entry has a valid kind and group and text", () => {
    for (const entry of api) {
      expect(KINDS.has(entry.kind), entry.id).toBe(true);
      expect(GROUPS.has(entry.group), entry.id).toBe(true);
      expect(entry.name.length, entry.id).toBeGreaterThan(0);
      expect(entry.signature.length, entry.id).toBeGreaterThan(0);
      expect(entry.summary.length, entry.id).toBeGreaterThan(0);
      expect(entry.example.length, entry.id).toBeGreaterThan(0);
    }
  });

  test("every entry has 3 to 5 bullets", () => {
    for (const entry of api) {
      expect(entry.bullets.length, entry.id).toBeGreaterThanOrEqual(3);
      expect(entry.bullets.length, entry.id).toBeLessThanOrEqual(5);
    }
  });

  test("covers the public API and markup features", () => {
    const ids = api.map((entry) => entry.id);
    for (const id of [
      "variable",
      "variable-compute",
      "variable-auto-run",
      "props",
      "attach",
      "variable-type",
      "computed-variable-type",
      "component",
      "instance",
      "props-type",
      "expr",
      "script",
      "style",
      "style-scoped",
      "style-global",
      "scoped",
      "global",
      "inline-global",
      "on-attach",
      "on-detach",
      "component-tag",
    ]) {
      expect(ids).toContain(id);
    }
  });

  test("covers the motion API: the animate attribute, its enums and types", () => {
    const ids = api.map((entry) => entry.id);
    for (const id of [
      "animate",
      "ease",
      "on",
      "animate-item",
      "animate-type",
      "keyframes-type",
      "interpolate",
    ]) {
      expect(ids).toContain(id);
    }
  });

  test("each enum is one value entry listing its members in upper case", () => {
    for (const name of ["EASE", "ON"]) {
      const entry = api.find((item) => item.name === name);
      expect(entry?.kind, name).toBe("value");
      expect(entry?.members?.length ?? 0, name).toBeGreaterThan(0);
      for (const member of entry?.members ?? []) expect(member.name, name).toMatch(/^[A-Z_]+$/);
    }
  });

  test("EASE.STYLE lists the eleven built-in curves", () => {
    const style = api
      .find((entry) => entry.name === "EASE")
      ?.members?.find((member) => member.name === "STYLE");
    const members = style?.members?.map((member) => member.name);
    expect(members).toEqual([
      "LINEAR",
      "QUAD",
      "CUBIC",
      "QUART",
      "QUINT",
      "SINE",
      "EXPO",
      "CIRC",
      "BACK",
      "ELASTIC",
      "BOUNCE",
    ]);
  });
});

describe("reference api: flow, events and bind-value", () => {
  test("covers the flow tags, events and bind-value entries", () => {
    const ids = api.map((entry) => entry.id);
    for (const id of [
      "event",
      "bind-value",
      "bind-prop",
      "bind-element",
      "if",
      "elseif",
      "else",
      "each",
      "for",
      "preset",
    ]) {
      expect(ids).toContain(id);
    }
  });

  test("the flow tags are in the flow group", () => {
    const flow = api.filter((entry) => entry.group === "flow").map((entry) => entry.id);
    expect(flow).toEqual(["if", "elseif", "else", "each", "for"]);
  });

  test("PRESET lists its members in upper case with underscores", () => {
    const members = presetMemberNames();
    expect(members).toContain("FADE_IN");
    expect(members).toContain("SLIDE_UP");
    for (const name of members) expect(name).toMatch(/^[A-Z_]+$/);
  });

  test("PRESET members match the PRESET export, in order", () => {
    expect(presetMemberNames()).toEqual(Object.keys(PRESET));
  });

  test("batch and untrack are gone from the public API", () => {
    const names = api.map((entry) => entry.name);
    expect(names).not.toContain("batch()");
    expect(names).not.toContain("untrack()");
  });
});
