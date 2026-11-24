import { categoryCode, colorEnabled, paint } from "./color.ts";

type Level = "info" | "warn" | "error";

export interface LogOptions {
  color: boolean;
  write(line: string): void;
  now(): Date;
}

export interface Logger {
  info(message: string): void;
  warn(message: string): void;
  error(message: string): void;
}

const DIM = "\x1b[90m";
const LEVEL_CODES: Record<Level, string> = {
  info: "\x1b[36m",
  warn: "\x1b[33m",
  error: "\x1b[31m",
};

export function defaultLogOptions(
  env: Record<string, string | undefined> = process.env,
  isTerminal = Boolean(process.stderr.isTTY),
): LogOptions {
  return {
    color: colorEnabled(env, isTerminal),
    write: (line) => void process.stderr.write(`${line}\n`),
    now: () => new Date(),
  };
}

export function createLogger(category: string, options: LogOptions = defaultLogOptions()): Logger {
  const tag = options.color ? paint(`[${category}]`, categoryCode(category)) : `[${category}]`;

  function log(level: Level, message: string): void {
    const time = formatTime(options.now());
    const label = level.toUpperCase().padEnd(5);
    if (!options.color) {
      options.write(`${time} ${label} ${tag} ${message}`);
      return;
    }
    options.write(`${paint(time, DIM)} ${paint(label, LEVEL_CODES[level])} ${tag} ${message}`);
  }

  return {
    info: (message) => log("info", message),
    warn: (message) => log("warn", message),
    error: (message) => log("error", message),
  };
}

function formatTime(date: Date): string {
  return date.toTimeString().slice(0, 8);
}
