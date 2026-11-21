import { posix } from "node:path";

export type DocFiles = Map<string, string>;

const LINK_PATTERN = /\]\(([^)\s]+)\)/g;
const FENCE_PATTERN = /^\s*```/;

interface MarkedLine {
  text: string;
  prose: boolean;
}

// Code blocks are skipped, so code samples never count as links.
function markLines(content: string): MarkedLine[] {
  let inFence = false;
  return content.split("\n").map((text) => {
    if (FENCE_PATTERN.test(text)) {
      inFence = !inFence;
      return { text, prose: false };
    }
    return { text, prose: !inFence };
  });
}

function isLocalTarget(target: string): boolean {
  return !/^[a-z]+:/i.test(target) && !target.startsWith("#");
}

function linkTargets(content: string): string[] {
  return markLines(content)
    .filter((line) => line.prose)
    .flatMap((line) => [...line.text.matchAll(LINK_PATTERN)].map((match) => match[1] ?? ""))
    .filter(isLocalTarget);
}

function resolveTarget(fromPath: string, target: string): string {
  return posix.normalize(posix.join(posix.dirname(fromPath), target));
}

function brokenLinksIn(files: DocFiles, fromPath: string, content: string): string[] {
  return linkTargets(content)
    .filter((target) => !files.has(resolveTarget(fromPath, target)))
    .map((target) => `${fromPath} links to ${target}`);
}

export function findBrokenLinks(files: DocFiles): string[] {
  return [...files].flatMap(([path, content]) => brokenLinksIn(files, path, content));
}

// Rewrites local links so they work from the package root, where llms-full.txt lives.
export function rebaseLinks(content: string, fromPath: string): string {
  return markLines(content)
    .map((line) => (line.prose ? rebaseLine(line.text, fromPath) : line.text))
    .join("\n");
}

function rebaseLine(text: string, fromPath: string): string {
  return text.replace(LINK_PATTERN, (_match, target: string) => {
    const newTarget = isLocalTarget(target) ? resolveTarget(fromPath, target) : target;
    return `](${newTarget})`;
  });
}
