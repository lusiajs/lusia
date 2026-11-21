import type { ApiEntry, ApiMember } from "../../reference/api/types.ts";
import { exampleLanguage } from "./example-language.ts";
import { codeSpan, linkTo } from "./markdown.ts";
import { seeAlsoEntries } from "./see-also.ts";

function fence(language: string, body: string): string[] {
  return ["```" + language, body, "```"];
}

function memberLines(members: ApiMember[], indent: string): string[] {
  return members.flatMap((member) => [
    `${indent}- ${codeSpan(member.name)}: ${member.summary}`,
    ...memberLines(member.members ?? [], `${indent}  `),
  ]);
}

function section(title: string, body: string[]): string[] {
  return body.length === 0 ? [] : ["", `## ${title}`, "", ...body];
}

function bulletLines(bullets: string[]): string[] {
  return bullets.map((bullet) => `- ${bullet}`);
}

function seeAlsoLines(entry: ApiEntry, all: ApiEntry[]): string[] {
  return seeAlsoEntries(entry, all).map(
    (other) => `- ${linkTo(codeSpan(other.name), `${other.id}.md`)}`,
  );
}

export function buildApiPage(entry: ApiEntry, all: ApiEntry[]): string {
  const lines = [
    `# ${codeSpan(entry.name)}`,
    "",
    `Kind: ${entry.kind}. Group: ${entry.group}.`,
    "",
    entry.summary,
    ...section("Signature", fence("ts", entry.signature)),
    ...section("Details", bulletLines(entry.bullets)),
    ...section("Members", memberLines(entry.members ?? [], "")),
    ...section("Example", fence(exampleLanguage(entry.example), entry.example)),
    ...section("See also", seeAlsoLines(entry, all)),
    "",
    linkTo("Back to the index", "../README.md"),
  ];
  return `${lines.join("\n")}\n`;
}
