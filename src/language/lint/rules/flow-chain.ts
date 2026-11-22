import type { LintFinding, LintRule } from "../types.ts";

const FLOW_TAG = /<(\/?)(IF|ELSEIF|ELSE|EACH|FOR)(?=[\s/>])/g;
const BLOCK_TAGS = ["IF", "EACH", "FOR"];

interface OpenBlock {
  name: string;
  sawElse: boolean;
}

/** Mirrors the compiler: ELSEIF and ELSE sit inside an open <IF>, and ELSE is its last branch. */
export const flowChain: LintRule = ({ markup }) => {
  const findings: LintFinding[] = [];
  const open: OpenBlock[] = [];
  for (const match of markup.matchAll(FLOW_TAG)) {
    const message = flowMessage(match, open);
    if (message) findings.push(flowFinding(match.index, message));
  }
  return findings;
};

function flowFinding(offset: number, message: string): LintFinding {
  return { offset, code: "flow-chain", message, severity: "error" };
}

function flowMessage(match: RegExpMatchArray, open: OpenBlock[]): string | undefined {
  const [, slash = "", name = ""] = match;
  if (slash === "/") return closeMessage(name, open);
  if (BLOCK_TAGS.includes(name)) {
    open.push({ name, sawElse: false });
    return undefined;
  }
  return branchMessage(name, open);
}

function closeMessage(name: string, open: OpenBlock[]): string | undefined {
  if (name === "ELSEIF" || name === "ELSE") {
    return `</${name}> is not used. <${name}> has no closing tag`;
  }
  open.pop();
  return undefined;
}

function branchMessage(name: string, open: OpenBlock[]): string | undefined {
  const top = open.at(-1);
  if (top?.name !== "IF") return `<${name}> must be inside an <IF> block`;
  if (top.sawElse) return "<ELSE> must be the last branch";
  if (name === "ELSE") top.sawElse = true;
  return undefined;
}
