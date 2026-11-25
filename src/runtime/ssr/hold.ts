const pending = new Set<Promise<unknown>>();

/** Tracks a load that the server render must wait for. A rejected load stays in `settledRenders`. */
export function holdRender(task: Promise<unknown>): void {
  pending.add(task);
  const release = () => void pending.delete(task);
  task.then(release, release);
}

/** Resolves once every held load has finished, including loads started by those loads. */
export async function settledRenders(): Promise<void> {
  while (pending.size > 0) await Promise.all([...pending]);
}
