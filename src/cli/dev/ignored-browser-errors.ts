interface IgnoredBrowserError {
  /** The start of the message, as browsers word it. */
  prefix: string;
  reason: string;
}

/** Browser error events that are notices, not failures. Add new ones here. */
export const IGNORED_BROWSER_ERRORS: IgnoredBrowserError[] = [
  {
    prefix: "ResizeObserver loop",
    reason: "The browser moves the extra size notices to the next frame, so nothing is lost.",
  },
];

export function isIgnoredBrowserError(message: string): boolean {
  return IGNORED_BROWSER_ERRORS.some((ignored) => message.startsWith(ignored.prefix));
}
