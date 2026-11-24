import { describe, expect, test } from "bun:test";
import { resolve } from "node:path";
import { parseCommand, UsageError } from "#cli/args/args.ts";

const NO_ENV = {};
const ALL_CACHES = { styles: true, modules: true, packages: true };
const NO_CACHES = { styles: false, modules: false, packages: false };

describe("parseCommand", () => {
  test("build uses the defaults", async () => {
    expect(await parseCommand(["build"], NO_ENV)).toEqual({
      name: "build",
      dir: ".",
      outdir: resolve("dist"),
      minify: true,
      routes: [],
      quiet: false,
      lazy: { mode: "smart", prefetch: "idle" },
      animate: {},
      cache: ALL_CACHES,
    });
  });

  test("build reads its options", async () => {
    expect(await parseCommand(["build", "app", "--outdir", "out", "--no-minify"], NO_ENV)).toEqual({
      name: "build",
      dir: "app",
      outdir: resolve("out"),
      minify: false,
      routes: [],
      quiet: false,
      lazy: { mode: "smart", prefetch: "idle" },
      animate: {},
      cache: ALL_CACHES,
    });
  });

  test("--no-cache turns every disk cache off for build and dev", async () => {
    expect(await parseCommand(["build", "--no-cache"], NO_ENV)).toMatchObject({
      cache: NO_CACHES,
    });
    expect(await parseCommand(["dev", "--no-cache"], NO_ENV)).toMatchObject({
      cache: NO_CACHES,
    });
  });

  test("--quiet hides the timing output for build and dev", async () => {
    expect(await parseCommand(["build", "--quiet"], NO_ENV)).toMatchObject({
      quiet: true,
    });
    expect(await parseCommand(["dev", "--quiet"], NO_ENV)).toMatchObject({
      quiet: true,
    });
  });

  test("dev defaults to port 3000, uses PORT, and --port wins", async () => {
    expect(await parseCommand(["dev"], NO_ENV)).toEqual({
      name: "dev",
      dir: ".",
      port: 3000,
      quiet: false,
      lazy: { mode: "smart", prefetch: "idle" },
      animate: {},
      cache: ALL_CACHES,
    });
    expect(await parseCommand(["dev"], { PORT: "3100" })).toEqual({
      name: "dev",
      dir: ".",
      port: 3100,
      quiet: false,
      lazy: { mode: "smart", prefetch: "idle" },
      animate: {},
      cache: ALL_CACHES,
    });
    expect(await parseCommand(["dev", "--port", "3196"], { PORT: "3100" })).toEqual({
      name: "dev",
      dir: ".",
      port: 3196,
      quiet: false,
      lazy: { mode: "smart", prefetch: "idle" },
      animate: {},
      cache: ALL_CACHES,
    });
  });

  test("format takes paths and its flags, defaulting to the current folder", async () => {
    expect(await parseCommand(["format"], NO_ENV)).toEqual({
      name: "format",
      paths: ["."],
      check: false,
      quiet: false,
      cache: true,
      indentScriptAndStyle: true,
    });
    expect(
      await parseCommand(["format", "src", "app/**/*.lusia", "--check", "--quiet"], NO_ENV),
    ).toEqual({
      name: "format",
      paths: ["src", "app/**/*.lusia"],
      check: true,
      quiet: true,
      cache: true,
      indentScriptAndStyle: true,
    });
  });

  test("format can turn the content cache off", async () => {
    expect(await parseCommand(["format", "--no-cache"], NO_ENV)).toEqual({
      name: "format",
      paths: ["."],
      check: false,
      quiet: false,
      cache: false,
      indentScriptAndStyle: true,
    });
  });

  test("clean takes a folder and --quiet, defaulting to the current folder", async () => {
    expect(await parseCommand(["clean"], NO_ENV)).toEqual({
      name: "clean",
      dir: ".",
      quiet: false,
    });
    expect(await parseCommand(["clean", "app", "--quiet"], NO_ENV)).toEqual({
      name: "clean",
      dir: "app",
      quiet: true,
    });
  });

  test("clean rejects more than one folder", async () => {
    await expect(parseCommand(["clean", "a", "b"], NO_ENV)).rejects.toBeInstanceOf(UsageError);
  });

  test("lint takes paths and its flags, defaulting to the current folder", async () => {
    expect(await parseCommand(["lint"], NO_ENV)).toEqual({
      name: "lint",
      paths: ["."],
      fix: false,
      maxWarnings: Number.POSITIVE_INFINITY,
      quiet: false,
      rules: undefined,
    });
    expect(
      await parseCommand(["lint", "src", "--fix", "--max-warnings", "0", "--quiet"], NO_ENV),
    ).toEqual({
      name: "lint",
      paths: ["src"],
      fix: true,
      maxWarnings: 0,
      quiet: true,
      rules: undefined,
    });
  });

  test("help and unknown commands", async () => {
    expect(await parseCommand([], NO_ENV)).toEqual({ name: "help" });
    await expect(parseCommand(["serve"], NO_ENV)).rejects.toThrow(UsageError);
  });

  test("bad options raise a usage error", async () => {
    await expect(parseCommand(["build", "--bogus"], NO_ENV)).rejects.toThrow(UsageError);
    await expect(parseCommand(["dev", "--port", "70000"], NO_ENV)).rejects.toThrow(UsageError);
    await expect(parseCommand(["build", "a", "b"], NO_ENV)).rejects.toThrow(UsageError);
    await expect(parseCommand(["format", "--bogus"], NO_ENV)).rejects.toThrow(UsageError);
    await expect(parseCommand(["lint", "--bogus"], NO_ENV)).rejects.toThrow(UsageError);
    await expect(parseCommand(["lint", "--max-warnings", "-1"], NO_ENV)).rejects.toThrow(
      UsageError,
    );
    await expect(parseCommand(["lint", "--max-warnings", "1.5"], NO_ENV)).rejects.toThrow(
      UsageError,
    );
    await expect(parseCommand(["lint", "--max-warnings"], NO_ENV)).rejects.toThrow(UsageError);
  });
});
