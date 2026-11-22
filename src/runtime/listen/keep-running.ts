let keepDepth = 0;

/** Listeners started inside `run` keep running after their component detaches, until their stop is called. */
export function keepRunning(run: () => void): void {
  keepDepth++;
  try {
    run();
  } finally {
    keepDepth--;
  }
}

export function isKeeping(): boolean {
  return keepDepth > 0;
}
