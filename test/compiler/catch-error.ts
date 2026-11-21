import { LusiaError } from "#compiler/errors/error.ts";

/** Runs `run` and returns the LusiaError it throws. Fails the test if it throws anything else or nothing. */
export function catchError(run: () => unknown): LusiaError {
  try {
    run();
  } catch (error) {
    if (error instanceof LusiaError) return error;
    throw error;
  }
  throw new Error("expected a LusiaError");
}
