import { paint } from "./color.ts";

export function styled(text: string, code: string, color: boolean): string {
  return color ? paint(text, code) : text;
}
