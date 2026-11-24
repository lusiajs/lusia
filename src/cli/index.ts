#!/usr/bin/env bun
import { LusiaError } from "#compiler/errors/error.ts";
import { parseCommand, UsageError, type Command } from "./args/args.ts";
import { USAGE } from "./args/usage.ts";
import { formatError } from "./format/format-error.ts";
import { colorEnabled } from "./log/color.ts";
import { createLogger } from "./log/log.ts";
import { now } from "./build/timings.ts";

// Each command module loads only when its command runs, so `dev` skips the build, lint and format code.
async function runCommand(command: Command, configMs: number): Promise<number> {
  if (command.name === "help") {
    process.stdout.write(USAGE);
    return 0;
  }
  if (command.name === "build") return (await import("./build/build.ts")).runBuild(command);
  if (command.name === "format") return (await import("./format/format.ts")).runFormat(command);
  if (command.name === "lint") return (await import("./lint/lint.ts")).runLint(command);
  await (await import("./dev/dev.ts")).startDev({ ...command, configMs });
  return 0;
}

async function main(argv: string[]): Promise<number> {
  try {
    // parseCommand reads lusia.config, so its time is the config time shown in `lusia dev`.
    const started = now();
    const command = await parseCommand(argv, process.env);
    return await runCommand(command, now() - started);
  } catch (error) {
    if (error instanceof UsageError) {
      process.stderr.write(`${error.message}\n\n${USAGE}`);
      return 1;
    }
    if (error instanceof LusiaError) {
      process.stderr.write(`${formatError(error, undefined, colorEnabled())}\n`);
      return 1;
    }
    createLogger("cli").error(error instanceof Error ? error.message : String(error));
    return 1;
  }
}

process.exitCode = await main(Bun.argv.slice(2));
