import { variable } from "lusiajs";

export const CARD_COUNT = 500;

export const cardIds = variable(Array.from({ length: CARD_COUNT }, (_, index) => index));

// Counted by the handlers in Watcher.lusia, so tests can check that they ran.
export const counts = { viewChanges: 0, outsidePresses: 0, logClicks: 0 };

// Stops for the keepRunning listeners, so a run can stop them when it is done.
export const keptStops: Array<() => void> = [];
