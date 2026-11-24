import { ANSI } from "./color.ts";
import { formatTime } from "./log.ts";
import { styled } from "./style.ts";

export type BlockKind = "hot" | "css" | "reload" | "error";

const LABEL_WIDTH = 8;
const INDENT = " ".repeat(10);

const KIND_STYLES: Record<BlockKind, { mark: string; code: string }> = {
  hot: { mark: "●", code: ANSI.green },
  css: { mark: "◆", code: ANSI.cyan },
  reload: { mark: "↻", code: ANSI.yellow },
  error: { mark: "✖", code: ANSI.red },
};

export const UNICODE_TREE = { pipe: "│", branch: "├", end: "└" };
export const PLAIN_TREE = { pipe: "|", branch: "|", end: "`" };

export function treeChars(color: boolean): { pipe: string; branch: string; end: string } {
  return color ? UNICODE_TREE : PLAIN_TREE;
}

export function headLine(time: Date, kind: BlockKind, text: string, color: boolean): string {
  const { mark, code } = KIND_STYLES[kind];
  const tag = styled(`${mark} ${kind.padEnd(LABEL_WIDTH)}`, code, color);
  return `${formatTime(time)}  ${tag}${text}`;
}

export function renderTree(head: string, children: string[], color: boolean): string {
  const tree = treeChars(color);
  const rows = children.map((child, index) => {
    const isLast = index === children.length - 1;
    const branch = styled(isLast ? tree.end : tree.pipe, ANSI.dim, color);
    return `${INDENT}${branch} ${child}`;
  });
  return [head, ...rows].join("\n");
}
