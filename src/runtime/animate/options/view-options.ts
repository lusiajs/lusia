import { runtimeError } from "../../errors.ts";
import { animateConfig } from "./config-store.ts";

export interface ViewOptions {
  margin?: number | string;
  amount?: number;
  reverse?: boolean;
}

export interface ViewSettings {
  rootMargin: string;
  amount: number;
}

/** The view fields as the item writes them: margin in CSS units, not rootMargin. */
interface ViewDefault {
  margin: number | string;
  amount: number;
  reverse: boolean;
}

const LIBRARY_VIEW: ViewDefault = { margin: "0px", amount: 0.15, reverse: false };

/** A CSS length or percentage, with an optional sign. A bare zero is allowed. */
const CSS_LENGTH = /^(-?(?:\d+\.?\d*|\.\d+))(px|%|em|rem|vw|vh|vmin|vmax)?$/;

export function viewDefault(): ViewDefault {
  const view = animateConfig().view ?? {};
  return {
    margin: view.margin ?? LIBRARY_VIEW.margin,
    amount: view.amount ?? LIBRARY_VIEW.amount,
    reverse: view.reverse ?? LIBRARY_VIEW.reverse,
  };
}

export function readViewOptions(options: ViewOptions): { view: ViewSettings; reverse: boolean } {
  const base = viewDefault();
  return {
    view: {
      rootMargin: readMargin(options.margin ?? base.margin),
      amount: readAmount(options.amount ?? base.amount),
    },
    reverse: readReverse(options.reverse ?? base.reverse),
  };
}

export function sameView(a: ViewSettings, b: ViewSettings): boolean {
  return a.rootMargin === b.rootMargin && a.amount === b.amount;
}

function readReverse(reverse: boolean): boolean {
  if (typeof reverse !== "boolean") throw runtimeError("L2020", { value: String(reverse) });
  return reverse;
}

// A positive margin shrinks the root box, so it maps to the negated rootMargin.
function readMargin(margin: number | string): string {
  if (typeof margin === "number") return numberMargin(margin);
  return stringMargin(margin);
}

function numberMargin(margin: number): string {
  if (!Number.isFinite(margin)) throw badMargin(margin);
  return `${-margin}px`;
}

function stringMargin(margin: string): string {
  const match = CSS_LENGTH.exec(margin.trim());
  if (!match) throw badMargin(margin);
  const value = Number(match[1]);
  const unit = match[2];
  if (unit === undefined && value !== 0) throw badMargin(margin);
  return `${-value}${unit ?? "px"}`;
}

function badMargin(margin: unknown): Error {
  return runtimeError("L2021", { value: String(margin) });
}

function readAmount(amount: number): number {
  if (!Number.isFinite(amount) || amount < 0 || amount > 1) {
    throw runtimeError("L2022", { value: String(amount) });
  }
  return amount;
}
