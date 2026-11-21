import { fnv1a } from "#compiler/id.ts";

export type Rgb = [red: number, green: number, blue: number];

const RESET = "\x1b[0m";
const PASTEL_SATURATION = 0.55;
const PASTEL_LIGHTNESS = 0.8;
const ANSI_PATTERN = /\x1b\[[0-9;]*m/g;

export const ANSI = {
  dim: "\x1b[90m",
  red: "\x1b[31m",
  yellow: "\x1b[33m",
  cyan: "\x1b[36m",
  bold: "\x1b[1m",
} as const;

export function colorEnabled(
  env: Record<string, string | undefined> = process.env,
  isTerminal = Boolean(process.stderr.isTTY),
): boolean {
  return isTerminal && !env.NO_COLOR;
}

export function stripAnsi(text: string): string {
  return text.replace(ANSI_PATTERN, "");
}

export function paint(text: string, code: string): string {
  return `${code}${text}${RESET}`;
}

export function rgbCode(rgb: Rgb): string {
  return `\x1b[38;2;${rgb[0]};${rgb[1]};${rgb[2]}m`;
}

export function categoryHue(category: string): number {
  return fnv1a(category) % 360;
}

export function categoryCode(category: string): string {
  return rgbCode(pastelForHue(categoryHue(category)));
}

export function pastelForHue(hue: number): Rgb {
  return hslToRgb(hue, PASTEL_SATURATION, PASTEL_LIGHTNESS);
}

function hslToRgb(hue: number, saturation: number, lightness: number): Rgb {
  const chroma = (1 - Math.abs(2 * lightness - 1)) * saturation;
  const second = chroma * (1 - Math.abs(((hue / 60) % 2) - 1));
  const offset = lightness - chroma / 2;
  const [red, green, blue] = sectorChannels(hue, chroma, second);
  return [red + offset, green + offset, blue + offset].map((channel) =>
    Math.round(channel * 255),
  ) as Rgb;
}

function sectorChannels(hue: number, chroma: number, second: number): Rgb {
  if (hue < 60) return [chroma, second, 0];
  if (hue < 120) return [second, chroma, 0];
  if (hue < 180) return [0, chroma, second];
  if (hue < 240) return [0, second, chroma];
  if (hue < 300) return [second, 0, chroma];
  return [chroma, 0, second];
}
