import { basename } from "node:path";

interface TimedEntry {
  label: string;
  ms: number;
}

type Attributes = Partial<Record<string, string>>;

const TOP_FILES = 8;
const TOP_TESTS = 5;
const MAX_TEST_LABEL = 70;
const TEST_ROOT = "test";
const EXAMPLES_AREA = "examples";
const AREA_DEPTH = 2;

export function formatSeconds(ms: number): string {
  return `${(ms / 1000).toFixed(1)}s`;
}

function decodeEntities(text: string): string {
  return text
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">")
    .replaceAll("&quot;", '"')
    .replaceAll("&apos;", "'")
    .replaceAll("&amp;", "&");
}

function parseAttributes(source: string): Attributes {
  const attributes: Attributes = {};
  for (const match of source.matchAll(/(\w+)="([^"]*)"/g)) {
    attributes[match[1] ?? ""] = decodeEntities(match[2] ?? "");
  }
  return attributes;
}

function collectElements(xml: string, tag: "testsuite" | "testcase"): Attributes[] {
  const pattern = new RegExp(`<${tag}((?:\\s+\\w+="[^"]*")*)\\s*/?>`, "g");
  return [...xml.matchAll(pattern)].map((match) => parseAttributes(match[1] ?? ""));
}

function secondsToMs(seconds: string | undefined): number {
  return Number(seconds ?? 0) * 1000;
}

function isFileSuite(attributes: Attributes): boolean {
  return attributes.file !== undefined && attributes.name === attributes.file;
}

function cutLabel(label: string): string {
  return label.length > MAX_TEST_LABEL ? `${label.slice(0, MAX_TEST_LABEL - 3)}...` : label;
}

function fileEntries(xml: string): TimedEntry[] {
  return collectElements(xml, "testsuite")
    .filter(isFileSuite)
    .map((attributes) => ({ label: attributes.name ?? "", ms: secondsToMs(attributes.time) }));
}

function testLabel(attributes: Attributes): string {
  return cutLabel(`${basename(attributes.file ?? "")} > ${attributes.name ?? ""}`);
}

function testEntries(xml: string): TimedEntry[] {
  return collectElements(xml, "testcase").map((attributes) => ({
    label: testLabel(attributes),
    ms: secondsToMs(attributes.time),
  }));
}

interface AreaTime {
  area: string;
  ms: number;
  files: number;
}

export function areaOf(file: string): string {
  const parts = file.replace(/^\.\//, "").split("/");
  if (parts[0] === EXAMPLES_AREA) {
    return EXAMPLES_AREA;
  }
  const directories = parts.slice(0, -1);
  const relative = directories[0] === TEST_ROOT ? directories.slice(1) : directories;
  return relative.slice(0, AREA_DEPTH).join("/") || TEST_ROOT;
}

function addToArea(areas: Map<string, AreaTime>, entry: TimedEntry): void {
  const area = areaOf(entry.label);
  const current = areas.get(area) ?? { area, ms: 0, files: 0 };
  areas.set(area, { area, ms: current.ms + entry.ms, files: current.files + 1 });
}

// `entries` are file entries: the label is the file path.
export function timeByArea(entries: TimedEntry[]): AreaTime[] {
  const areas = new Map<string, AreaTime>();
  for (const entry of entries) {
    addToArea(areas, entry);
  }
  return [...areas.values()].sort((a, b) => b.ms - a.ms);
}

function slowest(entries: TimedEntry[], count: number): TimedEntry[] {
  return [...entries].sort((a, b) => b.ms - a.ms).slice(0, count);
}

function formatSection(title: string, entries: TimedEntry[]): string {
  const lines = entries.map((entry) => `  ${formatSeconds(entry.ms)}  ${entry.label}`);
  return [title, ...lines].join("\n");
}

function formatFileCount(count: number): string {
  return count === 1 ? "1 file" : `${count} files`;
}

function formatAreaSection(areas: AreaTime[]): string {
  const width = Math.max(...areas.map((area) => area.area.length));
  const lines = areas.map(
    (area) =>
      `  ${area.area.padEnd(width)}  ${formatSeconds(area.ms).padStart(7)}  ${formatFileCount(area.files)}`,
  );
  return ["time by area", ...lines].join("\n");
}

export function slowestReport(xml: string): string {
  const files = fileEntries(xml);
  if (files.length === 0) {
    return "";
  }
  const sections = [
    formatAreaSection(timeByArea(files)),
    formatSection("slowest test files", slowest(files, TOP_FILES)),
    formatSection("slowest tests", slowest(testEntries(xml), TOP_TESTS)),
  ];
  return sections.join("\n\n");
}
