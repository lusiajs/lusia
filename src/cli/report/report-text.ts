const ELLIPSIS = "…";

export function padRight(text: string, width: number): string {
  return text.length >= width ? text : text + " ".repeat(width - text.length);
}

export function padLeft(text: string, width: number): string {
  return text.length >= width ? text : " ".repeat(width - text.length) + text;
}

/** Exactly `width` characters: pads with spaces or cuts the end. */
export function fitWidth(text: string, width: number): string {
  return padRight(text.slice(0, width), width);
}

/** Cuts the start of a long path and marks the cut with an ellipsis. */
export function truncateLeft(text: string, width: number): string {
  if (text.length <= width) return text;
  if (width <= 0) return "";
  return ELLIPSIS + text.slice(text.length - (width - 1));
}
