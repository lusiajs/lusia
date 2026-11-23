#!/usr/bin/env bun
import { LusiaError } from "#compiler/errors/error.ts";
import { parseCommand, UsageError } from "./args/args.ts";
import { USAGE } from "./args/usage.ts";
import { runBuild } from "./build/build.ts";
import { startDev } from "./dev/dev.ts";
import { runFormat } from "./format/format.ts";
import { formatError } from "./format/format-error.ts";
import { runLint } from "./lint/lint.ts";
import { colorEnabled } from "./log/color.ts";
import { createLogger } from "./log/log.ts";

async function main(argv: string[]): Promise<number> {
  try {
    const command = await parseCommand(argv, process.env);
    if (command.name === "help") {
      process.stdout.write(USAGE);
      return 0;
    }
    if (command.name === "build") return await runBuild(command);
    if (command.name === "format") return await runFormat(command);
    if (command.name === "lint") return await runLint(command);
    await startDev(command);
    return 0;
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
