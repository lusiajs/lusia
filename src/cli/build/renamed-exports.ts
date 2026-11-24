export const RENAMED_EXPORTS: ReadonlyMap<string, string> = new Map([
  [
    "ACTIVE",
    "ACTIVE was renamed to ON. ACTIVE.IN is now ON.ATTACH, and ACTIVE.OUT is now ON.DETACH.",
  ],
  ["WHEN", "WHEN was renamed to ON. Write ON.VIEW instead of WHEN.VIEW."],
  [
    "TURN",
    "TURN was removed. Use MIDWAY.SWITCH, MIDWAY.SWITCH_SMOOTH or MIDWAY.SWITCH_STOP in midway: { mode: ... }.",
  ],
  ["CURVE", "CURVE was renamed to EASE.STYLE."],
  ["TRANSITION", "TRANSITION was renamed to EASE.STYLE."],
  [
    "store",
    "store was renamed to variable. Use variable.compute() for store.from() and variable.autoRun() for store.onUpdate().",
  ],
  ["signal", "signal was renamed to variable."],
  ["computed", "computed was renamed to variable.compute."],
  ["effect", "effect was renamed to variable.autoRun."],
  ["batch", "batch was removed. Use .peek() to read a variable without tracking it."],
  ["untrack", "untrack was removed. Use .peek() to read a variable without tracking it."],
]);
