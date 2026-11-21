import type { ApiEntry, ApiKind } from "../../reference/api/types.ts";
import {
  GROUP_ORDER,
  GROUP_TITLES,
  KIND_ORDER,
  KIND_TITLES,
  entriesOfGroup,
  entriesOfKind,
} from "./api-order.ts";
import { codeSpan, linkTo, tableHeader, tableRow } from "./markdown.ts";

function entryRow(entry: ApiEntry): string {
  return tableRow([linkTo(codeSpan(entry.name), `api/${entry.id}.md`), entry.summary]);
}

function groupSection(entries: ApiEntry[], kind: ApiKind): string[] {
  const kindEntries = entriesOfKind(entries, kind);
  return GROUP_ORDER.flatMap((group) => {
    const groupEntries = entriesOfGroup(kindEntries, group);
    if (groupEntries.length === 0) return [];
    return [
      `### ${GROUP_TITLES[group]}`,
      "",
      ...tableHeader(["Name", "Summary"]),
      ...groupEntries.map(entryRow),
      "",
    ];
  });
}

function kindSection(entries: ApiEntry[], kind: ApiKind): string[] {
  const body = groupSection(entries, kind);
  return body.length === 0 ? [] : [`## ${KIND_TITLES[kind]}`, "", ...body];
}

const READING_NOTES = [
  "This folder is generated from the framework source. Do not edit it.",
  "Open `api/<name>.md` for one entry. Error codes and config options are in the pages below.",
  "For a step-by-step tour, read the Guide at https://lusia.azpepoze.com/guide.",
];

export function buildIndexPage(entries: ApiEntry[], intro: string): string {
  const lines = [
    "# Lusia",
    "",
    "**How to read these docs**",
    "",
    ...READING_NOTES.map((note) => `- ${note}`),
    "",
    intro,
    "",
    `- ${linkTo("Error codes", "errors.md")}`,
    `- ${linkTo("Config options", "config.md")}`,
    "",
    ...KIND_ORDER.flatMap((kind) => kindSection(entries, kind)),
  ];
  return `${lines.join("\n").trimEnd()}\n`;
}
