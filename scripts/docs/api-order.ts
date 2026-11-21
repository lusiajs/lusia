import type { ApiEntry, ApiGroup, ApiKind } from "../../reference/api/types.ts";

export const KIND_ORDER: ApiKind[] = ["function", "type", "markup", "style", "value"];

export const KIND_TITLES: Record<ApiKind, string> = {
  function: "Functions",
  type: "Types",
  markup: "Markup",
  style: "Styles",
  value: "Values",
};

export const GROUP_ORDER: ApiGroup[] = [
  "basics",
  "reactivity",
  "events",
  "flow",
  "components",
  "styling",
  "motion",
];

export const GROUP_TITLES: Record<ApiGroup, string> = {
  basics: "Basics",
  reactivity: "Reactivity",
  events: "Events",
  flow: "Flow",
  components: "Components",
  styling: "Styling",
  motion: "Motion",
};

export function entriesOfKind(entries: ApiEntry[], kind: ApiKind): ApiEntry[] {
  return entries.filter((entry) => entry.kind === kind);
}

export function entriesOfGroup(entries: ApiEntry[], group: ApiGroup): ApiEntry[] {
  return entries.filter((entry) => entry.group === group);
}

export function orderedEntries(entries: ApiEntry[]): ApiEntry[] {
  return KIND_ORDER.flatMap((kind) =>
    GROUP_ORDER.flatMap((group) =>
      entries.filter((entry) => entry.kind === kind && entry.group === group),
    ),
  );
}
