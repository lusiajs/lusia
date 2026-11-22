/** Screen names and the width, in CSS pixels, where each starts. The smallest must start at 0. */
export type Screens = Readonly<Record<string, number>>;

export const DEFAULT_SCREENS: Screens = Object.freeze({ PHONE: 0, TABLET: 600, DESKTOP: 1000 });

export const REDUCED_MOTION = "REDUCED_MOTION";

export interface ScreenRange {
  name: string;
  min: number;
  /** Where the next screen starts. Infinity for the widest. */
  until: number;
}

export function screenRanges(screens: Screens): ScreenRange[] {
  const sorted = Object.entries(screens).sort(([, a], [, b]) => a - b);
  return sorted.map(([name, min], index) => ({
    name,
    min,
    until: sorted[index + 1]?.[1] ?? Infinity,
  }));
}
