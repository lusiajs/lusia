/** A point on an element or the screen, as a fraction of its height: 0 is the top, 1 the bottom. */
export const EDGE = Object.freeze({ TOP: 0, CENTER: 0.5, BOTTOM: 1 } as const);

export type ScrollEdge = number;
