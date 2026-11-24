import { readFileSync, statSync } from "node:fs";

export interface FileStamp {
  path: string;
  lastModified: number;
  hash: string;
}

export function stampFile(path: string): FileStamp {
  // Stat before reading: a write in between must look stale, not current.
  const lastModified = statSync(path).mtimeMs;
  return { path, lastModified, hash: hashText(readFileSync(path)) };
}

export function isFileUnchanged(stamp: FileStamp): boolean {
  const lastModified = modifiedTime(stamp.path);
  if (lastModified === undefined) return false;
  if (lastModified === stamp.lastModified) return true;
  return hashFile(stamp.path) === stamp.hash;
}

function modifiedTime(path: string): number | undefined {
  try {
    return statSync(path).mtimeMs;
  } catch {
    return undefined;
  }
}

function hashFile(path: string): string | undefined {
  try {
    return hashText(readFileSync(path));
  } catch {
    return undefined;
  }
}

export function hashText(content: string | Uint8Array): string {
  return Bun.hash(content).toString(16);
}
