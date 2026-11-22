import { tagEnd, type FlowTag } from "./flow-placeholders.ts";

const MARKER = /^<div\s+data-lusia-flow="(\d+)"\s*>$/;
const CHAIN_MARKER_AT = /(\s*)<div\s+data-lusia-flow="(\d+)"\s*>/y;
const DIV_CLOSE = /^<\/div\s*>$/;

/** Puts the flow tags back into formatted markup, as protectFlowTags left them. */
export function restoreFlowTags(html: string, tags: FlowTag[]): string {
  const stack: Array<number | undefined> = [];
  let text = "";
  let index = 0;
  while (index < html.length) {
    if (html.charAt(index) !== "<") {
      text += html.charAt(index);
      index++;
      continue;
    }
    if (html.startsWith("<!--", index)) {
      const end = html.indexOf("-->", index);
      const next = end === -1 ? html.length : end + 3;
      text += html.slice(index, next);
      index = next;
      continue;
    }
    const end = tagEnd(html, index);
    if (end === -1) {
      text += html.charAt(index);
      index++;
      continue;
    }
    const tag = html.slice(index, end + 1);
    const marker = MARKER.exec(tag);
    if (marker) {
      stack.push(Number(marker[1]));
      text += tagOf(tags, Number(marker[1]));
      index = end + 1;
    } else if (DIV_CLOSE.test(tag)) {
      const placeholder = stack.pop();
      const branchStart = placeholder === undefined ? -1 : chainMarkerAt(html, end + 1, tags);
      if (branchStart === -1) {
        text += placeholder === undefined ? tag : `</${typeOf(tags, placeholder)}>`;
        index = end + 1;
      } else {
        index = branchStart;
      }
    } else {
      if (/^<div(?=[\s>])/i.test(tag)) stack.push(undefined);
      text += tag;
      index = end + 1;
    }
  }
  return text;
}

/** Where a chain-branch marker starts after a closing div at from, or -1 when none follows. */
function chainMarkerAt(html: string, from: number, tags: FlowTag[]): number {
  CHAIN_MARKER_AT.lastIndex = from;
  const match = CHAIN_MARKER_AT.exec(html);
  if (!match || !tags[Number(match[2])]?.chain) return -1;
  return from + (match[1] ?? "").length;
}

function tagOf(tags: FlowTag[], index: number): string {
  return tags[index]?.open ?? "";
}

function typeOf(tags: FlowTag[], index: number): string {
  return tags[index]?.type ?? "div";
}
