export type ApiKind = "function" | "type" | "markup" | "style" | "value";
export type ApiGroup =
  "basics" | "reactivity" | "events" | "flow" | "components" | "styling" | "motion" | "routing";

export interface ApiMember {
  members?: ApiMember[];
  name: string;
  summary: string;
}

export interface ApiEntry {
  id: string;
  name: string;
  kind: ApiKind;
  group: ApiGroup;
  signature: string;
  summary: string;
  bullets: string[];
  /** A small table after the bullets. The first row is the header. */
  table?: string[][];
  example: string;
  /** For an enum object: its members, completed after `NAME.`. */
  members?: ApiMember[];
}
