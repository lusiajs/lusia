import type { Steps } from "../build/timings.ts";
import { ANSI, categoryCode, stripAnsi } from "./color.ts";
import { startupRows } from "./dev-timing.ts";
import { styled } from "./style.ts";

export interface HeaderUrl {
  label: string;
  url: string;
}

export interface HeaderOptions {
  urls: HeaderUrl[];
  version: string;
  /** Startup breakdown, with `total`. */
  startup: Steps;
  /** Shows only the total row. */
  quiet: boolean;
  watching: string;
  width: number;
  color: boolean;
}

const TITLE = "lusia dev";
const TITLE_CATEGORY = "dev";
const LABEL_WIDTH = 9;
const RIGHT_PADDING = 3;
const BORDER_OVERHEAD = 7;

const UNICODE_BOX = {
  topLeft: "╭",
  topRight: "╮",
  bottomLeft: "╰",
  bottomRight: "╯",
  horizontal: "─",
  vertical: "│",
};
const PLAIN_BOX = {
  topLeft: "+",
  topRight: "+",
  bottomLeft: "+",
  bottomRight: "+",
  horizontal: "-",
  vertical: "|",
};

export function formatHeader(header: HeaderOptions): string {
  const box = header.color ? UNICODE_BOX : PLAIN_BOX;
  const rows = [
    "",
    ...header.urls.map((item) => formatUrlRow(item, header.color)),
    "",
    watchingRow(header),
    "",
    ...startupBlock(header).map((row) => `   ${row}`),
  ];
  const inner = innerWidth(rows, header);
  const top = topBorder(header, inner, box);
  const body = rows.map((row) => `${box.vertical}${padVisible(row, inner)}${box.vertical}`);
  const bottom = `${box.bottomLeft}${box.horizontal.repeat(inner)}${box.bottomRight}`;
  return [top, ...body, bottom].join("\n");
}

function formatUrlRow({ label, url }: HeaderUrl, color: boolean): string {
  return `   ➜  ${label.padEnd(LABEL_WIDTH)}${styled(url, ANSI.bold, color)}`;
}

function watchingRow(header: HeaderOptions): string {
  return `   watching ${header.watching}`;
}

function startupBlock(header: HeaderOptions): string[] {
  const steps = header.quiet ? { total: header.startup.total } : header.startup;
  return startupRows(steps, header.color);
}

function innerWidth(rows: string[], header: HeaderOptions): number {
  const widest = Math.max(...rows.map(visibleLength));
  const titleWidth = TITLE.length + header.version.length + BORDER_OVERHEAD;
  const wanted = Math.max(widest + RIGHT_PADDING, titleWidth);
  return Math.max(0, Math.min(wanted, header.width - 2));
}

function topBorder(header: HeaderOptions, inner: number, box: typeof UNICODE_BOX): string {
  const title = styled(TITLE, categoryCode(TITLE_CATEGORY), header.color);
  const version = styled(header.version, ANSI.dim, header.color);
  const fillWidth = inner - TITLE.length - header.version.length - 6;
  const fill = box.horizontal.repeat(Math.max(0, fillWidth));
  return `${box.topLeft}${box.horizontal} ${title} ${fill} ${version} ${box.horizontal}${box.topRight}`;
}

function padVisible(text: string, width: number): string {
  return `${text}${" ".repeat(Math.max(0, width - visibleLength(text)))}`;
}

function visibleLength(text: string): number {
  return stripAnsi(text).length;
}
