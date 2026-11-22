import type { AttrKind } from "./check/checks.ts";
import { expectClose, readHeader } from "./block-header.ts";
import { CHAIN_TAG, CLOSE_TAG, type BodyReader } from "./block-tokens.ts";
import type { Cursor } from "./scan/cursor.ts";
import type { IfBinding } from "./types/if.ts";
import type { Branch } from "./types/template.ts";

type BranchName = "IF" | "ELSEIF" | "ELSE";

const NO_ATTRS: ReadonlyMap<string, AttrKind> = new Map();

function readBranch(c: Cursor, name: BranchName, body: BodyReader): Branch {
  const start = c.pos;
  const isElse = name === "ELSE";
  const header = readHeader(c, name, NO_ATTRS, !isElse);
  if (!isElse && header.expr === undefined) c.fail("L1029", { name }, start);
  failOldBranchClose(c);
  const template = body();
  failOldBranchClose(c);
  return isElse ? { body: template } : { test: header.expr, body: template };
}

function chainNameAt(c: Cursor): "ELSEIF" | "ELSE" | undefined {
  return c.match(CHAIN_TAG)?.[1] as "ELSEIF" | "ELSE" | undefined;
}

// `</ELSEIF>` and `</ELSE>` belong to the old form, where each branch closed itself.
function failOldBranchClose(c: Cursor): void {
  const close = c.match(CLOSE_TAG)?.[1];
  if (close === "ELSEIF" || close === "ELSE") c.fail("L1043", { tag: close });
}

/** `<IF {a}> ... <ELSEIF {b}> ... <ELSE> ... </IF>`: the branches split one block, closed once. */
export function readIf(c: Cursor, body: BodyReader): IfBinding {
  const start = c.pos;
  const branches = [readBranch(c, "IF", body)];
  let name = chainNameAt(c);
  while (name) {
    if (branches.at(-1)!.test === undefined) c.fail("L1044", {});
    branches.push(readBranch(c, name, body));
    name = chainNameAt(c);
  }
  expectClose(c, "IF", start);
  return { kind: "if", branches };
}
