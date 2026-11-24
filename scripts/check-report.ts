import { basename } from "node:path";

interface TimedEntry {
  label: string;
  ms: number;
}

type Attributes = Partial<Record<string, string>>;

const TOP_FILES = 8;
const TOP_TESTS = 5;
const MAX_TEST_LABEL = 70;

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

function slowest(entries: TimedEntry[], count: number): TimedEntry[] {
  return [...entries].sort((a, b) => b.ms - a.ms).slice(0, count);
}

function formatSection(title: string, entries: TimedEntry[]): string {
  const lines = entries.map((entry) => `  ${formatSeconds(entry.ms)}  ${entry.label}`);
  return [title, ...lines].join("\n");
}

export function slowestReport(xml: string): string {
  const files = slowest(fileEntries(xml), TOP_FILES);
  if (files.length === 0) {
    return "";
  }
  const tests = slowest(testEntries(xml), TOP_TESTS);
  return [formatSection("slowest test files", files), formatSection("slowest tests", tests)].join(
    "\n",
  );
}
