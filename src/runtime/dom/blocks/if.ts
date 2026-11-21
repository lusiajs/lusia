import { untrack, watch } from "../../variable/graph.ts";
import type { Cleanup } from "../template/bindings.ts";
import type { Leave } from "../component/leave.ts";
import { Outlet } from "./outlet.ts";
import { mountBefore, type Mount } from "./mount.ts";
import { keepScope } from "../../config/scope.ts";

export type BranchRender = (cleanups: Cleanup[], leaves: Leave[]) => DocumentFragment;

export interface IfBranch {
  /** Missing for ELSE. */
  test?: () => unknown;
  render: BranchRender;
}

function pickBranch(branches: IfBranch[]): number {
  for (let i = 0; i < branches.length; i++) {
    const test = branches[i]!.test;
    if (!test || test()) return i;
  }
  return -1;
}

function mountBranch(outlet: Outlet, marker: Comment, branch: IfBranch): Mount {
  const cleanups: Cleanup[] = [];
  const leaves: Leave[] = [];
  const fragment = untrack(() => branch.render(cleanups, leaves));
  const mount = mountBefore(marker, fragment, cleanups, leaves);
  outlet.track(mount);
  return mount;
}

/** Shows one branch at a time. The old branch plays its leave animations while the new one is inserted. */
export function bindIf(
  marker: Comment,
  branches: IfBranch[],
  cleanups: Cleanup[],
  leaves: Leave[],
): void {
  const outlet = new Outlet(leaves);
  const scoped = branches.map(withKeptScope);
  let active: Mount | undefined;
  let activeIndex = -1;
  cleanups.push(
    watch(() => {
      const index = pickBranch(scoped);
      if (index === activeIndex) return;
      activeIndex = index;
      if (active) outlet.retire(active);
      active = index === -1 ? undefined : mountBranch(outlet, marker, scoped[index]!);
    }),
    () => outlet.disposeAll(),
  );
}

function withKeptScope(branch: IfBranch): IfBranch {
  return { test: branch.test, render: keepScope(branch.render) };
}
