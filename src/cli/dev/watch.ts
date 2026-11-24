import { watch } from "node:fs";
import { basename, sep } from "node:path";
import { now } from "../build/timings.ts";
import { isIgnoredPath, readIgnore, type IgnoreRules } from "../utils/ignore.ts";

const DEBOUNCE_MS = 15;
const GITIGNORE_FILE = ".gitignore";
const EDITOR_TEMP_SUFFIX = /\.tmp\.\d+\.[0-9a-f]+$/;
const EDITOR_BACKUP_SUFFIX = /(~|\.swp|\.swx)$/;
const VIM_WRITE_CHECK_FILE = "4913";

export interface Watcher {
  close(): void;
}

/** Calls onChange with the changed files once they settle. waitMs counts from the first change. */
export function watchFolder(
  dir: string,
  onChange: (files: string[], waitMs: number) => void,
): Watcher {
  let timer: ReturnType<typeof setTimeout> | undefined;
  let firstAt = 0;
  let rules = readIgnore(dir);
  const files = new Set<string>();

  function flush(): void {
    const batch = [...files];
    const waitMs = now() - firstAt;
    files.clear();
    onChange(batch, waitMs);
  }

  const watcher = watch(dir, { recursive: true }, (_event, file) => {
    if (!file) return;
    const source = toPosix(sourceFile(file));
    if (source === GITIGNORE_FILE) {
      rules = readIgnore(dir);
      return;
    }
    if (isIgnored(rules, source)) return;
    if (files.size === 0) firstAt = now();
    files.add(source);
    clearTimeout(timer);
    timer = setTimeout(flush, DEBOUNCE_MS);
  });
  return {
    close() {
      clearTimeout(timer);
      watcher.close();
    },
  };
}

/** Maps an editor's temp file to the file it saves, e.g. `Hero.lusia.tmp.42.ab12` to `Hero.lusia`. */
export function sourceFile(file: string): string {
  return file.replace(EDITOR_TEMP_SUFFIX, "");
}

export function isIgnored(rules: IgnoreRules, file: string): boolean {
  return isEditorJunk(basename(file)) || isIgnoredPath(rules, file, false);
}

function toPosix(file: string): string {
  return file.split(sep).join("/");
}

function isEditorJunk(name: string): boolean {
  return name === VIM_WRITE_CHECK_FILE || EDITOR_BACKUP_SUFFIX.test(name);
}
