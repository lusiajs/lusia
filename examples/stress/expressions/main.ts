import { attach, type Instance } from "lusiajs";
import { createTarget } from "../cells.ts";
import { formatMs, timed, type Result } from "../report.ts";
import Edge from "./Edge.lusia";

export async function run(): Promise<Result[]> {
  const target = createTarget("div");
  const instances: Instance[] = [];
  const attachMs = timed(() => instances.push(attach(Edge, target)));
  for (const instance of instances) instance.detach();
  target.remove();
  return [{ name: "Attach Edge (tricky expressions)", value: formatMs(attachMs) }];
}
