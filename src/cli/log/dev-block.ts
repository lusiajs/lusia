import { dirname } from "node:path";
import type { Steps } from "../build/timings.ts";
import { type BlockKind, headLine, renderTree } from "./dev-tree.ts";
import { formatTiming } from "./dev-timing.ts";

export interface UpdateBlock {
  time: Date;
  kind: Exclude<BlockKind, "error">;
  files: string[];
  steps: Steps;
  browserMs?: number;
}

export interface BrowserError {
  time: Date;
  page: string;
  message: string;
  stack: string;
}

export interface BlockOptions {
  color: boolean;
  showTiming: boolean;
}

const MAX_ENTRIES = 3;
const FOLDER_GROUP_MIN_FILES = 3;

/** Up to 3 files are listed as they are. More files are grouped by folder when a folder has 3 or more. */
export function groupFiles(files: string[]): string[] {
  if (files.length <= MAX_ENTRIES) return files;
  const folders = groupByFolder(files);
  return [...folders].flatMap(([folder, group]) =>
    group.length >= FOLDER_GROUP_MIN_FILES ? [`${folder}/  ${group.length} files`] : group,
  );
}

function groupByFolder(files: string[]): Map<string, string[]> {
  const folders = new Map<string, string[]>();
  for (const file of files) {
    const folder = dirname(file);
    folders.set(folder, [...(folders.get(folder) ?? []), file]);
  }
  return folders;
}

export function formatUpdate(block: UpdateBlock, options: BlockOptions): string {
  const entries = groupFiles(block.files);
  const [headText = "", ...shown] = entries.slice(0, MAX_ENTRIES);
  const hidden = entries.length - MAX_ENTRIES;
  const fileRest = [...shown, ...(hidden > 0 ? [`+${hidden} more`] : [])];
  const children = [
    ...(fileRest.length > 0 ? [`+ ${fileRest.join(", ")}`] : []),
    ...(options.showTiming ? [formatTiming(block.steps, block.browserMs, options.color)] : []),
  ];
  return renderTree(
    headLine(block.time, block.kind, headText, options.color),
    children,
    options.color,
  );
}

export function formatBrowserError(error: BrowserError, color: boolean): string {
  const head = headLine(error.time, "error", `in browser  ${error.page}`, color);
  const frame = firstFrame(error.stack);
  const children = [...splitLines(error.message), ...(frame ? [frame] : [])];
  return renderTree(head, children, color);
}

export function formatBuildError(time: Date, messages: string[], color: boolean): string {
  const head = headLine(time, "error", "build", color);
  return renderTree(head, messages.flatMap(splitLines), color);
}

function firstFrame(stack: string): string | undefined {
  return splitLines(stack)
    .map((line) => line.trim())
    .find((line) => line.startsWith("at "));
}

function splitLines(text: string): string[] {
  return text
    .split("\n")
    .map((line) => line.trimEnd())
    .filter((line) => line.trim() !== "");
}
